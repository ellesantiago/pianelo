"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PasswordInput } from "./PasswordInput";

interface AuthFormProps {
  mode: "login" | "signup";
  /** Called right before the full-page redirect after a successful login/signup with a session. */
  onAuthenticated?: () => void;
}

interface Status {
  text: string;
  tone: "info" | "error";
}

// Email/password only. Minimal signup, no unnecessary profile fields.
// Signup requires agreeing to the Terms & Privacy Policy.
export function AuthForm({ mode, onAuthenticated }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(mode === "login");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Authentication isn&apos;t connected yet — add your Supabase project URL and anon key to{" "}
        <code className="rounded bg-black/5 px-1">.env.local</code> (see the README) to enable
        sign-in.
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    if (mode === "signup" && !agreed) {
      setStatus({ text: "Please agree to the Terms and Privacy Policy to continue.", tone: "error" });
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setStatus({ text: "Passwords do not match.", tone: "error" });
      return;
    }
    setSubmitting(true);
    setStatus({ text: "Working…", tone: "info" });
    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus({ text: error.message, tone: "error" });
      setSubmitting(false);
      return;
    }

    if (mode === "signup" && !data.session) {
      // Supabase's signUp() never errors for an email that's already
      // registered -- it silently returns a user with no identities
      // instead, to avoid leaking which emails have accounts. That's the
      // only way to tell the two cases apart here.
      if (data.user && data.user.identities?.length === 0) {
        setStatus({
          text: "An account with this email already exists. Try logging in instead.",
          tone: "error",
        });
        setSubmitting(false);
        return;
      }

      // Email confirmation is required -- there's no session yet, so there's
      // nothing to register as an active device until the user clicks the
      // confirmation link (handled by /auth/callback, which registers the
      // session then).
      setStatus({ text: "Check your email to confirm your account.", tone: "info" });
      setSubmitting(false);
      return;
    }

    // Logged in -- register this device as the one active session (Section:
    // single-device enforcement) BEFORE navigating, so the very next request
    // (the full navigation below) already carries a matching session-token
    // cookie and proxy.ts doesn't immediately sign it back out.
    await fetch("/api/session/register", { method: "POST" });

    onAuthenticated?.();

    // Full navigation (not router.push) guarantees the server-rendered nav
    // picks up the new session -- router.push can still serve an
    // already-prefetched, pre-login copy of "/" from the Router Cache even
    // after router.refresh(), since refresh() only busts the CURRENT
    // route's cache entry, not other routes' prefetched ones.
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <form onSubmit={handleEmailAuth} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
        />
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
        />
        {mode === "signup" && (
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm password"
            autoComplete="new-password"
            minLength={8}
          />
        )}

        {mode === "login" && (
          <p className="text-right text-xs">
            <Link href="/forgot-password" className="text-neutral-500 underline hover:text-neutral-900">
              Forgot password?
            </Link>
          </p>
        )}

        {mode === "signup" && (
          <label className="flex items-start gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            I agree to the{" "}
            <a href="/terms" className="underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </label>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "signup" ? "Create account" : "Log in"}
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
