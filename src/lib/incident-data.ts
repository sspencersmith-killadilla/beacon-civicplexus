import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSync } from "@/components/beacon/sync-context";
import { equipmentCost, laborCost, materialCost } from "./costs";
import type { SyncQueueItem } from "./offlineDb";
import { supabase } from "@/integrations/supabase/client";

export function useIncidents(orgId: string | undefined) {
  return useQuery({
    queryKey: ["incidents", orgId], enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from("incidents").select("*").eq("organization_id", orgId!).order("started_at", { ascending: false });
      if (error) throw error; return data;
    },
  });
}

function useServerIncidentData(incidentId: string | undefined) {
  return useQuery({
    queryKey: ["incident-data", incidentId], enabled: !!incidentId,
    queryFn: async () => {
      const id = incidentId!;
      const [inc, logs, labor, equip, mats, photos, aar, contracts, projects] = await Promise.all([
        supabase.from("incidents").select("*").eq("id", id).single(),
        supabase.from("field_logs").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("labor_entries").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("equipment_entries").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("material_entries").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("evidence_photos").select("*").eq("incident_id", id).order("taken_at"),
        supabase.from("aar_reports").select("*").eq("incident_id", id).maybeSingle(),
        supabase.from("contract_entries").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("incident_projects").select("*").eq("incident_id", id).order("project_number"),
      ]);
      for (const r of [inc, logs, labor, equip, mats, photos, contracts, projects]) if (r.error) throw r.error;
      return { incident: inc.data!, logs: logs.data ?? [], labor: labor.data ?? [], equipment: equip.data ?? [], materials: mats.data ?? [], photos: photos.data ?? [], aar: aar.data, contracts: contracts.data ?? [], projects: projects.data ?? [] };
    },
  });
}
type ServerData = NonNullable<ReturnType<typeof useServerIncidentData>["data"]>;
export type IncidentData = ServerData & { queuedIds: Set<string>; syncedIds: Set<string> };

/** Optimistic view: entries still in this device's queue appear alongside server rows until the server copy arrives. */
export function mergeQueued(d: ServerData, items: SyncQueueItem[]): IncidentData {
  const onServer = new Set([...d.logs, ...d.labor, ...d.equipment, ...d.materials, ...d.contracts].map((r) => r.client_generated_id));
  const mine = items.filter((i) => i.incident_id === d.incident.id);
  const queued = mine.filter((i) => i.status !== "synced" && !onServer.has(i.id));
  const n = (v: unknown) => Number(v ?? 0);
  const row = (i: SyncQueueItem, extra: Record<string, unknown> = {}) => ({
    edited_by: null, edited_at: null, rate_verified: false, created_at: i.created_at, department: null, fema_category: null,
    ...i.payload, ...extra, id: `queued:${i.id}`, client_generated_id: i.id, organization_id: i.organization_id, incident_id: i.incident_id,
  }) as never;
  const of = (t: SyncQueueItem["entity_type"]) => queued.filter((i) => i.entity_type === t);
  const byTime = <T extends { entry_time: string }>(xs: T[]) => xs.sort((a, b) => a.entry_time.localeCompare(b.entry_time));
  return {
    ...d,
    logs: byTime([...d.logs, ...of("field_log").map((i) => row(i))]),
    labor: byTime([...d.labor, ...of("labor_entry").map((i) => row(i, { total_cost: laborCost(n(i.payload["regular_hours"]), n(i.payload["overtime_hours"]), n(i.payload["hourly_rate"]), n(i.payload["fringe_pct"])) }))]),
    equipment: byTime([...d.equipment, ...of("equipment_entry").map((i) => { const t = equipmentCost(n(i.payload["active_hours"]), n(i.payload["hourly_rate"])); return row(i, { total_cost: t, reimbursable_total: t }); })]),
    materials: byTime([...d.materials, ...of("material_entry").map((i) => row(i, { total_cost: materialCost(n(i.payload["quantity"]), n(i.payload["unit_cost"])) }))]),
    contracts: byTime([...d.contracts, ...of("contract_entry").map((i) => row(i, { total_cost: materialCost(n(i.payload["quantity"]), n(i.payload["unit_cost"])) }))]),
    queuedIds: new Set(queued.map((i) => i.id)),
    syncedIds: new Set(mine.filter((i) => i.status === "synced").map((i) => i.id)),
  };
}

