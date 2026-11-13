"use client";

import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-5 py-10 text-[#20251f] sm:px-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-semibold text-[#8b6738] hover:underline">← Back to AMANAH</Link>
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a743e]">AMANAH / Distributor onboarding</p>
          <h1 className="mt-3 text-3xl font-semibold">Distributor registration is temporarily unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            We are updating the registration process to match the current AMANAH account system.
            This helps protect sponsor records and ensures every new distributor account is created correctly.
          </p>
          <div role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Please contact an AMANAH administrator or your Marketing Officer for assistance with a new distributor account.
            Existing active members can continue signing in.
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/?portal=distributor" className="inline-flex items-center justify-center rounded-full bg-[#243c31] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#192d24]">
              Existing member sign in
            </Link>
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
              Back to AMANAH home
            </Link>
          </div>
        </section>
        <p className="mt-6 text-center text-xs leading-5 text-stone-500">
          Administrator accounts are provisioned separately by AMANAH.
        </p>
      </div>
    </main>
  );
}
