import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtLocal, fmtUTC } from "@/lib/fema";
import type { IncidentData } from "@/lib/incident-data";

export function useSignedUrls(paths: string[]) {
  return useQuery({
    queryKey: ["signed", paths], enabled: paths.length > 0,
    queryFn: async () => {
      const { data } = await supabase.storage.from("incident-evidence").createSignedUrls(paths, 3600);
      return Object.fromEntries((data ?? []).map((d) => [d.path ?? "", d.signedUrl ?? ""])) as Record<string, string>;
    },
  });
}

export function EvidenceGallery({ data, compact = false }: { data: IncidentData; compact?: boolean }) {
  const [phase, setPhase] = useState<"all" | "before" | "during" | "after" | "compare">(compact ? "all" : "compare");
  const urls = useSignedUrls(data.photos.map((p) => p.storage_path));
  if (data.photos.length === 0) return <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No photo evidence yet. Photos attached to field notes appear here with GPS and timestamp metadata.</p>;
  const Tile = ({ p }: { p: IncidentData["photos"][number] }) => (
    <figure className="print-avoid-break overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        {urls.data?.[p.storage_path] && <img src={urls.data[p.storage_path]} alt={p.caption || "Evidence photo"} className="h-full w-full object-cover" />}
        <div className="absolute inset-x-0 bottom-0 bg-primary/80 px-2 py-1 font-mono text-[10px] text-primary-foreground">
          {fmtUTC(p.taken_at)}{p.gps_lat != null && p.gps_lng != null ? ` · ${p.gps_lat.toFixed(5)}, ${p.gps_lng.toFixed(5)}` : ""}
        </div>
        <span className="absolute left-2 top-2 rounded bg-amber px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-foreground">{p.phase}</span>
      </div>
      <figcaption className="p-2 text-xs"><div className="font-medium">{p.caption || "Untitled"}</div><div className="text-muted-foreground">{p.author_name} · {fmtLocal(p.taken_at)}</div></figcaption>
    </figure>
  );
  const byPhase = (ph: string) => data.photos.filter((p) => p.phase === ph);
  return (
    <div className="grid gap-4">
      {!compact && (
        <div className="no-print flex flex-wrap gap-1">
          {(["compare", "all", "before", "during", "after"] as const).map((p) => (
            <button key={p} onClick={() => setPhase(p)} className={`rounded-md px-3 py-1.5 text-sm capitalize ${phase === p ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{p === "compare" ? "Before / During / After" : p}</button>
          ))}
        </div>
      )}
      {phase === "compare" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {(["before", "during", "after"] as const).map((ph) => (
            <div key={ph} className="grid content-start gap-3">
              <h3 className="text-sm font-semibold capitalize">{ph} <span className="text-muted-foreground">({byPhase(ph).length})</span></h3>
              {byPhase(ph).map((p) => <Tile key={p.id} p={p} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(phase === "all" ? data.photos : byPhase(phase)).map((p) => <Tile key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
