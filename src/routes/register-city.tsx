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

export const Route = createFileRoute("/register-city")({
  head: () => ({ meta: [
    { title: "Register your city — Beacon" }, { name: "description", content: "Create your municipality's Beacon workspace in minutes." },
    { property: "og:title", content: "Register your city — Beacon" }, { property: "og:description", content: "Create your municipality's Beacon workspace in minutes." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: RegisterCity,
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function RegisterCity() {
  const { user, loading } = useAuth();
  const navigate = useNavigate(); const qc = useQueryClient();
  const [name, setName] = useState(""); const [state, setState] = useState(""); const [full, setFull] = useState(""); const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const slug = `${slugify(name)}-${slugify(state)}`;
    const { error } = await supabase.rpc("register_city", { _name: name, _slug: slug, _state: state.toUpperCase(), _full_name: full });
    setBusy(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "That city is already registered — ask its admin for a join code." : error.message); return; }
    await qc.invalidateQueries();
    toast.success(`${name} workspace created with a sample incident`);
    navigate({ to: "/app/$org", params: { org: slug } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <Link to="/"><BeaconWordmark /></Link>
        <h1 className="mt-6 text-xl font-semibold">Register your city</h1>
        <p className="mt-1 text-sm text-muted-foreground">You'll become the City Admin. We'll set up standard departments, rate tables, and a sample winter storm incident so you can explore.</p>
        {loading ? null : !user ? (
          <div className="mt-6"><Button asChild className="w-full"><Link to="/auth" search={{ next: "/register-city" }}>Sign in or create an account first</Link></Button></div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <div className="grid gap-1.5"><Label htmlFor="city">City name</Label><Input id="city" required value={name} onChange={(e) => setName(e.target.value)} placeholder="City of Riverbend" /></div>
            <div className="grid gap-1.5"><Label htmlFor="st">State</Label><Input id="st" required maxLength={2} value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" /></div>
            <div className="grid gap-1.5"><Label htmlFor="full">Your name</Label><Input id="full" required value={full} onChange={(e) => setFull(e.target.value)} /></div>
            <Button disabled={busy} type="submit">Create workspace</Button>
          </form>
        )}
      </div>
    </div>
  );
}
