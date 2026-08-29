import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { PurchaseButton } from "@/components/paywall/PurchaseButton";
import { PRODUCTS, formatPeso } from "@/lib/payments/products";

export const metadata: Metadata = {
  title: "Pricing — Pianelo",
  description:
    "The Pianelo piano is free, forever. Unlock letter notes, recording, and an ad-free experience with a single one-time payment.",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  const isLoggedIn = Boolean(user);

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h1 className="text-2xl font-bold">Pricing</h1>
      <p className="text-neutral-500">
        The piano is free, forever, for everyone — supported by ads. One optional one-time
        upgrade if you want more, which requires a free account.
      </p>

      <div className="rounded-2xl border border-neutral-200 p-8">
        <p className="text-lg font-semibold">Piano</p>
        <p className="mt-1 text-4xl font-bold">Free</p>
        <ul className="mt-6 space-y-2 text-left text-sm text-neutral-700">
          <li>✓ Full piano, unlimited use, forever</li>
          <li>✓ Computer keyboard, mouse, and touch</li>
          <li>✓ Sustain, volume, and octave controls</li>
        </ul>
        <Link
          href="/"
          className="mt-6 inline-block w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Go play
        </Link>
        <p className="mt-3 text-xs text-neutral-400">No account or payment needed.</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-8">
        <p className="text-lg font-semibold">{PRODUCTS.full_access.label}</p>
        <p className="mt-1 text-4xl font-bold">{formatPeso(PRODUCTS.full_access.priceCentavos)}</p>
        <p className="mt-1 text-sm text-neutral-500">one-time — not a subscription</p>
        <ul className="mt-6 space-y-2 text-left text-sm text-neutral-700">
          <li>✓ Scrolling letter notes for every song</li>
          <li>✓ Local recording, playback, and export</li>
          <li>✓ No ads, anywhere on Pianelo</li>
        </ul>
        {user?.hasFullAccess ? (
          <p className="mt-6 text-sm font-medium text-neutral-500">You already own this ✓</p>
        ) : (
          <PurchaseButton
            isLoggedIn={isLoggedIn}
            className="mt-6 inline-block w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
          />
        )}
        <p className="mt-3 text-xs text-neutral-400">Pay with QR Ph.</p>
      </div>
    </div>
  );
}
