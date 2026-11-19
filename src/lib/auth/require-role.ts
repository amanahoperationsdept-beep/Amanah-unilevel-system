import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PortalRole =
  | "admin"
  | "marketing_officer"
  | "branch_operator"
  | "mobile_stockist"
  | "distributor";

export type AuthorizedProfile = {
  id: string;
  role: PortalRole;
  status: "active";
  full_name: string;
  member_code: string;
};

const DATABASE_ROLE_BY_PORTAL: Record<PortalRole, string> = {
  admin: "administrator",
  marketing_officer: "marketing_officer",
  branch_operator: "branch_operator",
  mobile_stockist: "mobile_stockist",
  distributor: "distributor",
};

export function portalPath(role: PortalRole): string {
  return role === "admin" ? "/admin" : `/${role.replaceAll("_", "-")}`;
}

export async function requireRole(expectedRole: PortalRole): Promise<AuthorizedProfile> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/?auth=not-configured");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name, member_code")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_active !== true) redirect("/");

  const portalRole = (Object.entries(DATABASE_ROLE_BY_PORTAL).find(
    ([, databaseRole]) => databaseRole === profile.role,
  )?.[0] ?? null) as PortalRole | null;

  if (!portalRole) redirect("/");
  if (portalRole !== expectedRole) redirect(portalPath(portalRole));

  return {
    id: profile.id,
    role: portalRole,
    status: "active",
    full_name: profile.full_name,
    member_code: profile.member_code ?? "",
  };
}
