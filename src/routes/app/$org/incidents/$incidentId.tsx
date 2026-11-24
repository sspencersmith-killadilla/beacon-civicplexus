import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canCommand } from "@/lib/org";
import { fmtLocal } from "@/lib/fema";
import { useIncidentData } from "@/lib/incident-data";
import { useOrgCtx } from "@/components/beacon/org-context";
import { KpiCards, STATUS_STYLES } from "@/components/beacon/kpis";
import { Timeline } from "@/components/beacon/timeline";
import { EvidenceGallery } from "@/components/beacon/evidence";
import { AfterActionReport } from "@/components/beacon/aar";
import { ExportCenter } from "@/components/beacon/exports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/$org/incidents/$incidentId")({ component: IncidentPage });

function IncidentPage() {
  const { incidentId } = Route.useParams();
  const { org, role } = useOrgCtx();
  const qc = useQueryClient();
  const q = useIncidentData(incidentId);
  if (q.isLoading) return <p className="text-muted-foreground">Loading incident…</p>;
  if (!q.data) return <p>Incident not found.</p>;
  const d = q.data; const inc = d.incident;
  const update = async (v: { status?: typeof inc.status; ended_at?: string | null; fema_declaration?: string | null; operational_period?: string | null }) => {
    const { error } = await supabase.from("incidents").update(v).eq("id", inc.id);
    if (error) toast.error(error.message); else { toast.success("Incident updated"); await qc.invalidateQueries(); }
  };
  return (
    <div className="grid gap-5">
      <div className="no-print">
        <Link to="/app/$org" params={{ org: org.slug }} search={{ incident: inc.id }} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Command Hub</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{inc.name}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[inc.status]}`}>{inc.status}</span>
        </div>
        <p className="font-mono text-xs text-muted-foreground">Started {fmtLocal(inc.started_at)}{inc.ended_at ? ` · ended ${fmtLocal(inc.ended_at)}` : ""}</p>
        {canCommand(role) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={inc.status} onValueChange={(v) => void update({ status: v as typeof inc.status, ended_at: v === "closed" ? inc.ended_at ?? new Date().toISOString() : null })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="recovery">Recovery</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
            </Select>
            <Input className="w-48 font-mono" defaultValue={inc.fema_declaration ?? ""} placeholder="FEMA DR-####" onBlur={(e) => e.target.value !== (inc.fema_declaration ?? "") && void update({ fema_declaration: e.target.value || null })} />
            <Input className="w-56" defaultValue={inc.operational_period ?? ""} placeholder="Operational period" onBlur={(e) => e.target.value !== (inc.operational_period ?? "") && void update({ operational_period: e.target.value || null })} />
          </div>
        )}
      </div>
      <div className="no-print"><KpiCards data={d} /></div>
      <Tabs defaultValue="timeline">
        <TabsList className="no-print">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Vault</TabsTrigger>
          <TabsTrigger value="aar">After-Action Report</TabsTrigger>
          <TabsTrigger value="exports">FEMA Exports</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline"><Timeline data={d} /></TabsContent>
        <TabsContent value="evidence"><EvidenceGallery data={d} /></TabsContent>
        <TabsContent value="aar"><AfterActionReport data={d} /></TabsContent>
        <TabsContent value="exports"><ExportCenter data={d} /></TabsContent>
      </Tabs>
    </div>
  );
}
