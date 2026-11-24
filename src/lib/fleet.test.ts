import { describe, expect, it } from "vitest";
import { resolveAssetRate, searchRates, type FemaRate, type FleetAsset } from "./fleet";

const rates: FemaRate[] = [
  { id: "r1", organization_id: null, cost_code: "8312", schedule_edition: "2025-07-01", category: "Generators & Lighting", equipment_name: "Generator", specifications: "45 kW Diesel", unit: "hour", hourly_rate: 35.75, notes: null },
  { id: "r2", organization_id: null, cost_code: "8541", schedule_edition: "2025-07-01", category: "Loaders & Heavy Equipment", equipment_name: "Skid-Steer Loader", specifications: "Medium, 66 HP", unit: "hour", hourly_rate: 38, notes: null },
];
const asset = (o: Partial<FleetAsset>): FleetAsset => ({ id: "a", asset_number: "PW-1", nickname: "Gen", department_id: null, fema_rate_id: "r1", custom_hourly_rate: null, rate_source: "fema_schedule", make_model_hp: null, justification_notes: null, ...o });

describe("fleet rate resolution", () => {
  it("FEMA schedule assets use the schedule's code, edition and rate", () => {
    expect(resolveAssetRate(asset({}), rates)).toMatchObject({ fema_cost_code: "8312", schedule_edition: "2025-07-01", hourly_rate: 35.75 });
  });
  it("local rate overrides the schedule rate but keeps the cost code", () => {
    expect(resolveAssetRate(asset({ rate_source: "local_rate", custom_hourly_rate: 30 }), rates)).toMatchObject({ fema_cost_code: "8312", hourly_rate: 30, rate_source: "local_rate" });
  });
  it("unlisted equipment carries no FEMA code", () => {
    expect(resolveAssetRate(asset({ rate_source: "unlisted_pending_fema", fema_rate_id: null, make_model_hp: "X" }), rates).fema_cost_code).toBeNull();
  });
  it("search matches cost code and keywords", () => {
    expect(searchRates(rates, "8312").map((r) => r.id)).toEqual(["r1"]);
    expect(searchRates(rates, "skid 66").length).toBe(1);
  });
});
