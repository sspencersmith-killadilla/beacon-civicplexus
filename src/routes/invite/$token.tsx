import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, fmtLocal } from "@/lib/fema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BeaconWordmark } from "@/components/beacon/logo";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Accept your invite — Beacon" }, { name: "description", content: "Accept an invitation to your city's Beacon workspace." },
    { property: "og:title", content: "Accept your invite — Beacon" }, { property: "og:description", content: "Accept an invitation to your city's Beacon workspace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth(); const navigate = useNavigate(); const qc = useQueryClient();
  const [full, setFull] = useState(""); const [busy, setBusy] = useState(false);
  const inv = useQuery({ queryKey: ["invite", token], queryFn: async () => { const { data, error } = await supabase.rpc("get_invite", { _token: token }); if (error) throw error; return data?.[0] ?? null; } });
  const i = inv.data;
  const accept = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data, error } = await supabase.rpc("accept_invite", { _token: token, _full_name: full });
    if (error) { setBusy(false); toast.error(error.message); return; }
    const { data: org } = await supabase.from("organizations").select("slug").eq("id", data).single();
    await qc.invalidateQueries(); setBusy(false);
    navigate({ to: "/app/$org", params: { org: org!.slug } });
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <Link to="/"><BeaconWordmark /></Link>
        {inv.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Checking invite…</p> : !i ? (
          <p className="mt-6 text-sm">This invite link isn't valid. Ask your City Admin for a new one.</p>
        ) : i.status !== "valid" ? (
          <p className="mt-6 text-sm">This invite has {i.status === "accepted" ? "already been used" : i.status === "revoked" ? "been cancelled" : "expired"}. Ask your City Admin for a new one.</p>
        ) : (<>
          <h1 className="mt-6 text-xl font-semibold">Join {i.organization_name}, {i.organization_state}</h1>
          <p className="mt-1 text-sm text-muted-foreground">You're invited as <strong>{ROLE_LABELS[i.role]}</strong>{i.department ? ` in ${i.department}` : ""}. For <span className="font-mono">{i.email}</span> · expires {fmtLocal(i.expires_at)}.</p>
          {loading ? null : !user ? (
            <Button asChild className="mt-6 w-full"><Link to="/auth" search={{ next: `/invite/${token}` }}>Sign in or create an account as {i.email}</Link></Button>
          ) : user.email?.toLowerCase() !== i.email.toLowerCase() ? (
            <p className="mt-6 rounded-md bg-amber-soft p-3 text-sm">You're signed in as {user.email}. Sign out and sign in as {i.email} to accept.</p>
          ) : (
            <form onSubmit={accept} className="mt-6 grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="full">Your name</Label><Input id="full" required value={full} onChange={(e) => setFull(e.target.value)} /></div>
              <Button disabled={busy} type="submit">Accept invite</Button>
            </form>
          )}
        </>)}
      </div>
    </div>
  );
}
