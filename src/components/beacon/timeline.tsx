import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, Lock, MapPin, Pencil } from "lucide-react";
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
  editedBy: string | null; editedAt: string | null; pending?: boolean; queued?: boolean; synced?: boolean; gps?: [number, number] | null; raw: Record<string, unknown>;
};

export function buildFeed(d: IncidentData): Item[] {
  const withSync = (i: Omit<Item, "queued" | "synced">): Item => {
    const cid = String(i.raw["client_generated_id"] ?? "");
    return { ...i, queued: d.queuedIds.has(cid), synced: d.syncedIds.has(cid) };
  };
  return buildRaw(d).map(withSync);
}
function buildRaw(d: IncidentData) {
  const base = (r: { id: string; entry_time: string; original_timestamp: string; timestamp_edited: boolean; department: string | null; author_name: string | null; created_by: string | null; edited_by: string | null; edited_at: string | null }) => ({
    id: r.id, time: r.entry_time, original: r.original_timestamp, tsEdited: r.timestamp_edited, dept: r.department, author: r.author_name, createdBy: r.created_by, editedBy: r.edited_by, editedAt: r.edited_at,
  });
  return [
    ...d.logs.map((r) => ({ ...base(r), table: "field_logs" as const, type: "ICS-214 Note", fema: r.fema_category, title: r.category, detail: r.notes + (r.location_address ? ` — ${r.location_address}` : ""), gps: r.gps_lat != null && r.gps_lng != null ? [r.gps_lat, r.gps_lng] as [number, number] : null, raw: r })),
    ...d.labor.map((r) => ({ ...base(r), table: "labor_entries" as const, type: "Labor", fema: r.fema_category, title: `${r.staff_name}${r.role_title ? `, ${r.role_title}` : ""}`, detail: `${r.regular_hours} reg + ${r.overtime_hours} OT @ $${r.hourly_rate}/hr · fringe ${r.fringe_pct}% — ${r.task_description ?? ""}`, cost: Number(r.total_cost), verified: r.rate_verified, raw: r })),
    ...d.equipment.map((r) => ({ ...base(r), table: "equipment_entries" as const, type: "Equipment", fema: r.fema_category, title: r.equipment_name + ((r.fema_cost_code ?? r.fema_code) ? ` (${r.fema_cost_code ?? r.fema_code}${r.schedule_edition ? ` · ed. ${r.schedule_edition}` : ""})` : ""), pending: r.rate_source === "unlisted_pending_fema", detail: `${r.active_hours} active hrs (reimbursable) / ${r.standby_hours} standby hrs (non-reimbursable) @ $${r.hourly_rate}/hr · ${r.operator_name ?? ""} · ${r.work_location ?? ""}`, cost: Number(r.total_cost), verified: r.rate_verified, raw: r })),
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
  const patch = async (i: Item, values: Record<string, unknown>, msg = "Saved — change recorded in audit trail") => {
    const { error } = await supabase.from(i.table).update(values as never).eq("id", i.id);
    if (error) toast.error(error.message); else { await qc.invalidateQueries({ queryKey: ["incident-data", data.incident.id] }); toast.success(msg); }
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
          const mine = i.createdBy === user?.id || (org.is_demo && !user);
          const review = String(i.raw["review_status"] ?? "pending");
          const reviewNote = i.raw["review_note"] as string | null;
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
                {!i.queued && review === "approved" && <span className="flex items-center gap-1 rounded bg-emerald px-1.5 py-0.5 font-semibold text-emerald-foreground"><Lock className="h-3 w-3" />Approved</span>}
                {!i.queued && review === "rejected" && <span className="rounded bg-destructive px-1.5 py-0.5 font-semibold text-destructive-foreground" title={reviewNote ?? ""}>Rejected{reviewNote ? `: ${reviewNote}` : ""}</span>}
                {!i.queued && review === "pending" && <span className="rounded border px-1.5 py-0.5 text-muted-foreground">Awaiting review</span>}
                {i.queued && <span className="rounded bg-amber-soft px-1.5 py-0.5 font-semibold text-amber">Queued Offline</span>}
                {i.synced && <span className="rounded bg-emerald px-1.5 py-0.5 font-semibold text-emerald-foreground">Synced</span>}
                {i.pending && <span className="rounded bg-amber px-1.5 py-0.5 font-semibold text-amber-foreground">Pending FEMA Rate Request</span>}
                {i.verified && <span className="rounded bg-emerald px-1.5 py-0.5 font-semibold text-emerald-foreground">Rate verified</span>}
                {i.tsEdited && <span className="rounded bg-amber-soft px-1.5 py-0.5 font-semibold">Timestamp edited · originally logged {fmtUTC(i.original)}</span>}
                {i.editedAt && <button onClick={() => setHistory(i)} className="flex items-center gap-1 underline"><History className="h-3 w-3" />Edited by {who(i.editedBy)} {fmtLocal(i.editedAt)}</button>}
                {!i.queued && <span className="ml-auto flex flex-wrap items-center gap-2">
                  {auditor && (
                    <Select value={i.fema ?? ""} onValueChange={(v) => void patch(i, { fema_category: v })}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Tag CAT" /></SelectTrigger>
                      <SelectContent>{FEMA_CATEGORIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {auditor && i.cost != null && !i.verified && <Button size="sm" variant="outline" onClick={() => void patch(i, { rate_verified: true })}>Verify rate</Button>}
                  {auditor && review !== "approved" && <Button size="sm" variant="outline" onClick={() => void patch(i, { review_status: "approved", review_note: null }, "Approved — entry locked")}>Approve</Button>}
                  {auditor && review === "pending" && <Button size="sm" variant="ghost" onClick={() => { const note = window.prompt("Why is this entry rejected? (the author will see this)"); if (note) void patch(i, { review_status: "rejected", review_note: note }, "Entry rejected"); }}>Reject</Button>}
                  {auditor && review !== "pending" && <Button size="sm" variant="ghost" onClick={() => void patch(i, { review_status: "pending", review_note: null }, "Entry reopened for edits")}>Reopen</Button>}
                  {(mine || auditor) && review !== "approved" && <Button size="sm" variant="ghost" onClick={() => setEditing(i)}><Pencil className="h-3 w-3" />Edit</Button>}
                </span>}
              </div>
            </li>
          );
        })}
      </ol>
      {editing && <EditEntry item={editing} onClose={() => setEditing(null)} onSave={async (v) => { await patch(editing, v); setEditing(null); }} />}
      {history && <HistoryDialog item={history} who={who} onClose={() => setHistory(null)} />}
    </div>
  );
}

