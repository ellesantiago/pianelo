import type { Metadata } from "next";
import { LAST_UPDATED, LEGAL_ENTITY_NAME, REGISTERED_ADDRESS, SUPPORT_EMAIL } from "@/config/legal";

export const metadata: Metadata = {
  title: "Terms and Conditions — Pianelo",
  description: "The terms governing your use of Pianelo.",
};

// DRAFT -- needs a lawyer's review, and the config/legal.ts placeholders
// filled in, before this is relied upon as the live Terms.
export default function TermsPage() {
  return (
    <article className="max-w-none space-y-4 text-sm text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">Terms and Conditions</h1>
      <p className="text-xs text-neutral-500">Last updated: {LAST_UPDATED}</p>

      <p>
        These Terms govern your access to and use of Pianelo (the &quot;Service&quot;), operated by{" "}
        {LEGAL_ENTITY_NAME}, at {REGISTERED_ADDRESS}. By creating an account or using the Service,
        you agree to be bound by these Terms.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Eligibility</h2>
      <p>
        The piano itself is free to play for anyone, no account required. You must be at least 13
        to create an account for full access, below. Users between 13 and the age of majority may
        only create an account with a parent or guardian&apos;s consent.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Full access</h2>
      <p>
        Letter notes, local recording, and ad removal are unlocked together with a single,
        one-time payment, and require a free account. This is not a subscription: payment does
        not renew or recur, and you will not be charged again for continued access. Payments are
        processed by PayMongo — Pianelo does not store your full card or e-wallet credentials.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Single-device access</h2>
      <p>
        Your account may be logged in on one device at a time. Logging in on a new device signs
        you out of any other device automatically.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Refunds</h2>
      <p>
        Payments are generally non-refundable once access has been unlocked. If a payment is
        refunded or charged back, access is revoked immediately.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Acceptable use</h2>
      <p>
        You agree not to circumvent the payment/access controls, attempt to access the Service
        without authorization, or use the Service unlawfully.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Recordings</h2>
      <p>
        The recording feature stores your recordings only on your own device&apos;s local browser
        storage. Pianelo does not receive, store, or have access to your recordings.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Intellectual property</h2>
      <p>Pianelo&apos;s software and interface belong to {LEGAL_ENTITY_NAME}.</p>

      <h2 className="text-lg font-semibold text-neutral-900">Disclaimers and liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent
        permitted by law, {LEGAL_ENTITY_NAME} is not liable for indirect, incidental, or
        consequential damages arising from your use of the Service.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Governing law</h2>
      <p>These Terms are governed by the laws of the Republic of the Philippines.</p>

      <h2 className="text-lg font-semibold text-neutral-900">Contact</h2>
      <p>Questions about these Terms: {SUPPORT_EMAIL}</p>
    </article>
  );
}
