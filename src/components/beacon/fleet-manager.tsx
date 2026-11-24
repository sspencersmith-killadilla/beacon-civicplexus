import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RATE_SOURCE_LABELS, resolveAssetRate, searchRates, type FemaRate, type FleetAsset } from "@/lib/fleet";
import { useReferenceData } from "@/lib/rate-cache";
import { useOrgCtx } from "./org-context";
import { CsvImporter, type ImportField } from "./csv-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const sec = "rounded-lg border bg-card p-5";
type Draft = { id?: string; asset_number: string; nickname: string; department_id: string; fema_rate_id: string; rate_source: FleetAsset["rate_source"]; custom_hourly_rate: string; make_model_hp: string; justification_notes: string };
const empty: Draft = { asset_number: "", nickname: "", department_id: "", fema_rate_id: "", rate_source: "fema_schedule", custom_hourly_rate: "", make_model_hp: "", justification_notes: "" };

const rateFields: ImportField[] = [
  { key: "cost_code", label: "Cost Code", required: true, guess: /code/i },
  { key: "equipment", label: "Equipment", required: true, guess: /equip|desc|name/i },
  { key: "specs", label: "Specifications", guess: /spec|capac|size|hp/i },
  { key: "unit", label: "Unit", guess: /unit/i },
  { key: "rate", label: "Rate", required: true, guess: /rate|\$|cost/i },
  { key: "category", label: "Category", guess: /categ|type|group/i },
];
const fleetFields: ImportField[] = [
  { key: "asset_number", label: "Asset #", required: true, guess: /asset|unit ?#|number|id/i },
  { key: "nickname", label: "Name", required: true, guess: /name|nick|desc/i },
  { key: "cost_code", label: "FEMA Cost Code", guess: /code/i },
  { key: "department", label: "Department", guess: /dept|depart/i },
];
const toNum = (s: string) => Number(s.replace(/[$,\s]/g, ""));

export function FleetManager() {
  const { org, role } = useOrgCtx();
  const qc = useQueryClient();
  const ref = useReferenceData(org.id);
  const rates = ref.data?.rates ?? [];
  const fleet = ref.data?.fleet ?? [];
  const depts = useQuery({ queryKey: ["departments", org.id], queryFn: async () => (await supabase.from("departments").select("id, name").eq("organization_id", org.id).order("name")).data ?? [] });
  const [edit, setEdit] = useState<Draft | null>(null);
  const [edition, setEdition] = useState(new Date().toISOString().slice(0, 10));
  const refresh = () => qc.invalidateQueries({ queryKey: ["reference", org.id] });
  const isAdmin = role === "city_admin";
  const editions = [...new Set(rates.map((r) => `${r.organization_id ? "City import" : "Reference"} ${r.schedule_edition}`))];

  const save = async (d: Draft) => {
    const row = {
      organization_id: org.id, asset_number: d.asset_number, nickname: d.nickname, department_id: d.department_id || null,
      fema_rate_id: d.fema_rate_id || null, rate_source: d.rate_source, custom_hourly_rate: d.custom_hourly_rate ? toNum(d.custom_hourly_rate) : null,
      make_model_hp: d.make_model_hp || null, justification_notes: d.justification_notes || null,
    };
    const { error } = d.id ? await supabase.from("city_fleet_assets").update(row).eq("id", d.id) : await supabase.from("city_fleet_assets").insert(row);
    if (error) { toast.error(error.message.includes("unlisted_needs") ? "Unlisted equipment needs make/model/HP" : error.message.includes("local_needs") ? "A local rate needs an hourly amount" : error.message); return; }
    toast.success("Fleet asset saved"); setEdit(null); await refresh();
  };

  return (
    <section className={`${sec} lg:col-span-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Fleet & FEMA Rates</h2>
        <Button onClick={() => setEdit({ ...empty })}>Add asset</Button>
      </div>
      <p className="mt-1 rounded-md bg-amber-soft px-3 py-2 text-xs">
        Built-in rates are representative values labeled edition 2025-07-01. Import and verify against the latest official FEMA Schedule of Equipment Rates CSV before filing. Loaded editions: <span className="font-mono">{editions.join(" · ") || "none"}</span>
      </p>

      <div className="mt-4 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-1">Asset #</th><th>Name</th><th>Dept</th><th>Cost code</th><th>Rate</th><th>Source</th><th /></tr></thead>
          <tbody>
            {fleet.map((a) => { const r = resolveAssetRate(a, rates); return (
              <tr key={a.id} className="border-t">
                <td className="py-1.5 font-mono">{a.asset_number}</td><td>{a.nickname}</td>
                <td>{depts.data?.find((d) => d.id === a.department_id)?.name ?? "—"}</td>
                <td className="font-mono">{r.fema_cost_code ?? "—"}</td><td className="font-mono">${r.hourly_rate.toFixed(2)}</td>
                <td className={a.rate_source === "fema_schedule" ? "" : "text-amber"}>{RATE_SOURCE_LABELS[a.rate_source]}</td>
                <td className="whitespace-nowrap text-right">
                  <Button size="icon" variant="ghost" aria-label="Edit asset" onClick={() => setEdit({ id: a.id, asset_number: a.asset_number, nickname: a.nickname, department_id: a.department_id ?? "", fema_rate_id: a.fema_rate_id ?? "", rate_source: a.rate_source, custom_hourly_rate: a.custom_hourly_rate?.toString() ?? "", make_model_hp: a.make_model_hp ?? "", justification_notes: a.justification_notes ?? "" })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete asset" onClick={async () => { const { error } = await supabase.from("city_fleet_assets").delete().eq("id", a.id); if (error) toast.error(error.message); else await refresh(); }}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ); })}
            {fleet.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">No assets yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Import fleet CSV</h3>
          <p className="mb-2 text-xs text-muted-foreground">Assets with a matching cost code are mapped to the FEMA schedule.</p>
          <CsvImporter fields={fleetFields} validate={() => null} onImport={async (rows) => {
            const payload = rows.map((r) => ({
              organization_id: org.id, asset_number: r["asset_number"]!, nickname: r["nickname"]!, rate_source: "fema_schedule" as const,
              fema_rate_id: rates.find((x) => x.cost_code === r["cost_code"])?.id ?? null,
              department_id: depts.data?.find((d) => d.name.toLowerCase() === (r["department"] ?? "").toLowerCase())?.id ?? null,
            }));
            const { error } = await supabase.from("city_fleet_assets").upsert(payload, { onConflict: "organization_id,asset_number" });
            if (error) toast.error(error.message); else { toast.success(`${payload.length} assets imported`); await refresh(); }
          }} />
        </div>
        {isAdmin && (
          <div>
            <h3 className="text-sm font-semibold">Import official FEMA / state DOT rate CSV</h3>
            <p className="mb-2 text-xs text-muted-foreground">Imported rates are only visible to your city. Re-importing the same edition replaces it.</p>
            <CsvImporter fields={rateFields} validate={(r) => (Number.isFinite(toNum(r["rate"] ?? "")) && toNum(r["rate"] ?? "") >= 0 ? null : "rate is not a number")} onImport={async (rows) => {
              await supabase.from("fema_equipment_rates").delete().eq("organization_id", org.id).eq("schedule_edition", edition);
              for (let i = 0; i < rows.length; i += 500) {
                const { error } = await supabase.from("fema_equipment_rates").insert(rows.slice(i, i + 500).map((r) => ({
                  organization_id: org.id, schedule_edition: edition, cost_code: r["cost_code"]!, equipment_name: r["equipment"]!, specifications: r["specs"] || null,
                  unit: r["unit"] || "hour", hourly_rate: toNum(r["rate"]!), category: r["category"] || "Imported",
                })));
                if (error) { toast.error(error.message); return; }
              }
              toast.success(`${rows.length} rates imported as edition ${edition}`); await refresh();
            }}>
              <div className="grid gap-1"><Label className="text-xs">Edition date *</Label><Input type="date" value={edition} onChange={(e) => setEdition(e.target.value)} /></div>
            </CsvImporter>
          </div>
        )}
      </div>

      {edit && <AssetDialog draft={edit} depts={depts.data ?? []} rates={rates} onClose={() => setEdit(null)} onSave={save} />}
    </section>
  );
}

function AssetDialog({ draft, depts, rates, onClose, onSave }: { draft: Draft; depts: { id: string; name: string }[]; rates: FemaRate[]; onClose: () => void; onSave: (d: Draft) => Promise<void> }) {
  const [d, setD] = useState(draft);
  const [q, setQ] = useState("");
  const picked = rates.find((r) => r.id === d.fema_rate_id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{d.id ? "Edit" : "Add"} fleet asset</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1"><Label>Asset #</Label><Input className="font-mono" value={d.asset_number} onChange={(e) => setD({ ...d, asset_number: e.target.value })} placeholder="PW-104" /></div>
            <div className="grid gap-1"><Label>Department</Label>
              <select className="h-10 rounded-md border bg-background px-2 text-sm" value={d.department_id} onChange={(e) => setD({ ...d, department_id: e.target.value })}><option value="">—</option>{depts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            </div>
          </div>
          <div className="grid gap-1"><Label>Nickname</Label><Input value={d.nickname} onChange={(e) => setD({ ...d, nickname: e.target.value })} placeholder="Salt Spreader Truck #4" /></div>
          <div className="grid gap-1"><Label>Rate source</Label>
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={d.rate_source} onChange={(e) => setD({ ...d, rate_source: e.target.value as Draft["rate_source"] })}>
              {Object.entries(RATE_SOURCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          {d.rate_source !== "unlisted_pending_fema" && (
            <div className="grid gap-1"><Label>FEMA cost code</Label>
              <Input placeholder="Search 8312, generator…" value={q} onChange={(e) => setQ(e.target.value)} />
              {picked && <p className="font-mono text-xs">Selected: {picked.cost_code} · {picked.equipment_name} {picked.specifications} · ${Number(picked.hourly_rate).toFixed(2)}/hr · {picked.schedule_edition}</p>}
              {q && (
                <ul className="max-h-40 divide-y overflow-auto rounded border">
                  {searchRates(rates, q).slice(0, 20).map((r) => (
                    <li key={r.id}><button type="button" className="w-full px-2 py-1.5 text-left font-mono text-xs hover:bg-muted" onClick={() => { setD({ ...d, fema_rate_id: r.id }); setQ(""); }}>{r.cost_code} · {r.equipment_name} {r.specifications} · ${Number(r.hourly_rate).toFixed(2)} · {r.schedule_edition}</button></li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {d.rate_source !== "fema_schedule" && (
            <div className="grid gap-1"><Label>{d.rate_source === "local_rate" ? "Approved local hourly rate $" : "Interim rate $ (optional)"}</Label><Input inputMode="decimal" className="font-mono" value={d.custom_hourly_rate} onChange={(e) => setD({ ...d, custom_hourly_rate: e.target.value })} /></div>
          )}
          {d.rate_source === "unlisted_pending_fema" && (
            <div className="grid gap-1"><Label>Make / model / capacity / HP *</Label><Input value={d.make_model_hp} onChange={(e) => setD({ ...d, make_model_hp: e.target.value })} placeholder="Caterpillar 259D3, 74 HP" /></div>
          )}
          <div className="grid gap-1"><Label>Justification notes</Label><Textarea rows={2} value={d.justification_notes} onChange={(e) => setD({ ...d, justification_notes: e.target.value })} placeholder="e.g. Local rate approved by state DOT, letter on file" /></div>
          <Button onClick={() => void onSave(d)} disabled={!d.asset_number || !d.nickname}>Save asset</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
