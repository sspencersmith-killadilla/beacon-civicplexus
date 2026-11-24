import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, MapPin, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { canAudit } from "@/lib/org";
import { FEMA_CATEGORIES, LOG_CATEGORIES, fmtLocal, fmtUTC } from "@/lib/fema";
import { fmtUSD } from "@/lib/costs";
import type { IncidentData } from "@/lib/incident-data";
import { useOrgCtx } from "./org-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Table = "field_logs" | "labor_entries" | "equipment_entries" | "material_entries";
type Item = {
  id: string; table: Table; type: string; time: string; original: string; tsEdited: boolean; dept: string | null; fema: string | null;
  author: string | null; createdBy: string | null; title: string; detail: string; cost?: number; verified?: boolean;
  editedBy: string | null; editedAt: string | null; gps?: [number, number] | null; raw: Record<string, unknown>;
};

export function buildFeed(d: IncidentData): Item[] {
  const base = (r: { id: string; entry_time: string; original_timestamp: string; timestamp_edited: boolean; department: string | null; author_name: string | null; created_by: string | null; edited_by: string | null; edited_at: string | null }) => ({
    id: r.id, time: r.entry_time, original: r.original_timestamp, tsEdited: r.timestamp_edited, dept: r.department, author: r.author_name, createdBy: r.created_by, editedBy: r.edited_by, editedAt: r.edited_at,
  });
  return [
    ...d.logs.map((r) => ({ ...base(r), table: "field_logs" as const, type: "ICS-214 Note", fema: r.fema_category, title: r.category, detail: r.notes + (r.location_address ? ` — ${r.location_address}` : ""), gps: r.gps_lat != null && r.gps_lng != null ? [r.gps_lat, r.gps_lng] as [number, number] : null, raw: r })),
    ...d.labor.map((r) => ({ ...base(r), table: "labor_entries" as const, type: "Labor", fema: r.fema_category, title: `${r.staff_name}${r.role_title ? `, ${r.role_title}` : ""}`, detail: `${r.regular_hours} reg + ${r.overtime_hours} OT @ $${r.hourly_rate}/hr · fringe ${r.fringe_pct}% — ${r.task_description ?? ""}`, cost: Number(r.total_cost), verified: r.rate_verified, raw: r })),
    ...d.equipment.map((r) => ({ ...base(r), table: "equipment_entries" as const, type: "Equipment", fema: r.fema_category, title: r.equipment_name + (r.fema_code ? ` (${r.fema_code})` : ""), detail: `${r.active_hours} active / ${r.standby_hours} standby hrs @ $${r.hourly_rate}/hr · ${r.operator_name ?? ""} · ${r.work_location ?? ""}`, cost: Number(r.total_cost), verified: r.rate_verified, raw: r })),
    ...d.materials.map((r) => ({ ...base(r), table: "material_entries" as const, type: "Materials", fema: r.fema_category, title: r.item_description, detail: `${r.quantity} × $${r.unit_cost} · ${r.vendor ?? ""}`, cost: Number(r.total_cost), verified: r.rate_verified, raw: r })),
  ].sort((a, b) => a.time.localeCompare(b.time));
}

