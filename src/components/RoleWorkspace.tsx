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

  const locationIds = (locations ?? []).map((location) => location.id);
  const { data: stockRows, error: stockError } =
    role === "branch_operator" && locationIds.length > 0
      ? await supabase
          .from("inventory")
          .select("id, product_id, quantity_on_hand, products(name, sku), location_id")
          .in("location_id", locationIds)
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
