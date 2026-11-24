import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BookOpen, Server } from "lucide-react";

import { BeaconWordmark } from "@/components/beacon/logo";
import { DOCS } from "@/lib/docs";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Beacon" },
      {
        name: "description",
        content:
          "Beacon documentation: the city user manual and the self-hosting guide for running Beacon on your own infrastructure.",
      },
      { property: "og:title", content: "Beacon Documentation" },
      {
        property: "og:description",
        content: "User manual and self-hosting guide for Beacon emergency operations and FEMA documentation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocsLayout,
});

const tabs = [
  { to: "/docs/manual" as const, label: "User Manual", icon: BookOpen },
  { to: "/docs/self-hosting" as const, label: "Self-Hosting Guide", icon: Server },
];

function DocsLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link to="/">
              <BeaconWordmark />
            </Link>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Docs
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground" }}
              >
                {t.label}
              </Link>
            ))}
            <Link
              to="/"
              className="ml-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Beacon · CivicPlexus open-source civic utilities ·{" "}
        <Link to="/docs" className="underline hover:text-foreground">
          All documentation
        </Link>
      </footer>
    </div>
  );
}

export const DOC_TABS = tabs;
export const DOC_LIST = [DOCS.manual, DOCS["self-hosting"]];
