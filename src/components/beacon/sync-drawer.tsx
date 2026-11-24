import { useEffect, useState } from "react";
import { AlertTriangle, Camera, CloudOff, Download, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";
import { fmtLocal } from "@/lib/fema";
import { ENTITY_LABEL } from "@/lib/offlineDb";
import { exportBackup, setSimulatedOffline } from "@/lib/syncEngine";
import { fmtBytes, storageEstimate } from "@/lib/photoCompressor";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSync } from "./sync-context";

export function SyncDrawer({ open, onOpenChange, canSimulate }: { open: boolean; onOpenChange: (o: boolean) => void; canSimulate: boolean }) {
  const s = useSync();
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => { if (open) void storageEstimate().then(setEst); }, [open, s.items]);
  const open_ = s.items.filter((i) => i.status !== "synced");
  const recent = s.items.filter((i) => i.status === "synced").slice(-5).reverse();
  const state = s.progress ? `Syncing ${Math.min(s.progress.done + 1, s.progress.total)} of ${s.progress.total}…` : s.simulatedOffline ? "Offline (simulated)" : s.networkOnline ? "Online" : "Offline";

  const download = async () => {
    const blob = await exportBackup();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `beacon-local-queue-${new Date().toISOString().replace(/[:.]/g, "-")}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Saved ${open_.length} unsynced entr${open_.length === 1 ? "y" : "ies"} to this device`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Sync status</SheetTitle>
          <SheetDescription>Entries are saved on this device first, then sent when there's a connection.</SheetDescription>
        </SheetHeader>

        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 font-medium">{s.online ? <Wifi className="h-4 w-4 text-emerald" /> : <CloudOff className="h-4 w-4 text-amber" />}{state}</div>
          {s.progress && <Progress className="mt-2" value={(s.progress.done / Math.max(1, s.progress.total)) * 100} />}
          {s.authPaused && <p className="mt-2 flex items-start gap-1.5 text-sm text-amber"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Session expired — sign in again to sync. Nothing has been deleted.</p>}
          <Button className="mt-3 w-full" disabled={!s.online || s.syncing || open_.length === 0} onClick={() => void s.syncNow()}>
            <RefreshCw className={`h-4 w-4 ${s.syncing ? "animate-spin" : ""}`} />Sync now
          </Button>
        </div>

        <section>
          <h3 className="text-sm font-semibold">Waiting to sync ({open_.length})</h3>
          {open_.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Everything on this device has synced.</p> : (
            <ul className="mt-2 divide-y rounded-lg border">
              {open_.map((i) => (
                <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {ENTITY_LABEL[i.entity_type]}
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${i.status === "failed" ? "bg-destructive text-destructive-foreground" : "bg-amber text-amber-foreground"}`}>{i.status === "failed" ? "Failed" : i.status === "syncing" ? "Syncing" : "Queued Offline"}</span>
                      {i.photo_ids.length + (i.receipt_photo_id ? 1 : 0) > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Camera className="h-3 w-3" />{i.photo_ids.length + (i.receipt_photo_id ? 1 : 0)}</span>}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{fmtLocal(i.created_at)}{i.retry_count ? ` · ${i.retry_count} tr${i.retry_count === 1 ? "y" : "ies"}` : ""}{i.next_attempt_at ? ` · auto-retry ${fmtLocal(i.next_attempt_at)}` : ""}</div>
                    {i.last_error && <div className="truncate text-xs text-destructive" title={i.last_error}>{i.last_error}</div>}
                  </div>
                  <Button size="sm" variant="outline" disabled={!s.online || s.syncing} onClick={() => void s.syncNow(i.id)}>Retry</Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recent.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold">Recently synced</h3>
            <ul className="mt-2 grid gap-1 text-xs">
              {recent.map((i) => <li key={i.id} className="flex justify-between"><span>{ENTITY_LABEL[i.entity_type]}</span><span className="rounded bg-emerald px-1.5 py-0.5 font-semibold text-emerald-foreground">Synced</span></li>)}
            </ul>
          </section>
        )}

        <section className="rounded-lg border p-3">
          <h3 className="text-sm font-semibold">Device storage</h3>
          {est ? (<>
            <Progress className="mt-2" value={(est.usage / est.quota) * 100} />
            <p className="mt-1 font-mono text-xs text-muted-foreground">{fmtBytes(est.usage)} used · {fmtBytes(Math.max(0, est.quota - est.usage))} available</p>
          </>) : <p className="mt-1 text-xs text-muted-foreground">This browser doesn't report storage space.</p>}
        </section>

        <section className="rounded-lg border p-3">
          <h3 className="text-sm font-semibold">Emergency local backup</h3>
          <p className="mt-1 text-xs text-muted-foreground">If this phone is damaged or you can't sign back in, save every unsynced entry and its photos as a file and send it to your EOC.</p>
          <Button variant="outline" className="mt-2 w-full" disabled={open_.length === 0} onClick={() => void download()}><Download className="h-4 w-4" />Download Local Queue (JSON)</Button>
        </section>

        {canSimulate && (
          <label className="flex items-start justify-between gap-3 rounded-lg border border-dashed p-3">
            <span className="grid gap-0.5"><span className="text-sm font-semibold">Simulate Offline Mode</span><span className="text-xs text-muted-foreground">For training: new entries stay on this device until you turn this off. No airplane mode needed.</span></span>
            <Switch checked={s.simulatedOffline} onCheckedChange={setSimulatedOffline} aria-label="Simulate Offline Mode" />
          </label>
        )}
      </SheetContent>
    </Sheet>
  );
}
