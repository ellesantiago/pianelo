import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { RecordingsList } from "@/components/recording/RecordingsList";
import { AdSlot } from "@/components/ads/AdSlot";

// Recordings live entirely in this browser's IndexedDB (see
// lib/recordings/localStore.ts) -- there is no server-side list to gate, so
// this page doesn't require login. It's most useful once the piano is
// actually unlocked, since a locked piano never produces a note to record.
export default async function RecordingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Recordings</h1>
        <p className="text-sm text-neutral-500">
          Saved only on this device and browser -- recordings are never uploaded anywhere.
        </p>
        <RecordingsList />
      </div>

      <AdSlot slot="recordings-rail" hidden={user?.hasPurchased} className="w-full sm:w-40" />
    </div>
  );
}
