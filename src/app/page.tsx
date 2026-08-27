import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { GatedPiano } from "@/components/piano/GatedPiano";
import { AdSlot } from "@/components/ads/AdSlot";
import { LetterNotesSearch } from "@/components/letterNotes/LetterNotesSearch";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Play piano, right in your browser.</h1>
        <p className="text-neutral-500">
          {user
            ? "Your computer keyboard, mouse, and touch all play real piano notes."
            : "Free to play, forever — just sign up, no payment needed."}
        </p>
      </div>

      <div className="pt-6">
        <LetterNotesSearch isLoggedIn={Boolean(user)} />
      </div>

      <div className="flex flex-1 flex-col justify-end space-y-10 pt-10">
        <GatedPiano isLoggedIn={Boolean(user)} hasContentUnlock={Boolean(user?.hasContentUnlock)} />

        <AdSlot slot="below-piano" hidden={user?.hasAdsRemoved} />
      </div>
    </div>
  );
}
