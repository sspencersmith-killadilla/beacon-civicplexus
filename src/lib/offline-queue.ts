// Browser-only: imported by client components; idb-keyval touches indexedDB lazily.
import { createStore, del, entries, set } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";

export type QueuedPhoto = { cid: string; blob: Blob; caption: string; phase: "before" | "during" | "after"; lat: number | null; lng: number | null; taken_at: string };
export type QueueItem = {
  cid: string;
  table: "field_logs" | "labor_entries" | "equipment_entries" | "material_entries";
  row: Record<string, unknown>;
  photos?: QueuedPhoto[];
  receipt?: Blob;
  queuedAt: string;
};

let store: ReturnType<typeof createStore> | null = null;
const db = () => (store ??= createStore("beacon-offline", "queue"));

export async function enqueue(item: QueueItem) { await set(item.cid, item, db()); notify(); }
export async function listQueue(): Promise<QueueItem[]> {
  return (await entries<string, QueueItem>(db())).map(([, v]) => v);
}

const listeners = new Set<() => void>();
export const onQueueChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const notify = () => listeners.forEach((f) => f());

/** Compress an image to max 1600px JPEG. */
export async function compressImage(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.78));
}

async function upload(orgId: string, incidentId: string, cid: string, blob: Blob) {
  const path = `${orgId}/${incidentId}/${cid}.jpg`;
  const { error } = await supabase.storage.from("incident-evidence").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

async function syncItem(item: QueueItem) {
  const row = { ...item.row };
  const org = row["organization_id"] as string, inc = row["incident_id"] as string;
  if (item.receipt) row["receipt_path"] = await upload(org, inc, `${item.cid}-receipt`, item.receipt);
  const { error } = await supabase.from(item.table).upsert(row as never, { onConflict: "organization_id,client_generated_id", ignoreDuplicates: true });
  if (error) throw error;
  if (item.photos?.length) {
    const { data: parent } = await supabase.from(item.table).select("id").eq("organization_id", org).eq("client_generated_id", item.cid).maybeSingle();
    for (const p of item.photos) {
      const path = await upload(org, inc, p.cid, p.blob);
      const { error: pe } = await supabase.from("evidence_photos").upsert({
        organization_id: org, incident_id: inc, field_log_id: item.table === "field_logs" ? parent?.id ?? null : null,
        client_generated_id: p.cid, storage_path: path, caption: p.caption, phase: p.phase, gps_lat: p.lat, gps_lng: p.lng,
        taken_at: p.taken_at, original_timestamp: p.taken_at, author_name: row["author_name"] as string, created_by: row["created_by"] as string,
      }, { onConflict: "organization_id,client_generated_id", ignoreDuplicates: true });
      if (pe) throw pe;
    }
  }
}

let running = false;
export async function syncAll(): Promise<{ synced: number; failed: number }> {
  if (running || !navigator.onLine) return { synced: 0, failed: 0 };
  running = true;
  let synced = 0, failed = 0;
  try {
    for (const item of await listQueue()) {
      try { await syncItem(item); await del(item.cid, db()); synced++; } catch (e) { console.error("sync failed", e); failed++; }
    }
  } finally { running = false; notify(); }
  return { synced, failed };
}
