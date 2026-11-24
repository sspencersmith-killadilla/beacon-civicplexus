import { useQuery } from "@tanstack/react-query";
import { createStore, get, set } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import type { FemaRate, FleetAsset } from "./fleet";

let store: ReturnType<typeof createStore> | null = null;
const db = () => (store ??= createStore("beacon-cache", "reference"));
type Ref = { rates: FemaRate[]; fleet: FleetAsset[]; cachedAt: string };

async function fetchRef(orgId: string): Promise<Ref> {
  const [rates, fleet] = await Promise.all([
    supabase.from("fema_equipment_rates").select("*").order("cost_code").limit(5000),
    supabase.from("city_fleet_assets").select("*").eq("organization_id", orgId).order("asset_number"),
  ]);
  if (rates.error) throw rates.error;
  if (fleet.error) throw fleet.error;
  const ref = { rates: rates.data as FemaRate[], fleet: fleet.data as FleetAsset[], cachedAt: new Date().toISOString() };
  await set(`ref:${orgId}`, ref, db());
  return ref;
}

/** FEMA rates + city fleet, network-first with an IndexedDB copy for offline use. */
export function useReferenceData(orgId: string) {
  return useQuery({
    queryKey: ["reference", orgId],
    networkMode: "always",
    queryFn: async () => {
      if (navigator.onLine) {
        try { return { ...(await fetchRef(orgId)), offline: false }; } catch { /* fall back to cache */ }
      }
      const cached = await get<Ref>(`ref:${orgId}`, db());
      return { ...(cached ?? { rates: [], fleet: [], cachedAt: "" }), offline: true };
    },
  });
}
