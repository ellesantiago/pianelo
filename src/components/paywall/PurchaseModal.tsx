"use client";

import { useEffect, useState } from "react";
import { SignupStep } from "./SignupStep";
import { PayPalButton } from "./PayPalButton";
import { PRODUCTS, formatPeso, formatUsd } from "@/lib/payments/products";

interface PurchaseModalProps {
  isLoggedIn: boolean;
  onClose: () => void;
}

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
const PAYPAL_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
const { label, priceCentavos, priceUsdCents } = PRODUCTS.full_access;

/**
 * Buys full access (see lib/payments/products.ts). Shows the signup step
 * first for a guest, then the payment step -- QR Ph (PayMongo) and/or
 * PayPal, whichever has its keys configured. Neither path unlocks
 * anything itself: PayMongo's webhook and PayPal's capture-order route
 * are the only things that mark a purchase paid (see PayPalButton and
 * src/lib/payments/paypal.ts for the PayPal side).
 */
export function PurchaseModal({ isLoggedIn, onClose }: PurchaseModalProps) {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">{loggedIn ? `Unlock ${label}` : "Sign up to unlock"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        {loggedIn ? (
          <PaymentStep />
        ) : (
          <SignupStep
            prompt={`Create a free account, then unlock ${label.toLowerCase()} with a one-time payment -- no subscription.`}
            onAuthenticated={() => setLoggedIn(true)}
          />
        )}
      </div>
    </div>
  );
}

type PaymentMethod = "qrph";

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
          const status = await res.json();
          if (status.hasFullAccess) {
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

  if (!PUBLIC_KEY && !PAYPAL_CONFIGURED) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        Payments aren&apos;t connected yet — add your PayMongo or PayPal keys to{" "}
        <code className="rounded bg-black/5 px-1">.env.local</code> (see the README).
      </p>
    );
  }

  const startCheckout = async (): Promise<{ intentId: string; clientKey: string } | null> => {
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: "full_access" }),
    });
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
        One-time payment unlocks {label.toLowerCase()} for good — no subscription, no recurring
        charges.
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
        // Each method gets its own card with its own price next to its name --
        // QRPH and PayPal charge different amounts in different currencies.
        <div className="space-y-3">
          {PUBLIC_KEY && (
            <div className="rounded-xl border border-neutral-200 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-neutral-900">QR Ph</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {formatPeso(priceCentavos)}
                </span>
              </div>
              <button
                type="button"
                onClick={payWithQrph}
                disabled={submitting !== null}
                className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {submitting === "qrph" ? "Generating QR…" : "Pay with QR Ph"}
              </button>
              <p className="mt-2 text-center text-xs text-neutral-500">
                Scan with any GCash, Maya, or bank app that supports QR Ph.
              </p>
            </div>
          )}

          {PUBLIC_KEY && PAYPAL_CONFIGURED && (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-neutral-200" />
              <span className="text-xs font-medium tracking-wide text-neutral-400">or</span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>
          )}

          {PAYPAL_CONFIGURED && (
            <div className="rounded-xl border border-neutral-200 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-neutral-900">PayPal</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {formatUsd(priceUsdCents)}
                </span>
              </div>
              <PayPalButton onError={setError} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
