export const OT_MULTIPLIER = 1.5;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Force account labor: (regular × rate + OT × rate × 1.5) × (1 + fringe%). */
export function laborCost(regular: number, overtime: number, rate: number, fringePct: number): number {
  return round2((regular * rate + overtime * rate * OT_MULTIPLIER) * (1 + fringePct / 100));
}

/** Force account equipment: only active hours are reimbursed at the hourly rate. */
export function equipmentCost(activeHours: number, rate: number): number {
  return round2(activeHours * rate);
}

export function materialCost(quantity: number, unitCost: number): number {
  return round2(quantity * unitCost);
}

export const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
