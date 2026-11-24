export type FemaRate = { id: string; organization_id: string | null; cost_code: string; schedule_edition: string; category: string; equipment_name: string; specifications: string | null; unit: string; hourly_rate: number; notes: string | null };
export type FleetAsset = { id: string; asset_number: string; nickname: string; department_id: string | null; fema_rate_id: string | null; custom_hourly_rate: number | null; rate_source: "fema_schedule" | "local_rate" | "unlisted_pending_fema"; make_model_hp: string | null; justification_notes: string | null };

export const RATE_SOURCE_LABELS: Record<string, string> = {
  fema_schedule: "FEMA Schedule", local_rate: "Local Rate (44 CFR 206.228)", unlisted_pending_fema: "Pending FEMA Rate Request",
};

/** What a fleet asset snapshots into an equipment entry. Local overrides win; unlisted items use any interim rate or $0. */
export function resolveAssetRate(asset: FleetAsset, rates: FemaRate[]) {
  const r = rates.find((x) => x.id === asset.fema_rate_id);
  const hourly = asset.rate_source === "fema_schedule" ? Number(r?.hourly_rate ?? 0) : Number(asset.custom_hourly_rate ?? 0);
  return {
    equipment_name: asset.nickname,
    fema_cost_code: asset.rate_source === "unlisted_pending_fema" ? null : r?.cost_code ?? null,
    schedule_edition: asset.rate_source === "fema_schedule" ? r?.schedule_edition ?? null : null,
    rate_source: asset.rate_source,
    hourly_rate: hourly,
  };
}

export function searchRates(rates: FemaRate[], q: string, category?: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return rates.filter((r) => {
    if (category && r.category !== category) return false;
    const hay = `${r.cost_code} ${r.equipment_name} ${r.specifications ?? ""} ${r.category}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
