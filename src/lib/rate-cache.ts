import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getReferenceCache, putReferenceCache } from "./offlineDb";
import type { FemaRate, FleetAsset } from "./fleet";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Dept = Pick<T["departments"]["Row"], "id" | "name" | "fica_pct" | "retirement_pct" | "medical_pct" | "workers_comp_pct" | "other_fringe_pct">;
/** Department fringe profile total (FICA + retirement + medical + workers' comp + other). */
export const deptFringe = (d: Partial<Dept> | undefined) => d ? Math.round([d.fica_pct, d.retirement_pct, d.medical_pct, d.workers_comp_pct, d.other_fringe_pct].reduce<number>((s, v) => s + Number(v ?? 0), 0) * 100) / 100 : 0;
export type Ref = {
  rates: FemaRate[]; fleet: FleetAsset[]; departments: Dept[];
  projects: T["incident_projects"]["Row"][];
  rateCards: T["rate_cards"]["Row"][]; incidents: T["incidents"]["Row"][]; cachedAt: string;
};

async function fetchRef(orgId: string): Promise<Ref> {
  const [rates, fleet, depts, cards, incs, projs] = await Promise.all([
    supabase.from("fema_equipment_rates").select("*").order("cost_code").limit(5000),
    supabase.from("city_fleet_assets").select("*").eq("organization_id", orgId).order("asset_number"),
    supabase.from("departments").select("id, name, fica_pct, retirement_pct, medical_pct, workers_comp_pct, other_fringe_pct").eq("organization_id", orgId).order("name"),
    supabase.from("rate_cards").select("*").eq("organization_id", orgId).order("name"),
    supabase.from("incidents").select("*").eq("organization_id", orgId).neq("status", "closed").order("started_at", { ascending: false }),
    supabase.from("incident_projects").select("*").eq("organization_id", orgId).order("project_number"),
  ]);
  for (const r of [rates, fleet, depts, cards, incs, projs]) if (r.error) throw r.error;
  const ref: Ref = { rates: rates.data as FemaRate[], fleet: fleet.data as FleetAsset[], departments: depts.data ?? [], rateCards: cards.data ?? [], incidents: incs.data ?? [], projects: projs.data ?? [], cachedAt: new Date().toISOString() };
  await putReferenceCache({ organization_id: orgId, fema_equipment_rates: ref.rates, city_fleet_assets: ref.fleet, departments: ref.departments, rate_cards: ref.rateCards, incidents: ref.incidents, projects: ref.projects, cached_at: ref.cachedAt });
  return ref;
}

/** FEMA rates, fleet, departments, rate cards and active incidents: network-first with an IndexedDB copy so the Field Logger works offline. */
export function useReferenceData(orgId: string) {
  return useQuery({
    queryKey: ["reference", orgId],
    networkMode: "always",
    queryFn: async () => {
      if (navigator.onLine) {
        try { return { ...(await fetchRef(orgId)), offline: false }; } catch { /* fall back to cache */ }
      }
      const c = await getReferenceCache(orgId);
      return {
        rates: (c?.fema_equipment_rates ?? []) as Ref["rates"], fleet: (c?.city_fleet_assets ?? []) as Ref["fleet"],
        departments: (c?.departments ?? []) as Ref["departments"], rateCards: (c?.rate_cards ?? []) as Ref["rateCards"],
        incidents: (c?.incidents ?? []) as Ref["incidents"], projects: (c?.projects ?? []) as Ref["projects"], cachedAt: c?.cached_at ?? "", offline: true,
      };
    },
  });
}
