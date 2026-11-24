import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronDown, CloudOff, Hand, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMyOrgs } from "@/lib/org";
import { ROLE_LABELS } from "@/lib/fema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BeaconMark } from "./logo";
import { useFieldMode } from "./field-mode";
import { useSync } from "./sync-context";
import { useOrgCtx } from "./org-context";

export function SyncBanner() {
  const { online, pending, syncing, syncNow } = useSync();
  const ok = online && pending === 0;
  return (
    <div className={`no-print flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium ${ok ? "bg-emerald text-emerald-foreground" : "bg-amber text-amber-foreground"}`}>
      <span className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        {ok ? "Online & Synced" : online ? `${pending} entr${pending === 1 ? "y" : "ies"} waiting to sync` : `Offline Mode — ${pending} entr${pending === 1 ? "y" : "ies"} queued locally`}
      </span>
      {pending > 0 && (
        <Button size="sm" variant="secondary" disabled={!online || syncing} onClick={() => void syncNow()}>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Sync now
        </Button>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { org, role } = useOrgCtx();
  const { user } = useAuth();
  const orgs = useMyOrgs();
  const fm = useFieldMode();
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
                  <span className="block text-xs text-muted-foreground">{org.state}{role ? ` · ${ROLE_LABELS[role]}` : org.is_demo ? " · Demo (read-only)" : ""}</span>
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
            {role === "city_admin" && <Link to="/app/$org/settings" params={p} className="rounded-md px-3 py-2 hover:bg-muted [&.active]:bg-muted [&.active]:font-semibold">City Settings</Link>}
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
      <SyncBanner />
      {org.is_demo && !role && (
        <div className="no-print border-b bg-amber-soft px-4 py-2 text-center text-sm">
          You're viewing the Riverbend demo city (read-only). <Link to="/register-city" className="font-semibold underline">Register your city</Link> to start logging.
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
