import type { IncidentData } from "./incident-data";

export type ClaimBlocker = { kind: "unverified_rate" | "unapproved" | "pending_fema_rate" | "queued"; count: number; label: string };

/** A claim packet is filing-ready only when every cost entry is approved, its rate verified, no equipment awaits a FEMA rate, and nothing is still queued on this device. */
export function claimReadiness(d: Pick<IncidentData, "labor" | "equipment" | "materials" | "queuedIds">) {
  const rows = [...d.labor, ...d.equipment, ...d.materials] as { rate_verified: boolean; review_status?: string; client_generated_id: string }[];
  const unverified = rows.filter((r) => !r.rate_verified).length;
  const unapproved = rows.filter((r) => r.review_status !== "approved").length;
  const pendingFema = d.equipment.filter((e) => e.rate_source === "unlisted_pending_fema").length;
  const queued = rows.filter((r) => d.queuedIds.has(r.client_generated_id)).length;
  const blockers: ClaimBlocker[] = [];
  if (unverified) blockers.push({ kind: "unverified_rate", count: unverified, label: `${unverified} cost entr${unverified === 1 ? "y has" : "ies have"} rates not yet verified by a Finance Auditor` });
  if (unapproved) blockers.push({ kind: "unapproved", count: unapproved, label: `${unapproved} cost entr${unapproved === 1 ? "y is" : "ies are"} not approved` });
  if (pendingFema) blockers.push({ kind: "pending_fema_rate", count: pendingFema, label: `${pendingFema} equipment entr${pendingFema === 1 ? "y is" : "ies are"} waiting on a FEMA rate request` });
  if (queued) blockers.push({ kind: "queued", count: queued, label: `${queued} entr${queued === 1 ? "y is" : "ies are"} still waiting to sync from this device` });
  return { ready: blockers.length === 0, blockers };
}
