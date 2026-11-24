import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useOrg } from "@/lib/org";
import { OrgCtx } from "@/components/beacon/org-context";
import { AppShell } from "@/components/beacon/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/$org")({ component: OrgLayout });

function OrgLayout() {
  const { org: slug } = Route.useParams();
  const q = useOrg(slug);
  if (q.isLoading || q.isPending) return <div className="p-8 text-muted-foreground">Loading workspace…</div>;
  if (q.error || !q.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Workspace not available</h1>
        <p className="max-w-sm text-sm text-muted-foreground">This city doesn't exist, or you're not a member of it.</p>
        <Button asChild><Link to="/app">Back to my workspaces</Link></Button>
      </div>
    );
  }
  return (
    <OrgCtx.Provider value={q.data}>
      <AppShell><Outlet /></AppShell>
    </OrgCtx.Provider>
  );
}
