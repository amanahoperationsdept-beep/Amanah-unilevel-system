"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await updatePasswordAction(data);
      setError(result.error || "");
    });
  }

  return (
    <main className="recovery-shell">
      <section className="recovery-card">
        <Link href="/" className="recovery-back">← Back to AMANAH sign in</Link>
        <span className="eyebrow">SECURE ACCOUNT RECOVERY</span>
        <h1>Choose a new password.</h1>
        <p className="recovery-copy">Enter your new password below. You’ll be asked to sign in again after it has been updated.</p>
        <form onSubmit={submit} className="recovery-form">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required placeholder="Enter the password again" />
          <button className="primary-button full-button" type="submit" disabled={pending}>{pending ? "Updating password..." : "Update password"}</button>
        </form>
        {error && <p className="recovery-error" role="alert">{error}</p>}
        <p className="recovery-foot">If your reset link has expired, return to sign in and request a new one.</p>
      </section>
    </main>
  );
}
