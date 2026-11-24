import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, CloudOff, FileCheck2, Building2, Camera, ShieldCheck, BookOpen, Server, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeaconWordmark } from "@/components/beacon/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beacon — Field-ready emergency logging & FEMA documentation" },
      { name: "description", content: "Open-source, multi-city emergency operations and FEMA Public Assistance documentation for local governments." },
      { property: "og:title", content: "Beacon — Emergency Operations for Cities" },
      { property: "og:description", content: "Log field activity offline, track force account costs, and export FEMA-ready reimbursement packets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: CloudOff, t: "Offline-first field logger", d: "Crews log notes, hours, equipment and photos with no signal. Entries sync automatically when coverage returns." },
  { icon: ClipboardList, t: "ICS-214 activity log", d: "Timestamped, geotagged decisions and field notes with a tamper-evident edit trail." },
  { icon: FileCheck2, t: "FEMA PA categories A–G", d: "Force account labor, equipment and materials costed and grouped for reimbursement." },
  { icon: Camera, t: "Evidence vault", d: "Before / during / after photo evidence with GPS and timestamp metadata." },
  { icon: Building2, t: "Built for many cities", d: "Each municipality gets its own isolated workspace, branding, departments and rate tables." },
  { icon: ShieldCheck, t: "After-Action Reports", d: "One click compiles a printable AAR with corrective action plan and photo appendix." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BeaconWordmark />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/docs">Docs</Link></Button>
          <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/register-city">Register your city</Link></Button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 md:pt-20">
        <p className="font-mono text-xs uppercase tracking-widest text-amber">Beacon — CivicPlexus · Open source</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Field-ready emergency logging and FEMA-compliant documentation for local governments.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          When the storm hits, every hour, truck and decision is money your city can recover. Beacon captures it from the field — even offline —
          and turns it into reimbursement packets and After-Action Reports.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-amber text-amber-foreground hover:bg-amber/90">
            <Link to="/app/$org" params={{ org: "demo" }}>Explore live demo city</Link>
          </Button>
          <Button asChild size="lg" variant="outline"><Link to="/register-city">Register your city</Link></Button>
          <Button asChild size="lg" variant="ghost"><Link to="/auth">Sign in</Link></Button>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
          {[["$0", "license cost — open source"], ["A–G", "FEMA PA categories"], ["ICS-214", "activity log format"], ["Offline", "queue & auto-sync"]].map(([k, v]) => (
            <div key={k} className="bg-card p-5">
              <div className="font-mono text-2xl font-semibold">{k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.t}>
              <f.icon className="h-6 w-6 text-amber" />
              <h3 className="mt-3 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-amber">Documentation</p>
          <h2 className="mt-3 text-2xl font-semibold">Read the manual, or run it yourself.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Two guides ship with Beacon: how your staff use it day to day, and how your IT team puts
            it on infrastructure your city controls.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col rounded-lg border bg-background p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber" />
                <h3 className="font-semibold">User Manual</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Roles and permissions, opening an incident, the offline field logger, evidence,
                After-Action Reports and the FEMA CSV exports.
              </p>
              <Link
                to="/docs/manual"
                className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-medium text-amber hover:underline"
              >
                Read the user manual <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-col rounded-lg border bg-background p-6">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-amber" />
                <h3 className="font-semibold">Self-Hosting Guide</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Backend setup, database schema, storage and auth, then deploy to Cloudflare Workers
                or a Node.js server — with backups and update notes.
              </p>
              <Link
                to="/docs/self-hosting"
                className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-medium text-amber hover:underline"
              >
                Read the self-hosting guide <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-lg border bg-primary p-8 text-primary-foreground md:p-12">
          <h2 className="text-2xl font-semibold">One mission, many cities.</h2>
          <p className="mt-3 max-w-2xl opacity-80">
            Beacon is part of the CivicPlexus open-source suite. Any municipality can register, invite its staff, and run incidents in a
            workspace that is fully isolated from every other city — while county partners and mutual-aid teams can switch between the cities they serve.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary"><Link to="/register-city">Register your city</Link></Button>
            <Button asChild variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"><Link to="/join">Join with a code</Link></Button>
          </div>
        </div>
      </section>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>Beacon · CivicPlexus open-source civic utilities</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link to="/docs/manual" className="underline hover:text-foreground">User Manual</Link>
          <Link to="/docs/self-hosting" className="underline hover:text-foreground">Self-Hosting Guide</Link>
          <Link to="/docs" className="underline hover:text-foreground">All documentation</Link>
        </p>
      </footer>
    </div>
  );
}
