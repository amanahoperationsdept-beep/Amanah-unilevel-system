import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PortalRole = "admin" | "distributor";

export type AuthorizedProfile = {
  id: string;
  role: PortalRole;
  status: "active";
  full_name: string;
  member_code: string;
};

export async function requireRole(expectedRole: PortalRole): Promise<AuthorizedProfile> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/?auth=not-configured");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name, member_code")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_active !== true) {
    redirect("/");
  }

  const portalRole: PortalRole | null =
    profile.role === "administrator"
      ? "admin"
      : profile.role === "distributor"
        ? "distributor"
        : null;

  if (!portalRole) {
    redirect("/");
  }

  if (portalRole !== expectedRole) {
    redirect(portalRole === "admin" ? "/admin" : "/distributor");
  }

  return {
    id: profile.id,
    role: portalRole,
    status: "active",
    full_name: profile.full_name,
    member_code: profile.member_code ?? "",
  };
}