export function useIncidentData(incidentId: string | undefined) {
  const q = useServerIncidentData(incidentId);
  const { items } = useSync();
  const data = useMemo(() => (q.data ? mergeQueued(q.data, items) : undefined), [q.data, items]);
  return { ...q, data };
}

export function summarize(d: IncidentData) {
  const n = (v: unknown) => Number(v ?? 0);
  const regHours = d.labor.reduce((s, l) => s + n(l.regular_hours), 0);
  const otHours = d.labor.reduce((s, l) => s + n(l.overtime_hours), 0);
  const laborCost = d.labor.reduce((s, l) => s + n(l.total_cost), 0);
  const equipCost = d.equipment.reduce((s, e) => s + n(e.total_cost), 0);
  const matCost = d.materials.reduce((s, m) => s + n(m.total_cost), 0);
  const contractCost = d.contracts.reduce((s, c) => s + n(c.total_cost), 0);
  const byCat: Record<string, { labor: number; equipment: number; materials: number; contracts: number }> = {};
  const add = (c: string | null, k: "labor" | "equipment" | "materials" | "contracts", v: number) => {
    const key = c ?? "—"; byCat[key] ??= { labor: 0, equipment: 0, materials: 0, contracts: 0 }; byCat[key][k] += v;
  };
  d.labor.forEach((l) => add(l.fema_category, "labor", n(l.total_cost)));
  d.equipment.forEach((e) => add(e.fema_category, "equipment", n(e.total_cost)));
  d.materials.forEach((m) => add(m.fema_category, "materials", n(m.total_cost)));
  d.contracts.forEach((c) => add(c.fema_category, "contracts", n(c.total_cost)));
  const byDept: Record<string, { reg: number; ot: number; labor: number; equipment: number; materials: number; contracts: number }> = {};
  const dep = (k: string | null) => (byDept[k ?? "Unassigned"] ??= { reg: 0, ot: 0, labor: 0, equipment: 0, materials: 0, contracts: 0 });
  d.labor.forEach((l) => { const x = dep(l.department); x.reg += n(l.regular_hours); x.ot += n(l.overtime_hours); x.labor += n(l.total_cost); });
  d.equipment.forEach((e) => { dep(e.department).equipment += n(e.total_cost); });
  d.materials.forEach((m) => { dep(m.department).materials += n(m.total_cost); });
  d.contracts.forEach((c) => { dep(c.department).contracts += n(c.total_cost); });
  const byProject: Record<string, { name: string; number: string | null; total: number; entries: number }> = {};
  const proj = (id: string | null) => {
    const p = d.projects.find((x) => x.id === id);
    return (byProject[p?.id ?? "none"] ??= { name: p?.name ?? "Not assigned to a project", number: p?.project_number ?? null, total: 0, entries: 0 });
  };
  for (const r of [...d.labor, ...d.equipment, ...d.materials, ...d.contracts]) { const x = proj(r.project_id ?? null); x.total += n(r.total_cost); x.entries += 1; }
  d.logs.forEach((l) => { proj(l.project_id ?? null).entries += 1; });
  return {
    regHours, otHours, laborCost, equipCost, matCost, contractCost, total: laborCost + equipCost + matCost + contractCost, byProject,
    activeEquipment: d.equipment.length, entries: d.logs.length + d.labor.length + d.equipment.length + d.materials.length + d.contracts.length,
    byCat, byDept,
  };
}
