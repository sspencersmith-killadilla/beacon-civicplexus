import { createFileRoute } from "@tanstack/react-router";

import { DocPage } from "@/components/beacon/doc-page";
import { DOCS } from "@/lib/docs";

export const Route = createFileRoute("/docs/self-hosting")({
  head: () => ({
    meta: [
      { title: "Self-Hosting Guide — Beacon" },
      { name: "description", content: DOCS["self-hosting"].description },
      { property: "og:title", content: "Self-Hosting Beacon" },
      { property: "og:description", content: DOCS["self-hosting"].description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <DocPage docKey="self-hosting" />,
});
