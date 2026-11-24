import { fmtUSD } from "@/lib/costs";
import { useSync } from "./sync-context";
import { summarize, type IncidentData } from "@/lib/incident-data";

export function KpiCards({ data }: { data: IncidentData }) {
  const s = summarize(data);
  const { pending } = useSync();
  const cards = [
    { k: "Staff hours", v: `${(s.regHours + s.otHours).toFixed(1)}`, sub: `${s.regHours.toFixed(1)} reg · ${s.otHours.toFixed(1)} OT` },
    { k: "Est. reimbursable", v: fmtUSD(s.total), sub: "labor + equipment + materials", tone: "text-emerald" },
    { k: "Equipment deployments", v: String(s.activeEquipment), sub: fmtUSD(s.equipCost) },
    { k: "Pending offline syncs", v: String(pending), sub: pending ? "on this device" : "all synced", tone: pending ? "text-amber" : "" },
    { k: "Field entries", v: String(s.entries), sub: `${data.logs.length} ICS-214 notes` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((c) => (
        <div key={c.k} className="rounded-lg border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.k}</div>
          <div className={`mt-1 font-mono text-2xl font-semibold ${c.tone ?? ""}`}>{c.v}</div>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

export const STATUS_STYLES: Record<string, string> = {
  active: "bg-amber text-amber-foreground",
  recovery: "bg-amber-soft text-foreground",
  closed: "bg-muted text-muted-foreground",
};
