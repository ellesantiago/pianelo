// Computer-keyboard <-> musical-note mapping.
//
// The keyboard covers three octaves at once, full chromatic (every black
// key has a letter/number too), so the player rarely needs the octave
// shift controls (ArrowLeft/ArrowRight) to reach a note. This exact
// key-per-note table is a fixed, external reference (not derived from any
// physical-keyboard heuristic) -- reproduce it verbatim rather than
// re-deriving it:
//
//   Octave 3 (one below the default base octave):
//     C3=Q  C#3=`  D3=W  D#3=1  E3=E  F3=R  F#3=2
//     G3=T  G#3=3  A3=G  A#3=4  B3=F
//   Octave 4 (DEFAULT_BASE_OCTAVE):
//     C4=D  C#4=5  D4=S  D#4=6  E4=V  F4=B  F#4=7
//     G4=N  G#4=8  A4=L  A#4=9  B4=K
//   Octave 5 (one above the default base octave):
//     C5=J  C#5=0  D5=H  D#5=-  E5=Y  F5=U  F#5==
//     G5=I  G#5=[  A5=O  A#5=]  B5=P
//
// getOctaveMapping/noteForSemitone below reuse this same 36-key table for
// any other octave window too (e.g. shifting the live piano up or down via
// ArrowLeft/ArrowRight) -- same keys, shifted by whole octaves, exactly as
// they already do for octaves 3-5 above.
//
// The visual piano itself still renders every note across the full
// MIN_OCTAVE..MAX_OCTAVE range (see getFullKeyboardKeys below) and every key
// is always playable by click/tap -- which also always shows the correct
// label for whichever physical key plays it, so none of this needs to
// visually line up with real keyboard rows to be usable.

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

// ---------------------------------------------------------------------------
// Below this point: helpers specific to the letter-notes feature (converting
// an admin-authored note token to its keyboard letter). Kept here rather
// than under lib/letterNotes/ because both are fundamentally "note name <->
// key" lookups -- the same domain as everything above.
// ---------------------------------------------------------------------------

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

/** Reference mapping used to convert note tokens to keyboard letters for display
 * (see noteToLetterLabel) -- deliberately fixed to DEFAULT_BASE_OCTAVE (the
 * fixed KEY_LAYOUT table above is authored directly against octaves 3-5,
 * matching that convention), independent of whatever octave the live piano
 * is currently showing. */
const LETTER_REFERENCE_MAPPING = getOctaveMapping(DEFAULT_BASE_OCTAVE);

/**
 * Converts a letter-notes token to its keyboard letter, e.g. "C4" -> "A".
 * A token with no octave (older, octave-less letter-notes content) or one
 * that doesn't parse as a note at all is returned unchanged -- there's no
 * single correct key for a bare pitch class. A token outside the reference
 * mapping's octave window (no on-screen key label for it under the default
 * octave) also falls back to the raw token rather than erroring.
 */
export function noteToLetterLabel(token: string): string {
  const match = FULL_NOTE_PATTERN.exec(token.trim());
  if (!match) return token;
  const [, letter, accidental, octave] = match;
  const pitchClass = normalizePitchClass(`${letter.toUpperCase()}${accidental ?? ""}`);
  return LETTER_REFERENCE_MAPPING.noteToKey[`${pitchClass}${octave}`] ?? token;
}

/** Absolute semitone count from C0 -- unlike KEY_LAYOUT's semitone offsets
 * (relative to a chosen base octave), this orders every note on one scale
 * regardless of octave, so it can be compared against a fixed pivot. */
function absoluteSemitone(pitchClass: string, octave: number): number {
  return octave * 12 + NOTE_NAMES.indexOf(pitchClass as (typeof NOTE_NAMES)[number]);
}

// Fallback left/right pivot for beats saved without an explicit hand split
// (see parseBeats.ts) -- the fixed KEY_LAYOUT table above has no inherent
// notion of "hand," so this just keeps the old pitch-based guess (A4 and
// above is the right hand) as a best-effort default for that legacy case.
const LEFT_RIGHT_PIVOT = absoluteSemitone("A", DEFAULT_BASE_OCTAVE);

/**
 * Whether a letter-notes token falls on the keyboard's left-hand side (C4-G4
 * and below) rather than the right (A4 and above) -- for splitting a beat's
 * simultaneous notes into a two-hand display when the beat has no explicit
 * hand split of its own (see parseBeats.ts). A token with no parseable
 * octave has no pitch to compare, so it defaults to the left column.
 */
export function isLeftHandNote(token: string): boolean {
  const match = FULL_NOTE_PATTERN.exec(token.trim());
  if (!match) return true;
  const [, letter, accidental, octaveStr] = match;
  const pitchClass = normalizePitchClass(`${letter.toUpperCase()}${accidental ?? ""}`);
  const octave = Number.parseInt(octaveStr, 10);
  return absoluteSemitone(pitchClass, octave) < LEFT_RIGHT_PIVOT;
}
