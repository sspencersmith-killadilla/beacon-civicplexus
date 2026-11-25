import { toCSV } from "./csv";
import type { IncidentData } from "./incident-data";

/**
 * CSVs laid out like FEMA's Public Assistance summary records (Force Account Labor, Force Account Equipment,
 * Materials, Contract Work). Column order follows the paper forms so finance staff can paste rows straight in.
 * Rows are grouped by project site so each worksheet's records are together.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;
const day = (iso: string) => iso.slice(0, 10);

function header(d: IncidentData, applicant: string, projectId: string | null | undefined) {
  const p = d.projects.find((x) => x.id === projectId);
  return { Applicant: applicant, "Disaster Number": d.incident.fema_declaration ?? "", "Project Number": p?.project_number ?? "", "Project / Site": p?.name ?? "Unassigned" };
}
const H = ["Applicant", "Disaster Number", "Project Number", "Project / Site"];
const byProject = <T extends { project_id?: string | null; entry_time: string }>(rows: T[]) =>
  [...rows].sort((a, b) => (a.project_id ?? "~").localeCompare(b.project_id ?? "~") || a.entry_time.localeCompare(b.entry_time));

export function laborSummaryRow(l: { regular_hours: number; overtime_hours: number; hourly_rate: number; fringe_pct: number }) {
  const rate = Number(l.hourly_rate), f = Number(l.fringe_pct) / 100;
  const otRate = rate * 1.5;
  const regBenefit = r2(rate * f), otBenefit = r2(otRate * f);
  const regTotal = r2(Number(l.regular_hours) * (rate + rate * f));
  const otTotal = r2(Number(l.overtime_hours) * (otRate + otRate * f));
  return { "Regular Hourly Rate": r2(rate), "Overtime Hourly Rate": r2(otRate), "Benefit Rate/hr (Regular)": regBenefit, "Benefit Rate/hr (Overtime)": otBenefit, "Total Regular Cost": regTotal, "Total Overtime Cost": otTotal, "Total Cost": r2(regTotal + otTotal) };
}

export function femaSummaries(d: IncidentData, applicant: string) {
  const labor = toCSV(byProject(d.labor).map((l) => ({
    ...header(d, applicant, l.project_id), Name: l.staff_name, "Job Title": l.role_title ?? "", Agency: l.mutual_aid_agency ?? applicant, Department: l.department ?? "",
    "Date Worked": day(l.entry_time), "Regular Hours": l.regular_hours, "Overtime Hours": l.overtime_hours, ...laborSummaryRow(l), "Crew Ticket": l.crew_ticket_id ?? "", "Description of Work": l.task_description ?? "", "Category of Work": l.fema_category,
  })), [...H, "Name", "Job Title", "Agency", "Department", "Date Worked", "Regular Hours", "Overtime Hours", "Regular Hourly Rate", "Overtime Hourly Rate", "Benefit Rate/hr (Regular)", "Benefit Rate/hr (Overtime)", "Total Regular Cost", "Total Overtime Cost", "Total Cost", "Crew Ticket", "Description of Work", "Category of Work"]);
  const equipment = toCSV(byProject(d.equipment).map((e) => ({
    ...header(d, applicant, e.project_id), "Type of Equipment": e.equipment_name, "Equipment Code Number": e.fema_cost_code ?? e.fema_code ?? "", "Schedule Edition": e.schedule_edition ?? "", "Operator Name": e.operator_name ?? "",
    "Date Used": day(e.entry_time), "Hours Used": e.active_hours, "Standby Hours (Not Claimed)": e.standby_hours, "Equipment Rate": e.hourly_rate, "Total Cost": e.reimbursable_total ?? e.total_cost, "Work Location": e.work_location ?? "", "Category of Work": e.fema_category,
  })), [...H, "Type of Equipment", "Equipment Code Number", "Schedule Edition", "Operator Name", "Date Used", "Hours Used", "Standby Hours (Not Claimed)", "Equipment Rate", "Total Cost", "Work Location", "Category of Work"]);
  const materials = toCSV(byProject(d.materials).map((m) => ({
    ...header(d, applicant, m.project_id), Vendor: m.vendor ?? "", Description: m.item_description, Quantity: m.quantity, "Unit Price": m.unit_cost, "Total Price": m.total_cost,
    "Date Purchased": day(m.entry_time), "Date Used": day(m.entry_time), "Receipt on File": m.receipt_path ? "Yes" : "No", "Category of Work": m.fema_category,
  })), [...H, "Vendor", "Description", "Quantity", "Unit Price", "Total Price", "Date Purchased", "Date Used", "Receipt on File", "Category of Work"]);
  const contracts = toCSV(byProject(d.contracts).map((c) => ({
    ...header(d, applicant, c.project_id), "Contractor / Agency": c.vendor, Type: c.kind === "mutual_aid" ? "Mutual Aid" : c.kind === "rental" ? "Rental" : "Contract", "Date Worked": day(c.entry_time),
    "Contract Number": c.contract_number ?? "", "PO Number": c.po_number ?? "", "Ticket / Invoice Number": c.ticket_number ?? "", "Procurement Method": c.procurement_method ?? "", "Description of Work": c.description,
    Quantity: c.quantity, Unit: c.unit ?? "", "Unit Price": c.unit_cost, Amount: c.total_cost, "Invoice on File": c.invoice_path ? "Yes" : "No", "Category of Work": c.fema_category,
  })), [...H, "Contractor / Agency", "Type", "Date Worked", "Contract Number", "PO Number", "Ticket / Invoice Number", "Procurement Method", "Description of Work", "Quantity", "Unit", "Unit Price", "Amount", "Invoice on File", "Category of Work"]);
  return { labor, equipment, materials, contracts };
}
