"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileUpdateResult = { error?: string; success?: string };

export async function updateOwnProfileAction(formData: FormData): Promise<ProfileUpdateResult> {
  const fullNameValue = formData.get("full_name");
  const phoneValue = formData.get("phone");
  if (typeof fullNameValue !== "string" || typeof phoneValue !== "string") {
    return { error: "Please enter a valid name and contact number." };
  }

  const fullName = fullNameValue.trim().replace(/\s+/g, " ");
  const phone = phoneValue.trim();
  if (fullName.length < 2 || fullName.length > 100) {
    return { error: "Full name must be between 2 and 100 characters." };
  }
  if (phone.length > 30 || (phone && !/^[+0-9() .-]{7,30}$/.test(phone))) {
    return { error: "Enter a valid contact number (7–30 characters)." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Your session has expired. Please sign in again." };

  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !currentProfile || currentProfile.is_active !== true) {
    return { error: "Your active member profile could not be verified." };
  }

  // Explicit allow-list: only the two self-editable columns are sent.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", user.id);
  if (updateError) {
    console.error("[profile-update] self-profile update failed", { code: updateError.code, message: updateError.message });
    return { error: "Your profile could not be saved. Please try again or contact AMANAH support." };
  }
  return { success: "Profile details saved." };
}
