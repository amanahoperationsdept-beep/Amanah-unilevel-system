"use client";

import { useActionState } from "react";
import { issueActivationCodeAction } from "@/app/actions/activation";

const initialState = { status: "idle" as const, message: "" };

export default function ActivationCodePanel() {
  const [state, action, pending] = useActionState(issueActivationCodeAction, initialState);
  return (
    <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Secure onboarding</p>
      <h2 className="mt-2 text-2xl font-semibold">Issue a receipt activation code</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">Choose the account role. The system stores only a secure hash; the code is displayed once for printing on the receipt.</p>
      <form action={action} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 text-sm font-medium">Assigned role
          <select name="role" required className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-4 py-3">
            <option value="distributor">Distributor</option>
            <option value="mobile_stockist">Mobile Stockist</option>
            <option value="branch_operator">Branch Operator</option>
            <option value="marketing_officer">Marketing Officer</option>
          </select>
        </label>
        <button disabled={pending} className="rounded-full bg-[#243c31] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Generating…" : "Generate activation code"}</button>
      </form>
      {state.message && <p role="status" className={`mt-4 rounded-xl p-3 text-sm ${state.status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}
      {state.activationCode && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Show once · print on receipt</p>
        <p className="mt-2 break-all font-mono text-2xl font-bold tracking-wider text-emerald-950">{state.activationCode}</p>
        <button type="button" onClick={() => navigator.clipboard?.writeText(state.activationCode!)} className="mt-3 rounded-full border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900">Copy code</button>
      </div>}
    </section>
  );
}
