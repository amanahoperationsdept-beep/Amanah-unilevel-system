import { signOutAction } from "@/app/actions/auth";
import { sendResendTestEmailAction } from "@/app/actions/email";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminWorkspacePage({ searchParams }: { searchParams: Promise<{ "email-test"?: string }> }) {
  const params = await searchParams;
  const profile = await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: distributors, error: distributorsError } = await supabase
    .from("profiles")
    .select("id, member_code, full_name, phone, created_at")
    .eq("role", "distributor")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-6 py-10 text-[#20251f]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#9a743e]">
              AMANAH / Administrator
            </p>
            <h1 className="text-3xl font-semibold">Welcome, {profile.full_name}</h1>
            <p className="mt-2 text-sm text-stone-600">Your administrator session is authenticated.</p>
          </div>
          <form action={signOutAction}>
            <button className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-100">
              Sign out
            </button>
          </form>
        </header>

        <section className="mb-7 rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Email setup</p>
          <h2 className="mt-2 text-xl font-semibold">Test AMANAH email delivery</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Sends one test email to the email address on your signed-in administrator account.
            This does not send messages to applicants.
          </p>
          <form action={sendResendTestEmailAction} className="mt-4">
            <button className="rounded-full bg-[#244735] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1b3829]">
              Send test email to my account
            </button>
          </form>
          {/*
            The result query parameter is intentionally simple feedback from the server action.
          */}
          {params["email-test"] === "sent" && (
            <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Resend accepted the test email. Check the inbox for your administrator account.
            </p>
          )}
          {params["email-test"] === "failed" && (
            <p role="status" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
              The test email could not be sent. Check the Vercel environment variables and Resend sender settings.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Access verified
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Administrator workspace</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Supabase Auth confirmed your session, and the server verified that your AMANAH profile
            is active and assigned the administrator role. This page reads active distributor
            profiles from the live database schema.
          </p>
          <dl className="mt-7 grid gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-stone-500">Member code</dt>
              <dd className="mt-1 font-semibold">{profile.member_code || "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-stone-500">Account role</dt>
              <dd className="mt-1 font-semibold">Administrator</dd>
            </div>
          </dl>
        </section>

        <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Member directory</p>
              <h2 className="mt-2 text-2xl font-semibold">Active Distributors</h2>
              <p className="mt-2 text-sm text-stone-600">Read-only list of Distributor accounts currently marked active.</p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700">
              {distributors?.length ?? 0} active
            </span>
          </div>

          {distributorsError ? (
            <p role="status" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
              The Distributor directory could not be loaded. Check the profiles table and administrator read policy.
            </p>
          ) : distributors && distributors.length > 0 ? (
            <div className="mt-6 divide-y divide-stone-100">
              {distributors.map((member) => (
                <article key={member.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div>
                    <h3 className="font-semibold">{member.full_name}</h3>
                    <p className="mt-1 text-xs text-stone-500">
                      {member.member_code || "No member code"} · Joined {new Date(member.created_at).toLocaleDateString("en-PH")}
                    </p>
                    {member.phone && <p className="mt-1 text-sm text-stone-600">{member.phone}</p>}
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Active</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-xl bg-stone-50 p-5 text-sm text-stone-600">
              No active Distributor profiles were found.
            </p>
          )}
          <p className="mt-5 border-t border-stone-100 pt-4 text-xs leading-5 text-stone-500">
            This directory is read-only. Distributor application approval is not enabled here because
            the live profiles schema uses an active flag rather than the separate pending/closed
            application status required by the older onboarding workflow.
          </p>
        </section>

        <p className="mt-6 text-xs leading-5 text-stone-500">
          Development workspace only. Commission calculation, wallet posting, payout approval,
          stock adjustment, and account activation are not available from this page.
        </p>
      </div>
    </main>
  );
}
