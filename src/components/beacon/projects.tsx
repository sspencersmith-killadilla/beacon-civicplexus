import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canCommand } from "@/lib/org";
import { FEMA_CATEGORIES } from "@/lib/fema";
import { fmtUSD } from "@/lib/costs";
import { summarize, type IncidentData } from "@/lib/incident-data";
import { useOrgCtx } from "./org-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Project sites (FEMA worksheets / damage sites) under one incident, with a cost rollup per site. */
export function ProjectsPanel({ data }: { data: IncidentData }) {
  const { org, role } = useOrgCtx();
  const qc = useQueryClient();
  const s = summarize(data);
  const blank = { name: "", project_number: "", fema_category: "B", facility: "", lat: "", lng: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ predicate: (q) => ["incident-data", "reference"].includes(String(q.queryKey[0])) });
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("incident_projects").insert({
      organization_id: org.id, incident_id: data.incident.id, name: f.name, project_number: f.project_number || null,
      fema_category: f.fema_category as never, facility: f.facility || null, gps_lat: f.lat ? Number(f.lat) : null, gps_lng: f.lng ? Number(f.lng) : null,
    });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Project site added"); setF(blank); await refresh(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Remove this project site? Its entries stay, but become unassigned.")) return;
    const { error } = await supabase.from("incident_projects").delete().eq("id", id);
    if (error) toast.error(error.message); else await refresh();
  };
  const here = () => navigator.geolocation?.getCurrentPosition((p) => setF((x) => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })));
  const rows: [string, { name: string; number: string | null; total: number; entries: number }][] = [
    ...data.projects.map((p) => [p.id, s.byProject[p.id] ?? { name: p.name, number: p.project_number, total: 0, entries: 0 }] as [string, { name: string; number: string | null; total: number; entries: number }]),
    ...(s.byProject["none"] ? [["none", s.byProject["none"]] as [string, { name: string; number: string | null; total: number; entries: number }]] : []),
  ];
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Group work into the project worksheets FEMA will write (e.g. "Citywide debris removal", "Main St culvert"). Crews pick the project in the Field Logger so costs roll up by site.</p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-3">Project</th><th className="p-3">Category</th><th className="p-3">Facility</th><th className="p-3 text-right">Entries</th><th className="p-3 text-right">Est. cost</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.map(([id, r]) => {
              const p = data.projects.find((x) => x.id === id);
              return (
                <tr key={id} className="border-t">
                  <td className="p-3"><span className="font-mono text-xs text-muted-foreground">{r.number ?? ""}</span> <span className="font-medium">{r.name}</span></td>
                  <td className="p-3 font-mono">{p?.fema_category ?? "—"}</td>
                  <td className="p-3">{p?.facility ?? ""}{p?.gps_lat != null && <MapPin className="ml-1 inline h-3 w-3 text-muted-foreground" />}</td>
                  <td className="p-3 text-right font-mono">{r.entries}</td>
                  <td className="p-3 text-right font-mono">{fmtUSD(r.total)}</td>
                  <td className="p-3 text-right">{p && canCommand(role) && <Button size="icon" variant="ghost" aria-label={`Remove ${p.name}`} onClick={() => void remove(p.id)}><Trash2 className="h-4 w-4" /></Button>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {canCommand(role) && (
        <form onSubmit={add} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-6">
          <div className="text-sm font-semibold md:col-span-6">Add a project site</div>
          <Input required className="md:col-span-2" placeholder="Name, e.g. Main St culvert" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input className="font-mono" placeholder="Project # (PW-4)" value={f.project_number} onChange={(e) => setF({ ...f, project_number: e.target.value })} />
          <select aria-label="FEMA category" className="h-10 rounded-md border bg-background px-2 text-sm" value={f.fema_category} onChange={(e) => setF({ ...f, fema_category: e.target.value })}>
            {FEMA_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <Input className="md:col-span-2" placeholder="Facility / address" value={f.facility} onChange={(e) => setF({ ...f, facility: e.target.value })} />
          <Input className="font-mono" placeholder="Latitude" inputMode="decimal" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
          <Input className="font-mono" placeholder="Longitude" inputMode="decimal" value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
          <Button type="button" variant="outline" onClick={here}><MapPin className="h-4 w-4" />Use my location</Button>
          <Button type="submit" disabled={busy} className="md:col-span-3">Add project</Button>
        </form>
      )}
    </div>
  );
}
