import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, ShieldCheck } from "lucide-react";

const pullRequests = [
  { n: 1, title: "POS position-based pricing", status: "CI passed · checkout held", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/1", detail: "Role price selection and browser-only cart; checkout remains disabled." },
  { n: 2, title: "Product pricing by membership level", status: "CI passed · reference pricing", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/2", detail: "Eight-product reference pricing; not yet the authoritative live catalog or editable admin data." },
  { n: 3, title: "Order-item access hardening", status: "Disposable PostgreSQL tests passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/3", detail: "Tested policy remediation draft; not applied to the live database." },
  { n: 4, title: "Admin member directory", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/4", detail: "Searchable, paginated, read-only member listing." },
  { n: 5, title: "Admin inventory snapshot", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/5", detail: "Read-only inventory visibility." },
  { n: 6, title: "Admin recent order queue", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/6", detail: "Read-only order oversight; no fulfillment or payment actions." },
  { n: 7, title: "Branch Operator stock view", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/7", detail: "Assigned-location stock visibility." },
  { n: 8, title: "Mobile Stockist stock view", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/8", detail: "Personal stock visibility." },
  { n: 9, title: "Marketing Officer network view", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/9", detail: "Own-network genealogy visibility." },
  { n: 10, title: "Distributor order history", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/10", detail: "Own-order history, read-only." },
  { n: 11, title: "Marketing Officer commission history", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/11", detail: "Own commission records, not wallet balance or payout approval." },
  { n: 12, title: "Admin commission audit view", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/12", detail: "Read-only commission record inspection." },
  { n: 13, title: "Admin live product pricing", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/13", detail: "Live catalog price and stored PV reference, read-only." },
  { n: 15, title: "Distributor personal genealogy", status: "CI passed", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/15", detail: "Read-only own-downline view rooted to the authenticated Distributor account." },
  { n: 16, title: "Member self-profile view", status: "CI pending", href: "https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system/pull/16", detail: "Read-only personal profile summary across all authenticated role workspaces." }
];

const phases = [
  { title: "Platform foundation", state: "In place", detail: "Next.js application, Supabase authentication foundation, role-guarded workspaces, public landing page and catalog." },
  { title: "Read-only operations visibility", state: "Implemented in draft PRs", detail: "Member, order, stock, network, commission and product views are being added through reviewed feature branches." },
  { title: "Security and live-schema reconciliation", state: "In progress · blocking", detail: "Resolve the known order-item access issue and reconcile activation-code workflows with the actual hosted database before enabling dependent operations." },
  { title: "Transactional workflows", state: "Not production-ready", detail: "Checkout, payment verification, stock movement, commission posting, wallet ledger and payouts require verified server-side rules, permissions and audit trails." },
  { title: "Business rules and launch readiness", state: "Awaiting approval", detail: "Finalize qualification, rank, replacement/reversal, commission and payout rules, then complete end-to-end and operational acceptance testing." }
];

function statusStyle(status: string) {
  return status.includes("passed") || status === "In place" ? "bg-emerald-50 text-emerald-800" : status.includes("blocking") ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800";
}

export default function ProjectProgressPage() {
  const passed = pullRequests.filter(p => p.status.includes("passed")).length;
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#26251f]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-semibold tracking-[0.18em] text-[#6f5731]">AMANAH <span className="text-xs font-normal tracking-normal text-stone-500">DMC</span></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950"><ArrowLeft size={16}/> Back to site</Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a743e]">AMANAH SYSTEM DEVELOPMENT</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Project progress</h1>
          <p className="mt-5 text-lg leading-8 text-stone-600">A transparent view of what has been built, what has passed automated checks, and what still needs security, business or operational approval.</p>
          <p className="mt-3 text-sm text-stone-500">Status snapshot: 19 November 2026 · based on repository pull requests and recorded project validation.</p>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Feature PRs opened</p><p className="mt-2 text-3xl font-semibold tabular-nums">15</p><p className="mt-1 text-xs text-stone-500">Feature PRs #1–#13 and #15–#16; all draft / unmerged</p></div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Automated validations passed</p><p className="mt-2 text-3xl font-semibold tabular-nums">{passed} / 15</p><p className="mt-1 text-xs text-stone-500">PRs 1–13 and 15 passed; PR 3 includes disposable PostgreSQL security tests; PR 16 pending</p></div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Live database changes</p><p className="mt-2 text-3xl font-semibold">0</p><p className="mt-1 text-xs text-stone-500">No unapproved migration or writes</p></div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Production readiness</p><p className="mt-2 text-xl font-semibold text-amber-700">Not ready</p><p className="mt-1 text-xs text-stone-500">Security and transaction gates remain</p></div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a743e]">Delivery roadmap</p><h2 className="mt-2 text-2xl font-semibold">System workstreams</h2></div><span className="text-xs text-stone-500">Current stage by workstream</span></div>
          <div className="mt-5 space-y-3">
            {phases.map((phase, i) => <article key={phase.title} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-5">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1ece2] text-sm font-semibold text-[#795d32]">{i + 1}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{phase.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(phase.state)}`}>{phase.state}</span></div><p className="mt-2 text-sm leading-6 text-stone-600">{phase.detail}</p></div>
            </article>)}
          </div>
        </section>

        <section className="mt-12">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a743e]">Implementation register</p><h2 className="mt-2 text-2xl font-semibold">Feature-by-feature progress</h2><p className="mt-2 text-sm text-stone-600">Each item links to its draft pull request. “CI passed” means automated repository checks passed; it does not mean the feature has been merged, connected end-to-end, or approved for production.</p></div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {pullRequests.map((pr, i) => <div key={pr.n} className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${i ? "border-t border-stone-100" : ""}`}>
              <div className="flex min-w-0 gap-3"><span className="mt-0.5 text-xs font-semibold tabular-nums text-stone-400">#{pr.n}</span><div className="min-w-0"><h3 className="font-medium">{pr.title}</h3><p className="mt-1 text-sm text-stone-500">{pr.detail}</p></div></div>
              <div className="flex shrink-0 items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(pr.status)}`}>{pr.status}</span><a href={pr.href} target="_blank" rel="noreferrer" aria-label={`Open pull request ${pr.n}`} className="text-stone-500 hover:text-stone-950"><ArrowUpRight size={18}/></a></div>
            </div>)}
          </div>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6"><div className="flex items-center gap-2 text-rose-800"><ShieldCheck size={18}/><h2 className="font-semibold">Current release blockers</h2></div><ul className="mt-4 space-y-3 text-sm leading-6 text-rose-950"><li>• Live order-item row-level access needs remediation and a fresh live verification before related data is exposed.</li><li>• Activation-code application workflow and the hosted database schema need final reconciliation.</li><li>• Checkout, stock movement, payment verification, commission posting and payout flows need complete server-side transaction and permission tests.</li><li>• Qualification, rank, replacement, reversal and payout policies need final business approval.</li></ul></div>
          <div className="rounded-2xl border border-stone-200 bg-white p-6"><div className="flex items-center gap-2 text-[#795d32]"><Clock3 size={18}/><h2 className="font-semibold">What “done” means</h2></div><p className="mt-4 text-sm leading-6 text-stone-600">A module is not counted as production-ready just because its screen exists or its build passes. It must also use the correct live schema, enforce role and row-level access, handle failures and duplicate requests safely, preserve an audit trail, and pass end-to-end acceptance tests.</p><p className="mt-3 text-sm leading-6 text-stone-600">This page is a manually maintained development snapshot, not a live CI feed or live operational dashboard.</p></div>
        </section>
        <footer className="mt-12 flex flex-col gap-3 border-t border-stone-200 pt-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between"><span>AMANAH DMC · Development transparency</span><a className="inline-flex items-center gap-2 hover:text-stone-900" href="https://github.com/amanahoperationsdept-beep/Amanah-unilevel-system" target="_blank" rel="noreferrer">View source repository <ArrowUpRight size={15}/></a></footer>
      </div>
    </main>
  );
}