const ALL = "__all";
function F({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <div className="grid gap-1"><Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value={ALL}>All</SelectItem>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export function Timeline({ data }: { data: IncidentData }) {
  const { org, role } = useOrgCtx();
  const { user } = useAuth();
  const qc = useQueryClient();
  const feed = useMemo(() => buildFeed(data), [data]);
  const [flt, setFlt] = useState({ dept: ALL, type: ALL, fema: ALL, author: ALL, from: "", to: "" });
  const [editing, setEditing] = useState<Item | null>(null);
  const [history, setHistory] = useState<Item | null>(null);
  const members = useQuery({
    queryKey: ["members", org.id], enabled: !!role,
    queryFn: async () => (await supabase.from("organization_members").select("user_id, full_name, email").eq("organization_id", org.id)).data ?? [],
  });
  const who = (id: string | null) => { const m = members.data?.find((x) => x.user_id === id); return m?.full_name || m?.email || "a team member"; };
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
  const shown = feed.filter((i) =>
    (flt.dept === ALL || i.dept === flt.dept) && (flt.type === ALL || i.type === flt.type) && (flt.fema === ALL || i.fema === flt.fema) &&
    (flt.author === ALL || i.author === flt.author) && (!flt.from || i.time >= new Date(flt.from).toISOString()) && (!flt.to || i.time <= new Date(flt.to + "T23:59:59").toISOString()));
  const auditor = canAudit(role);
  const patch = async (i: Item, values: Record<string, unknown>) => {
    const { error } = await supabase.from(i.table).update(values as never).eq("id", i.id);
    if (error) toast.error(error.message); else { await qc.invalidateQueries({ queryKey: ["incident-data", data.incident.id] }); toast.success("Saved — change recorded in audit trail"); }
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-6">
        <F label="Department" value={flt.dept} onChange={(v) => setFlt({ ...flt, dept: v })} opts={uniq(feed.map((i) => i.dept))} />
        <F label="Entry type" value={flt.type} onChange={(v) => setFlt({ ...flt, type: v })} opts={["ICS-214 Note", "Labor", "Equipment", "Materials"]} />
        <F label="FEMA category" value={flt.fema} onChange={(v) => setFlt({ ...flt, fema: v })} opts={FEMA_CATEGORIES.map((c) => c.code)} />
        <F label="Author" value={flt.author} onChange={(v) => setFlt({ ...flt, author: v })} opts={uniq(feed.map((i) => i.author))} />
        <div className="grid gap-1"><Label className="text-xs">From</Label><Input type="date" className="h-9" value={flt.from} onChange={(e) => setFlt({ ...flt, from: e.target.value })} /></div>
        <div className="grid gap-1"><Label className="text-xs">To</Label><Input type="date" className="h-9" value={flt.to} onChange={(e) => setFlt({ ...flt, to: e.target.value })} /></div>
      </div>
      <p className="text-xs text-muted-foreground">{shown.length} of {feed.length} entries</p>
      <ol className="relative grid gap-3 border-l pl-5">
        {shown.map((i) => {
          const mine = i.createdBy === user?.id;
          return (
            <li key={i.table + i.id} className="relative rounded-lg border bg-card p-4">
              <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-card bg-amber" />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground">{i.type}</span>
                {i.fema && <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold">CAT {i.fema}</span>}
                {i.dept && <span className="text-muted-foreground">{i.dept}</span>}
                <span className="ml-auto font-mono text-muted-foreground">{fmtLocal(i.time)} · {fmtUTC(i.time)}</span>
              </div>
              <div className="mt-2 font-medium">{i.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{i.detail}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {i.author && <span>By {i.author}</span>}
                {i.gps && <span className="flex items-center gap-1 font-mono"><MapPin className="h-3 w-3" />{i.gps[0].toFixed(5)}, {i.gps[1].toFixed(5)}</span>}
                {i.cost != null && <span className="font-mono font-semibold">{fmtUSD(i.cost)}</span>}
                {i.verified && <span className="rounded bg-emerald px-1.5 py-0.5 font-semibold text-emerald-foreground">Rate verified</span>}
                {i.tsEdited && <span className="rounded bg-amber-soft px-1.5 py-0.5 font-semibold">Timestamp edited · originally logged {fmtUTC(i.original)}</span>}
                {i.editedAt && <button onClick={() => setHistory(i)} className="flex items-center gap-1 underline"><History className="h-3 w-3" />Edited by {who(i.editedBy)} {fmtLocal(i.editedAt)}</button>}
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {auditor && (
                    <Select value={i.fema ?? ""} onValueChange={(v) => void patch(i, { fema_category: v })}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Tag CAT" /></SelectTrigger>
                      <SelectContent>{FEMA_CATEGORIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {auditor && i.cost != null && !i.verified && <Button size="sm" variant="outline" onClick={() => void patch(i, { rate_verified: true })}>Verify rate</Button>}
                  {(mine || auditor) && i.table === "field_logs" && <Button size="sm" variant="ghost" onClick={() => setEditing(i)}><Pencil className="h-3 w-3" />Edit</Button>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {editing && <EditNote item={editing} onClose={() => setEditing(null)} onSave={async (v) => { await patch(editing, v); setEditing(null); }} />}
      {history && <HistoryDialog item={history} who={who} onClose={() => setHistory(null)} />}
    </div>
  );
}

function EditNote({ item, onClose, onSave }: { item: Item; onClose: () => void; onSave: (v: Record<string, unknown>) => Promise<void> }) {
  const r = item.raw as { notes: string; category: string; entry_time: string };
  const toLocal = (iso: string) => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [f, setF] = useState({ notes: r.notes, category: r.category, time: toLocal(r.entry_time) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit field note</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">The original record and timestamp are preserved in the audit trail.</p>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Timestamp</Label><Input type="datetime-local" className="font-mono" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-1.5"><Label>Notes</Label><Textarea rows={5} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <Button onClick={() => void onSave({ notes: f.notes, category: f.category, entry_time: new Date(f.time).toISOString() })}>Save edit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ item, who, onClose }: { item: Item; who: (id: string | null) => string; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["edits", item.id],
    queryFn: async () => (await supabase.from("record_edits").select("*").eq("record_id", item.id).order("edited_at", { ascending: false })).data ?? [],
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Audit trail</DialogTitle></DialogHeader>
        <p className="font-mono text-xs">Original timestamp: {fmtUTC(item.original)}</p>
        <div className="grid max-h-96 gap-2 overflow-auto">
          {(q.data ?? []).map((e) => (
            <div key={e.id} className="rounded border p-3 text-xs">
              <div className="font-semibold">Edited by {who(e.edited_by)} · <span className="font-mono">{fmtUTC(e.edited_at)}</span></div>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-muted-foreground">Previous: {JSON.stringify(e.previous, ["notes", "category", "entry_time", "fema_category", "rate_verified"], 1)}</pre>
            </div>
          ))}
          {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No prior versions visible to you.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
