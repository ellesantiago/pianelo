"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PasswordInput } from "./PasswordInput";

interface Status {
  text: string;
  tone: "info" | "error";
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Authentication isn&apos;t connected yet — add your Supabase project URL and anon key to{" "}
        <code className="rounded bg-black/5 px-1">.env.local</code> (see the README).
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (password !== confirmPassword) {
      setStatus({ text: "Passwords do not match.", tone: "error" });
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus({ text: error.message, tone: "error" });
      setSubmitting(false);
      return;
    }

    setStatus({ text: "Password updated. Taking you to log in…", tone: "info" });
    // Sign out of the temporary recovery session so the user logs back in
    // fresh with their new password, rather than staying signed in here.
    await supabase.auth.signOut();
    // Full navigation -- see AuthForm.tsx for why router.push can serve a
    // stale, pre-update copy of the page from the Router Cache.
    window.location.href = "/login?reason=password-updated";
  };

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="New password"
          autoComplete="new-password"
          minLength={8}
        />
        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm new password"
          autoComplete="new-password"
          minLength={8}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Update password
        </button>
      </form>

      {status && (
        <p
          className={`text-center text-xs ${status.tone === "error" ? "text-red-600" : "text-neutral-500"}`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
