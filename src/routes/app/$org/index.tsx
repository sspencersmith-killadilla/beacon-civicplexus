import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { canCommand } from "@/lib/org";
import { INCIDENT_TYPES, fmtLocal } from "@/lib/fema";
import { useIncidentData, useIncidents } from "@/lib/incident-data";
import { useOrgCtx } from "@/components/beacon/org-context";
import { KpiCards, STATUS_STYLES } from "@/components/beacon/kpis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/$org/")({
  validateSearch: (s: Record<string, unknown>): { incident?: string } => (typeof s["incident"] === "string" ? { incident: s["incident"] } : {}),
  component: Hub,
});

function Hub() {
  const { org, role } = useOrgCtx();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const incidents = useIncidents(org.id);
  const list = incidents.data ?? [];
  const active = list.filter((i) => i.status !== "closed");
  const archived = list.filter((i) => i.status === "closed");
  const selectedId = search.incident ?? active[0]?.id ?? list[0]?.id;
  const data = useIncidentData(selectedId);
  const selected = list.find((i) => i.id === selectedId);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Incident Command Hub</p>
          <h1 className="text-2xl font-semibold">{selected?.name ?? "No incidents yet"}</h1>
          {selected && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {selected.fema_declaration ? `${selected.fema_declaration} · ` : ""}{selected.operational_period ?? ""} · started {fmtLocal(selected.started_at)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selected && <Button asChild><Link to="/app/$org/incidents/$incidentId" params={{ org: org.slug, incidentId: selected.id }}>Open timeline, evidence & AAR</Link></Button>}
          {canCommand(role) && <NewIncident orgId={org.id} onCreated={(id) => navigate({ search: { incident: id } })} />}
        </div>
      </div>

      {data.data && <KpiCards data={data.data} />}

      <div className="grid gap-6 md:grid-cols-2">
        <IncidentList title="Active incidents" items={active} selectedId={selectedId} onPick={(id) => navigate({ search: { incident: id } })} />
        <IncidentList title="Archived incidents" items={archived} selectedId={selectedId} onPick={(id) => navigate({ search: { incident: id } })} />
      </div>
    </div>
  );
}

type Inc = NonNullable<ReturnType<typeof useIncidents>["data"]>[number];
function IncidentList({ title, items, selectedId, onPick }: { title: string; items: Inc[]; selectedId: string | undefined; onPick: (id: string) => void }) {
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">{title}</h2>
      {items.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">None.</p>}
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <button onClick={() => onPick(i.id)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted ${i.id === selectedId ? "bg-muted" : ""}`}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{i.name}</span>
                <span className="block font-mono text-xs text-muted-foreground">{INCIDENT_TYPES.find((t) => t.v === i.incident_type)?.l} · {fmtLocal(i.started_at)}</span>
              </span>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[i.status]}`}>{i.status}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewIncident({ orgId, onCreated }: { orgId: string; onCreated: (id: string) => void }) {
  const { user } = useAuth(); const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", incident_type: "other", fema_declaration: "", operational_period: "", started_at: "" });
  useEffect(() => { if (open) setF((x) => ({ ...x, started_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) })); }, [open]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from("incidents").insert({
      organization_id: orgId, name: f.name, incident_type: f.incident_type as Inc["incident_type"],
      fema_declaration: f.fema_declaration || null, operational_period: f.operational_period || null,
      started_at: new Date(f.started_at).toISOString(), created_by: user!.id,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["incidents", orgId] });
    setOpen(false); onCreated(data.id); toast.success("Incident opened");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4" />Open incident</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Open a new incident</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid gap-3">
          <div className="grid gap-1.5"><Label>Incident name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Spring Flood Response" /></div>
          <div className="grid gap-1.5"><Label>Type</Label>
            <Select value={f.incident_type} onValueChange={(v) => setF({ ...f, incident_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>FEMA declaration #</Label><Input className="font-mono" value={f.fema_declaration} onChange={(e) => setF({ ...f, fema_declaration: e.target.value })} placeholder="DR-0000" /></div>
            <div className="grid gap-1.5"><Label>Operational period</Label><Input value={f.operational_period} onChange={(e) => setF({ ...f, operational_period: e.target.value })} placeholder="OP-1 (0600–1800)" /></div>
          </div>
          <div className="grid gap-1.5"><Label>Start</Label><Input type="datetime-local" required value={f.started_at} onChange={(e) => setF({ ...f, started_at: e.target.value })} /></div>
          <Button type="submit">Open incident</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
