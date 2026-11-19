"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendResendTestEmail } from "@/lib/email/resend";

export async function sendResendTestEmailAction(): Promise<void> {
  await requireRole("admin");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    redirect("/admin?email-test=failed");
  }

  try {
    await sendResendTestEmail(user.email);
  } catch {
    redirect("/admin?email-test=failed");
  }

  redirect("/admin?email-test=sent");
}
