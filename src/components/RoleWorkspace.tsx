import { signOutAction } from "@/app/actions/auth";
import { requireRole, type PortalRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const workspaceDetails: Record<Exclude<PortalRole, "admin" | "distributor">, { title: string; description: string; modules: string[] }> = {
  marketing_officer: {
    title: "Marketing Officer workspace",
    description: "Your account is authenticated and your assigned role has been verified.",
    modules: ["Member and network visibility", "Sales and PV reports", "Marketing activity"],
  },
  branch_operator: {
    title: "Branch Operator workspace",
    description: "Your account is authenticated and your assigned role has been verified.",
    modules: ["Branch stock balances", "Stock requests and transfers", "Payment verification"],
  },
  mobile_stockist: {
    title: "Mobile Stockist workspace",
    description: "Your account is authenticated and your assigned role has been verified.",
    modules: ["Stock balances", "Stock requests and receipt confirmation", "Payment verification"],
  },
};

type GenealogyRow = {
  member_code?: string | null;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

export default async function RoleWorkspace({ role }: { role: Exclude<PortalRole, "admin" | "distributor"> }) {
  const profile = await requireRole(role);
  const details = workspaceDetails[role];
  const supabase = await createSupabaseServerClient();

  // Branch Operators see only stock locations explicitly linked to their own profile.
  const { data: locations, error: locationsError } =
    role === "branch_operator"
      ? await supabase
          .from("stock_locations")
          .select("id, location_code, location_name, location_type")
          .eq("profile_id", profile.id)
          .eq("is_active", true)
      : { data: null, error: null };

  // The live get_my_genealogy RPC defaults to auth.uid() and rejects non-admin
  // attempts to select another root. Never pass a member-supplied root ID here.
  const { data: networkRows, error: networkError } =
    role === "marketing_officer"
      ? await supabase.rpc("get_my_genealogy")
      : { data: null, error: null };

  // Commission rows are private to their beneficiary under the audited live RLS.
  // Keep an explicit beneficiary filter and never present pending rows as withdrawable.
  const { data: commissionRows, error: commissionError } =
    role === "marketing_officer"
      ? await supabase
          .from("commissions")
          .select("id, order_id, source_member_id, level_number, commission_type, basis, rate, amount, status")
          .eq("beneficiary_id", profile.id)
          .limit(50)
      : { data: null, error: null };

  const locationIds = (locations ?? []).map((location) => location.id);
  const { data: stockRows, error: stockError } =
    role === "branch_operator" && locationIds.length > 0
      ? await supabase
          .from("inventory")
          .select("id, product_id, quantity_on_hand, products(name, sku), location_id")
          .in("location_id", locationIds)
          .order("quantity_on_hand", { ascending: false })
      : role === "mobile_stockist"
        ? await supabase
            .from("inventory")
            .select("id, product_id, quantity_on_hand, products(name, sku)")
            .eq("holder_id", profile.id)
            .order("quantity_on_hand", { ascending: false })
        : { data: [], error: null };

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-5 py-8 text-[#20251f] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#9a743e]">AMANAH / {role.replaceAll("_", " ")}</p>
            <h1 className="text-3xl font-semibold">{details.title}</h1>
            <p className="mt-2 text-sm text-stone-600">Welcome, {profile.full_name}</p>
            <p className="mt-1 text-xs text-stone-500">Member code: {profile.member_code || "Not assigned"}</p>
          </div>
          <form action={signOutAction}>
            <button className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-100">Sign out</button>
          </form>
        </header>

        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Access verified</p>
          <h2 className="mt-2 text-xl font-semibold">Role-based access is active</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{details.description}</p>
        </section>

        {role === "marketing_officer" && (
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Network visibility</p>
            <h2 className="mt-2 text-xl font-semibold">My downline</h2>
            <p className="mt-2 text-sm text-stone-600">This view uses the authenticated account as its root. It does not allow searching for or opening another member’s network.</p>
            {networkError ? (
              <p role="status" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Your network could not be loaded. Ask an administrator to verify the genealogy RPC and account permissions.</p>
            ) : networkRows && networkRows.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                    <tr><th className="py-2 pr-3">Member</th><th className="py-2 pr-3">Member code</th><th className="py-2 pr-3">Role</th><th className="py-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {networkRows.map((member: GenealogyRow, index: number) => (
                      <tr key={member.member_code || index}>
                        <td className="py-3 pr-3 font-medium">{member.full_name || "Unnamed member"}</td>
                        <td className="py-3 pr-3 text-stone-600">{member.member_code || "—"}</td>
                        <td className="py-3 pr-3 capitalize text-stone-600">{String(member.role || "—").replaceAll("_", " ")}</td>
                        <td className="py-3">{member.is_active ? "Active" : "Inactive"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No downline members were returned for your account.</p>
            )}
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">Read-only · genealogy depth and access are enforced by the database function.</p>
          </section>
        )}

        {role === "marketing_officer" && (
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Personal commission records</p>
            <h2 className="mt-2 text-xl font-semibold">My commission history</h2>
            <p className="mt-2 text-sm text-stone-600">Commission entries recorded for your own beneficiary account. Up to 50 records are shown.</p>
            {commissionError ? (
              <p role="status" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Your commission records could not be loaded. Ask an administrator to verify commission access.</p>
            ) : commissionRows && commissionRows.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                    <tr><th className="py-3 pr-3">Type</th><th className="py-3 pr-3">Level</th><th className="py-3 pr-3">Basis</th><th className="py-3 pr-3">Rate</th><th className="py-3 pr-3 text-right">Amount</th><th className="py-3 text-right">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {commissionRows.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-3 pr-3 capitalize">{String(entry.commission_type).replaceAll("_", " ")}</td>
                        <td className="py-3 pr-3">{entry.level_number ?? "—"}</td>
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
              <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No commission entries were returned for your account.</p>
            )}
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">Read-only record view · commission entries are not a wallet balance or withdrawal approval.</p>
          </section>
        )}

        {role === "branch_operator" && (
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Branch stock visibility</p>
            <h2 className="mt-2 text-xl font-semibold">My assigned location stock</h2>
            <p className="mt-2 text-sm text-stone-600">Only active stock locations linked to your own profile are included. This is a read-only balance view.</p>
            {locationsError || stockError ? (
              <p role="status" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Stock balances could not be loaded. Ask an administrator to verify your location assignment and read permissions.</p>
            ) : locations && locations.length > 0 ? (
              <div className="mt-4 space-y-5">
                {locations.map((location) => {
                  const rows = (stockRows ?? []).filter((row) => "location_id" in row && row.location_id === location.id);
                  return (
                    <div key={location.id} className="rounded-xl border border-stone-100 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{location.location_name}</h3>
                          <p className="text-xs text-stone-500">{location.location_code} · {location.location_type}</p>
                        </div>
                        <span className="text-xs text-stone-500">{rows.length} product balances</span>
                      </div>
                      {rows.length > 0 ? (
                        <div className="mt-3 divide-y divide-stone-100">
                          {rows.map((row) => {
                            const product = row.products as { name?: string; sku?: string | null } | null;
                            return (
                              <div key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                <div>
                                  <p className="font-medium">{product?.name || "Unknown product"}</p>
                                  <p className="text-xs text-stone-500">{product?.sku || row.product_id}</p>
                                </div>
                                <p className="font-semibold tabular-nums">{Number(row.quantity_on_hand).toLocaleString("en-PH")}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-stone-500">No inventory balances found for this location.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No active stock location is currently linked to your account. Contact an administrator to verify your assignment.</p>
            )}
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">Read-only · no stock adjustment, transfer, reservation, or fulfillment action.</p>
          </section>
        )}

        {role === "mobile_stockist" && (
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Mobile Stockist stock visibility</p>
            <h2 className="mt-2 text-xl font-semibold">My stock balance</h2>
            <p className="mt-2 text-sm text-stone-600">Balances assigned to your authenticated member profile are shown below. This view is read-only.</p>
            {stockError ? (
              <p role="status" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Your stock balances could not be loaded. Ask an administrator to verify your stock assignment and read permissions.</p>
            ) : stockRows && stockRows.length > 0 ? (
              <div className="mt-4 divide-y divide-stone-100">
                {stockRows.map((row) => {
                  const product = row.products as { name?: string; sku?: string | null } | null;
                  return (
                    <div key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div>
                        <p className="font-medium">{product?.name || "Unknown product"}</p>
                        <p className="text-xs text-stone-500">{product?.sku || row.product_id}</p>
                      </div>
                      <p className="font-semibold tabular-nums">{Number(row.quantity_on_hand).toLocaleString("en-PH")}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No stock is currently assigned to your profile.</p>
            )}
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">Read-only · no stock adjustment, transfer, reservation, or receipt confirmation.</p>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-950">Operational modules are not enabled yet</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">This is an authenticated workspace shell. No stock, payment, commission, or sales transaction is available here. Do not use it for live operations until the modules and database permissions are verified.</p>
        </section>

        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Planned modules for this role</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {details.modules.map((module) => (
              <li key={module} className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm text-stone-700">{module}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
