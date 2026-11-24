import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { canLog } from "@/lib/org";
import { FEMA_CATEGORIES, LOG_CATEGORIES } from "@/lib/fema";
import { equipmentCost, fmtUSD, laborCost, materialCost } from "@/lib/costs";
import { compressImage, enqueue, type QueuedPhoto } from "@/lib/offline-queue";
import { useIncidents } from "@/lib/incident-data";
import { useOrgCtx } from "@/components/beacon/org-context";
import { useSync } from "@/components/beacon/sync-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/$org/log")({ component: Logger });

const uid = () => crypto.randomUUID();
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}
function Pick({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; placeholder?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Select"} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
    </Select>
  );
}
const femaOpts = FEMA_CATEGORIES.map((c) => ({ v: c.code, l: c.label }));
const num = (s: string) => Number(s) || 0;

function Logger() {
  const { org, role } = useOrgCtx();
  const { user } = useAuth();
  const { online, syncNow } = useSync();
  const incidents = useIncidents(org.id);
  const active = (incidents.data ?? []).filter((i) => i.status !== "closed");
  const [incidentId, setIncidentId] = useState("");
  useEffect(() => { if (!incidentId && active[0]) setIncidentId(active[0].id); }, [active, incidentId]);
  const depts = useQuery({ queryKey: ["departments", org.id], queryFn: async () => (await supabase.from("departments").select("name").eq("organization_id", org.id).order("name")).data ?? [] });
  const rates = useQuery({ queryKey: ["rates", org.id], queryFn: async () => (await supabase.from("rate_cards").select("*").eq("organization_id", org.id).order("name")).data ?? [] });
  const deptOpts = (depts.data ?? []).map((d) => ({ v: d.name, l: d.name }));
  const [authorName, setAuthorName] = useState("");
  useEffect(() => {
    if (!user) return;
    supabase.from("organization_members").select("full_name").eq("organization_id", org.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAuthorName(data?.full_name || user.email || ""));
  }, [user, org.id]);

  if (!canLog(role)) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">Field logging is for responders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {org.is_demo ? "The demo city is read-only. Register your own city to try the offline field logger." : "Your role can review and tag entries but not create them."}
        </p>
        {org.is_demo && <Button asChild className="mt-4"><Link to="/register-city">Register your city</Link></Button>}
      </div>
    );
  }

  const submit = async (table: "field_logs" | "labor_entries" | "equipment_entries" | "material_entries", row: Record<string, unknown>, extra?: { photos?: QueuedPhoto[]; receipt?: Blob }) => {
    if (!incidentId) { toast.error("Choose an incident first"); return false; }
    const cid = uid();
    const time = (row["entry_time"] as string | undefined) ?? new Date().toISOString();
    await enqueue({
      cid, table, queuedAt: new Date().toISOString(), ...extra,
      row: { ...row, organization_id: org.id, incident_id: incidentId, client_generated_id: cid, entry_time: time, original_timestamp: new Date().toISOString(), timestamp_edited: !!row["timestamp_edited"], created_by: user!.id, author_name: authorName },
    });
    if (navigator.onLine) await syncNow(); else toast("Saved on this device — will sync when back online");
    return true;
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Quick-Log · {online ? "online" : "offline"}</p>
        <h1 className="text-2xl font-semibold">Field Logger</h1>
      </div>
      <Field label="Incident">
        <Pick value={incidentId} onChange={setIncidentId} options={active.map((i) => ({ v: i.id, l: i.name }))} placeholder="No active incidents" />
      </Field>
      <Tabs defaultValue="note">
        <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="note">Field Note</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>
        <TabsContent value="note"><NoteForm deptOpts={deptOpts} onSubmit={submit} /></TabsContent>
        <TabsContent value="labor"><LaborForm deptOpts={deptOpts} rates={(rates.data ?? []).filter((r) => r.kind === "labor")} onSubmit={submit} /></TabsContent>
        <TabsContent value="equipment"><EquipForm deptOpts={deptOpts} rates={(rates.data ?? []).filter((r) => r.kind === "equipment")} onSubmit={submit} /></TabsContent>
        <TabsContent value="materials"><MaterialForm deptOpts={deptOpts} onSubmit={submit} /></TabsContent>
      </Tabs>
    </div>
  );
}

