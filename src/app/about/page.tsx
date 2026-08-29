import type { Metadata } from "next";
import { LEGAL_ENTITY_NAME, REGISTERED_ADDRESS } from "@/config/legal";

export const metadata: Metadata = {
  title: "About Us — Pianelo",
  description: "What Pianelo is, who runs it, and why we built a free browser piano.",
};

export default function AboutPage() {
  return (
    <article className="max-w-none space-y-4 text-sm text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">About Us</h1>

      <p>
        Pianelo is a free, browser-based piano you can play right now with your computer
        keyboard, mouse, or touch screen — no download, no account, no sign-up required. We
        built it for anyone who wants to sit down and play without friction: students practicing
        between lessons, curious beginners, or anyone who just wants to noodle on a piano without
        installing an app.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">What we offer</h2>
      <p>
        The core piano is free forever. For learners who want more, a single one-time purchase
        unlocks letter-note sheet music, local recording of your playing, and an ad-free
        experience.
      </p>

      <h2 className="text-lg font-semibold text-neutral-900">Who runs this</h2>
      <p>
        Pianelo is operated by {LEGAL_ENTITY_NAME}, based in {REGISTERED_ADDRESS}. It&apos;s a
        small, independently run project.
      </p>
    </article>
  );
}
