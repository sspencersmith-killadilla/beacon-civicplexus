import { describe, expect, it } from "vitest";
import { equipmentCost, laborCost, materialCost } from "./costs";

describe("FEMA cost rules", () => {
  it("labor pays overtime at 1.5x and adds fringe", () => {
    // (8*30 + 4*30*1.5) * 1.30 = (240 + 180) * 1.3 = 546
    expect(laborCost(8, 4, 30, 30)).toBe(546);
  });
  it("equipment reimburses active hours only", () => {
    expect(equipmentCost(10, 62)).toBe(620);
  });
  it("materials are quantity times unit cost", () => {
    expect(materialCost(120, 84.5)).toBe(10140);
  });
});
