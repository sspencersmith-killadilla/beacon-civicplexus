import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, CloudOff, FileCheck2, Building2, Camera, ShieldCheck } from "lucide-react";
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
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">Beacon · CivicPlexus open-source civic utilities</footer>
    </div>
  );
}
