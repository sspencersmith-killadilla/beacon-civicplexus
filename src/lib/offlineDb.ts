// Browser-only IndexedDB layer for offline field logging. Never imported at module scope by SSR routes' render paths
// (the /app tree is ssr:false); the DB opens lazily on first use.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type EntityType = "field_log" | "labor_entry" | "equipment_entry" | "material_entry";
export type QueueStatus = "pending" | "syncing" | "failed" | "synced";

export const ENTITY_TABLE = {
  field_log: "field_logs",
  labor_entry: "labor_entries",
  equipment_entry: "equipment_entries",
  material_entry: "material_entries",
} as const satisfies Record<EntityType, string>;
export type EntityTable = (typeof ENTITY_TABLE)[EntityType];

export const ENTITY_LABEL: Record<EntityType, string> = {
  field_log: "ICS-214 Note", labor_entry: "Labor", equipment_entry: "Equipment", material_entry: "Materials",
};

export type SyncQueueItem = {
  id: string; // client_generated_id
  organization_id: string;
  incident_id: string;
  entity_type: EntityType;
  payload: Record<string, unknown>;
  photo_ids: string[];
  /** Receipt image for material entries; uploaded to storage and written to receipt_path, not evidence_photos. */
  receipt_photo_id: string | null;
  status: QueueStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  next_attempt_at: string | null;
  synced_at: string | null;
};

export type OfflinePhoto = {
  id: string;
  organization_id: string;
  incident_id: string;
  blob: Blob | null; // null once uploaded and cleaned up
  mime_type: "image/jpeg";
  original_size_bytes: number;
  compressed_size_bytes: number;
  captured_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  caption: string | null;
  phase: "before" | "during" | "after";
  storage_path: string | null;
};

export type ReferenceCache = {
  organization_id: string;
  fema_equipment_rates: unknown[];
  city_fleet_assets: unknown[];
  departments: unknown[];
  rate_cards: unknown[];
  incidents: unknown[];
  cached_at: string;
};

interface BeaconDB extends DBSchema {
  sync_queue: { key: string; value: SyncQueueItem; indexes: { by_created: string; by_status: QueueStatus } };
  offline_photos: { key: string; value: OfflinePhoto };
  reference_cache: { key: string; value: ReferenceCache };
}

let dbp: Promise<IDBPDatabase<BeaconDB>> | null = null;
export function offlineDb() {
  return (dbp ??= openDB<BeaconDB>("beacon-offline-v2", 1, {
    upgrade(db) {
      const q = db.createObjectStore("sync_queue", { keyPath: "id" });
      q.createIndex("by_created", "created_at");
      q.createIndex("by_status", "status");
      db.createObjectStore("offline_photos", { keyPath: "id" });
      db.createObjectStore("reference_cache", { keyPath: "organization_id" });
    },
  }));
}

/** Queue item + its photos written in one transaction so a crash can't leave an entry without its photos. */
export async function saveQueueItem(item: SyncQueueItem, photos: OfflinePhoto[]) {
  const db = await offlineDb();
  const tx = db.transaction(["sync_queue", "offline_photos"], "readwrite");
  await Promise.all([...photos.map((p) => tx.objectStore("offline_photos").put(p)), tx.objectStore("sync_queue").put(item), tx.done]);
}
export async function listQueueItems(): Promise<SyncQueueItem[]> {
  return (await offlineDb()).getAllFromIndex("sync_queue", "by_created");
}
export async function getQueueItem(id: string) { return (await offlineDb()).get("sync_queue", id); }
export async function putQueueItem(item: SyncQueueItem) { await (await offlineDb()).put("sync_queue", item); }
export async function deleteQueueItem(id: string) { await (await offlineDb()).delete("sync_queue", id); }
export async function getPhoto(id: string) { return (await offlineDb()).get("offline_photos", id); }
export async function putPhoto(p: OfflinePhoto) { await (await offlineDb()).put("offline_photos", p); }
export async function deletePhoto(id: string) { await (await offlineDb()).delete("offline_photos", id); }
export async function getReferenceCache(orgId: string) { return (await offlineDb()).get("reference_cache", orgId); }
export async function putReferenceCache(c: ReferenceCache) { await (await offlineDb()).put("reference_cache", c); }

/** One-time move of entries queued by the previous idb-keyval store ("beacon-offline"/"queue") into sync_queue. */
export async function migrateLegacyQueue() {
  const legacy = await openDB("beacon-offline").catch(() => null);
  if (!legacy) return;
  try {
    if (!legacy.objectStoreNames.contains("queue")) return;
    const old = (await legacy.getAll("queue")) as {
      cid: string; table: EntityTable; row: Record<string, unknown>; queuedAt: string; receipt?: Blob;
      photos?: { cid: string; blob: Blob; caption: string; phase: OfflinePhoto["phase"]; lat: number | null; lng: number | null; taken_at: string }[];
    }[];
    const typeOf = Object.fromEntries(Object.entries(ENTITY_TABLE).map(([k, v]) => [v, k])) as Record<EntityTable, EntityType>;
    for (const o of old) {
      const org = String(o.row["organization_id"]), inc = String(o.row["incident_id"]);
      const photos: OfflinePhoto[] = (o.photos ?? []).map((p) => ({
        id: p.cid, organization_id: org, incident_id: inc, blob: p.blob, mime_type: "image/jpeg", original_size_bytes: p.blob.size,
        compressed_size_bytes: p.blob.size, captured_at: p.taken_at, gps_lat: p.lat, gps_lng: p.lng, caption: p.caption || null, phase: p.phase, storage_path: null,
      }));
      let receipt: string | null = null;
      if (o.receipt) {
        receipt = `${o.cid}-receipt`;
        photos.push({ id: receipt, organization_id: org, incident_id: inc, blob: o.receipt, mime_type: "image/jpeg", original_size_bytes: o.receipt.size, compressed_size_bytes: o.receipt.size, captured_at: o.queuedAt, gps_lat: null, gps_lng: null, caption: "Receipt", phase: "during", storage_path: null });
      }
      await saveQueueItem({
        id: o.cid, organization_id: org, incident_id: inc, entity_type: typeOf[o.table], payload: o.row,
        photo_ids: (o.photos ?? []).map((p) => p.cid), receipt_photo_id: receipt, status: "pending", retry_count: 0, last_error: null,
        created_at: o.queuedAt, next_attempt_at: null, synced_at: null,
      }, photos);
      await legacy.delete("queue", o.cid);
    }
  } finally { legacy.close(); }
}
