import { useQuery } from "@tanstack/react-query";
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

export function useIncidentData(incidentId: string | undefined) {
  return useQuery({
    queryKey: ["incident-data", incidentId], enabled: !!incidentId,
    queryFn: async () => {
      const id = incidentId!;
      const [inc, logs, labor, equip, mats, photos, aar] = await Promise.all([
        supabase.from("incidents").select("*").eq("id", id).single(),
        supabase.from("field_logs").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("labor_entries").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("equipment_entries").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("material_entries").select("*").eq("incident_id", id).order("entry_time"),
        supabase.from("evidence_photos").select("*").eq("incident_id", id).order("taken_at"),
        supabase.from("aar_reports").select("*").eq("incident_id", id).maybeSingle(),
      ]);
      for (const r of [inc, logs, labor, equip, mats, photos]) if (r.error) throw r.error;
      return { incident: inc.data!, logs: logs.data ?? [], labor: labor.data ?? [], equipment: equip.data ?? [], materials: mats.data ?? [], photos: photos.data ?? [], aar: aar.data };
    },
  });
}
export type IncidentData = NonNullable<ReturnType<typeof useIncidentData>["data"]>;

export function summarize(d: IncidentData) {
  const n = (v: unknown) => Number(v ?? 0);
  const regHours = d.labor.reduce((s, l) => s + n(l.regular_hours), 0);
  const otHours = d.labor.reduce((s, l) => s + n(l.overtime_hours), 0);
  const laborCost = d.labor.reduce((s, l) => s + n(l.total_cost), 0);
  const equipCost = d.equipment.reduce((s, e) => s + n(e.total_cost), 0);
  const matCost = d.materials.reduce((s, m) => s + n(m.total_cost), 0);
  const byCat: Record<string, { labor: number; equipment: number; materials: number }> = {};
  const add = (c: string | null, k: "labor" | "equipment" | "materials", v: number) => {
    const key = c ?? "—"; byCat[key] ??= { labor: 0, equipment: 0, materials: 0 }; byCat[key][k] += v;
  };
  d.labor.forEach((l) => add(l.fema_category, "labor", n(l.total_cost)));
  d.equipment.forEach((e) => add(e.fema_category, "equipment", n(e.total_cost)));
  d.materials.forEach((m) => add(m.fema_category, "materials", n(m.total_cost)));
  const byDept: Record<string, { reg: number; ot: number; labor: number; equipment: number; materials: number }> = {};
  const dep = (k: string | null) => (byDept[k ?? "Unassigned"] ??= { reg: 0, ot: 0, labor: 0, equipment: 0, materials: 0 });
  d.labor.forEach((l) => { const x = dep(l.department); x.reg += n(l.regular_hours); x.ot += n(l.overtime_hours); x.labor += n(l.total_cost); });
  d.equipment.forEach((e) => { dep(e.department).equipment += n(e.total_cost); });
  d.materials.forEach((m) => { dep(m.department).materials += n(m.total_cost); });
  return {
    regHours, otHours, laborCost, equipCost, matCost, total: laborCost + equipCost + matCost,
    activeEquipment: d.equipment.length, entries: d.logs.length + d.labor.length + d.equipment.length + d.materials.length,
    byCat, byDept,
  };
}
