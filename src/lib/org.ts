import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type OrgRole = "city_admin" | "eoc_commander" | "field_responder" | "finance_auditor";

export function useMyOrgs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-orgs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, department, organizations(id,name,slug,state,logo_url,primary_color)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).flatMap((m) => (m.organizations ? [{ ...m.organizations, role: m.role as OrgRole }] : []));
    },
  });
}

export function useOrg(slug: string) {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["org", slug, user?.id],
    enabled: !loading,
    queryFn: async () => {
      const { data: org, error } = await supabase.from("organizations").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!org) return null;
      let role: OrgRole | null = null;
      if (user) {
        const { data: m } = await supabase.from("organization_members").select("role").eq("organization_id", org.id).eq("user_id", user.id).maybeSingle();
        role = (m?.role as OrgRole) ?? null;
      }
      return { org, role };
    },
  });
}

export const canLog = (r: OrgRole | null) => r === "city_admin" || r === "eoc_commander" || r === "field_responder";
export const canCommand = (r: OrgRole | null) => r === "city_admin" || r === "eoc_commander";
export const canAudit = (r: OrgRole | null) => r === "city_admin" || r === "eoc_commander" || r === "finance_auditor";
