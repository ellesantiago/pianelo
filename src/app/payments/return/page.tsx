"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "checking" | "paid" | "pending" | "timeout";

// After a GCash/Maya/card redirect, PayMongo sends the user back here. This
// page never unlocks anything itself -- it just polls our own
// /api/payments/status, which only ever reports "paid" once the webhook has
// confirmed it. The webhook can occasionally lag a few seconds behind the
// redirect, hence the polling instead of an instant check.
export default function PaymentsReturnPage() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/payments/status");
        if (res.ok) {
          const { hasPurchased } = await res.json();
          if (hasPurchased) {
            setStatus("paid");
            clearInterval(interval);
            return;
          }
        }
      } catch {
        // Keep polling -- a transient network error shouldn't stop retries.
      }
      if (attempts >= 20) {
        setStatus("timeout");
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (status === "paid") {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">You&apos;re all set 🎉</h1>
        <p className="text-neutral-500">Full piano access unlocked.</p>
        <Link
          href="/"
          className="inline-block rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Go play
        </Link>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">Still confirming</h1>
        <p className="text-neutral-500">
          This is taking longer than usual. If you completed the payment, refresh this page in a
          minute -- your access will unlock as soon as it&apos;s confirmed.
        </p>
        <Link href="/" className="inline-block underline">
          Back to Pianelo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <h1 className="text-2xl font-bold">Confirming your payment…</h1>
      <p className="text-neutral-500">This only takes a moment.</p>
    </div>
  );
}
