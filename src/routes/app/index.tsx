import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useMyOrgs } from "@/lib/org";
import { ROLE_LABELS } from "@/lib/fema";
import { Button } from "@/components/ui/button";
import { BeaconWordmark } from "@/components/beacon/logo";

export const Route = createFileRoute("/app/")({ component: Chooser });

function Chooser() {
  const { user, loading } = useAuth();
  const orgs = useMyOrgs();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" search={{ next: "/app" }} />;
  if (orgs.isLoading) return <div className="p-8 text-muted-foreground">Loading workspaces…</div>;
  const list = orgs.data ?? [];
  if (list.length === 1) return <Navigate to="/app/$org" params={{ org: list[0]!.slug }} />;
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <BeaconWordmark />
      <h1 className="mt-8 text-2xl font-semibold">Choose a city workspace</h1>
      <div className="mt-6 grid gap-2">
        {list.map((o) => (
          <Link key={o.id} to="/app/$org" params={{ org: o.slug }} className="flex items-center justify-between rounded-lg border bg-card p-4 hover:border-amber">
            <span className="font-medium">{o.name}, {o.state}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[o.role]}</span>
          </Link>
        ))}
        {list.length === 0 && <p className="text-muted-foreground">You're not part of a city yet.</p>}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild><Link to="/register-city">Register your city</Link></Button>
        <Button asChild variant="outline"><Link to="/join">Join with a code</Link></Button>
        <Button asChild variant="ghost"><Link to="/app/$org" params={{ org: "demo" }}>Explore demo</Link></Button>
      </div>
    </div>
  );
}
