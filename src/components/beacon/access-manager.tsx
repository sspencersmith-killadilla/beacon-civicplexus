import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, fmtLocal } from "@/lib/fema";
import type { Database } from "@/integrations/supabase/types";
import { useOrgCtx } from "./org-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = Database["public"]["Enums"]["org_role"];
const sec = "rounded-lg border bg-card p-5";
const roleOpts = Object.entries(ROLE_LABELS);

function RolePick({ value, onChange, className = "w-44" }: { value: string; onChange: (v: Role) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)}>
      <SelectTrigger className={className}><SelectValue /></SelectTrigger>
      <SelectContent>{roleOpts.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function AccessManager() {
  const { org } = useOrgCtx();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState(org.join_code);
  const members = useQuery({ queryKey: ["members", org.id], queryFn: async () => (await supabase.from("organization_members").select("*").eq("organization_id", org.id).order("created_at")).data ?? [] });
  const invites = useQuery({ queryKey: ["invites", org.id], queryFn: async () => (await supabase.from("org_invites").select("*").eq("organization_id", org.id).order("created_at", { ascending: false })).data ?? [] });
  const requests = useQuery({ queryKey: ["join-requests", org.id], queryFn: async () => (await supabase.from("join_requests").select("*").eq("organization_id", org.id).eq("status", "pending").order("created_at")).data ?? [] });
  const depts = useQuery({ queryKey: ["departments", org.id], queryFn: async () => (await supabase.from("departments").select("name").eq("organization_id", org.id).order("name")).data ?? [] });
  const [inv, setInv] = useState<{ email: string; role: Role; department: string; days: string }>({ email: "", role: "field_responder", department: "", days: "7" });
  const [reqRole, setReqRole] = useState<Record<string, Role>>({});
  const done = (error: { message: string } | null, keys: string[][], msg: string) => {
    if (error) { toast.error(error.message); return false; }
    toast.success(msg); keys.forEach((k) => void qc.invalidateQueries({ queryKey: k })); return true;
  };
  const link = (token: string) => `${window.location.origin}/invite/${token}`;
  const copy = async (token: string) => { await navigator.clipboard.writeText(link(token)); toast.success("Invite link copied"); };
  const status = (i: { revoked_at: string | null; accepted_at: string | null; expires_at: string }) =>
    i.revoked_at ? "Revoked" : i.accepted_at ? "Accepted" : Date.parse(i.expires_at) < Date.now() ? "Expired" : "Active";

  return (
    <section className={`${sec} lg:col-span-2`}>
      <h2 className="font-semibold">Staff access</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Invite by email</h3>
          <p className="mt-1 text-xs text-muted-foreground">The invite only works for this email address, gives the role and department you pick, and expires automatically. Send the link to the person.</p>
          <form className="mt-3 grid gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const expires = new Date(Date.now() + Math.max(1, Math.min(30, Number(inv.days) || 7)) * 86400000).toISOString();
            const { data, error } = await supabase.from("org_invites").insert({ organization_id: org.id, email: inv.email.trim().toLowerCase(), role: inv.role, department: inv.department || null, expires_at: expires, created_by: user!.id }).select("token").single();
            if (done(error, [["invites", org.id]], "Invite created") && data) { await copy(data.token); setInv({ ...inv, email: "" }); }
          }}>
            <div className="grid gap-1.5"><Label htmlFor="inv-email">Email</Label><Input id="inv-email" type="email" required value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} /></div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem] gap-2">
              <div className="grid gap-1.5"><Label>Role</Label><RolePick className="w-full" value={inv.role} onChange={(v) => setInv({ ...inv, role: v })} /></div>
              <div className="grid gap-1.5"><Label>Department</Label>
                <Select value={inv.department || "__none"} onValueChange={(v) => setInv({ ...inv, department: v === "__none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="__none">None</SelectItem>{(depts.data ?? []).map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="inv-days">Days</Label><Input id="inv-days" inputMode="numeric" className="font-mono" value={inv.days} onChange={(e) => setInv({ ...inv, days: e.target.value })} /></div>
            </div>
            <Button type="submit">Create invite &amp; copy link</Button>
          </form>
          <ul className="mt-3 divide-y text-sm">
            {(invites.data ?? []).slice(0, 15).map((i) => { const s = status(i); return (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
                <span className="min-w-0"><span className="block truncate font-medium">{i.email}</span><span className="block truncate text-xs text-muted-foreground">{ROLE_LABELS[i.role]}{i.department ? ` · ${i.department}` : ""} · {s}{s === "Active" ? ` until ${fmtLocal(i.expires_at)}` : ""}</span></span>
                {s === "Active" && <span className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label={`Copy invite link for ${i.email}`} onClick={() => void copy(i.token)}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label={`Revoke invite for ${i.email}`} onClick={async () => { const { error } = await supabase.from("org_invites").update({ revoked_at: new Date().toISOString() }).eq("id", i.id); done(error, [["invites", org.id]], "Invite revoked"); }}><Trash2 className="h-4 w-4" /></Button>
                </span>}
              </li>
            ); })}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Join code</h3>
          <p className="mt-1 text-xs text-muted-foreground">Anyone with the code can ask to join; nobody gets in until you approve them below. If the code leaks, make a new one — the old one stops working immediately.</p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="rounded-md bg-muted p-3 text-center font-mono text-2xl font-bold tracking-[0.3em]">{code}</div>
            <Button variant="outline" onClick={async () => { const { data, error } = await supabase.rpc("rotate_join_code", { _org: org.id }); if (done(error, [["org"], ["my-orgs"]], "New join code created") && data) setCode(data); }}><RefreshCw className="h-4 w-4" />New code</Button>
          </div>
          <h3 className="mt-6 text-sm font-semibold">Waiting for approval ({requests.data?.length ?? 0})</h3>
          <ul className="mt-2 divide-y">
            {(requests.data ?? []).map((r) => (
              <li key={r.id} className="grid gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.full_name || r.email}</span><span className="block truncate text-xs text-muted-foreground">{r.email} · {fmtLocal(r.created_at)}</span></span>
                <RolePick value={reqRole[r.id] ?? "field_responder"} onChange={(v) => setReqRole({ ...reqRole, [r.id]: v })} />
                <Button size="sm" onClick={async () => { const { error } = await supabase.rpc("decide_join_request", { _id: r.id, _approve: true, _role: reqRole[r.id] ?? "field_responder" }); done(error, [["join-requests", org.id], ["members", org.id]], "Approved"); }}>Approve</Button>
                <Button size="sm" variant="outline" onClick={async () => { const { error } = await supabase.rpc("decide_join_request", { _id: r.id, _approve: false }); done(error, [["join-requests", org.id]], "Request denied"); }}>Deny</Button>
              </li>
            ))}
            {requests.data?.length === 0 && <li className="py-2 text-sm text-muted-foreground">No pending requests.</li>}
          </ul>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-semibold">Members</h3>
      <ul className="mt-2 divide-y">
        {(members.data ?? []).map((m) => (
          <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-2">
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{m.full_name || m.email}</span><span className="block truncate text-xs text-muted-foreground">{m.email}{m.department ? ` · ${m.department}` : ""}</span></span>
            <Select value={m.role} disabled={m.user_id === user?.id} onValueChange={async (v) => { const { error } = await supabase.from("organization_members").update({ role: v as Role }).eq("id", m.id); done(error, [["members", org.id]], "Role updated"); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{roleOpts.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="icon" variant="ghost" aria-label="Remove member" disabled={m.user_id === user?.id} onClick={async () => { const { error } = await supabase.from("organization_members").delete().eq("id", m.id); done(error, [["members", org.id]], "Member removed"); }}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
