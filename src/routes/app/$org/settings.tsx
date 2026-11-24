import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/fema";
import { useOrgCtx } from "@/components/beacon/org-context";
import { FleetManager } from "@/components/beacon/fleet-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/$org/settings")({ component: Settings });

const sec = "rounded-lg border bg-card p-5";

function Settings() {
  const { org, role } = useOrgCtx();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [b, setB] = useState({ name: org.name, state: org.state, logo_url: org.logo_url ?? "", primary_color: org.primary_color });
  const depts = useQuery({ queryKey: ["departments", org.id], queryFn: async () => (await supabase.from("departments").select("*").eq("organization_id", org.id).order("name")).data ?? [] });
  const rates = useQuery({ queryKey: ["rates", org.id], queryFn: async () => (await supabase.from("rate_cards").select("*").eq("organization_id", org.id).order("kind").order("name")).data ?? [] });
  const members = useQuery({ queryKey: ["members", org.id], queryFn: async () => (await supabase.from("organization_members").select("*").eq("organization_id", org.id).order("created_at")).data ?? [] });
  const [dept, setDept] = useState("");
  const [rate, setRate] = useState({ kind: "labor", name: "", code: "", hourly_rate: "", fringe_pct: "" });

  if (role === "finance_auditor") return <div className="grid gap-5"><FleetManager /></div>;
  if (role !== "city_admin") return <p className="text-muted-foreground">Only City Admins and Finance Auditors can manage settings.</p>;
  const done = (error: { message: string } | null, keys: string[][], msg = "Saved") => {
    if (error) { toast.error(error.message); return; }
    toast.success(msg); keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {!org.is_demo && <section className={sec}>
        <h2 className="font-semibold">City branding</h2>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-1.5"><Label>City name</Label><Input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>State</Label><Input maxLength={2} value={b.state} onChange={(e) => setB({ ...b, state: e.target.value.toUpperCase() })} /></div>
          <div className="grid gap-1.5"><Label>Municipal seal / logo URL</Label><Input value={b.logo_url} onChange={(e) => setB({ ...b, logo_url: e.target.value })} placeholder="https://…" /></div>
          <div className="grid gap-1.5"><Label>Accent color</Label><div className="flex gap-2"><input type="color" className="h-10 w-14 rounded border" value={b.primary_color} onChange={(e) => setB({ ...b, primary_color: e.target.value })} /><Input className="font-mono" value={b.primary_color} onChange={(e) => setB({ ...b, primary_color: e.target.value })} /></div></div>
          <Button onClick={async () => { const { error } = await supabase.from("organizations").update({ ...b, logo_url: b.logo_url || null }).eq("id", org.id); done(error, [["org"], ["my-orgs"]]); }}>Save branding</Button>
        </div>
      </section>}

      {!org.is_demo && <section className={sec}>
        <h2 className="font-semibold">Invite staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">Share this join code. New members join as Field Responders; change their role below.</p>
        <div className="mt-4 rounded-md bg-muted p-4 text-center font-mono text-3xl font-bold tracking-[0.3em]">{org.join_code}</div>
        <p className="mt-2 text-center text-xs text-muted-foreground">They sign up, then open <span className="font-mono">/join</span> and enter the code.</p>
        <h3 className="mt-6 text-sm font-semibold">Members</h3>
        <ul className="mt-2 divide-y">
          {(members.data ?? []).map((m) => (
            <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-2">
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{m.full_name || m.email}</span><span className="block truncate text-xs text-muted-foreground">{m.email}</span></span>
              <Select value={m.role} disabled={m.user_id === user?.id} onValueChange={async (v) => { const { error } = await supabase.from("organization_members").update({ role: v as typeof m.role }).eq("id", m.id); done(error, [["members", org.id]], "Role updated"); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon" variant="ghost" aria-label="Remove member" disabled={m.user_id === user?.id} onClick={async () => { const { error } = await supabase.from("organization_members").delete().eq("id", m.id); done(error, [["members", org.id]], "Member removed"); }}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </section>}

      <section className={sec}>
        <h2 className="font-semibold">Departments</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(depts.data ?? []).map((d) => (
            <span key={d.id} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">{d.name}
              <button aria-label={`Remove ${d.name}`} onClick={async () => { const { error } = await supabase.from("departments").delete().eq("id", d.id); done(error, [["departments", org.id]], "Removed"); }}><Trash2 className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.from("departments").insert({ organization_id: org.id, name: dept }); done(error, [["departments", org.id]], "Department added"); setDept(""); }}>
          <Input required value={dept} onChange={(e) => setDept(e.target.value)} placeholder="New department" /><Button type="submit">Add</Button>
        </form>
      </section>

      <section className={sec}>
        <h2 className="font-semibold">Standard rate tables</h2>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th>Type</th><th>Name</th><th>Code</th><th>Rate</th><th>Fringe</th><th /></tr></thead>
          <tbody className="font-mono">
            {(rates.data ?? []).map((r) => (
              <tr key={r.id} className="border-t"><td className="py-1.5 font-sans capitalize">{r.kind}</td><td className="font-sans">{r.name}</td><td>{r.code}</td><td>${r.hourly_rate}</td><td>{r.kind === "labor" ? `${r.fringe_pct}%` : "—"}</td>
                <td><Button size="icon" variant="ghost" aria-label="Remove rate" onClick={async () => { const { error } = await supabase.from("rate_cards").delete().eq("id", r.id); done(error, [["rates", org.id]], "Removed"); }}><Trash2 className="h-4 w-4" /></Button></td></tr>
            ))}
          </tbody>
        </table>
        <form className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6" onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("rate_cards").insert({ organization_id: org.id, kind: rate.kind, name: rate.name, code: rate.code || null, hourly_rate: Number(rate.hourly_rate) || 0, fringe_pct: Number(rate.fringe_pct) || 0 });
          done(error, [["rates", org.id]], "Rate added"); setRate({ ...rate, name: "", code: "", hourly_rate: "", fringe_pct: "" });
        }}>
          <Select value={rate.kind} onValueChange={(v) => setRate({ ...rate, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="labor">Labor</SelectItem><SelectItem value="equipment">Equipment</SelectItem></SelectContent></Select>
          <Input required placeholder="Name" value={rate.name} onChange={(e) => setRate({ ...rate, name: e.target.value })} />
          <Input placeholder="Code" value={rate.code} onChange={(e) => setRate({ ...rate, code: e.target.value })} />
          <Input required placeholder="$/hr" inputMode="decimal" value={rate.hourly_rate} onChange={(e) => setRate({ ...rate, hourly_rate: e.target.value })} />
          <Input placeholder="Fringe %" inputMode="decimal" value={rate.fringe_pct} onChange={(e) => setRate({ ...rate, fringe_pct: e.target.value })} />
          <Button type="submit">Add</Button>
        </form>
      </section>
      <FleetManager />
    </div>
  );
}
