import type { Components } from "react-markdown";
import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { slugify } from "@/lib/docs";

type NodeLike = { value?: string; children?: NodeLike[] };

function textOf(node: unknown): string {
  const n = node as NodeLike | undefined;
  if (!n) return "";
  if (typeof n.value === "string") return n.value;
  return (n.children ?? []).map(textOf).join("");
}

function Heading({
  level,
  node,
  children,
}: {
  level: 1 | 2 | 3 | 4;
  node?: unknown;
  children?: ReactNode;
}) {
  const text = textOf(node);
  const id = text ? slugify(text) : undefined;
  const className =
    level === 1
      ? "text-3xl font-bold tracking-tight text-foreground"
      : level === 2
        ? "mt-12 scroll-mt-24 border-b border-border pb-2 text-2xl font-semibold tracking-tight text-foreground"
        : level === 3
          ? "mt-8 scroll-mt-24 text-lg font-semibold text-foreground"
          : "mt-6 scroll-mt-24 text-base font-semibold text-foreground";
  if (level === 1)
    return (
      <h1 id={id} className={className}>
        {children}
      </h1>
    );
  if (level === 2)
    return (
      <h2 id={id} className={className}>
        {children}
      </h2>
    );
  if (level === 3)
    return (
      <h3 id={id} className={className}>
        {children}
      </h3>
    );
  return (
    <h4 id={id} className={className}>
      {children}
    </h4>
  );
}

const isExternal = (href?: string) => !!href && /^https?:/i.test(href);

export const markdownComponents: Components = {
  h1: (props) => (
    <Heading level={1} node={props.node}>
      {props.children}
    </Heading>
  ),
  h2: (props) => (
    <Heading level={2} node={props.node}>
      {props.children}
    </Heading>
  ),
  h3: (props) => (
    <Heading level={3} node={props.node}>
      {props.children}
    </Heading>
  ),
  h4: (props) => (
    <Heading level={4} node={props.node}>
      {props.children}
    </Heading>
  ),
  p: (props) => <p className="mt-4 text-[15px] leading-7 text-foreground/90">{props.children}</p>,
  a: (props) => (
    <a
      href={props.href}
      className="font-medium text-amber underline decoration-amber/40 underline-offset-4 hover:decoration-amber"
      target={isExternal(props.href) ? "_blank" : undefined}
      rel={isExternal(props.href) ? "noreferrer" : undefined}
    >
      {props.children}
    </a>
  ),
  ul: (props) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-7 marker:text-muted-foreground">
      {props.children}
    </ul>
  ),
  ol: (props) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-[15px] leading-7 marker:text-muted-foreground">
      {props.children}
    </ol>
  ),
  li: (props) => <li className="pl-1">{props.children}</li>,
  blockquote: (props) => (
    <blockquote className="mt-6 rounded-r-md border-l-4 border-amber bg-amber-soft/70 p-4 text-[15px] leading-7">
      {props.children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-border" />,
  strong: (props) => <strong className="font-semibold">{props.children}</strong>,
  table: (props) => (
    <div className="mt-6 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">{props.children}</table>
    </div>
  ),
  thead: (props) => <thead className="bg-muted/60">{props.children}</thead>,
  th: (props) => (
    <th className="border-b border-border px-3 py-2 text-left font-semibold">{props.children}</th>
  ),
  tr: (props) => <tr className="border-b border-border last:border-0">{props.children}</tr>,
  td: (props) => <td className="px-3 py-2 align-top">{props.children}</td>,
  pre: (props) => (
    <pre className="mt-5 overflow-x-auto rounded-lg border border-border bg-primary p-4 font-mono text-[13px] leading-6 text-primary-foreground">
      {props.children}
    </pre>
  ),
  code: (props) =>
    props.className?.includes("language-") ? (
      <code className={props.className}>{props.children}</code>
    ) : (
      <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
        {props.children}
      </code>
    ),
};

export function MarkdownArticle({ source }: { source: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {source}
    </Markdown>
  );
}
