import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canCommand } from "@/lib/org";
import { FEMA_CATEGORIES, fmtLocal, fmtUTC } from "@/lib/fema";
import { fmtUSD } from "@/lib/costs";
import { RATE_SOURCE_LABELS } from "@/lib/fleet";
import { summarize, type IncidentData } from "@/lib/incident-data";
import { useOrgCtx } from "./org-context";
import { EvidenceGallery } from "./evidence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Action = { type: string; item: string; action?: string; owner: string; target: string };

export function AfterActionReport({ data }: { data: IncidentData }) {
  const { org, role } = useOrgCtx();
  const qc = useQueryClient();
  const editable = canCommand(role);
  const s = summarize(data);
  const [summary, setSummary] = useState(data.aar?.executive_summary ?? "");
  const [actions, setActions] = useState<Action[]>((data.aar?.corrective_actions as Action[] | null) ?? []);
  useEffect(() => { setSummary(data.aar?.executive_summary ?? ""); setActions((data.aar?.corrective_actions as Action[] | null) ?? []); }, [data.aar]);
  const inc = data.incident;

  const save = async () => {
    const { error } = await supabase.from("aar_reports").upsert({ organization_id: org.id, incident_id: inc.id, executive_summary: summary, corrective_actions: actions, updated_at: new Date().toISOString() }, { onConflict: "incident_id" });
    if (error) toast.error(error.message); else { toast.success("Report saved"); await qc.invalidateQueries({ queryKey: ["incident-data", inc.id] }); }
  };
  const upd = (i: number, k: keyof Action, v: string) => setActions(actions.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  const H = ({ n, t }: { n: number; t: string }) => <h2 className="mt-10 border-b pb-2 text-lg font-semibold"><span className="font-mono text-amber">{n}.</span> {t}</h2>;
  const th = "border-b px-2 py-1.5 text-left text-xs font-semibold uppercase text-muted-foreground";
  const td = "border-b px-2 py-1.5 align-top";

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print / Save as PDF</Button>
        {editable && <Button variant="outline" onClick={() => void save()}>Save edits</Button>}
      </div>
      <article className="rounded-lg border bg-card p-8 text-sm print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">After-Action Report</p>
            <h1 className="mt-1 text-2xl font-bold">{inc.name}</h1>
            <p className="mt-1 text-muted-foreground">{org.name}, {org.state}</p>
            <p className="mt-1 font-mono text-xs">{inc.fema_declaration ?? "No declaration"} · {fmtUTC(inc.started_at)} → {inc.ended_at ? fmtUTC(inc.ended_at) : "ongoing"} · status {inc.status}</p>
          </div>
          {org.logo_url && <img src={org.logo_url} alt="" className="h-16 w-16 object-contain" />}
        </header>

        <H n={1} t="Executive Summary" />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Staff hours", `${(s.regHours + s.otHours).toFixed(1)}`], ["Overtime hours", s.otHours.toFixed(1)], ["Field entries", String(s.entries)], ["Est. reimbursable", fmtUSD(s.total)]].map(([k, v]) => (
            <div key={k} className="rounded border p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="font-mono text-lg font-semibold">{v}</div></div>
          ))}
        </div>
        {editable ? <Textarea className="no-print mt-3" rows={6} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summarize the incident, response and outcome…" /> : null}
        <p className={`mt-3 whitespace-pre-wrap leading-relaxed ${editable ? "hidden print:block" : ""}`}>{summary || "—"}</p>

        <H n={2} t="Chronological ICS-214 Activity & Decision Log" />
        <table className="mt-3 w-full border-collapse">
          <thead><tr><th className={th}>Time (local / UTC)</th><th className={th}>Dept</th><th className={th}>Category</th><th className={th}>Activity</th><th className={th}>By</th></tr></thead>
          <tbody>{data.logs.map((l) => (
            <tr key={l.id} className="print-avoid-break"><td className={`${td} whitespace-nowrap font-mono text-xs`}>{fmtLocal(l.entry_time)}<br />{fmtUTC(l.entry_time)}</td><td className={td}>{l.department}</td><td className={td}>{l.category}</td><td className={td}>{l.notes}{l.timestamp_edited ? " [timestamp edited]" : ""}</td><td className={td}>{l.author_name}</td></tr>
          ))}</tbody>
        </table>

        <H n={3} t="Departmental Resource Breakdown" />
        <table className="mt-3 w-full border-collapse">
          <thead><tr><th className={th}>Department</th><th className={th}>Reg hrs</th><th className={th}>OT hrs</th><th className={th}>Labor</th><th className={th}>Equipment</th><th className={th}>Materials</th></tr></thead>
          <tbody className="font-mono">{Object.entries(s.byDept).map(([d, v]) => (
            <tr key={d}><td className={`${td} font-sans`}>{d}</td><td className={td}>{v.reg.toFixed(1)}</td><td className={td}>{v.ot.toFixed(1)}</td><td className={td}>{fmtUSD(v.labor)}</td><td className={td}>{fmtUSD(v.equipment)}</td><td className={td}>{fmtUSD(v.materials)}</td></tr>
          ))}</tbody>
        </table>

        <h3 className="mt-6 text-sm font-semibold">Force Account Equipment</h3>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead><tr><th className={th}>Equipment</th><th className={th}>FEMA Cost Code</th><th className={th}>Schedule Edition</th><th className={th}>Rate Source</th><th className={th}>Active Hrs</th><th className={th}>Standby Hrs (Non-Reimb.)</th><th className={th}>Hourly Rate</th><th className={th}>Eligible Total</th></tr></thead>
          <tbody>{data.equipment.map((e) => (
            <tr key={e.id} className="print-avoid-break"><td className={td}>{e.equipment_name}</td><td className={`${td} font-mono`}>{e.fema_cost_code ?? e.fema_code ?? "—"}</td><td className={`${td} font-mono`}>{e.schedule_edition ?? "—"}</td>
              <td className={`${td} ${e.rate_source === "unlisted_pending_fema" ? "text-amber font-semibold" : ""}`}>{RATE_SOURCE_LABELS[e.rate_source ?? ""] ?? "—"}</td>
              <td className={`${td} font-mono`}>{e.active_hours}</td><td className={`${td} font-mono text-muted-foreground`}>{e.standby_hours}</td><td className={`${td} font-mono`}>{fmtUSD(Number(e.hourly_rate))}</td><td className={`${td} font-mono font-semibold`}>{fmtUSD(Number(e.reimbursable_total ?? e.total_cost))}</td></tr>
          ))}</tbody>
        </table>

        <H n={4} t="Estimated Reimbursement Summary by FEMA Category" />
        <table className="mt-3 w-full border-collapse">
          <thead><tr><th className={th}>Category</th><th className={th}>Labor</th><th className={th}>Equipment</th><th className={th}>Materials</th><th className={th}>Total</th></tr></thead>
          <tbody className="font-mono">
            {FEMA_CATEGORIES.filter((c) => s.byCat[c.code]).map((c) => { const v = s.byCat[c.code]!; return (
              <tr key={c.code}><td className={`${td} font-sans`}>{c.label}</td><td className={td}>{fmtUSD(v.labor)}</td><td className={td}>{fmtUSD(v.equipment)}</td><td className={td}>{fmtUSD(v.materials)}</td><td className={`${td} font-semibold`}>{fmtUSD(v.labor + v.equipment + v.materials)}</td></tr>
            ); })}
            <tr><td className={`${td} font-sans font-semibold`}>Total</td><td className={td}>{fmtUSD(s.laborCost)}</td><td className={td}>{fmtUSD(s.equipCost)}</td><td className={td}>{fmtUSD(s.matCost)}</td><td className={`${td} font-bold text-emerald`}>{fmtUSD(s.total)}</td></tr>
          </tbody>
        </table>

        <H n={5} t="Strengths, Gaps & Corrective Action Plan" />
        <table className="mt-3 w-full border-collapse">
          <thead><tr><th className={th}>Type</th><th className={th}>Observation</th><th className={th}>Corrective action</th><th className={th}>Owner</th><th className={th}>Target date</th>{editable && <th className={`${th} no-print`} />}</tr></thead>
          <tbody>{actions.map((a, i) => (
            <tr key={i} className="print-avoid-break">
              {editable ? (
                <>
                  <td className={td}><select className="rounded border bg-background px-1 py-1" value={a.type} onChange={(e) => upd(i, "type", e.target.value)}><option>Strength</option><option>Gap</option></select></td>
                  <td className={td}><Input value={a.item} onChange={(e) => upd(i, "item", e.target.value)} /></td>
                  <td className={td}><Input value={a.action ?? ""} onChange={(e) => upd(i, "action", e.target.value)} /></td>
                  <td className={td}><Input value={a.owner} onChange={(e) => upd(i, "owner", e.target.value)} /></td>
                  <td className={td}><Input type="date" value={a.target} onChange={(e) => upd(i, "target", e.target.value)} /></td>
                  <td className={`${td} no-print`}><Button size="icon" variant="ghost" aria-label="Remove row" onClick={() => setActions(actions.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button></td>
                </>
              ) : (
                <><td className={td}>{a.type}</td><td className={td}>{a.item}</td><td className={td}>{a.action}</td><td className={td}>{a.owner}</td><td className={`${td} font-mono`}>{a.target}</td></>
              )}
            </tr>
          ))}</tbody>
        </table>
        {editable && <Button size="sm" variant="outline" className="no-print mt-2" onClick={() => setActions([...actions, { type: "Gap", item: "", action: "", owner: "", target: "" }])}><Plus className="h-4 w-4" />Add row</Button>}

        <div className="print-page-break" />
        <H n={6} t="Photo Evidence Appendix" />
        <div className="mt-3"><EvidenceGallery data={data} compact /></div>
      </article>
    </div>
  );
}
