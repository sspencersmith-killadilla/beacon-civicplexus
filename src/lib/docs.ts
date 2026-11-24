import selfHostingGuide from "../../docs/SELF_HOSTING.md?raw";
import userManual from "../../docs/USER_MANUAL.md?raw";

export type DocKey = "manual" | "self-hosting";

export type DocMeta = {
  key: DocKey;
  title: string;
  shortTitle: string;
  description: string;
  path: "/docs/manual" | "/docs/self-hosting";
  source: string;
  fileName: string;
};

export const DOCS: Record<DocKey, DocMeta> = {
  manual: {
    key: "manual",
    title: "Beacon User Manual",
    shortTitle: "User Manual",
    description:
      "How to run a city workspace in Beacon: roles, incidents, the offline field logger, evidence, After-Action Reports and FEMA exports.",
    path: "/docs/manual",
    source: userManual,
    fileName: "docs/USER_MANUAL.md",
  },
  "self-hosting": {
    key: "self-hosting",
    title: "Self-Hosting Beacon",
    shortTitle: "Self-Hosting Guide",
    description:
      "How to deploy Beacon on your own infrastructure: backend setup, schema, storage, auth, environment variables, build and operations.",
    path: "/docs/self-hosting",
    source: selfHostingGuide,
    fileName: "docs/SELF_HOSTING.md",
  },
};

export type TocItem = { level: 2 | 3; text: string; id: string };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Headings (## and ###) outside fenced code blocks, with the anchor ids the renderer assigns. */
export function extractToc(source: string): TocItem[] {
  const items: TocItem[] = [];
  let inFence = false;
  for (const line of source.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (!match) continue;
    const hashes = match[1];
    const text = match[2];
    if (!hashes || !text) continue;
    items.push({ level: hashes.length === 2 ? 2 : 3, text, id: slugify(text) });
  }
  return items;
}
