import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { sendResendTestEmailAction } from "@/app/actions/email";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MemberProfileSummary from "@/components/MemberProfileSummary";
import ActivationCodePanel from "@/app/admin/activation-code-panel";

export const dynamic = "force-dynamic";

const DIRECTORY_PAGE_SIZE = 20;

type AdminSearchParams = {
  "email-test"?: string;
  q?: string;
  page?: string;
  status?: string;
};

function directoryPageUrl(page: number, query: string, status: "active" | "inactive"): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "active") params.set("status", status);
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
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, buyer_id, status, total, destination_name, created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id, name, sku, srp, distributor_price, mobile_stockist_price, branch_operator_price, marketing_officer_price, point_value, is_active")
    .order("name", { ascending: true })
    .limit(100);

  const { data: commissionRows, error: commissionError } = await supabase
    .from("commissions")
    .select("id, beneficiary_id, source_member_id, order_id, level_number, commission_type, basis, rate, amount, status")
    .limit(50);

  const { data: stockRows, error: stockError } = await supabase
    .from("inventory")
    .select("id, product_id, holder_id, location_id, quantity_on_hand, products(name, sku), stock_locations(location_code, location_name, location_type)")
    .order("quantity_on_hand", { ascending: false })
    .limit(100);

  // Keep the filter grammar safe for PostgREST's .or() expression.
  // Search is read-only and limited to the selected Distributor account status.
  const memberStatus = params.status === "inactive" ? "inactive" : "active";
  const activeFilter = memberStatus === "active";
  const search = (params.q ?? "")
    .trim()
    .slice(0, 60)
    .replace(/[^\p{L}\p{N}\s-]/gu, "");
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const safeRequestedPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  let directoryQuery = supabase
    .from("profiles")
    .select("id, member_code, full_name, phone, sponsor_id, created_at, is_active", { count: "exact" })
    .eq("role", "distributor")
    .eq("is_active", activeFilter);

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

  const [activeTotals, inactiveTotals] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "distributor").eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "distributor").eq("is_active", false),
  ]);

  const sponsorIds = Array.from(new Set((distributors ?? [])
    .map((member) => member.sponsor_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)));
  const { data: sponsorProfiles, error: sponsorProfilesError } = sponsorIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, member_code").in("id", sponsorIds)
    : { data: [], error: null };
  const sponsorById = new Map((sponsorProfiles ?? []).map((sponsor) => [sponsor.id, sponsor]));

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

        <MemberProfileSummary profileId={profile.id} />

        <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Order operations</p>
          <h2 className="mt-2 text-2xl font-semibold">Recent orders</h2>
          <p className="mt-2 text-sm text-stone-600">Latest 25 orders from the live order table. This queue is read-only; payment verification, fulfillment assignment, and status changes are not available here.</p>
          {ordersError ? (
            <p role="status" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Orders could not be loaded. Check the live orders columns and administrator read policy.</p>
          ) : orders && orders.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <tr><th className="py-3 pr-4">Order</th><th className="py-3 pr-4">Buyer ID</th><th className="py-3 pr-4">Destination</th><th className="py-3 pr-4">Status</th><th className="py-3 text-right">Total</th><th className="py-3 text-right">Created</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 pr-4 font-semibold">{order.order_number}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-stone-500">{String(order.buyer_id).slice(0, 8)}…</td>
                      <td className="py-3 pr-4">{order.destination_name || "—"}</td>
                      <td className="py-3 pr-4"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">{order.status}</span></td>
                      <td className="py-3 text-right font-semibold tabular-nums">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(order.total))}</td>
                      <td className="py-3 text-right text-xs text-stone-500">{new Date(order.created_at).toLocaleDateString("en-PH")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No orders were returned.</p>
          )}
          <p className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500">Read-only queue · latest 25 records · no payment or fulfillment action initiated.</p>
        </section>

        <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Product catalog</p>
          <h2 className="mt-2 text-2xl font-semibold">Live position pricing</h2>
          <p className="mt-2 text-sm text-stone-600">Read-only reference of up to 100 products and the prices currently stored in the live catalog.</p>
          {productsError ? (
            <p role="status" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Product pricing could not be loaded. Check the live products columns and administrator read policy.</p>
          ) : productRows && productRows.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <tr><th className="py-3 pr-3">Product</th><th className="py-3 pr-3 text-right">SRP</th><th className="py-3 pr-3 text-right">Distributor</th><th className="py-3 pr-3 text-right">Mobile Stockist</th><th className="py-3 pr-3 text-right">Branch Operator</th><th className="py-3 pr-3 text-right">Marketing Officer</th><th className="py-3 pr-3 text-right">Stored PV</th><th className="py-3 text-right">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {productRows.map((product) => (
                    <tr key={product.id}>
                      <td className="py-3 pr-3"><span className="font-medium">{product.name}</span><span className="block text-xs text-stone-500">{product.sku || "No SKU"}</span></td>
                      {([product.srp, product.distributor_price, product.mobile_stockist_price, product.branch_operator_price, product.marketing_officer_price] as Array<number | string | null>).map((price, index) => (
                        <td key={index} className="py-3 pr-3 text-right tabular-nums">{price == null ? "—" : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(price))}</td>
                      ))}
                      <td className="py-3 pr-3 text-right tabular-nums">{product.point_value == null ? "—" : Number(product.point_value).toLocaleString("en-PH")}</td>
                      <td className="py-3 text-right"><span className={product.is_active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600"}>{product.is_active ? "Active" : "Inactive"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No product records were returned.</p>
          )}
          <p className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500">Read-only catalog · stored PV is displayed as recorded and is not a confirmation of qualification or commission policy · no product edits or price changes.</p>
        </section>

        <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Commission oversight</p>
          <h2 className="mt-2 text-2xl font-semibold">Commission entries</h2>
          <p className="mt-2 text-sm text-stone-600">Up to 50 commission rows from the live commission table. This is a record inspection view, not a payable balance or payout queue.</p>
          {commissionError ? (
            <p role="status" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Commission entries could not be loaded. Check the commission table columns and administrator read policy.</p>
          ) : commissionRows && commissionRows.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <tr><th className="py-3 pr-3">Beneficiary</th><th className="py-3 pr-3">Source member</th><th className="py-3 pr-3">Order ID</th><th className="py-3 pr-3">Type / level</th><th className="py-3 pr-3">Basis</th><th className="py-3 pr-3">Rate</th><th className="py-3 pr-3 text-right">Amount</th><th className="py-3 text-right">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {commissionRows.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 pr-3 font-mono text-xs">{String(entry.beneficiary_id).slice(0, 8)}…</td>
                      <td className="py-3 pr-3 font-mono text-xs">{entry.source_member_id ? `${String(entry.source_member_id).slice(0, 8)}…` : "—"}</td>
                      <td className="py-3 pr-3 font-mono text-xs">{entry.order_id ? `${String(entry.order_id).slice(0, 8)}…` : "—"}</td>
                      <td className="py-3 pr-3 capitalize">{String(entry.commission_type).replaceAll("_", " ")}{entry.level_number == null ? "" : ` · L${entry.level_number}`}</td>
                      <td className="py-3 pr-3 tabular-nums">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(entry.basis))}</td>
                      <td className="py-3 pr-3 tabular-nums">{Number(entry.rate).toLocaleString("en-PH")}%</td>
                      <td className="py-3 pr-3 text-right font-semibold tabular-nums">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(entry.amount))}</td>
                      <td className="py-3 text-right"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold capitalize">{String(entry.status).replaceAll("_", " ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No commission entries were returned.</p>
          )}
          <p className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500">Read-only · no commission calculation, posting, adjustment, wallet credit, or payout action.</p>
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
              <h2 className="mt-2 text-2xl font-semibold">{activeFilter ? "Active Distributors" : "Inactive Distributors"}</h2>
              <p className="mt-2 text-sm text-stone-600">
                Search and browse Distributor accounts by account status. This directory does not change account status.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={directoryPageUrl(1, search, "active")}
                aria-current={memberStatus === "active" ? "page" : undefined}
                className={memberStatus === "active" ? "rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200" : "rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-200"}
              >
                Active: {activeTotals.error ? "Unavailable" : (activeTotals.count ?? 0).toLocaleString("en-PH")}
              </Link>
              <Link
                href={directoryPageUrl(1, search, "inactive")}
                aria-current={memberStatus === "inactive" ? "page" : undefined}
                className={memberStatus === "inactive" ? "rounded-full bg-stone-200 px-3 py-1.5 text-sm font-semibold text-stone-800 ring-1 ring-stone-300" : "rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-200"}
              >
                Inactive: {inactiveTotals.error ? "Unavailable" : (inactiveTotals.count ?? 0).toLocaleString("en-PH")}
              </Link>
              <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700">
                {countResult.error ? "Unavailable" : `${totalMembers.toLocaleString("en-PH")} matching`}
              </span>
            </div>
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
            <label htmlFor="member-status" className="sr-only">Account status</label>
            <select id="member-status" name="status" defaultValue={memberStatus} className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="rounded-xl bg-[#244735] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b3829]">
              Search
            </button>
            {search && (
              <Link href={directoryPageUrl(1, "", memberStatus)} className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold hover:bg-stone-50">
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
                      <p className="mt-1 text-xs text-stone-500">
                        Sponsor: {member.sponsor_id ? sponsorById.get(member.sponsor_id)?.full_name || "Sponsor profile unavailable" : "No sponsor recorded"}
                        {member.sponsor_id && sponsorById.get(member.sponsor_id)?.member_code ? ` · ${sponsorById.get(member.sponsor_id)?.member_code}` : ""}
                      </p>
                      {sponsorProfilesError && member.sponsor_id && <p className="mt-1 text-xs text-stone-500">Sponsor details unavailable due to profile access policy.</p>}
                      {member.phone && <p className="mt-1 text-sm text-stone-600">{member.phone}</p>}
                    </div>
                    <span className={member.is_active ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700"}>{member.is_active ? "Active" : "Inactive"}</span>
                  </article>
                ))}
              </div>
              <nav aria-label="Distributor directory pages" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
                <p className="text-sm text-stone-500">
                  Page {currentPage} of {totalPages} · Showing {Math.min(totalMembers, (currentPage - 1) * DIRECTORY_PAGE_SIZE + 1)}–{Math.min(totalMembers, currentPage * DIRECTORY_PAGE_SIZE)} of {totalMembers}
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link href={directoryPageUrl(currentPage - 1, search, memberStatus)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50">
                      Previous
                    </Link>
                  )}
                  {currentPage < totalPages && (
                    <Link href={directoryPageUrl(currentPage + 1, search, memberStatus)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50">
                      Next
                    </Link>
                  )}
                </div>
              </nav>
            </>
          ) : (
            <p className="mt-6 rounded-xl bg-stone-50 p-5 text-sm text-stone-600">
              {search ? `No ${memberStatus} Distributor profiles match this search.` : `No ${memberStatus} Distributor profiles were found.`}
            </p>
          )}
          <p className="mt-5 border-t border-stone-100 pt-4 text-xs leading-5 text-stone-500">
            Read-only directory. Status filtering is informational only; approval, suspension, role changes, and profile edits remain disabled until
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