type SubmitFn = (t: "field_logs" | "labor_entries" | "equipment_entries" | "material_entries", row: Record<string, unknown>, extra?: { photos?: QueuedPhoto[]; receipt?: Blob }) => Promise<boolean>;
type Rate = { id: string; name: string; code: string | null; hourly_rate: number; fringe_pct: number };
const card = "grid gap-4 rounded-lg border bg-card p-4";

function useTimestamp() {
  const [auto] = useState(localNow);
  const [val, setVal] = useState(auto);
  return { val, setVal, edited: val !== auto, iso: new Date(val).toISOString(), reset: () => setVal(localNow()) };
}
function TimestampField({ ts }: { ts: ReturnType<typeof useTimestamp> }) {
  return (
    <Field label="Timestamp">
      <Input type="datetime-local" className="font-mono" value={ts.val} onChange={(e) => ts.setVal(e.target.value)} />
      {ts.edited && <span className="text-xs font-medium text-amber">Edited from auto-captured time — will be flagged for audit</span>}
    </Field>
  );
}

function NoteForm({ deptOpts, onSubmit }: { deptOpts: { v: string; l: string }[]; onSubmit: SubmitFn }) {
  const ts = useTimestamp();
  const [f, setF] = useState({ department: "", category: LOG_CATEGORIES[0]!, address: "", notes: "", fema: "" });
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<(QueuedPhoto & { url: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }), () => toast.error("Location unavailable"), { enableHighAccuracy: true, timeout: 10000 });
  useEffect(locate, []);
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const blob = await compressImage(file);
      setPhotos((p) => [...p, { cid: uid(), blob, caption: "", phase: "during", lat: gps?.lat ?? null, lng: gps?.lng ?? null, taken_at: new Date().toISOString(), url: URL.createObjectURL(blob) }]);
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const ok = await onSubmit("field_logs", {
      entry_time: ts.iso, timestamp_edited: ts.edited, department: f.department || null, category: f.category, location_address: f.address || null,
      gps_lat: gps?.lat ?? null, gps_lng: gps?.lng ?? null, fema_category: f.fema || null, notes: f.notes,
    }, { photos: photos.map(({ url: _u, ...p }) => p) });
    setBusy(false);
    if (ok) { setF({ ...f, notes: "", address: "" }); setPhotos([]); ts.reset(); }
  };
  return (
    <form onSubmit={save} className={card}>
      <TimestampField ts={ts} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department"><Pick value={f.department} onChange={(v) => setF({ ...f, department: v })} options={deptOpts} /></Field>
        <Field label="Category"><Pick value={f.category} onChange={(v) => setF({ ...f, category: v })} options={LOG_CATEGORIES.map((c) => ({ v: c, l: c }))} /></Field>
      </div>
      <Field label="Location">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={locate}><MapPin className="h-4 w-4" />GPS</Button>
          <span className="font-mono text-xs text-muted-foreground">{gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : "no fix"}</span>
        </div>
        <Input placeholder="Address or landmark" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      </Field>
      <Field label="FEMA category (optional)"><Pick value={f.fema} onChange={(v) => setF({ ...f, fema: v })} options={femaOpts} /></Field>
      <Field label="Notes / decision"><Textarea required rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <Field label="Photos">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted">
          <Camera className="h-5 w-5" /> Add photos
          <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void addPhotos(e.target.files)} />
        </label>
        <div className="grid gap-2">
          {photos.map((p, i) => (
            <div key={p.cid} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2">
              <img src={p.url} alt="" className="h-16 w-16 rounded object-cover" />
              <div className="grid min-w-0 gap-1">
                <Input placeholder="Caption" value={p.caption} onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                <div className="flex gap-1">
                  {(["before", "during", "after"] as const).map((ph) => (
                    <button type="button" key={ph} onClick={() => setPhotos(photos.map((x, j) => (j === i ? { ...x, phase: ph } : x)))} className={`rounded px-2 py-0.5 text-xs capitalize ${p.phase === ph ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{ph}</button>
                  ))}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label="Remove photo"><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </Field>
      <Button disabled={busy} type="submit" size="lg">Log field note</Button>
    </form>
  );
}

function RatePicker({ rates, onPick }: { rates: Rate[]; onPick: (r: Rate) => void }) {
  if (!rates.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      <span className="text-xs text-muted-foreground">Quick-fill:</span>
      {rates.map((r) => <button type="button" key={r.id} onClick={() => onPick(r)} className="rounded bg-muted px-2 py-0.5 text-xs hover:bg-amber-soft">{r.name}</button>)}
    </div>
  );
}

function LaborForm({ deptOpts, rates, onSubmit }: { deptOpts: { v: string; l: string }[]; rates: Rate[]; onSubmit: SubmitFn }) {
  const ts = useTimestamp();
  const blank = { staff_name: "", role_title: "", department: "", fema: "B", reg: "", ot: "", rate: "", fringe: "", task: "" };
  const [f, setF] = useState(blank);
  const total = useMemo(() => laborCost(num(f.reg), num(f.ot), num(f.rate), num(f.fringe)), [f]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onSubmit("labor_entries", { entry_time: ts.iso, timestamp_edited: ts.edited, staff_name: f.staff_name, role_title: f.role_title || null, department: f.department || null, fema_category: f.fema, regular_hours: num(f.reg), overtime_hours: num(f.ot), hourly_rate: num(f.rate), fringe_pct: num(f.fringe), task_description: f.task || null })) { setF({ ...blank, department: f.department, fema: f.fema }); ts.reset(); }
  };
  return (
    <form onSubmit={save} className={card}>
      <TimestampField ts={ts} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Staff member"><Input required value={f.staff_name} onChange={(e) => setF({ ...f, staff_name: e.target.value })} /></Field>
        <Field label="Role / title"><Input value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} /></Field>
        <Field label="Department"><Pick value={f.department} onChange={(v) => setF({ ...f, department: v })} options={deptOpts} /></Field>
        <Field label="FEMA work category"><Pick value={f.fema} onChange={(v) => setF({ ...f, fema: v })} options={femaOpts} /></Field>
      </div>
      <RatePicker rates={rates} onPick={(r) => setF({ ...f, role_title: f.role_title || r.name, rate: String(r.hourly_rate), fringe: String(r.fringe_pct) })} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Regular hrs"><Input inputMode="decimal" className="font-mono" value={f.reg} onChange={(e) => setF({ ...f, reg: e.target.value })} /></Field>
        <Field label="OT hrs"><Input inputMode="decimal" className="font-mono" value={f.ot} onChange={(e) => setF({ ...f, ot: e.target.value })} /></Field>
        <Field label="Hourly rate $"><Input inputMode="decimal" className="font-mono" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field>
        <Field label="Fringe %"><Input inputMode="decimal" className="font-mono" value={f.fringe} onChange={(e) => setF({ ...f, fringe: e.target.value })} /></Field>
      </div>
      <Field label="Task description"><Input value={f.task} onChange={(e) => setF({ ...f, task: e.target.value })} /></Field>
      <TotalRow label="Total labor cost (OT at 1.5×)" value={total} />
      <Button type="submit" size="lg">Log labor</Button>
    </form>
  );
}

function EquipForm({ deptOpts, rates, onSubmit }: { deptOpts: { v: string; l: string }[]; rates: Rate[]; onSubmit: SubmitFn }) {
  const ts = useTimestamp();
  const blank = { name: "", code: "", operator: "", department: "", fema: "B", active: "", standby: "", rate: "", location: "" };
  const [f, setF] = useState(blank);
  const total = equipmentCost(num(f.active), num(f.rate));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onSubmit("equipment_entries", { entry_time: ts.iso, timestamp_edited: ts.edited, equipment_name: f.name, fema_code: f.code || null, operator_name: f.operator || null, department: f.department || null, fema_category: f.fema, active_hours: num(f.active), standby_hours: num(f.standby), hourly_rate: num(f.rate), work_location: f.location || null })) { setF({ ...blank, department: f.department }); ts.reset(); }
  };
  return (
    <form onSubmit={save} className={card}>
      <TimestampField ts={ts} />
      <RatePicker rates={rates} onPick={(r) => setF({ ...f, name: r.name, code: r.code ?? "", rate: String(r.hourly_rate) })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Equipment"><Input required placeholder="Salt Spreader, Skid Steer…" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="FEMA equipment code"><Input className="font-mono" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Operator"><Input value={f.operator} onChange={(e) => setF({ ...f, operator: e.target.value })} /></Field>
        <Field label="Department"><Pick value={f.department} onChange={(v) => setF({ ...f, department: v })} options={deptOpts} /></Field>
        <Field label="FEMA category"><Pick value={f.fema} onChange={(v) => setF({ ...f, fema: v })} options={femaOpts} /></Field>
        <Field label="Work location"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Active hrs"><Input inputMode="decimal" className="font-mono" value={f.active} onChange={(e) => setF({ ...f, active: e.target.value })} /></Field>
        <Field label="Standby hrs"><Input inputMode="decimal" className="font-mono" value={f.standby} onChange={(e) => setF({ ...f, standby: e.target.value })} /></Field>
        <Field label="Hourly rate $"><Input inputMode="decimal" className="font-mono" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field>
      </div>
      <TotalRow label="Total equipment cost (active hours)" value={total} />
      <Button type="submit" size="lg">Log equipment</Button>
    </form>
  );
}

function MaterialForm({ deptOpts, onSubmit }: { deptOpts: { v: string; l: string }[]; onSubmit: SubmitFn }) {
  const ts = useTimestamp();
  const blank = { vendor: "", item: "", department: "", qty: "", unit: "", fema: "B" };
  const [f, setF] = useState(blank);
  const [receipt, setReceipt] = useState<Blob | null>(null);
  const total = materialCost(num(f.qty), num(f.unit));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onSubmit("material_entries", { entry_time: ts.iso, timestamp_edited: ts.edited, vendor: f.vendor || null, item_description: f.item, department: f.department || null, quantity: num(f.qty), unit_cost: num(f.unit), fema_category: f.fema }, receipt ? { receipt } : undefined)) { setF({ ...blank, department: f.department }); setReceipt(null); ts.reset(); }
  };
  return (
    <form onSubmit={save} className={card}>
      <TimestampField ts={ts} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vendor"><Input value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
        <Field label="Item description"><Input required value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} /></Field>
        <Field label="Department"><Pick value={f.department} onChange={(v) => setF({ ...f, department: v })} options={deptOpts} /></Field>
        <Field label="FEMA category"><Pick value={f.fema} onChange={(v) => setF({ ...f, fema: v })} options={femaOpts} /></Field>
        <Field label="Quantity"><Input inputMode="decimal" className="font-mono" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
        <Field label="Unit cost $"><Input inputMode="decimal" className="font-mono" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
      </div>
      <Field label="Receipt photo">
        <Input type="file" accept="image/*" capture="environment" onChange={async (e) => { const file = e.target.files?.[0]; setReceipt(file ? await compressImage(file) : null); }} />
      </Field>
      <TotalRow label="Total" value={total} />
      <Button type="submit" size="lg">Log purchase</Button>
    </form>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-emerald-soft px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <span className="font-mono text-lg font-semibold">{fmtUSD(value)}</span>
    </div>
  );
}
