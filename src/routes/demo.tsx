import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/demo")({
  beforeLoad: () => { throw redirect({ to: "/app/$org", params: { org: "demo" } }); },
});
