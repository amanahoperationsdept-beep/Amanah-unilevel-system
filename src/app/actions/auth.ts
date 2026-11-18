"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignInResult = { error: string };
type RecoveryResult = { error?: string; success?: string };

export async function signInAction(formData: FormData): Promise<SignInResult | void> {
  const identifierValue = formData.get("identifier");
  const passwordValue = formData.get("password");

  if (
    typeof identifierValue !== "string" ||
    typeof passwordValue !== "string" ||
    identifierValue.trim().length < 3 ||
    identifierValue.trim().length > 254 ||
    passwordValue.length < 1
  ) {
    return { error: "Enter your AMANAH email or username and password." };
  }

  const identifier = identifierValue.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Sign-in is not configured yet. Please contact AMANAH support." };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let accountEmail: string | null = null;
  let expectedUserId: string | null = null;

  if (isEmail) {
    // Existing accounts can authenticate by their confirmed Supabase Auth email,
    // even when their profile username has not yet been populated.
    accountEmail = identifier;
  } else {
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(identifier)) {
      return { error: "Enter a valid AMANAH email address or username." };
    }
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", identifier.toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      return { error: "Unable to sign in. Check your email or username and password, or contact AMANAH support." };
    }

    expectedUserId = profile.id;
    const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(profile.id);
    accountEmail = authUserError ? null : authUser.user?.email ?? null;
  }

  if (!accountEmail) {
    return { error: "Unable to sign in. Check your email or username and password, or contact AMANAH support." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: accountEmail,
    password: passwordValue,
  });

  if (error || !data.user || (expectedUserId && data.user.id !== expectedUserId)) {
    await supabase.auth.signOut();
    return { error: "Unable to sign in. Check your email or username and password, or contact AMANAH support." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_active !== true) {
    await supabase.auth.signOut();
    return { error: "This AMANAH account is inactive or not fully configured. Contact support." };
  }

  const roleRoutes: Record<string, string> = {
    administrator: "/admin",
    marketing_officer: "/marketing-officer",
    branch_operator: "/branch-operator",
    mobile_stockist: "/mobile-stockist",
    distributor: "/distributor",
  };
  const destination = roleRoutes[profile.role];
  if (!destination) {
    await supabase.auth.signOut();
    return { error: "This account does not have a valid AMANAH role. Contact support." };
  }

  redirect(destination);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}


export async function requestPasswordResetAction(formData: FormData): Promise<RecoveryResult> {
  const emailValue = formData.get("email");
  if (typeof emailValue !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
    return { error: "Enter a valid email address." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "Password recovery is temporarily unavailable. Please contact AMANAH support." };
  }

  // Use only the explicitly configured public origin. Do not trust Host or
  // X-Forwarded-Host headers to choose an authentication redirect destination.
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let origin: string;
  try {
    const configuredUrl = new URL(configuredSiteUrl || "");
    if (
      (configuredUrl.protocol !== "https:" && configuredUrl.protocol !== "http:") ||
      configuredUrl.username ||
      configuredUrl.password
    ) {
      throw new Error("Invalid public site URL");
    }
    origin = configuredUrl.origin;
  } catch {
    return { error: "Password recovery is temporarily unavailable. Please contact AMANAH support." };
  }
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(emailValue.trim(), {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    // Keep provider details in server logs only; never expose them to the browser.
    console.error("[password-reset] Supabase email request failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    return { error: "Supabase could not send the reset email. Please wait a few minutes and try once more. If it still fails, AMANAH support can check the server error." };
  }

  return {
    success: "If an account exists for that email, a password reset link has been sent. Please check your inbox and spam folder.",
  };
}

export async function updatePasswordAction(formData: FormData): Promise<RecoveryResult> {
  const passwordValue = formData.get("password");
  const confirmValue = formData.get("confirmPassword");

  if (typeof passwordValue !== "string" || passwordValue.length < 8) {
    return { error: "Your new password must be at least 8 characters long." };
  }
  if (passwordValue !== confirmValue) {
    return { error: "The passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "This reset link is invalid or has expired. Please request a new password reset link." };
  }

  const { error } = await supabase.auth.updateUser({ password: passwordValue });
  if (error) {
    return { error: "We couldn't update your password. Please try again or request a new reset link." };
  }

  await supabase.auth.signOut();
  redirect("/?auth=password-updated&portal=admin");
}
