import { createFileRoute } from "@tanstack/react-router";

import { DocPage } from "@/components/beacon/doc-page";
import { DOCS } from "@/lib/docs";

export const Route = createFileRoute("/docs/manual")({
  head: () => ({
    meta: [
      { title: "User Manual — Beacon" },
      { name: "description", content: DOCS.manual.description },
      { property: "og:title", content: "Beacon User Manual" },
      { property: "og:description", content: DOCS.manual.description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <DocPage docKey="manual" />,
});
