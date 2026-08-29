import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { GatedPiano } from "@/components/piano/GatedPiano";
import { AdSlot } from "@/components/ads/AdSlot";
import { LetterNotesSearch } from "@/components/letterNotes/LetterNotesSearch";

export const metadata: Metadata = {
  title: "Pianelo — Play Piano Online",
  description:
    "A clean, simple online piano you play with your computer keyboard, mouse, or touch. Free, forever, no account needed.",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Play piano, right in your browser.</h1>
        <p className="text-neutral-500">
          Your computer keyboard, mouse, and touch all play real piano notes — free, forever, no
          account needed.
        </p>
      </div>

      <div className="pt-6">
        <LetterNotesSearch isLoggedIn={Boolean(user)} />
      </div>

      <div className="flex flex-1 flex-col justify-end space-y-10 pt-10">
        <GatedPiano isLoggedIn={Boolean(user)} hasFullAccess={Boolean(user?.hasFullAccess)} />

        <AdSlot slot="below-piano" hidden={user?.hasFullAccess} />
      </div>
    </div>
  );
}