type FieldDef = { k: string; l: string; kind?: "num" | "text" | "area" | "category" };
const EDIT_FIELDS: Record<Table, FieldDef[]> = {
  field_logs: [{ k: "category", l: "Category", kind: "category" }, { k: "location_address", l: "Location" }, { k: "notes", l: "Notes", kind: "area" }],
  labor_entries: [{ k: "staff_name", l: "Staff member" }, { k: "role_title", l: "Role / title" }, { k: "regular_hours", l: "Regular hrs", kind: "num" }, { k: "overtime_hours", l: "OT hrs", kind: "num" }, { k: "hourly_rate", l: "Hourly rate $", kind: "num" }, { k: "fringe_pct", l: "Fringe %", kind: "num" }, { k: "task_description", l: "Task description" }],
  equipment_entries: [{ k: "equipment_name", l: "Equipment" }, { k: "operator_name", l: "Operator" }, { k: "active_hours", l: "Active hrs", kind: "num" }, { k: "standby_hours", l: "Standby hrs", kind: "num" }, { k: "hourly_rate", l: "Hourly rate $", kind: "num" }, { k: "work_location", l: "Work location" }],
  material_entries: [{ k: "vendor", l: "Vendor" }, { k: "item_description", l: "Item description" }, { k: "quantity", l: "Quantity", kind: "num" }, { k: "unit_cost", l: "Unit cost $", kind: "num" }],
};

function EditEntry({ item, onClose, onSave }: { item: Item; onClose: () => void; onSave: (v: Record<string, unknown>) => Promise<void> }) {
  const toLocal = (iso: string) => new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const fields = EDIT_FIELDS[item.table];
  const [f, setF] = useState<Record<string, string>>(() => ({ time: toLocal(String(item.raw["entry_time"])), ...Object.fromEntries(fields.map((d) => [d.k, item.raw[d.k] == null ? "" : String(item.raw[d.k])])) }));
  const save = () => {
    const v: Record<string, unknown> = { entry_time: new Date(f["time"] ?? "").toISOString() };
    for (const d of fields) { const x = f[d.k] ?? ""; v[d.k] = d.kind === "num" ? Number(x) || 0 : x === "" ? null : x; }
    if (item.table === "field_logs" && !v["notes"]) v["notes"] = "";
    void onSave(v);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {item.type.toLowerCase()} entry</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">The original record and timestamp are preserved in the audit trail.</p>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Timestamp</Label><Input type="datetime-local" className="font-mono" value={f["time"]} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          {fields.map((d) => (
            <div key={d.k} className="grid gap-1.5"><Label htmlFor={`edit-${d.k}`}>{d.l}</Label>
              {d.kind === "category" ? (
                <Select value={f[d.k] ?? ""} onValueChange={(v) => setF({ ...f, [d.k]: v })}><SelectTrigger id={`edit-${d.k}`}><SelectValue /></SelectTrigger><SelectContent>{LOG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              ) : d.kind === "area" ? (
                <Textarea id={`edit-${d.k}`} rows={5} value={f[d.k] ?? ""} onChange={(e) => setF({ ...f, [d.k]: e.target.value })} />
              ) : (
                <Input id={`edit-${d.k}`} inputMode={d.kind === "num" ? "decimal" : undefined} className={d.kind === "num" ? "font-mono" : ""} value={f[d.k] ?? ""} onChange={(e) => setF({ ...f, [d.k]: e.target.value })} />
              )}
            </div>
          ))}
          <Button onClick={save}>Save edit</Button>
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
              <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-muted-foreground">Previous: {JSON.stringify(e.previous, ["notes", "category", "entry_time", "fema_category", "rate_verified", "review_status", "review_note", "staff_name", "regular_hours", "overtime_hours", "hourly_rate", "fringe_pct", "equipment_name", "active_hours", "standby_hours", "quantity", "unit_cost", "vendor", "item_description"], 1)}</pre>
            </div>
          ))}
          {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No prior versions visible to you.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
