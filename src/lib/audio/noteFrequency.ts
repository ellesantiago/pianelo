import { parseNote } from "@/lib/keyboard/mapping";

const PITCH_CLASS_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/** Converts a note name like "C4" or "F#3" to its frequency in Hz (A4 = 440Hz, MIDI standard). */
export function noteToFrequency(note: string): number {
  const { pitchClass, octave } = parseNote(note);
  const semitone = PITCH_CLASS_TO_SEMITONE[pitchClass];
  if (semitone === undefined) {
    throw new Error(`Unknown pitch class in note "${note}"`);
  }
  const midi = (octave + 1) * 12 + semitone; // MIDI note number, C4 = 60
  return 440 * Math.pow(2, (midi - 69) / 12);
}
