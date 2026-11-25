import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { IncidentData } from "@/lib/incident-data";
import { fmtLocal } from "@/lib/fema";

type Pin = { lat: number; lng: number; kind: "note" | "hazard" | "photo" | "project"; label: string; sub: string };
const COLORS: Record<Pin["kind"], string> = { note: "#0F172A", hazard: "#D97706", photo: "#059669", project: "#2563EB" };
const LABELS: Record<Pin["kind"], string> = { note: "Field note", hazard: "Hazard / closure", photo: "Photo", project: "Project site" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function pinsFor(d: IncidentData): Pin[] {
  const pins: Pin[] = [];
  for (const l of d.logs) if (l.gps_lat != null && l.gps_lng != null)
    pins.push({ lat: l.gps_lat, lng: l.gps_lng, kind: /hazard|closure/i.test(l.category) ? "hazard" : "note", label: l.category, sub: `${fmtLocal(l.entry_time)} · ${l.notes.slice(0, 120)}` });
  for (const p of d.photos) if (p.gps_lat != null && p.gps_lng != null)
    pins.push({ lat: p.gps_lat, lng: p.gps_lng, kind: "photo", label: p.caption ?? "Photo", sub: `${p.phase} · ${fmtLocal(p.taken_at)}` });
  for (const p of d.projects) if (p.gps_lat != null && p.gps_lng != null)
    pins.push({ lat: p.gps_lat, lng: p.gps_lng, kind: "project", label: `${p.project_number ?? ""} ${p.name}`.trim(), sub: p.facility ?? "" });
  return pins;
}

export default function IncidentMap({ data }: { data: IncidentData }) {
  const el = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<Set<Pin["kind"]>>(new Set());
  const pins = pinsFor(data).filter((p) => !hidden.has(p.kind));
  const key = pins.map((p) => `${p.kind}${p.lat}${p.lng}`).join("|");
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
      const group = L.featureGroup();
      for (const p of pins) {
        L.circleMarker([p.lat, p.lng], { radius: p.kind === "project" ? 10 : 7, color: "#fff", weight: 2, fillColor: COLORS[p.kind], fillOpacity: 0.95 })
          .bindPopup(`<strong>${esc(LABELS[p.kind])}: ${esc(p.label)}</strong><br/><span style="font-family:'JetBrains Mono',monospace;font-size:11px">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</span><br/>${esc(p.sub)}`)
          .addTo(group);
      }
      group.addTo(map);
      if (pins.length) map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 16 }); else map.setView([39.5, -98.35], 4);
    });
    return () => { cancelled = true; map?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const all = pinsFor(data);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LABELS) as Pin["kind"][]).map((k) => {
          const n = all.filter((p) => p.kind === k).length;
          return (
            <button key={k} type="button" aria-pressed={!hidden.has(k)} onClick={() => { const s = new Set(hidden); if (s.has(k)) s.delete(k); else s.add(k); setHidden(s); }}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${hidden.has(k) ? "opacity-50" : ""}`}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[k] }} />{LABELS[k]} <span className="font-mono text-xs">{n}</span>
            </button>
          );
        })}
      </div>
      <div ref={el} className="h-[520px] w-full overflow-hidden rounded-lg border" />
      {all.length === 0 && <p className="text-sm text-muted-foreground">No geotagged entries yet. Field notes and photos logged with GPS appear here.</p>}
    </div>
  );
}
