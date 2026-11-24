import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

import { MarkdownArticle } from "@/components/beacon/markdown";
import { DOCS, extractToc, type DocKey } from "@/lib/docs";

export function DocPage({ docKey }: { docKey: DocKey }) {
  const doc = DOCS[docKey];
  const toc = extractToc(doc.source);
  const other = docKey === "manual" ? DOCS["self-hosting"] : DOCS.manual;

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="no-print order-2 lg:order-1">
        <div className="lg:sticky lg:top-24">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            On this page
          </p>
          <nav className="mt-3 max-h-[58vh] space-y-1 overflow-y-auto pb-2 pr-2 text-sm">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={
                  item.level === 2
                    ? "block rounded px-2 py-1 font-medium text-foreground hover:bg-muted"
                    : "block rounded px-2 py-1 pl-5 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              >
                {item.text}
              </a>
            ))}
          </nav>
          <div className="mt-5 rounded-md border bg-card p-3 text-xs">
            <p className="font-medium">Source file</p>
            <p className="mt-1 font-mono text-muted-foreground">{doc.fileName}</p>
            <p className="mt-2 text-muted-foreground">
              Part of the Beacon repository — MIT licensed.
            </p>
          </div>
        </div>
      </aside>

      <article className="order-1 min-w-0 lg:order-2">
        <Link
          to="/docs"
          className="no-print inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All documentation
        </Link>
        <MarkdownArticle source={doc.source} />
        <div className="no-print mt-14 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Read next: <span className="font-medium text-foreground">{other.shortTitle}</span>
          </p>
          <div className="flex gap-2">
            <Link
              to={other.path}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <FileText className="h-4 w-4" /> {other.shortTitle}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to home
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
