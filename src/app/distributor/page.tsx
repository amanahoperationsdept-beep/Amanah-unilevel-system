import { signOutAction } from "@/app/actions/auth";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DistributorProductCatalog, type CatalogProduct } from "./product-catalog";

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
        <p className="mt-6 text-xs leading-5 text-stone-500">Cart contents are temporary and stay in this browser page. Checkout, payment, stock deduction, and order submission are not enabled yet.</p>
      </div>
    </main>
  );
}
