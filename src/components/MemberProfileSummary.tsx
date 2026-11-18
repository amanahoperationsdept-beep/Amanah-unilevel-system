import { createSupabaseServerClient } from "@/lib/supabase/server";\nimport ProfileEditForm from "@/components/ProfileEditForm";

type MemberProfileSummaryProps = {
  profileId: string;
};

const roleLabels: Record<string, string> = {
  administrator: "Administrator",
  distributor: "Distributor",
  marketing_officer: "Marketing Officer",
  branch_operator: "Branch Operator",
  mobile_stockist: "Mobile Stockist",
};

export default async function MemberProfileSummary({ profileId }: MemberProfileSummaryProps) {
  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, username, phone, member_code, role, is_active, created_at")
    .eq("id", profileId)
    .maybeSingle();

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Account details</p>
      <h2 className="mt-2 text-xl font-semibold">My profile</h2>
      <p className="mt-2 text-sm text-stone-600">Edit your name and contact number. Your account identifiers and role remain protected.</p>
      {error || !profile ? (
        <p role="status" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          Your profile details could not be loaded. Your sign-in session remains separate from this profile summary.
        </p>
      ) : (
        <>
          <ProfileEditForm fullName={profile.full_name || ""} phone={profile.phone} />
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-stone-500">Username</dt>
            <dd className="mt-1 font-semibold">{profile.username || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-stone-500">Member code</dt>
            <dd className="mt-1 font-semibold">{profile.member_code || "Not assigned"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-stone-500">Account role</dt>
            <dd className="mt-1 font-semibold">{roleLabels[profile.role] || "Unrecognized role"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-stone-500">Account status</dt>
            <dd className="mt-1 font-semibold">{profile.is_active ? "Active" : "Inactive"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-stone-500">Member since</dt>
            <dd className="mt-1 font-semibold">{profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-PH") : "Not available"}</dd>
          </div>
          </dl>
        </>
      )}
      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">Editable fields are limited to full name and contact number. Username, member code, role, sponsor, and account status are read-only. Changes are restricted to your authenticated profile and subject to Supabase RLS.</p>
    </section>
  );
}
