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
          {user?.hasPurchased
            ? "Your computer keyboard, mouse, and touch all play real piano notes."
            : "Try any key below — unlock full play for a one-time ₱99, no subscription."}
        </p>
      </div>

      <div className="pt-6">
        <LetterNotesSearch />
      </div>

      <div className="flex flex-1 flex-col justify-end space-y-10 pt-10">
        <GatedPiano isLoggedIn={Boolean(user)} hasPurchased={Boolean(user?.hasPurchased)} />

        <AdSlot slot="below-piano" hidden={user?.hasPurchased} />
      </div>
    </div>
  );
}
