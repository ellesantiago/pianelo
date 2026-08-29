import type { Metadata } from "next";
import { LAST_UPDATED, LEGAL_ENTITY_NAME, REGISTERED_ADDRESS, SUPPORT_EMAIL } from "@/config/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Pianelo",
  description: "How Pianelo collects, uses, and protects your personal data.",
};

// DRAFT -- needs a lawyer's review, and the config/legal.ts placeholders
// filled in, before this is relied upon as the live Privacy Policy.
export default function PrivacyPage() {
  return (
    <article className="max-w-none space-y-4 text-sm text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">Privacy Policy</h1>
      <p className="text-xs text-neutral-500">Last updated: {LAST_UPDATED}</p>

      <p>
        {LEGAL_ENTITY_NAME} (&quot;Pianelo&quot;) respects your privacy. This policy explains what personal
        data we collect, why, and the rights you have, in line with the Philippines&apos; Data Privacy
        Act of 2012.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Information we collect</h2>
      <p>
        Account info (email) when you sign up, and a single active session token used to enforce
        one-device-at-a-time login. Our payment providers, PayMongo and PayPal, collect your
        payment details directly — we never receive or store your full card, e-wallet, or PayPal
        account credentials.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Recordings stay on your device</h2>
      <p>
        The recording feature saves your recordings only in your browser&apos;s local storage on your
        own device. We do not receive, store, back up, or have any access to your recordings —
        they are not part of your account data and are not covered by the retention/deletion
        practices below, since we never have them in the first place.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">How we use it</h2>
      <p>
        To operate the Service, process your one-time payment, enforce single-device login, and
        communicate with you. We do not sell your personal information.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Third parties</h2>
      <p>Supabase (database, auth), PayMongo and PayPal (payments), and Google AdSense (ads, shown only to users who haven&apos;t purchased full access).</p>

      <h2 className="text-lg font-semibold text-neutral-900">Cookies &amp; advertising</h2>
      <p>
        We use a strictly necessary cookie to keep you signed in and to enforce one-device-at-a-time
        login. For users who haven&apos;t purchased full access, Google AdSense and its partners use
        cookies to serve and personalize ads and measure their performance. Google&apos;s use of
        advertising cookies enables it and its partners to serve ads based on your visits to this and
        other sites. You can learn more, and opt out of personalized advertising, at{" "}
        <a
          href="https://policies.google.com/technologies/ads"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Google&apos;s Ads Settings
        </a>
        . Purchasing full access removes ads, and their cookies, from your experience going forward.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Your rights</h2>
      <p>
        You may request access, correction, or deletion of your account data by contacting{" "}
        {SUPPORT_EMAIL}. Philippine users may file a complaint with the National Privacy
        Commission (privacy.gov.ph) if unsatisfied with our response.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Children&apos;s privacy</h2>
      <p>
        Pianelo is not directed at children under 13. Users between 13 and the age of majority
        need parent/guardian involvement.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Contact</h2>
      <p>
        {LEGAL_ENTITY_NAME}, {REGISTERED_ADDRESS}, {SUPPORT_EMAIL}
      </p>
    </article>
  );
}
