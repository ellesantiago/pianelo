import type { Metadata } from "next";
import { LEGAL_ENTITY_NAME, REGISTERED_ADDRESS, SUPPORT_EMAIL } from "@/config/legal";

export const metadata: Metadata = {
  title: "Contact Us — Pianelo",
  description: "How to reach Pianelo for support, account questions, or feedback.",
};

export default function ContactPage() {
  return (
    <article className="max-w-none space-y-4 text-sm text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">Contact Us</h1>

      <p>
        Questions about your account, a purchase, or the Service in general? Reach us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
        . We aim to reply within a few business days.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Mailing address</h2>
      <p>
        {LEGAL_ENTITY_NAME}
        <br />
        {REGISTERED_ADDRESS}
      </p>
    </article>
  );
}
