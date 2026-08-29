// Computer-keyboard <-> musical-note mapping. KEY_LAYOUT is a fixed,
// external reference table (full chromatic across three octaves) --
// reproduce it verbatim rather than re-deriving it. getOctaveMapping
// reuses the same 36-key table shifted by whole octaves for any octave
// window. The on-screen piano still renders the full
// MIN_OCTAVE..MAX_OCTAVE range regardless (see getFullKeyboardKeys).

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

interface KeyLayoutEntry {
  key: string; // lowercase physical key
  semitone: number; // semitones above the base octave's C (negative = below, 12+ = above)
  isBlack: boolean;
}

// prettier-ignore
export const KEY_LAYOUT: KeyLayoutEntry[] = [
  // Octave 3 (semitone -12..-1)
  { key: "q", semitone: -12, isBlack: false }, // C3
  { key: "`", semitone: -11, isBlack: true  }, // C#3
  { key: "w", semitone: -10, isBlack: false }, // D3
  { key: "1", semitone: -9,  isBlack: true  }, // D#3
  { key: "e", semitone: -8,  isBlack: false }, // E3
  { key: "r", semitone: -7,  isBlack: false }, // F3
  { key: "2", semitone: -6,  isBlack: true  }, // F#3
  { key: "t", semitone: -5,  isBlack: false }, // G3
  { key: "3", semitone: -4,  isBlack: true  }, // G#3
  { key: "g", semitone: -3,  isBlack: false }, // A3
  { key: "4", semitone: -2,  isBlack: true  }, // A#3
  { key: "f", semitone: -1,  isBlack: false }, // B3

  // Octave 4 (semitone 0..11, DEFAULT_BASE_OCTAVE)
  { key: "d", semitone: 0,  isBlack: false }, // C4
  { key: "5", semitone: 1,  isBlack: true  }, // C#4
  { key: "s", semitone: 2,  isBlack: false }, // D4
  { key: "6", semitone: 3,  isBlack: true  }, // D#4
  { key: "v", semitone: 4,  isBlack: false }, // E4
  { key: "b", semitone: 5,  isBlack: false }, // F4
  { key: "7", semitone: 6,  isBlack: true  }, // F#4
  { key: "n", semitone: 7,  isBlack: false }, // G4
  { key: "8", semitone: 8,  isBlack: true  }, // G#4
  { key: "l", semitone: 9,  isBlack: false }, // A4
  { key: "9", semitone: 10, isBlack: true  }, // A#4
  { key: "k", semitone: 11, isBlack: false }, // B4

  // Octave 5 (semitone 12..23)
  { key: "j", semitone: 12, isBlack: false }, // C5
  { key: "0", semitone: 13, isBlack: true  }, // C#5
  { key: "h", semitone: 14, isBlack: false }, // D5
  { key: "-", semitone: 15, isBlack: true  }, // D#5
  { key: "y", semitone: 16, isBlack: false }, // E5
  { key: "u", semitone: 17, isBlack: false }, // F5
  { key: "=", semitone: 18, isBlack: true  }, // F#5
  { key: "i", semitone: 19, isBlack: false }, // G5
  { key: "[", semitone: 20, isBlack: true  }, // G#5
  { key: "o", semitone: 21, isBlack: false }, // A5
  { key: "]", semitone: 22, isBlack: true  }, // A#5
  { key: "p", semitone: 23, isBlack: false }, // B5
];

export const DEFAULT_BASE_OCTAVE = 4;
export const MIN_OCTAVE = 1;
export const MAX_OCTAVE = 7;

/** Builds the note name for a semitone offset from the C of `baseOctave`. */
export function noteForSemitone(baseOctave: number, semitone: number): NoteAndOctave {
  const octave = baseOctave + Math.floor(semitone / 12);
  const name = NOTE_NAMES[((semitone % 12) + 12) % 12];
  return { note: `${name}${octave}`, octave };
}

interface NoteAndOctave {
  note: string;
  octave: number;
}

export interface OctaveMapping {
  baseOctave: number;
  /** note name (e.g. "C4") -> uppercase key label (e.g. "A") */
  noteToKey: Record<string, string>;
  /** lowercase physical key -> note name */
  keyToNote: Record<string, string>;
  /** ordered list of { note, key, isBlack } for rendering the piano */
  keys: { note: string; key: string; isBlack: boolean }[];
}

/** Returns the full keyboard <-> note mapping for one visible octave. */
export function getOctaveMapping(baseOctave: number): OctaveMapping {
  const noteToKey: Record<string, string> = {};
  const keyToNote: Record<string, string> = {};
  const keys: OctaveMapping["keys"] = [];

  for (const entry of KEY_LAYOUT) {
    const { note } = noteForSemitone(baseOctave, entry.semitone);
    noteToKey[note] = entry.key.toUpperCase();
    keyToNote[entry.key] = note;
    keys.push({ note, key: entry.key.toUpperCase(), isBlack: entry.isBlack });
  }

  return { baseOctave, noteToKey, keyToNote, keys };
}

/** Parses a note name like "C#4" into its letter/accidental/octave parts. */
export function parseNote(note: string): { pitchClass: string; octave: number } {
  const match = /^([A-Ga-g])(#|b)?(-?\d+)$/.exec(note.trim());
  if (!match) {
    throw new Error(`Invalid note name: "${note}"`);
  }
  const [, letter, accidental, octaveStr] = match;
  return {
    pitchClass: `${letter.toUpperCase()}${accidental ?? ""}`,
    octave: Number.parseInt(octaveStr, 10),
  };
}

export function clampOctave(octave: number): number {
  return Math.min(MAX_OCTAVE, Math.max(MIN_OCTAVE, octave));
}

const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]);

