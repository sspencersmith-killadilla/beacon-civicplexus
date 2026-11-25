// Browser-only singleton that drains the IndexedDB sync_queue to Lovable Cloud, FIFO, one item at a time.
import { supabase } from "@/integrations/supabase/client";
import {
  deletePhoto, deleteQueueItem, ENTITY_TABLE, getPhoto, listQueueItems, migrateLegacyQueue, putPhoto, putQueueItem, saveQueueItem,
  type OfflinePhoto, type SyncQueueItem,
} from "./offlineDb";
import { backoffDelay, classifyFailure, MAX_AUTO_RETRIES, type FailureKind } from "./sync-policy";

const SIM_KEY = "beacon:simulate-offline";
const SYNCED_KEEP_MS = 24 * 3600 * 1000;

export type EngineState = {
  online: boolean; simulatedOffline: boolean; running: boolean; authPaused: boolean;
  progress: { done: number; total: number } | null; items: SyncQueueItem[]; lastResult: { synced: number; failed: number } | null;
};

class SyncFailure extends Error { constructor(public kind: FailureKind, message: string) { super(message); } }
const fail = (err: { message?: string; status?: number; statusCode?: string | number } | null | undefined, status?: number) => {
  const msg = err?.message ?? "Unknown error";
  const st = status ?? err?.status ?? (err?.statusCode != null ? Number(err.statusCode) : undefined);
  return new SyncFailure(classifyFailure(st, msg), msg);
};

