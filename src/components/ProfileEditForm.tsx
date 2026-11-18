"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfileAction } from "@/app/actions/profile";

export default function ProfileEditForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage("");
    startTransition(async () => {
      const result = await updateOwnProfileAction(data);
      if (result.error) {
        setIsError(true);
        setMessage(result.error);
      } else {
        setIsError(false);
        setMessage(result.success || "Saved.");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="profile-full-name" className="block text-xs uppercase tracking-wider text-stone-500">Full name</label>
        <input id="profile-full-name" name="full_name" defaultValue={fullName} maxLength={100} required minLength={2} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="profile-phone" className="block text-xs uppercase tracking-wider text-stone-500">Contact number</label>
        <input id="profile-phone" name="phone" defaultValue={phone || ""} maxLength={30} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" autoComplete="tel" />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-[#244735] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving..." : "Save profile"}
        </button>
        {message && <p role={isError ? "alert" : "status"} className={isError ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{message}</p>}
      </div>
    </form>
  );
}
