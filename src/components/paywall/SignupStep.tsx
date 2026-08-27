"use client";

import { useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

interface SignupStepProps {
  /** Shown above the form, e.g. "Create a free account, then unlock..." */
  prompt: string;
  onAuthenticated: () => void;
}

/** Shared signup/login switcher, used by both SignupPromptModal and PurchaseModal. */
export function SignupStep({ prompt, onAuthenticated }: SignupStepProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">{prompt}</p>
      <AuthForm mode={mode} onAuthenticated={onAuthenticated} />
      <p className="text-center text-xs text-neutral-500">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("login")} className="underline">
              Log in
            </button>
          </>
        ) : (
          <>
            Need an account?{" "}
            <button type="button" onClick={() => setMode("signup")} className="underline">
              Sign up
            </button>
          </>
        )}
      </p>
    </div>
  );
}
