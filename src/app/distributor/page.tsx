import { signOutAction } from "@/app/actions/auth";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DistributorProductCatalog, type CatalogProduct } from "./product-catalog";

type GenealogyRow = {
  member_code?: string | null;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

export const dynamic = "force-dynamic";

export default async function DistributorWorkspacePage() {
  const profile = await requireRole("distributor");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, name, description, srp, distributor_price, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const products = (data ?? []) as CatalogProduct[];

  // The genealogy RPC uses auth.uid() as its root; never accept a member-supplied root ID.
  const { data: networkRows, error: networkError } = await supabase.rpc("get_my_genealogy");

  // The explicit buyer filter keeps this panel to the signed-in distributor's
  // own orders, even though the parent-table RLS also supports downline visibility.
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);



  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-[#20251f] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#9a743e]">AMANAH / Distributor</p>
            <h1 className="text-3xl font-semibold">Welcome, {profile.full_name}</h1>
            <p className="mt-2 text-sm text-stone-600">Your authenticated distributor workspace.</p>
            <p className="mt-1 text-xs text-stone-500">Member code: {profile.member_code}</p>
          </div>
          <form action={signOutAction}>
            <button className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-100">Sign out</button>
          </form>
        </header>
        <section className="mb-7 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Access verified</p>
          <h2 className="mt-2 text-xl font-semibold">Distributor product ordering</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Prices below are loaded from the AMANAH product catalog and use the Distributor price column.</p>
        </section>
        {error ? (
          <p role="alert" className="rounded-xl bg-rose-50 p-5 text-sm text-rose-800">The product catalog could not be loaded. Ask an administrator to check the products table and its read policy.</p>
        ) : (
          <DistributorProductCatalog products={products} />
        )}
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Network visibility</p>
          <h2 className="mt-2 text-xl font-semibold">My downline</h2>
          <p className="mt-2 text-sm text-stone-600">Your network is rooted to your authenticated account. This page cannot request another member’s network.</p>
          {networkError ? (
            <p role="status" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Your network could not be loaded. Ask AMANAH support to verify genealogy access.</p>
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
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Order history</p>
          <h2 className="mt-2 text-xl font-semibold">My recent orders</h2>
          <p className="mt-2 text-sm text-stone-600">The latest 20 orders placed by your account. This is a read-only history view.</p>
          {ordersError ? (
            <p role="status" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Your order history could not be loaded. Ask AMANAH support to verify your order access.</p>
          ) : orders && orders.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <tr><th className="py-3 pr-4">Order</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4 text-right">Total</th><th className="py-3 text-right">Date</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 pr-4 font-semibold">{order.order_number}</td>
                      <td className="py-3 pr-4"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">{order.status}</span></td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(order.total))}</td>
                      <td className="py-3 text-right text-xs text-stone-500">{new Date(order.created_at).toLocaleDateString("en-PH")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No orders have been placed by your account yet.</p>
          )}
          <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">Read-only · no order, payment, or fulfillment changes are available here.</p>
        </section>

        <p className="mt-6 text-xs leading-5 text-stone-500">Cart contents are temporary and stay in this browser page. Checkout, payment, stock deduction, and order submission are not enabled yet.</p>
      </div>
    </main>
  );
}
