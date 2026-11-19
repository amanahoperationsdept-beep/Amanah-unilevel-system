"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await requestPasswordResetAction(data);
      setMessage(result.success || "");
      setError(result.error || "");
    });
  }

  return (
    <main className="recovery-shell">
      <section className="recovery-card">
        <Link href="/" className="recovery-back">← Back to AMANAH sign in</Link>
        <span className="eyebrow">AMANAH ACCOUNT SUPPORT</span>
        <h1>Reset your password.</h1>
        <p className="recovery-copy">Enter the email address registered to your AMANAH account. We’ll send a secure password reset link if an account is registered with that address.</p>
        <form onSubmit={submit} className="recovery-form">
          <label htmlFor="recovery-email">Registered email address</label>
          <input id="recovery-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Enter your email address" />
          <button className="primary-button full-button" type="submit" disabled={pending}>{pending ? "Sending link..." : "Send password reset link"}</button>
        </form>
        {message && <p className="recovery-message" role="status">{message}</p>}
        {error && <p className="recovery-error" role="alert">{error}</p>}
        <p className="recovery-foot">For security, this page does not reveal whether an email address has an account.</p>
      </section>
    </main>
  );
}
