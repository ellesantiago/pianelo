"use client";

import { useCallback, useRef, useState } from "react";
import { usePianoEngine } from "./usePianoEngine";
import { PianoView } from "./PianoView";
import { PurchaseModal } from "@/components/paywall/PurchaseModal";
import { RecordButton } from "@/components/recording/RecordButton";
import { formatPeso, PRODUCTS } from "@/lib/payments/products";
import type { RecordedNoteEvent } from "@/types/music";

interface GatedPianoProps {
  isLoggedIn: boolean;
  hasFullAccess: boolean;
  className?: string;
}

/**
 * The homepage piano. Playing is free for everyone, no account needed.
 * Recording is part of the paid full_access bundle, which itself requires
 * an account: a logged-in user without it sees an "Unlock recording" prompt
 * instead of the Record button; a guest sees neither.
 */
export function GatedPiano({ isLoggedIn, hasFullAccess, className }: GatedPianoProps) {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<RecordedNoteEvent[] | null>(null);
  const eventsRef = useRef<RecordedNoteEvent[]>([]);
  const startRef = useRef<number>(0);

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
      {isLoggedIn &&
        (hasFullAccess ? (
          <RecordButton
            isRecording={isRecording}
            pendingEvents={pendingEvents}
            onStart={startRecording}
            onStop={stopRecording}
            onDismissPending={() => setPendingEvents(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPurchaseModalOpen(true)}
            className="text-xs text-neutral-500 underline hover:text-neutral-900"
          >
            🔒 Unlock recording — {formatPeso(PRODUCTS.full_access.priceCentavos)}
          </button>
        ))}
      <PianoView {...engine} className={className} />
      {purchaseModalOpen && (
        <PurchaseModal isLoggedIn={isLoggedIn} onClose={() => setPurchaseModalOpen(false)} />
      )}
    </div>
  );
}
