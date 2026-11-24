import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, CloudOff, Hand, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMyOrgs } from "@/lib/org";
import { ROLE_LABELS } from "@/lib/fema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BeaconMark } from "./logo";
import { useFieldMode } from "./field-mode";
import { useSync } from "./sync-context";
import { SyncDrawer } from "./sync-drawer";
import { useOrgCtx } from "./org-context";
import { useReferenceData } from "@/lib/rate-cache";

export function SyncBanner({ canSimulate }: { canSimulate: boolean }) {
  const { online, pending, syncing, authPaused, progress, simulatedOffline } = useSync();
  const [open, setOpen] = useState(false);
  const ok = online && pending === 0 && !authPaused;
  const entries = (n: number) => `${n} saved field entr${n === 1 ? "y" : "ies"}`;
  const text = authPaused ? `Session expired — sign in again to sync your ${entries(pending)}.`
    : progress ? `Syncing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
    : ok ? "Online & Synced"
    : online ? `${pending} entr${pending === 1 ? "y" : "ies"} waiting to sync`
    : `Offline Mode${simulatedOffline ? " (simulated)" : ""} — ${pending} entr${pending === 1 ? "y" : "ies"} queued locally`;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open sync status" className={`no-print flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm font-medium ${ok ? "bg-emerald text-emerald-foreground" : "bg-amber text-amber-foreground"}`}>
        <span className="flex min-w-0 items-center gap-2">
          {authPaused ? <AlertTriangle className="h-4 w-4 shrink-0" /> : syncing ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}
          <span className="min-w-0">{text}</span>
        </span>
        <span className="shrink-0 text-xs underline underline-offset-2">{authPaused ? "Details" : pending > 0 ? "View queue" : "Details"}</span>
      </button>
      <SyncDrawer open={open} onOpenChange={setOpen} canSimulate={canSimulate} />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { org, role } = useOrgCtx();
  const { user } = useAuth();
  const orgs = useMyOrgs();
  const fm = useFieldMode();
  useReferenceData(org.id); // keeps FEMA rates + fleet cached for offline logging
  const navigate = useNavigate();
  const p = { org: org.slug };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="no-print h-1" style={{ backgroundColor: org.primary_color }} />
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="shrink-0"><BeaconMark /></Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
                {org.logo_url && <img src={org.logo_url} alt="" className="h-7 w-7 rounded-full object-cover" />}
                <span className="min-w-0 text-left">
                  <span className="block truncate font-semibold leading-tight">{org.name}</span>
                  <span className="block text-xs text-muted-foreground">{org.state}{org.is_demo ? " · Demo (full access)" : role ? ` · ${ROLE_LABELS[role]}` : ""}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Switch city workspace</DropdownMenuLabel>
              {(orgs.data ?? []).map((o) => (
                <DropdownMenuItem key={o.id} onSelect={() => navigate({ to: "/app/$org", params: { org: o.slug } })}>
                  {o.name}, {o.state}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => navigate({ to: "/app/$org", params: { org: "demo" } })}>Riverbend (Demo)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/register-city" })}>Register a city…</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/join" })}>Join with a code…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <Link to="/app/$org" params={p} activeOptions={{ exact: true }} className="rounded-md px-3 py-2 hover:bg-muted [&.active]:bg-muted [&.active]:font-semibold">Command Hub</Link>
            <Link to="/app/$org/log" params={p} className="rounded-md px-3 py-2 hover:bg-muted [&.active]:bg-muted [&.active]:font-semibold">Field Logger</Link>
            {(role === "city_admin" || role === "finance_auditor") && <Link to="/app/$org/settings" params={p} className="rounded-md px-3 py-2 hover:bg-muted [&.active]:bg-muted [&.active]:font-semibold">City Settings</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant={fm.on ? "default" : "outline"} size="sm" onClick={fm.toggle} aria-pressed={fm.on}><Hand className="h-4 w-4" />Field Mode</Button>
            {user ? (
              <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" />Sign out</Button>
            ) : (
              <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
            )}
          </div>
        </div>
      </header>
      <SyncBanner canSimulate={role === "city_admin" || role === "eoc_commander"} />
      {org.is_demo && (
        <div className="no-print border-b bg-amber-soft px-4 py-2 text-center text-sm">
          You're in the shared Riverbend demo city — try anything. Everyone sees the same demo, and it resets every night. <Link to="/register-city" className="font-semibold underline">Register your city</Link> to start logging.
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
