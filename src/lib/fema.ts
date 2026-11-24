export const FEMA_CATEGORIES = [
  { code: "A", label: "Cat A: Debris Removal" },
  { code: "B", label: "Cat B: Emergency Protective Measures" },
  { code: "C", label: "Cat C: Roads & Bridges" },
  { code: "D", label: "Cat D: Water Control" },
  { code: "E", label: "Cat E: Public Buildings" },
  { code: "F", label: "Cat F: Utilities" },
  { code: "G", label: "Cat G: Parks/Rec" },
] as const;
export type FemaCode = (typeof FEMA_CATEGORIES)[number]["code"];
export const femaLabel = (c: string | null | undefined) =>
  FEMA_CATEGORIES.find((f) => f.code === c)?.label ?? "Uncategorized";

export const LOG_CATEGORIES = ["Operational Decision", "Hazard Report", "Resident Assist", "Utility/Road Closure", "Mutual Aid"];
export const INCIDENT_TYPES = [
  { v: "freeze", l: "Freeze" }, { v: "flood", l: "Flood" }, { v: "severe_storm", l: "Severe Storm" },
  { v: "cyber", l: "Cyber" }, { v: "utility_outage", l: "Utility Outage" }, { v: "other", l: "Other" },
] as const;
export const ROLE_LABELS: Record<string, string> = {
  city_admin: "City Admin", eoc_commander: "EOC Commander", field_responder: "Field Responder", finance_auditor: "Finance / FEMA Auditor",
};
export const fmtLocal = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
export const fmtUTC = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 16) + "Z";
