"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface Status {
  text: string;
  tone: "info" | "error";
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
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
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    // Same message either way -- Supabase doesn't error for an unregistered
    // email either, and mirroring that here avoids leaking which emails
    // have accounts.
    setStatus({
      text: error
        ? error.message
        : "If an account exists for that email, we've sent a password reset link.",
      tone: error ? "error" : "info",
    });
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send reset link
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
