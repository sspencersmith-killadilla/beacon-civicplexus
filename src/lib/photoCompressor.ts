// Browser-only photo pipeline: metadata first (canvas strips EXIF), then resize + JPEG encode.
export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.78;

export type PhotoMeta = { captured_at: string; gps_lat: number | null; gps_lng: number | null };
export type CompressedPhoto = PhotoMeta & { blob: Blob; original_size_bytes: number; compressed_size_bytes: number };

/** Proportional scale so the longest edge is at most `max` px (never upscales). */
export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Timestamp now, plus a quick GPS fix (falls back to a known fix if the device can't answer in 4 s). */
export async function captureMeta(fallback?: { lat: number; lng: number } | null): Promise<PhotoMeta> {
  const captured_at = new Date().toISOString();
  const pos = await new Promise<GeolocationPosition | null>((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 4000, maximumAge: 60000 });
  });
  return { captured_at, gps_lat: pos?.coords.latitude ?? fallback?.lat ?? null, gps_lng: pos?.coords.longitude ?? fallback?.lng ?? null };
}

export async function compressBlob(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const { width, height } = fitWithin(bmp.width, bmp.height);
  let blob: Blob | null = null;
  if (typeof OffscreenCanvas !== "undefined") {
    const c = new OffscreenCanvas(width, height);
    c.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
    blob = await c.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY }).catch(() => null);
  }
  if (!blob) {
    const c = document.createElement("canvas");
    c.width = width; c.height = height;
    c.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
    blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", JPEG_QUALITY));
  }
  bmp.close();
  return blob ?? file;
}

/** Metadata is captured before compression starts so it survives even if encoding is slow. */
export async function processPhoto(file: File, fallbackGps?: { lat: number; lng: number } | null): Promise<CompressedPhoto> {
  const meta = await captureMeta(fallbackGps);
  const blob = await compressBlob(file);
  return { ...meta, blob, original_size_bytes: file.size, compressed_size_bytes: blob.size };
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return e.quota ? { usage: e.usage ?? 0, quota: e.quota } : null;
}

export const fmtBytes = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
