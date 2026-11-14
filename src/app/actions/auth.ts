"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignInResult = { error: string };
type RecoveryResult = { error?: string; success?: string };

export async function signInAction(formData: FormData): Promise<SignInResult | void> {
  const portalRole = formData.get("role");
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (portalRole !== "admin" && portalRole !== "distributor") {
    return { error: "Choose a valid AMANAH sign-in portal." };
  }

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string" ||
    !emailValue.trim() ||
    !passwordValue
  ) {
    return { error: "Enter your email address and password." };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      error: "Secure sign-in is not configured yet. Add the Supabase project URL and anon key, then try again.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailValue.trim(),
    password: passwordValue,
  });

  if (error || !data.user) {
    return { error: "Unable to sign in. Check your credentials or contact AMANAH support." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  const databaseRole =
    portalRole === "admin" ? "administrator" : "distributor";

  if (
    profileError ||
    !profile ||
    profile.role !== databaseRole ||
    profile.is_active !== true
  ) {
    await supabase.auth.signOut();
    return {
      error: "This account is not active for the selected portal. Contact an AMANAH administrator.",
    };
  }

  redirect(portalRole === "admin" ? "/admin" : "/distributor");
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

  const { headers } = await import("next/headers");
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const requestOrigin = host ? `${protocol}://${host}` : "";
  // Prefer the stable, allow-listed site URL. Vercel's request host can be a
  // one-off deployment URL that Supabase does not recognize as an allowed redirect.
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const origin =
    configuredSiteUrl ||
    requestOrigin ||
    "https://amanah-unilevel-system.vercel.app";
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(emailValue.trim(), {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    // Keep provider details in Vercel server logs only; never expose them to the browser.
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