let state: EngineState = { online: true, simulatedOffline: false, running: false, authPaused: false, progress: null, items: [], lastResult: null };
const listeners = new Set<() => void>();
const emit = (patch: Partial<EngineState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getEngineState = () => state;
export const subscribeEngine = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const isEffectivelyOnline = () => navigator.onLine && !state.simulatedOffline;

async function refreshItems() { emit({ items: await listQueueItems() }); }

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleRetry() {
  if (timer) clearTimeout(timer);
  const due = state.items.filter((i) => i.status === "failed" && i.next_attempt_at).map((i) => Date.parse(i.next_attempt_at!));
  if (!due.length) return;
  timer = setTimeout(() => void syncAll(), Math.max(1000, Math.min(...due) - Date.now()));
}

async function uploadPhoto(p: OfflinePhoto): Promise<string> {
  if (p.storage_path) return p.storage_path; // already uploaded in an earlier partial attempt
  if (!p.blob) throw new SyncFailure("permanent", `Photo ${p.id} has no local image data`);
  const path = `${p.organization_id}/${p.incident_id}/${p.id}.jpg`;
  const { error } = await supabase.storage.from("incident-evidence").upload(path, p.blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw fail(error as never);
  await putPhoto({ ...p, storage_path: path }); // record immediately so a later failure doesn't re-upload
  return path;
}

async function syncOne(item: SyncQueueItem) {
  const table = ENTITY_TABLE[item.entity_type];
  // Phase 1: binaries
  const photos: OfflinePhoto[] = [];
  for (const id of item.photo_ids) {
    const p = await getPhoto(id);
    if (p) { p.storage_path = await uploadPhoto(p); photos.push(p); }
  }
  const row: Record<string, unknown> = { ...item.payload, organization_id: item.organization_id, incident_id: item.incident_id, client_generated_id: item.id };
  if (item.receipt_photo_id) {
    const r = await getPhoto(item.receipt_photo_id);
    if (r) row[table === "contract_entries" ? "invoice_path" : "receipt_path"] = await uploadPhoto(r);
  }
  // Phase 2: records (idempotent on organization_id + client_generated_id)
  const up = await supabase.from(table).upsert(row as never, { onConflict: "organization_id,client_generated_id", ignoreDuplicates: true });
  if (up.error) throw fail(up.error, up.status);
  if (photos.length) {
    let parentId: string | null = null;
    if (table === "field_logs") {
      const parent = await supabase.from("field_logs").select("id").eq("organization_id", item.organization_id).eq("client_generated_id", item.id).maybeSingle();
      if (parent.error) throw fail(parent.error, parent.status);
      parentId = parent.data?.id ?? null;
    }
    const ev = await supabase.from("evidence_photos").upsert(photos.map((p) => ({
      organization_id: item.organization_id, incident_id: item.incident_id, field_log_id: parentId, client_generated_id: p.id,
      storage_path: p.storage_path!, caption: p.caption, phase: p.phase, gps_lat: p.gps_lat, gps_lng: p.gps_lng,
      taken_at: p.captured_at, original_timestamp: p.captured_at,
      author_name: (item.payload["author_name"] as string | null) ?? null, created_by: (item.payload["created_by"] as string | null) ?? null,
    })), { onConflict: "organization_id,client_generated_id", ignoreDuplicates: true });
    if (ev.error) throw fail(ev.error, ev.status);
  }
  // Phase 3: confirm + free the binaries
  await putQueueItem({ ...item, status: "synced", last_error: null, next_attempt_at: null, synced_at: new Date().toISOString() });
  for (const id of [...item.photo_ids, ...(item.receipt_photo_id ? [item.receipt_photo_id] : [])]) await deletePhoto(id);
}

let running = false;
/** manual: user pressed Sync Now / Retry — ignores backoff timers and the retry limit. */
export async function syncAll(opts: { manual?: boolean; only?: string } = {}): Promise<{ synced: number; failed: number }> {
  if (running || !isEffectivelyOnline()) return { synced: 0, failed: 0 };
  if (state.authPaused) {
    if (!opts.manual) return { synced: 0, failed: 0 };
    emit({ authPaused: false });
  }
  running = true;
  const now = Date.now();
  const all = await listQueueItems();
  const todo = all.filter((i) => {
    if (opts.only) return i.id === opts.only && i.status !== "synced";
    if (i.status === "pending" || i.status === "syncing") return true;
    if (i.status !== "failed") return false;
    if (opts.manual) return true;
    return !!i.next_attempt_at && Date.parse(i.next_attempt_at) <= now && i.retry_count <= MAX_AUTO_RETRIES;
  });
  let synced = 0, failed = 0;
  emit({ running: true, progress: todo.length ? { done: 0, total: todo.length } : null });
  try {
    for (const [n, item] of todo.entries()) {
      if (!isEffectivelyOnline()) break;
      emit({ progress: { done: n, total: todo.length } });
      await putQueueItem({ ...item, status: "syncing" });
      try {
        await syncOne(item); synced++;
      } catch (e) {
        const f = e instanceof SyncFailure ? e : new SyncFailure(classifyFailure(undefined, String(e)), String(e));
        if (f.kind === "auth") {
          await putQueueItem({ ...item, status: "pending", last_error: "Session expired — sign in again to sync" });
          emit({ authPaused: true });
          break; // keep everything, stop draining
        }
        const retry = item.retry_count + 1;
        const delay = f.kind === "transient" ? backoffDelay(retry) : null;
        await putQueueItem({ ...item, status: "failed", retry_count: retry, last_error: f.message, next_attempt_at: delay ? new Date(Date.now() + delay).toISOString() : null });
        failed++;
      }
      await refreshItems();
    }
  } finally {
    running = false;
    emit({ running: false, progress: null, lastResult: { synced, failed } });
    await refreshItems();
    scheduleRetry();
  }
  return { synced, failed };
}

export async function enqueueEntry(item: Omit<SyncQueueItem, "status" | "retry_count" | "last_error" | "next_attempt_at" | "synced_at">, photos: OfflinePhoto[]) {
  await saveQueueItem({ ...item, status: "pending", retry_count: 0, last_error: null, next_attempt_at: null, synced_at: null }, photos);
  await refreshItems();
  if (isEffectivelyOnline()) void syncAll();
}

export function setSimulatedOffline(on: boolean) {
  localStorage.setItem(SIM_KEY, on ? "1" : "0");
  emit({ simulatedOffline: on });
  if (!on) void syncAll();
}

/** Every unsynced entry with photo metadata (images as base64 data URLs) for a last-resort device backup. */
export async function exportBackup(): Promise<Blob> {
  const items = (await listQueueItems()).filter((i) => i.status !== "synced");
  const toDataUrl = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(b); });
  const out = [];
  for (const i of items) {
    const ids = [...i.photo_ids, ...(i.receipt_photo_id ? [i.receipt_photo_id] : [])];
    const photos = [];
    for (const id of ids) {
      const p = await getPhoto(id);
      if (p) { const { blob, ...meta } = p; photos.push({ ...meta, image_data_url: blob ? await toDataUrl(blob) : null }); }
    }
    out.push({ ...i, photos });
  }
  return new Blob([JSON.stringify({ app: "Beacon", exported_at: new Date().toISOString(), entries: out }, null, 2)], { type: "application/json" });
}

let started = false;
export function startEngine() {
  if (started) return;
  started = true;
  emit({ online: navigator.onLine, simulatedOffline: localStorage.getItem(SIM_KEY) === "1" });
  window.addEventListener("online", () => { emit({ online: true }); void syncAll(); });
  window.addEventListener("offline", () => emit({ online: false }));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void syncAll(); });
  supabase.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_IN" || evt === "TOKEN_REFRESHED") { emit({ authPaused: false }); void syncAll(); } });
  void (async () => {
    await migrateLegacyQueue().catch((e) => console.error("legacy queue migration failed", e));
    for (const i of await listQueueItems()) {
      if (i.status === "synced" && i.synced_at && Date.now() - Date.parse(i.synced_at) > SYNCED_KEEP_MS) await deleteQueueItem(i.id);
      else if (i.status === "syncing") await putQueueItem({ ...i, status: "pending" }); // interrupted mid-sync
    }
    await refreshItems();
    void syncAll();
  })();
}
