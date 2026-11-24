import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BeaconWordmark } from "@/components/beacon/logo";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [
    { title: "Join your city — Beacon" }, { name: "description", content: "Join your city's Beacon workspace with a join code." },
    { property: "og:title", content: "Join your city — Beacon" }, { property: "og:description", content: "Join your city's Beacon workspace with a join code." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Join,
});

function Join() {
  const { user, loading } = useAuth(); const navigate = useNavigate(); const qc = useQueryClient();
  const [code, setCode] = useState(""); const [full, setFull] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data, error } = await supabase.rpc("join_city", { _code: code, _full_name: full });
    if (error) { setBusy(false); toast.error("That join code didn't match a city."); return; }
    const { data: org } = await supabase.from("organizations").select("slug").eq("id", data).single();
    await qc.invalidateQueries(); setBusy(false);
    navigate({ to: "/app/$org", params: { org: org!.slug } });
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <Link to="/"><BeaconWordmark /></Link>
        <h1 className="mt-6 text-xl font-semibold">Join your city</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ask your City Admin for the 8-character join code. You'll join as a Field Responder; your admin can change your role.</p>
        {loading ? null : !user ? (
          <Button asChild className="mt-6 w-full"><Link to="/auth" search={{ next: "/join" }}>Sign in first</Link></Button>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <div className="grid gap-1.5"><Label htmlFor="code">Join code</Label><Input id="code" required className="font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="full">Your name</Label><Input id="full" required value={full} onChange={(e) => setFull(e.target.value)} /></div>
            <Button disabled={busy} type="submit">Join workspace</Button>
          </form>
        )}
      </div>
    </div>
  );
}
