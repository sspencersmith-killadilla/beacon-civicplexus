import { describe, expect, it } from "vitest";
import { laborSummaryRow } from "./fema-summaries";
import { laborCost } from "./costs";

describe("FEMA labor summary row", () => {
  it("splits benefits onto regular and 1.5× overtime rates and matches the labor cost total", () => {
    const l = { regular_hours: 8, overtime_hours: 4, hourly_rate: 30, fringe_pct: 40 };
    const r = laborSummaryRow(l);
    expect(r["Overtime Hourly Rate"]).toBe(45);
    expect(r["Benefit Rate/hr (Regular)"]).toBe(12);
    expect(r["Benefit Rate/hr (Overtime)"]).toBe(18);
    expect(r["Total Cost"]).toBe(laborCost(8, 4, 30, 40));
  });
});
