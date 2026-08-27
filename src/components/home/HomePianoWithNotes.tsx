"use client";

import { useCallback, useRef, useState } from "react";
import { LetterNotesSearch } from "@/components/letterNotes/LetterNotesSearch";
import type { PlayedNote } from "@/components/letterNotes/LetterNotesViewer";
import { GatedPiano } from "@/components/piano/GatedPiano";
import { AdSlot } from "@/components/ads/AdSlot";
import { DEFAULT_BASE_OCTAVE } from "@/lib/keyboard/mapping";

interface HomePianoWithNotesProps {
  isLoggedIn: boolean;
  hasContentUnlock: boolean;
  hasAdsRemoved?: boolean;
}

/**
 * Owns the state LetterNotesSearch/Viewer and GatedPiano need to share --
 * the most recently played note, and the piano's octave -- since page.tsx
 * (their nearest common ancestor) is a server component and can't hold it
 * itself. This is what lets an open song's letter-notes viewer auto-advance
 * as the reader actually plays it on the piano below, AND recenter the
 * piano's octave so whichever key letters the current row shows are always
 * the keys that actually play it (a row's note can be outside the piano's
 * currently-mapped 3-octave window -- without this, the shown letter can
 * point at the wrong physical key entirely).
 */
export function HomePianoWithNotes({ isLoggedIn, hasContentUnlock, hasAdsRemoved }: HomePianoWithNotesProps) {
  const [lastPlayedNote, setLastPlayedNote] = useState<PlayedNote | null>(null);
  const seqRef = useRef(0);

  const handleNotePlayed = useCallback((note: string) => {
    seqRef.current += 1;
    setLastPlayedNote({ note, seq: seqRef.current });
  }, []);

  const [octave, setOctave] = useState(DEFAULT_BASE_OCTAVE);

  return (
    <>
      <div className="pt-6">
        <LetterNotesSearch
          isLoggedIn={isLoggedIn}
          lastPlayedNote={lastPlayedNote}
          requestOctave={setOctave}
          octave={octave}
        />
      </div>

      <div className="flex flex-1 flex-col justify-end space-y-10 pt-10">
        <GatedPiano
          isLoggedIn={isLoggedIn}
          hasContentUnlock={hasContentUnlock}
          onNotePlayed={handleNotePlayed}
          octave={octave}
          onOctaveChange={setOctave}
        />

        <AdSlot slot="below-piano" hidden={hasAdsRemoved} />
      </div>
    </>
  );
}
