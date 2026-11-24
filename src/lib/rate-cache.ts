import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getReferenceCache, putReferenceCache } from "./offlineDb";
import type { FemaRate, FleetAsset } from "./fleet";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Ref = {
  rates: FemaRate[]; fleet: FleetAsset[]; departments: { id: string; name: string }[];
  rateCards: T["rate_cards"]["Row"][]; incidents: T["incidents"]["Row"][]; cachedAt: string;
};

async function fetchRef(orgId: string): Promise<Ref> {
  const [rates, fleet, depts, cards, incs] = await Promise.all([
    supabase.from("fema_equipment_rates").select("*").order("cost_code").limit(5000),
    supabase.from("city_fleet_assets").select("*").eq("organization_id", orgId).order("asset_number"),
    supabase.from("departments").select("id, name").eq("organization_id", orgId).order("name"),
    supabase.from("rate_cards").select("*").eq("organization_id", orgId).order("name"),
    supabase.from("incidents").select("*").eq("organization_id", orgId).neq("status", "closed").order("started_at", { ascending: false }),
  ]);
  for (const r of [rates, fleet, depts, cards, incs]) if (r.error) throw r.error;
  const ref: Ref = { rates: rates.data as FemaRate[], fleet: fleet.data as FleetAsset[], departments: depts.data ?? [], rateCards: cards.data ?? [], incidents: incs.data ?? [], cachedAt: new Date().toISOString() };
  await putReferenceCache({ organization_id: orgId, fema_equipment_rates: ref.rates, city_fleet_assets: ref.fleet, departments: ref.departments, rate_cards: ref.rateCards, incidents: ref.incidents, cached_at: ref.cachedAt });
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
        incidents: (c?.incidents ?? []) as Ref["incidents"], cachedAt: c?.cached_at ?? "", offline: true,
      };
    },
  });
}
