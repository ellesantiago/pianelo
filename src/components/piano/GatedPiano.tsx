"use client";

import { useCallback, useRef, useState } from "react";
import { usePianoEngine } from "./usePianoEngine";
import { PianoView } from "./PianoView";
import { SignupPromptModal } from "@/components/paywall/PaywallModal";
import { PurchaseModal } from "@/components/paywall/PurchaseModal";
import { RecordButton } from "@/components/recording/RecordButton";
import { formatPeso, PRODUCTS } from "@/lib/payments/products";
import type { RecordedNoteEvent } from "@/types/music";

interface GatedPianoProps {
  isLoggedIn: boolean;
  hasContentUnlock: boolean;
  className?: string;
}

/**
 * The homepage piano. Free to play for any registered user -- a guest sees
 * and can press every key, but the very first press suppresses the sound
 * and opens the signup modal instead (see usePianoEngine's `locked` option).
 * Recording is a separate paid add-on (content_unlock): a logged-in user
 * without it sees an "Unlock recording" prompt instead of the Record button.
 */
export function GatedPiano({ isLoggedIn, hasContentUnlock, className }: GatedPianoProps) {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<RecordedNoteEvent[] | null>(null);
  const eventsRef = useRef<RecordedNoteEvent[]>([]);
  const startRef = useRef<number>(0);

  const handleLockedAttempt = useCallback(() => setSignupModalOpen(true), []);

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
    locked: !isLoggedIn,
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
      {isLoggedIn &&
        (hasContentUnlock ? (
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
            🔒 Unlock recording — {formatPeso(PRODUCTS.content_unlock.priceCentavos)}
          </button>
        ))}
      <PianoView {...engine} className={className} />
      {signupModalOpen && <SignupPromptModal onClose={() => setSignupModalOpen(false)} />}
      {purchaseModalOpen && (
        <PurchaseModal
          product="content_unlock"
          isLoggedIn={isLoggedIn}
          onClose={() => setPurchaseModalOpen(false)}
        />
      )}
    </div>
  );
}
