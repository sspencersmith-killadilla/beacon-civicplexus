import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FieldModeProvider } from "@/components/beacon/field-mode";
import { SyncProvider } from "@/components/beacon/sync-context";

// Workspace pages read the signed-in session and IndexedDB, which exist only in the browser.
export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({ meta: [{ title: "Beacon Workspace" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <FieldModeProvider>
      <SyncProvider>
        <Outlet />
      </SyncProvider>
    </FieldModeProvider>
  ),
});
