import { describe, expect, it } from "vitest";
import { claimReadiness } from "./claim";

const row = (o: Record<string, unknown> = {}) => ({ rate_verified: true, review_status: "approved", client_generated_id: "c1", rate_source: "fema_schedule", ...o });
const data = (o: { labor?: unknown[]; equipment?: unknown[]; materials?: unknown[]; queued?: string[] }) =>
  ({ labor: o.labor ?? [], equipment: o.equipment ?? [], materials: o.materials ?? [], queuedIds: new Set(o.queued ?? []) }) as never;

describe("claim export lock", () => {
  it("is ready when every cost entry is approved and rate-verified", () => {
    expect(claimReadiness(data({ labor: [row()], equipment: [row({ client_generated_id: "c2" })] })).ready).toBe(true);
  });
  it("blocks on an unverified rate", () => {
    const r = claimReadiness(data({ materials: [row({ rate_verified: false })] }));
    expect(r.ready).toBe(false);
    expect(r.blockers.map((b) => b.kind)).toContain("unverified_rate");
  });
  it("blocks on an unapproved entry", () => {
    expect(claimReadiness(data({ labor: [row({ review_status: "pending" })] })).blockers.map((b) => b.kind)).toEqual(["unapproved"]);
  });
  it("blocks on equipment waiting for a FEMA rate and on entries still queued offline", () => {
    const kinds = claimReadiness(data({ equipment: [row({ rate_source: "unlisted_pending_fema" })], queued: ["c1"] })).blockers.map((b) => b.kind);
    expect(kinds).toEqual(expect.arrayContaining(["pending_fema_rate", "queued"]));
  });
});
