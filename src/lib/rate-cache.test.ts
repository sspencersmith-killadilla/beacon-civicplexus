import { describe, expect, it } from "vitest";
import { deptFringe } from "./rate-cache";

describe("department fringe profile", () => {
  it("sums FICA, retirement, medical, workers' comp and other", () => {
    expect(deptFringe({ fica_pct: 7.65, retirement_pct: 24, medical_pct: 9, workers_comp_pct: 6, other_fringe_pct: 0.1 })).toBe(46.75);
  });
  it("is 0 when no department is picked", () => { expect(deptFringe(undefined)).toBe(0); });
});
