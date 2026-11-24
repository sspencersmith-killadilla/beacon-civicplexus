import { createContext, useContext } from "react";
import type { Database } from "@/integrations/supabase/types";
import type { OrgRole } from "@/lib/org";

export type Org = Database["public"]["Tables"]["organizations"]["Row"];
export const OrgCtx = createContext<{ org: Org; role: OrgRole | null } | null>(null);
export function useOrgCtx() {
  const v = useContext(OrgCtx);
  if (!v) throw new Error("useOrgCtx outside workspace");
  return v;
}
