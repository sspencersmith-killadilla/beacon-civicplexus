import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Server } from "lucide-react";

import { DOCS } from "@/lib/docs";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Beacon Documentation — Manual & Self-Hosting" },
      {
        name: "description",
        content:
          "Two guides for Beacon: the city user manual (roles, incidents, offline field logging, FEMA exports) and the self-hosting guide.",
      },
      { property: "og:title", content: "Beacon Documentation" },
      {
        property: "og:description",
        content: "Read the Beacon user manual or the guide to self-hosting Beacon on your own infrastructure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocsIndex,
});

const cards = [
  {
    doc: DOCS.manual,
    icon: BookOpen,
    points: [
      "Roles: City Admin, EOC Commander, Field Responder, Finance / FEMA Auditor",
      "Incident Command Hub, Field Logger, Timeline, Evidence Vault",
      "After-Action Reports and the four FEMA CSV exports",
      "Fleet, rate tables and the official FEMA schedule importer",
    ],
  },
  {
    doc: DOCS["self-hosting"],
    icon: Server,
    points: [
      "Backend setup: database schema, storage bucket, authentication",
      "Environment variables and running the app locally",
      "Deploy to Cloudflare Workers, or to a Node.js server / Docker",
      "Backups, updates and architecture notes",
    ],
  },
];

function DocsIndex() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-amber">Beacon — CivicPlexus</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Documentation</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Everything you need to run a city workspace, and to put Beacon on infrastructure your city
        controls. Both guides ship with the source under the MIT license.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.doc.key} className="flex flex-col rounded-lg border bg-card p-6">
            <c.icon className="h-6 w-6 text-amber" />
            <h2 className="mt-3 text-lg font-semibold">{c.doc.shortTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.doc.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {c.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Link
              to={c.doc.path}
              className="mt-6 inline-flex items-center gap-1.5 self-start rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open {c.doc.shortTitle} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border bg-muted/40 p-5 text-sm text-muted-foreground">
        Prefer the raw files? Both guides live in the <span className="font-mono">docs/</span> folder
        of the Beacon repository:{" "}
        <span className="font-mono text-foreground">docs/USER_MANUAL.md</span> and{" "}
        <span className="font-mono text-foreground">docs/SELF_HOSTING.md</span>.
      </div>
    </main>
  );
}