/** Default visible range for the full on-screen piano. Matches MIN_OCTAVE/MAX_OCTAVE exactly
 * so every note the computer keyboard can ever reach (via octave up/down) is always visible
 * on screen too -- the piano scrolls horizontally rather than clipping either end. */
export const FULL_KEYBOARD_MIN_OCTAVE = MIN_OCTAVE;
export const FULL_KEYBOARD_MAX_OCTAVE = MAX_OCTAVE;

export interface FullKeyboardKey {
  note: string;
  pitchClass: string;
  octave: number;
  isBlack: boolean;
}

/**
 * Every key across a full multi-octave range, for rendering the on-screen
 * piano. Unlike getOctaveMapping, this has nothing to do with
 * computer-keyboard letters -- it's the complete set of clickable/tappable
 * keys. Callers overlay QWERTY letters on top by cross-referencing
 * getOctaveMapping(activeOctave).noteToKey.
 */
export function getFullKeyboardKeys(
  minOctave: number = FULL_KEYBOARD_MIN_OCTAVE,
  maxOctave: number = FULL_KEYBOARD_MAX_OCTAVE
): FullKeyboardKey[] {
  const keys: FullKeyboardKey[] = [];
  for (let octave = minOctave; octave <= maxOctave; octave++) {
    for (let semitone = 0; semitone < 12; semitone++) {
      keys.push({
        note: `${NOTE_NAMES[semitone]}${octave}`,
        pitchClass: NOTE_NAMES[semitone],
        octave,
        isBlack: BLACK_SEMITONES.has(semitone),
      });
    }
  }
  // Cap the range with the final C so the last octave doesn't look cut off.
  keys.push({ note: `C${maxOctave + 1}`, pitchClass: "C", octave: maxOctave + 1, isBlack: false });
  return keys;
}

// Below: letter-notes-specific helpers (note token -> keyboard letter).
// Kept here since both are "note name <-> key" lookups.

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

/** Canonicalizes a pitch class to the sharp spelling NOTE_NAMES/KEY_LAYOUT use (no flats). */
export function normalizePitchClass(pitchClass: string): string {
  return FLAT_TO_SHARP[pitchClass] ?? pitchClass;
}

const FULL_NOTE_PATTERN = /^([A-Ga-g])(#|b)?(-?\d+)$/;

/** semitone offset (relative to DEFAULT_BASE_OCTAVE's C, matching KEY_LAYOUT)
 * -> uppercase key label. Built once from KEY_LAYOUT so noteToLetterLabel
 * doesn't need to round-trip through getOctaveMapping's note-name strings. */
const SEMITONE_TO_KEY: Record<number, string> = {};
for (const entry of KEY_LAYOUT) {
  SEMITONE_TO_KEY[entry.semitone] = entry.key.toUpperCase();
}

/** KEY_LAYOUT only spans octaves 3-5 -- clamp (don't wrap) to the nearest
 * boundary octave for anything outside that range. */
function clampToTableOctave(octave: number): number {
  return Math.min(5, Math.max(3, octave));
}

/** Converts a letter-notes token to its keyboard letter, e.g. "C4" -> "D".
 * A token with no octave or that doesn't parse as a note is returned
 * unchanged -- there's no single correct key for a bare pitch class. */
export function noteToLetterLabel(token: string): string {
  const match = FULL_NOTE_PATTERN.exec(token.trim());
  if (!match) return token;
  const [, letter, accidental, octaveStr] = match;
  const pitchClass = normalizePitchClass(`${letter.toUpperCase()}${accidental ?? ""}`);
  const octave = clampToTableOctave(Number.parseInt(octaveStr, 10));
  const semitone = (octave - DEFAULT_BASE_OCTAVE) * 12 + NOTE_NAMES.indexOf(pitchClass as (typeof NOTE_NAMES)[number]);
  return SEMITONE_TO_KEY[semitone] ?? token;
}

/** Absolute semitone count from C0 -- unlike KEY_LAYOUT's semitone offsets
 * (relative to a chosen base octave), this orders every note on one scale
 * regardless of octave, so it can be compared against a fixed pivot. */
function absoluteSemitone(pitchClass: string, octave: number): number {
  return octave * 12 + NOTE_NAMES.indexOf(pitchClass as (typeof NOTE_NAMES)[number]);
}

// Fallback left/right pivot for beats with no explicit hand split (see
// parseBeats.ts): A4 and above is the right hand.
const LEFT_RIGHT_PIVOT = absoluteSemitone("A", DEFAULT_BASE_OCTAVE);

/** Whether a token falls on the left-hand side (below A4) for the two-hand
 * display fallback. No parseable octave defaults to the left column. */
export function isLeftHandNote(token: string): boolean {
  const match = FULL_NOTE_PATTERN.exec(token.trim());
  if (!match) return true;
  const [, letter, accidental, octaveStr] = match;
  const pitchClass = normalizePitchClass(`${letter.toUpperCase()}${accidental ?? ""}`);
  const octave = Number.parseInt(octaveStr, 10);
  return absoluteSemitone(pitchClass, octave) < LEFT_RIGHT_PIVOT;
}
