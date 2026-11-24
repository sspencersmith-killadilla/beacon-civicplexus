import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listQueue, onQueueChange, syncAll } from "@/lib/offline-queue";

type Ctx = { online: boolean; pending: number; syncing: boolean; syncNow: () => Promise<void> };
const SyncCtx = createContext<Ctx>({ online: true, pending: 0, syncing: false, syncNow: async () => {} });

export function SyncProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const refresh = useCallback(() => { listQueue().then((q) => setPending(q.length)); }, []);
  const syncNow = useCallback(async () => {
    setSyncing(true);
    const r = await syncAll();
    setSyncing(false);
    if (r.synced) { toast.success(`${r.synced} entr${r.synced === 1 ? "y" : "ies"} synced`); qc.invalidateQueries(); }
    if (r.failed) toast.error(`${r.failed} entr${r.failed === 1 ? "y" : "ies"} could not sync yet`);
  }, [qc]);
  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();
    const off = onQueueChange(refresh);
    const up = () => { setOnline(true); void syncNow(); };
    const down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    if (navigator.onLine) void syncNow();
    return () => { off(); window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, [refresh, syncNow]);
  return <SyncCtx.Provider value={{ online, pending, syncing, syncNow }}>{children}</SyncCtx.Provider>;
}
export const useSync = () => useContext(SyncCtx);
