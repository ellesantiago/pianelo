"use client";

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

interface PaywallModalProps {
  isLoggedIn: boolean;
  onClose: () => void;
}

type PaymentMethod = "qrph";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;

/**
 * The paywall: opened the moment a guest or unpaid user presses a piano key
 * (see GatedPiano/usePianoEngine's `locked` option). Shows the signup step
 * for a guest, or the ₱99 one-time payment step for a logged-in-but-unpaid
 * user.
 *
 * Payment uses PayMongo's Payment Intent workflow: our server creates the
 * Intent (secret key), and THIS component creates the Payment Method and
 * attaches it directly from the browser using the PUBLIC key. QRPH is the
 * only method wired up -- it's the only one activated on this PayMongo
 * account without a registered business. Unlike e-wallets, QRPH doesn't
 * redirect: the attach response carries a base64 QR image
 * (next_action.code.image_url) that we render inline and poll against while
 * the customer scans it. PayMongo's own webhook
 * (src/app/api/payments/webhook/route.ts) is the only thing that actually
 * marks the purchase paid -- this modal never unlocks anything itself.
 */
export function PaywallModal({ isLoggedIn, onClose }: PaywallModalProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">
            {isLoggedIn ? "Unlock the full piano" : mode === "signup" ? "Sign up to play" : "Log in to play"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        {isLoggedIn ? (
          <PaymentStep />
        ) : (
          <SignupStep mode={mode} setMode={setMode} onAuthenticated={onClose} />
        )}
      </div>
    </div>
  );
}

interface SignupStepProps {
  mode: "signup" | "login";
  setMode: (mode: "signup" | "login") => void;
  onAuthenticated: () => void;
}

function SignupStep({ mode, setMode, onAuthenticated }: SignupStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        {mode === "signup"
          ? "Create a free account, then unlock the full piano for a one-time ₱99 — no subscription."
          : "Log in, then unlock the full piano for a one-time ₱99 — no subscription."}
      </p>
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

function PaymentStep() {
  const [submitting, setSubmitting] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!qrImage || confirmed) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/payments/status");
        if (res.ok) {
          const { hasPurchased } = await res.json();
          if (hasPurchased) {
            clearInterval(interval);
            setConfirmed(true);
            window.location.href = "/";
            return;
          }
        }
      } catch {
        // Keep polling -- a transient network error shouldn't stop retries.
      }
      // QR codes expire after ~30 minutes; stop polling well before that.
      if (attempts >= 200) {
        clearInterval(interval);
        setError("This QR code has expired. Please try again.");
        setQrImage(null);
        setSubmitting(null);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [qrImage, confirmed]);

  if (!PUBLIC_KEY) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        Payments aren&apos;t connected yet — add your PayMongo keys to{" "}
        <code className="rounded bg-black/5 px-1">.env.local</code> (see the README).
      </p>
    );
  }

  const startCheckout = async (): Promise<{ intentId: string; clientKey: string } | null> => {
    const res = await fetch("/api/payments/checkout", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not start checkout. Please try again.");
      return null;
    }
    return json;
  };

  const createPaymentMethod = async (attributes: Record<string, unknown>): Promise<string> => {
    const res = await fetch("https://api.paymongo.com/v1/payment_methods", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${PUBLIC_KEY}:`)}`,
      },
      body: JSON.stringify({ data: { attributes } }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.errors?.[0]?.detail ?? "Could not process that payment method.");
    }
    return json.data.id as string;
  };

  const attach = async (intentId: string, clientKey: string, paymentMethodId: string) => {
    const res = await fetch(`https://api.paymongo.com/v1/payment_intents/${intentId}/attach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${PUBLIC_KEY}:`)}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
            return_url: `${window.location.origin}/payments/return`,
          },
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.errors?.[0]?.detail ?? "Could not process your payment.");
    }
    return json.data;
  };

  const payWithQrph = async () => {
    setSubmitting("qrph");
    setError(null);
    try {
      const checkout = await startCheckout();
      if (!checkout) return;
      const pmId = await createPaymentMethod({ type: "qrph" });
      const attached = await attach(checkout.intentId, checkout.clientKey, pmId);
      // QRPH doesn't redirect -- it hands back a base64 QR image to render
      // and scan in place.
      const imageUrl = attached.attributes?.next_action?.code?.image_url as string | undefined;
      if (imageUrl) {
        const src = imageUrl.startsWith("data:") || imageUrl.startsWith("http")
          ? imageUrl
          : `data:image/png;base64,${imageUrl}`;
        setQrImage(src);
      } else {
        throw new Error("Could not generate a QR code. Please try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        One-time payment of <span className="font-semibold text-neutral-900">₱99</span> unlocks
        the piano for good — no subscription, no recurring charge.
      </p>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {qrImage ? (
        <div className="space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not a static asset */}
          <img
            src={qrImage}
            alt="Scan to pay with QR Ph"
            className="mx-auto h-56 w-56 rounded-lg border border-neutral-200"
          />
          <p className="text-sm text-neutral-500">
            Scan with any GCash, Maya, or bank app that supports QR Ph.
          </p>
          <p className="text-xs text-neutral-400">Waiting for confirmation…</p>
          <button
            type="button"
            onClick={() => {
              setQrImage(null);
              setSubmitting(null);
              setError(null);
            }}
            className="text-xs text-neutral-500 underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={payWithQrph}
            disabled={submitting !== null}
            className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {submitting === "qrph" ? "Generating QR…" : "Pay ₱99 with QR Ph"}
          </button>
          <p className="text-center text-xs text-neutral-500">
            Scan with any GCash, Maya, or bank app that supports QR Ph.
          </p>
        </div>
      )}
    </div>
  );
}
