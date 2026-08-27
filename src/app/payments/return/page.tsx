import { Suspense } from "react";
import { ReturnStatus } from "./ReturnStatus";

export default function PaymentsReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Confirming your payment…</h1>
          <p className="text-neutral-500">This only takes a moment.</p>
        </div>
      }
    >
      <ReturnStatus />
    </Suspense>
  );
}
