"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerWithActivationCodeAction } from "@/app/actions/activation";

const initialState = { status: "idle" as const, message: "" };

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerWithActivationCodeAction, initialState);
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-5 py-10 text-[#20251f] sm:px-8">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-semibold text-[#8b6738] hover:underline">← Back to AMANAH</Link>
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a743e]">AMANAH / Member onboarding</p>
          <h1 className="mt-3 text-3xl font-semibold">Create your account</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">Enter the one-time activation code printed on your AMANAH receipt. Your role and member code are assigned securely by the system.</p>
          <form action={action} className="mt-7 space-y-4">
            <label className="block text-sm font-medium">Activation code<input name="activation_code" required autoCapitalize="characters" autoComplete="off" placeholder="AMN-ABCDE-FGHIJ" className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-[#8b6738]" /></label>
            <label className="block text-sm font-medium">Full name<input name="full_name" required minLength={2} maxLength={120} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium">Phone number <span className="text-stone-400">(optional)</span><input name="phone" type="tel" maxLength={40} autoComplete="tel" className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium">Create username<input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9._-]+" autoComplete="username" className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium">Create password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
            <label className="block text-sm font-medium">Confirm password<input name="confirm_password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-stone-300 px-4 py-3" /></label>
            {state.message && <p role="status" className={`rounded-xl p-3 text-sm ${state.status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}
            <button disabled={pending} className="w-full rounded-full bg-[#243c31] px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Creating account…" : "Create AMANAH account"}</button>
          </form>
          <p className="mt-6 text-sm text-stone-600">Already registered? <Link href="/" className="font-semibold text-[#8b6738] hover:underline">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}
