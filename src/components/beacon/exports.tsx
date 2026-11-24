import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { claimReadiness } from "@/lib/claim";
import { useOrgCtx } from "./org-context";
import { downloadCSV, toCSV } from "@/lib/csv";
import { femaLabel } from "@/lib/fema";
import { RATE_SOURCE_LABELS } from "@/lib/fleet";
import type { IncidentData } from "@/lib/incident-data";
import { Button } from "@/components/ui/button";

export function ExportCenter({ data }: { data: IncidentData }) {
  const inc = data.incident;
  const { org } = useOrgCtx();
  const { ready, blockers } = claimReadiness(data);
  const [pdfBusy, setPdfBusy] = useState(false);
  const fileName = (n: string) => (ready ? n : `DRAFT-not-for-filing_${n}`);
  const pdf = async () => {
    setPdfBusy(true);
    try {
      const { buildClaimPdf } = await import("@/lib/claim-pdf");
      const blob = await buildClaimPdf(data, { orgName: org.name, draft: !ready });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = fileName(`fema_packet_${inc.name.replace(/[^a-z0-9]+/gi, "_")}.pdf`); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not build the PDF"); }
    setPdfBusy(false);
  };
  const meta = (r: { entry_time: string; original_timestamp: string; timestamp_edited: boolean }) => ({ incident: inc.name, declaration: inc.fema_declaration ?? "", entry_time_utc: r.entry_time, original_timestamp_utc: r.original_timestamp, timestamp_edited: r.timestamp_edited });
  const files = [
    { name: "force_account_labor.csv", n: data.labor.length, run: () => toCSV(data.labor.map((r) => ({ ...meta(r), staff_name: r.staff_name, role_title: r.role_title, department: r.department, fema_category: femaLabel(r.fema_category), regular_hours: r.regular_hours, overtime_hours: r.overtime_hours, hourly_rate: r.hourly_rate, fringe_pct: r.fringe_pct, total_cost: r.total_cost, task_description: r.task_description, rate_verified: r.rate_verified, logged_by: r.author_name })), ["incident", "declaration", "entry_time_utc", "staff_name", "role_title", "department", "fema_category", "regular_hours", "overtime_hours", "hourly_rate", "fringe_pct", "total_cost", "task_description", "rate_verified", "logged_by", "original_timestamp_utc", "timestamp_edited"]) },
    { name: "force_account_equipment.csv", n: data.equipment.length, run: () => toCSV(data.equipment.map((r) => ({ ...meta(r), equipment_name: r.equipment_name, "FEMA Cost Code": r.fema_cost_code ?? r.fema_code ?? "", "Schedule Edition": r.schedule_edition ?? "", "Rate Source": RATE_SOURCE_LABELS[r.rate_source ?? ""] ?? r.rate_source ?? "", operator_name: r.operator_name, department: r.department, fema_category: femaLabel(r.fema_category), "Active Hours": r.active_hours, "Standby Hours (Non-Reimbursable)": r.standby_hours, "Hourly Rate": r.hourly_rate, "Eligible Reimbursable Total": r.reimbursable_total ?? r.total_cost, work_location: r.work_location, rate_verified: r.rate_verified })), ["incident", "declaration", "entry_time_utc", "equipment_name", "FEMA Cost Code", "Schedule Edition", "Rate Source", "operator_name", "department", "fema_category", "Active Hours", "Standby Hours (Non-Reimbursable)", "Hourly Rate", "Eligible Reimbursable Total", "work_location", "rate_verified", "original_timestamp_utc", "timestamp_edited"]) },
    { name: "materials_and_purchases.csv", n: data.materials.length, run: () => toCSV(data.materials.map((r) => ({ ...meta(r), vendor: r.vendor, item_description: r.item_description, department: r.department, quantity: r.quantity, unit_cost: r.unit_cost, total_cost: r.total_cost, fema_category: femaLabel(r.fema_category), has_receipt: !!r.receipt_path })), ["incident", "declaration", "entry_time_utc", "vendor", "item_description", "department", "quantity", "unit_cost", "total_cost", "fema_category", "has_receipt", "original_timestamp_utc", "timestamp_edited"]) },
    { name: "ics214_activity_log.csv", n: data.logs.length, run: () => toCSV(data.logs.map((r) => ({ ...meta(r), department: r.department, category: r.category, notes: r.notes, location_address: r.location_address, gps_lat: r.gps_lat, gps_lng: r.gps_lng, fema_category: r.fema_category ? femaLabel(r.fema_category) : "", author: r.author_name })), ["incident", "declaration", "entry_time_utc", "department", "category", "notes", "location_address", "gps_lat", "gps_lng", "fema_category", "author", "original_timestamp_utc", "timestamp_edited"]) },
  ];
  const claim = new Set(["force_account_labor.csv", "force_account_equipment.csv", "materials_and_purchases.csv"]);
  return (
    <div className="grid gap-3">
      {ready ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald bg-emerald-soft p-4 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-emerald" />FEMA-ready: every cost entry is approved and its rate verified.</div>
      ) : (
        <div className="rounded-lg border border-amber bg-amber-soft p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber" />Claim exports are locked until these are resolved</div>
          <ul className="mt-2 list-disc pl-6">{blockers.map((b) => <li key={b.kind}>{b.label}</li>)}</ul>
          <p className="mt-2 text-xs text-muted-foreground">Review and verify entries in the Timeline. Until then, claim files download as drafts marked "not for filing". Built-in FEMA rates are estimates — verify them against the current official schedule.</p>
        </div>
      )}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div><div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" />FEMA reimbursement packet (PDF)</div><div className="text-xs text-muted-foreground">Summary, all cost and ICS-214 entries, and every photo and receipt embedded with time and GPS.</div></div>
        <Button variant={ready ? "default" : "outline"} disabled={pdfBusy} onClick={() => void pdf()}><Download className="h-4 w-4" />{pdfBusy ? "Building…" : ready ? "Download PDF" : "Download draft PDF"}</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
      {files.map((f) => (
        <div key={f.name} className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div><div className="font-mono text-sm font-semibold">{f.name}</div><div className="text-xs text-muted-foreground">{f.n} rows</div></div>
          <Button variant="outline" onClick={() => downloadCSV(claim.has(f.name) ? fileName(f.name) : f.name, f.run())}><Download className="h-4 w-4" />{claim.has(f.name) && !ready ? "Download draft" : "Download"}</Button>
        </div>
      ))}
      </div>
    </div>
  );
}
