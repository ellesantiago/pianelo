"use client";

import { useCallback, useRef, useState } from "react";
import { usePianoEngine } from "./usePianoEngine";
import { PianoView } from "./PianoView";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { RecordButton } from "@/components/recording/RecordButton";
import type { RecordedNoteEvent } from "@/types/music";

interface GatedPianoProps {
  isLoggedIn: boolean;
  hasPurchased: boolean;
  className?: string;
}

/**
 * The homepage piano, wrapped with the paywall gate: a guest or unpaid user
 * sees and can press every key, but the very first press suppresses the
 * sound and opens the signup/payment modal instead (see
 * usePianoEngine's `locked` option) -- no free notes at all. Once
 * `hasPurchased` is true this is a plain pass-through with no further
 * checks, and the Record control appears (recording is local-only, so it
 * only makes sense once the piano actually makes sound).
 */
export function GatedPiano({ isLoggedIn, hasPurchased, className }: GatedPianoProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<RecordedNoteEvent[] | null>(null);
  const eventsRef = useRef<RecordedNoteEvent[]>([]);
  const startRef = useRef<number>(0);

  const handleLockedAttempt = useCallback(() => setModalOpen(true), []);

  const handleNotePlayed = useCallback((note: string) => {
    if (startRef.current === 0) return;
    eventsRef.current.push({
      note,
      action: "down",
      timestamp: Math.round(performance.now() - startRef.current),
    });
  }, []);

  const handleNoteReleased = useCallback((note: string) => {
    if (startRef.current === 0) return;
    eventsRef.current.push({
      note,
      action: "up",
      timestamp: Math.round(performance.now() - startRef.current),
    });
  }, []);

  const engine = usePianoEngine({
    locked: !hasPurchased,
    onLockedAttempt: handleLockedAttempt,
    onNotePlayed: handleNotePlayed,
    onNoteReleased: handleNoteReleased,
  });

  const startRecording = () => {
    eventsRef.current = [];
    startRef.current = performance.now();
    setIsRecording(true);
  };

  const stopRecording = () => {
    startRef.current = 0;
    setIsRecording(false);
    setPendingEvents(eventsRef.current.length > 0 ? eventsRef.current : null);
  };

  return (
    <div className="space-y-3">
      {hasPurchased && (
        <RecordButton
          isRecording={isRecording}
          pendingEvents={pendingEvents}
          onStart={startRecording}
          onStop={stopRecording}
          onDismissPending={() => setPendingEvents(null)}
        />
      )}
      <PianoView {...engine} className={className} />
      {modalOpen && <PaywallModal isLoggedIn={isLoggedIn} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
