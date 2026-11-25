import { describe, expect, it } from "vitest";
import { buildCrewEntries } from "./crew";

const base = { ticketId: "T1", entryTime: "2026-02-15T12:00:00Z", timestampEdited: false, department: "Public Works", fema: "B", task: "Plow", location: "Main St", regularHours: 8, overtimeHours: 2 };

describe("crew ticket", () => {
  it("creates one labor entry per named crew member with the shared hours", () => {
    const r = buildCrewEntries({ ...base, members: [{ name: "Ana", role: "Op", rate: 30, fringe: 30 }, { name: " ", role: "", rate: 0, fringe: 0 }, { name: "Ben", role: "", rate: 25, fringe: 30, agency: "Cedar Park PW" }], equipment: [] });
    expect(r.labor).toHaveLength(2);
    expect(r.labor.every((l) => l.regular_hours === 8 && l.overtime_hours === 2 && l.crew_ticket_id === "T1")).toBe(true);
    expect(r.labor[1]!.mutual_aid_agency).toBe("Cedar Park PW");
  });
  it("links equipment to the same ticket and keeps standby separate", () => {
    const r = buildCrewEntries({ ...base, members: [], equipment: [{ name: "Dump Truck", code: "8720", edition: "2025-07-01", source: "fema_schedule", assetId: null, rate: 60, activeHours: 6, standbyHours: 4, operator: "Ana" }] });
    expect(r.equipment[0]).toMatchObject({ crew_ticket_id: "T1", active_hours: 6, standby_hours: 4, fema_cost_code: "8720" });
  });
});
