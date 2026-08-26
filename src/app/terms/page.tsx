import { LAST_UPDATED, LEGAL_ENTITY_NAME, REGISTERED_ADDRESS, SUPPORT_EMAIL } from "@/config/legal";

// DRAFT -- needs a lawyer's review, and the config/legal.ts placeholders
// filled in, before this is relied upon as the live Terms.
export default function TermsPage() {
  return (
    <article className="max-w-none space-y-4 text-sm text-neutral-700">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        Draft — not final. Requires legal review before publishing.
      </div>
      <h1 className="text-2xl font-bold text-neutral-900">Terms and Conditions</h1>
      <p className="text-xs text-neutral-500">Last updated: {LAST_UPDATED}</p>

      <p>
        These Terms govern your access to and use of Pianelo (the &quot;Service&quot;), operated by{" "}
        {LEGAL_ENTITY_NAME}, at {REGISTERED_ADDRESS}. By creating an account or using the Service,
        you agree to be bound by these Terms.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Eligibility</h2>
      <p>
        You must be at least 13 to create an account. Users between 13 and the age of majority may
        only use Pianelo with a parent or guardian&apos;s consent. No account is required to view the
        piano; an account and payment are required to play it.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">One-time purchase</h2>
      <p>
        Full access to the piano is unlocked with a single, one-time payment of ₱99. This is not a
        subscription: it does not renew or recur, and you will not be charged again for continued
        access. Payments are processed by PayMongo — Pianelo does not store your full card or
        e-wallet credentials.
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
