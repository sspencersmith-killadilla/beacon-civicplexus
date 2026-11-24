import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getEngineState, startEngine, subscribeEngine, syncAll, type EngineState } from "@/lib/syncEngine";
import type { SyncQueueItem } from "@/lib/offlineDb";

type Ctx = {
  online: boolean; networkOnline: boolean; simulatedOffline: boolean; pending: number; syncing: boolean; authPaused: boolean;
  progress: EngineState["progress"]; items: SyncQueueItem[]; syncNow: (only?: string) => Promise<void>;
};
const SyncCtx = createContext<Ctx>({ online: true, networkOnline: true, simulatedOffline: false, pending: 0, syncing: false, authPaused: false, progress: null, items: [], syncNow: async () => {} });

export function SyncProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const s = useSyncExternalStore(subscribeEngine, getEngineState, getEngineState);
  useEffect(() => { startEngine(); }, []);
  const last = useRef(s.lastResult);
  useEffect(() => {
    if (s.lastResult === last.current || !s.lastResult) return;
    last.current = s.lastResult;
    const r = s.lastResult;
    if (r.synced) { toast.success(`${r.synced} entr${r.synced === 1 ? "y" : "ies"} synced`); void qc.invalidateQueries(); }
    if (r.failed) toast.error(`${r.failed} entr${r.failed === 1 ? "y" : "ies"} could not sync yet`);
  }, [s.lastResult, qc]);
  const syncNow = useCallback(async (only?: string) => { await syncAll(only ? { manual: true, only } : { manual: true }); }, []);
  const value = useMemo<Ctx>(() => ({
    online: s.online && !s.simulatedOffline, networkOnline: s.online, simulatedOffline: s.simulatedOffline,
    pending: s.items.filter((i) => i.status !== "synced").length, syncing: s.running, authPaused: s.authPaused,
    progress: s.progress, items: s.items, syncNow,
  }), [s, syncNow]);
  return <SyncCtx.Provider value={value}>{children}</SyncCtx.Provider>;
}
export const useSync = () => useContext(SyncCtx);
