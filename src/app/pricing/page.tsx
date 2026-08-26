import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h1 className="text-2xl font-bold">Pricing</h1>
      <p className="text-neutral-500">
        Pianelo is free to look at. Playing it costs one payment, once.
      </p>

      <div className="rounded-2xl border border-neutral-200 p-8">
        <p className="text-4xl font-bold">₱99</p>
        <p className="mt-1 text-sm text-neutral-500">one-time — not a subscription</p>
        <ul className="mt-6 space-y-2 text-left text-sm text-neutral-700">
          <li>✓ Full piano, unlimited use, forever</li>
          <li>✓ Computer keyboard, mouse, and touch</li>
          <li>✓ Sustain, volume, and octave controls</li>
          <li>✓ Local recording, playback, and export</li>
        </ul>
        <Link
          href="/"
          className="mt-6 inline-block w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Go play
        </Link>
        <p className="mt-3 text-xs text-neutral-400">
          Pay with GCash, Maya, or card the moment you press a key.
        </p>
      </div>
    </div>
  );
}
