"use client";

import { usePianoEngine } from "./usePianoEngine";
import { PianoView } from "./PianoView";

export interface PianoProps {
  /** Fired every time a note actually sounds, from any input method. */
  onNotePlayed?: (note: string) => void;
  onNoteReleased?: (note: string) => void;
  className?: string;
}

/** Standalone playable piano: owns its own engine, always unlocked. */
export function Piano({ onNotePlayed, onNoteReleased, className }: PianoProps) {
  const engine = usePianoEngine({ onNotePlayed, onNoteReleased });
  return <PianoView {...engine} className={className} />;
}
