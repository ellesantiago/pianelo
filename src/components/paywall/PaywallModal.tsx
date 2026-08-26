"use client";

import { useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

interface PaywallModalProps {
  isLoggedIn: boolean;
  onClose: () => void;
}

type PaymentMethod = "gcash" | "paymaya" | "card";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;

/**
 * The paywall: opened the moment a guest or unpaid user presses a piano key
 * (see GatedPiano/usePianoEngine's `locked` option). Shows the signup step
 * for a guest, or the ₱99 one-time payment step for a logged-in-but-unpaid
 * user.
 *
 * Payment uses PayMongo's Payment Intent workflow: our server creates the
 * Intent (secret key), and THIS component creates the Payment Method and
 * attaches it directly from the browser using the PUBLIC key -- card
 * details never touch our server, only PayMongo's API. GCash/Maya always
 * redirect for authorization; PayMongo's own webhook
 * (src/app/api/payments/webhook/route.ts) is the only thing that actually
 * marks the purchase paid -- this modal never unlocks anything itself.
 */
export function PaywallModal({ isLoggedIn, onClose }: PaywallModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">
            {isLoggedIn ? "Unlock the full piano" : "Sign up to play"}
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

        {isLoggedIn ? <PaymentStep /> : <SignupStep onAuthenticated={onClose} />}
      </div>
    </div>
  );
}

function SignupStep({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        Create a free account, then unlock the full piano for a one-time ₱99 — no subscription.
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
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // "MM/YY"
  const [cvc, setCvc] = useState("");

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

  const payWithEwallet = async (method: "gcash" | "paymaya") => {
    setSubmitting(method);
    setError(null);
    try {
      const checkout = await startCheckout();
      if (!checkout) return;
      const pmId = await createPaymentMethod({ type: method });
      const attached = await attach(checkout.intentId, checkout.clientKey, pmId);
      const redirectUrl = attached.attributes?.next_action?.redirect?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = "/payments/return";
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(null);
    }
  };

  const payWithCard = async () => {
    const [expMonthStr, expYearStr] = expiry.split("/").map((part) => part.trim());
    const expMonth = Number.parseInt(expMonthStr ?? "", 10);
    const expYear = Number.parseInt(expYearStr ?? "", 10);
    const normalizedCardNumber = cardNumber.replace(/\s+/g, "");

    if (!normalizedCardNumber || !expMonth || !expYear || !cvc) {
      setError("Please fill in all card fields.");
      return;
    }

    setSubmitting("card");
    setError(null);
    try {
      const checkout = await startCheckout();
      if (!checkout) return;
      const pmId = await createPaymentMethod({
        type: "card",
        details: {
          card_number: normalizedCardNumber,
          exp_month: expMonth,
          exp_year: expYear < 100 ? 2000 + expYear : expYear,
          cvc,
        },
      });
      const attached = await attach(checkout.intentId, checkout.clientKey, pmId);
      const redirectUrl = attached.attributes?.next_action?.redirect?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = "/payments/return";
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

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => payWithEwallet("gcash")}
          disabled={submitting !== null}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {submitting === "gcash" ? "Redirecting…" : "Pay ₱99 with GCash"}
        </button>
        <button
          type="button"
          onClick={() => payWithEwallet("paymaya")}
          disabled={submitting !== null}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
        >
          {submitting === "paymaya" ? "Redirecting…" : "Pay ₱99 with Maya"}
        </button>

        {!showCardForm ? (
          <button
            type="button"
            onClick={() => setShowCardForm(true)}
            className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
          >
            Pay ₱99 with card
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
            <input
              inputMode="numeric"
              placeholder="Card number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-1/2 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <input
                inputMode="numeric"
                placeholder="CVC"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                className="w-1/2 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={payWithCard}
              disabled={submitting !== null}
              className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {submitting === "card" ? "Processing…" : "Pay ₱99"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
