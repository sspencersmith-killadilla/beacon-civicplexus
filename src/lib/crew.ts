/** Daily crew ticket: one foreman submission fans out into linked labor and equipment entries. */
export type CrewMember = { name: string; role: string; rate: number; fringe: number; agency?: string };
export type CrewEquipment = { name: string; code: string | null; edition: string | null; source: string; assetId: string | null; rate: number; activeHours: number; standbyHours: number; operator: string | null };
export type CrewTicket = {
  ticketId: string; entryTime: string; timestampEdited: boolean; department: string | null; fema: string; task: string | null; location: string | null;
  regularHours: number; overtimeHours: number; members: CrewMember[]; equipment: CrewEquipment[];
};

export function buildCrewEntries(t: CrewTicket) {
  const common = { entry_time: t.entryTime, timestamp_edited: t.timestampEdited, department: t.department, fema_category: t.fema, crew_ticket_id: t.ticketId };
  const labor = t.members.filter((m) => m.name.trim()).map((m) => ({
    ...common, staff_name: m.name.trim(), role_title: m.role || null, regular_hours: t.regularHours, overtime_hours: t.overtimeHours,
    hourly_rate: m.rate, fringe_pct: m.fringe, task_description: t.task, mutual_aid_agency: m.agency?.trim() || null,
  }));
  const equipment = t.equipment.filter((e) => e.name.trim()).map((e) => ({
    ...common, equipment_name: e.name, fema_code: e.code, fema_cost_code: e.code, schedule_edition: e.edition, rate_source: e.source,
    city_fleet_asset_id: e.assetId, operator_name: e.operator, active_hours: e.activeHours, standby_hours: e.standbyHours, hourly_rate: e.rate, work_location: t.location,
  }));
  return { labor, equipment };
}
