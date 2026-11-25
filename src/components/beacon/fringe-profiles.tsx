import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deptFringe } from "@/lib/rate-cache";
import { Input } from "@/components/ui/input";

const COLS = [["fica_pct", "FICA"], ["retirement_pct", "Retirement"], ["medical_pct", "Medical"], ["workers_comp_pct", "Workers' comp"], ["other_fringe_pct", "Other"]] as const;

/** Department fringe benefit profiles: the labor logger fills Fringe % from these so crews never guess. */
export function FringeProfiles({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const depts = useQuery({ queryKey: ["departments", orgId], queryFn: async () => (await supabase.from("departments").select("*").eq("organization_id", orgId).order("name")).data ?? [] });
  const save = async (id: string, col: (typeof COLS)[number][0], v: string) => {
    const { error } = await supabase.from("departments").update({ [col]: Number(v) || 0 } as Record<typeof col, number>).eq("id", id);
    if (error) toast.error(error.message);
    else { await qc.invalidateQueries({ queryKey: ["departments", orgId] }); await qc.invalidateQueries({ queryKey: ["reference", orgId] }); toast.success("Fringe profile saved"); }
  };
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold">Department fringe benefit profiles</h2>
      <p className="text-sm text-muted-foreground">Percent of base pay. The Field Logger fills Fringe % from the department's total. Keep the payroll calculation on file — FEMA asks how each rate was built.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Department</th>{COLS.map(([, l]) => <th key={l} className="px-1">{l} %</th>)}<th className="px-1 text-right">Total</th></tr></thead>
          <tbody>
            {(depts.data ?? []).map((d) => (
              <tr key={d.id} className="border-t">
                <td className="py-2 pr-2 font-medium">{d.name}</td>
                {COLS.map(([c, l]) => (
                  <td key={c} className="px-1"><Input aria-label={`${d.name} ${l} %`} disabled={!canEdit} inputMode="decimal" className="w-20 font-mono" defaultValue={String(d[c])} onBlur={(e) => { if (Number(e.target.value) !== Number(d[c])) void save(d.id, c, e.target.value); }} /></td>
                ))}
                <td className="px-1 text-right font-mono font-semibold">{deptFringe(d).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
