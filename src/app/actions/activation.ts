"use server";

import { randomBytes, createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ROLES = ["distributor", "mobile_stockist", "branch_operator", "marketing_officer"] as const;
type Role = (typeof ROLES)[number];
type ActionState = { status: "idle" | "error" | "success"; message: string; activationCode?: string };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("AMANAH secure registration is not configured.");
  // Imported only on the server; service-role credentials never reach the browser.
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
  );
}

export async function issueActivationCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const role = formData.get("role");
  if (typeof role !== "string" || !ROLES.includes(role as Role)) {
    return { status: "error", message: "Choose a valid member role." };
  }
  try {
    const supabase = await adminClient();
    const code = `AMN-${randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-")}`;
    const codeHash = createHash("sha256").update(code).digest("hex");
    const sessionClient = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await sessionClient.auth.getUser();
    if (userError || !user) return { status: "error", message: "Your administrator session could not be verified." };
    const { error } = await supabase.from("activation_codes").insert({
      code_hash: codeHash, role, issued_by: user.id,
    });
    if (error) {
      console.error("[activation-issue] database insert failed", { code: error.code });
      return { status: "error", message: "Could not issue the activation code. Confirm migration 0006 is installed." };
    }
    revalidatePath("/admin");
    return { status: "success", message: "Activation code created. Copy or print it now; it will not be shown again.", activationCode: code };
  } catch {
    return { status: "error", message: "Activation-code issuance is not configured. Contact AMANAH support." };
  }
}

export async function registerWithActivationCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const code = String(formData.get("activation_code") ?? "").trim().toUpperCase();

  if (fullName.length < 2 || fullName.length > 120) return { status: "error", message: "Enter your full name (2–120 characters)." };
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return { status: "error", message: "Username must be 3–32 characters: letters, numbers, dot, underscore, or hyphen." };
  if (password.length < 8 || password.length > 128) return { status: "error", message: "Password must be 8–128 characters." };
  if (password !== confirm) return { status: "error", message: "Passwords do not match." };
  if (!/^AMN-(?:[A-F0-9]{5}-){1}[A-F0-9]{5}$/.test(code)) return { status: "error", message: "Enter the activation code exactly as printed on your receipt." };
  if (phone.length > 40) return { status: "error", message: "Phone number must be 40 characters or fewer." };

  let supabase: Awaited<ReturnType<typeof adminClient>> | undefined;
  let userId: string | undefined;
  let activationId: string | undefined;
  try {
    supabase = await adminClient();
    const codeHash = createHash("sha256").update(code).digest("hex");
    userId = randomUUID();
    const { data: reservation, error: reserveError } = await supabase.rpc("reserve_amanah_activation_code", {
      p_code_hash: codeHash, p_user_id: userId,
    }).single();
    if (reserveError || !reservation) return { status: "error", message: "Activation code is invalid, expired, or has already been used." };
    activationId = (reservation as unknown as { activation_id: string }).activation_id;

    // Supabase Auth requires an email identity for password authentication.
    // This private, non-deliverable alias is derived from the username; no email is collected.
    const internalEmail = `${username}@accounts.amanah.invalid`;
    const { error: createError } = await supabase.auth.admin.createUser({
      id: userId, email: internalEmail, password, email_confirm: true,
      user_metadata: { amanah_username: username },
    });
    if (createError) {
      await supabase.rpc("release_amanah_activation_reservation", { p_activation_id: activationId, p_user_id: userId });
      return { status: "error", message: "That username may already be taken, or the account could not be created. Try another username." };
    }

    const { error: finishError } = await supabase.rpc("complete_amanah_activation", {
      p_activation_id: activationId, p_user_id: userId, p_username: username,
      p_full_name: fullName, p_phone: phone || null,
    });
    if (finishError) {
      await supabase.auth.admin.deleteUser(userId);
      await supabase.rpc("release_amanah_activation_reservation", { p_activation_id: activationId, p_user_id: userId });
      return { status: "error", message: "Registration could not be completed. Your activation code has been released; please try again." };
    }
  } catch {
    if (supabase && activationId && userId) {
      await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
      await supabase.rpc("release_amanah_activation_reservation", { p_activation_id: activationId, p_user_id: userId }).catch(() => undefined);
    }
    return { status: "error", message: "Registration is temporarily unavailable. Please try again later." };
  }
  redirect("/?auth=registered");
}
