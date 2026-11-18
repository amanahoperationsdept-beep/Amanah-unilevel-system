import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { sendResendTestEmailAction } from "@/app/actions/email";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ActivationCodePanel from "@/app/admin/activation-code-panel";

export const dynamic = "force-dynamic";

const DIRECTORY_PAGE_SIZE = 20;

type AdminSearchParams = {
  "email-test"?: string;
  q?: string;
  page?: string;
};

function directoryPageUrl(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin?${suffix}` : "/admin";
}

export default async function AdminWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const profile = await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: stockRows, error: stockError } = await supabase
    .from("inventory")
    .select("id, product_id, holder_id, location_id, quantity_on_hand, products(name, sku), stock_locations(location_code, location_name, location_type)")
    .order("quantity_on_hand", { ascending: false })
    .limit(100);

  // Keep the filter grammar safe for PostgREST's .or() expression.
  // Search is read-only and limited to active Distributor profiles.
  const search = (params.q ?? "")
    .trim()
    .slice(0, 60)
    .replace(/[^\p{L}\p{N}\s-]/gu, "");
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const safeRequestedPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  let directoryQuery = supabase
    .from("profiles")
    .select("id, member_code, full_name, phone, created_at", { count: "exact" })
    .eq("role", "distributor")
    .eq("is_active", true);

  if (search) {
    directoryQuery = directoryQuery.or(
      `full_name.ilike.%${search}%,member_code.ilike.%${search}%`,
    );
  }

  const countResult = await directoryQuery
    .order("created_at", { ascending: true })
    .range(
      (safeRequestedPage - 1) * DIRECTORY_PAGE_SIZE,
      safeRequestedPage * DIRECTORY_PAGE_SIZE - 1,
    );

  const totalMembers = countResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMembers / DIRECTORY_PAGE_SIZE));
  const currentPage = Math.min(safeRequestedPage, totalPages);
  const { data: distributors, error: distributorsError } =
    currentPage === safeRequestedPage
      ? countResult
      : await directoryQuery
          .order("created_at", { ascending: true })
          .range(
            (currentPage - 1) * DIRECTORY_PAGE_SIZE,
            currentPage * DIRECTORY_PAGE_SIZE - 1,
          );

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

        <ActivationCodePanel />

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
          {params["email-test"] === "sent" && (
            <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Resend accepted the test email. Check the inbox for your administrator account.
            </p>
          )}
          {params["email-test"] === "failed" && (
            <p role="status" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
              The test email could not be sent. Check the email provider environment variables and sender settings.
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Inventory visibility</p>
          <h2 className="mt-2 text-2xl font-semibold">Stock snapshot</h2>
          <p className="mt-2 text-sm text-stone-600">
            Read-only view of the first 100 inventory records, ordered by on-hand quantity. This panel does not reserve, transfer, or adjust stock.
          </p>
          {stockError ? (
            <p role="status" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
              Inventory could not be loaded. Check the live inventory relationships and administrator read policy.
            </p>
          ) : stockRows && stockRows.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <tr><th className="py-3 pr-4">Product</th><th className="py-3 pr-4">Stock location</th><th className="py-3 pr-4">Holder</th><th className="py-3 text-right">On hand</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stockRows.map((row) => {
                    const product = row.products as { name?: string; sku?: string | null } | null;
                    const location = row.stock_locations as { location_code?: string; location_name?: string; location_type?: string } | null;
                    return (
                      <tr key={row.id}>
                        <td className="py-3 pr-4"><span className="font-medium">{product?.name || "Unknown product"}</span><span className="block text-xs text-stone-500">{product?.sku || row.product_id}</span></td>
                        <td className="py-3 pr-4">{location ? <><span className="font-medium">{location.location_name}</span><span className="block text-xs text-stone-500">{location.location_code} · {location.location_type}</span></> : "—"}</td>
                        <td className="py-3 pr-4">{row.holder_id ? "Member-held stock" : "Location-held stock"}</td>
                        <td className="py-3 text-right font-semibold tabular-nums">{Number(row.quantity_on_hand).toLocaleString("en-PH")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No inventory records were returned.</p>
          )}
          <p className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500">Read-only snapshot · maximum 100 records · no stock movement initiated.</p>
        </section>

        <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Member directory</p>
              <h2 className="mt-2 text-2xl font-semibold">Active Distributors</h2>
              <p className="mt-2 text-sm text-stone-600">
                Search and browse active Distributor accounts. This directory does not change account status.
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700">
              {totalMembers.toLocaleString("en-PH")} matching
            </span>
          </div>

          <form action="/admin" method="get" className="mt-6 flex flex-wrap gap-3">
            <label htmlFor="member-search" className="sr-only">Search name or member code</label>
            <input
              id="member-search"
              name="q"
              type="search"
              maxLength={60}
              defaultValue={search}
              placeholder="Search name or member code"
              className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-[#244735] focus:ring-2 focus:ring-[#244735]/10"
            />
            <button className="rounded-xl bg-[#244735] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b3829]">
              Search
            </button>
            {search && (
              <Link href="/admin" className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold hover:bg-stone-50">
                Clear
              </Link>
            )}
          </form>

          {distributorsError ? (
            <p role="status" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
              The Distributor directory could not be loaded. Check the profiles table and administrator read policy.
            </p>
          ) : distributors && distributors.length > 0 ? (
            <>
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
              <nav aria-label="Distributor directory pages" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
                <p className="text-sm text-stone-500">
                  Page {currentPage} of {totalPages} · Showing {Math.min(totalMembers, (currentPage - 1) * DIRECTORY_PAGE_SIZE + 1)}–{Math.min(totalMembers, currentPage * DIRECTORY_PAGE_SIZE)} of {totalMembers}
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link href={directoryPageUrl(currentPage - 1, search)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50">
                      Previous
                    </Link>
                  )}
                  {currentPage < totalPages && (
                    <Link href={directoryPageUrl(currentPage + 1, search)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50">
                      Next
                    </Link>
                  )}
                </div>
              </nav>
            </>
          ) : (
            <p className="mt-6 rounded-xl bg-stone-50 p-5 text-sm text-stone-600">
              {search ? "No active Distributor profiles match this search." : "No active Distributor profiles were found."}
            </p>
          )}
          <p className="mt-5 border-t border-stone-100 pt-4 text-xs leading-5 text-stone-500">
            Read-only directory. Approval, suspension, role changes, and profile edits remain disabled until
            the current live profile schema and authorization rules are fully reconciled.
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
