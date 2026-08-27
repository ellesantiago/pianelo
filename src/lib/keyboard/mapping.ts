// Computer-keyboard <-> musical-note mapping.
//
// The keyboard covers three octaves at once, full chromatic (every black
// key has a letter/number too), so the player rarely needs the octave
// shift controls (ArrowLeft/ArrowRight) to reach a note. The split also
// follows piano hand ergonomics: lower notes (further left on the piano)
// sit under the LEFT hand's home keys, higher notes (further right on the
// piano) sit under the RIGHT hand's, so a low-to-high run across all three
// octaves moves left-to-right across the keyboard too, the same way it does
// on the piano itself.
//
//   Base octave    -- white A S D F G H J K, black 2 3 5 6 7
//                      (C4 -> "A", D4 -> "S", ... C5 -> "K". A S D F G is
//                      the left hand, H J K is the right hand -- the base
//                      octave itself is the hand-split's pivot point.)
//   One octave down -- LEFT hand only: white Z X C V B R T, black 1 4 Q W E
//   One octave up    -- RIGHT hand only: white L ; ' N M , ., black 8 9 0 Y U
//
// Within each octave, black keys always come from a row physically ABOVE
// the row(s) their white keys come from -- numbers above letters, and (once
// numbers run out) the QWERTY row above the ZXCV row -- the same "black is
// higher up, white is lower down" split the base octave already uses
// (numbers above ASDF), so it's not a different rule to learn per octave.
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
  // One octave below the base -- LEFT hand only, full chromatic.
  // White (bottom rows): Z X C V B, then R T (ZXCVB is only 5 keys --
  // one row short of the 7 whites an octave needs, so it borrows the
  // last 2 keys of the row above once the black keys claim the rest).
  // Black (top rows): 1 4 (number row), then Q W E (row above ZXCV).
  { key: "z", semitone: -12, isBlack: false }, // C
  { key: "1", semitone: -11, isBlack: true  }, // C#
  { key: "x", semitone: -10, isBlack: false }, // D
  { key: "4", semitone: -9,  isBlack: true  }, // D#
  { key: "c", semitone: -8,  isBlack: false }, // E
  { key: "v", semitone: -7,  isBlack: false }, // F
  { key: "q", semitone: -6,  isBlack: true  }, // F#
  { key: "b", semitone: -5,  isBlack: false }, // G
  { key: "w", semitone: -4,  isBlack: true  }, // G#
  { key: "r", semitone: -3,  isBlack: false }, // A
  { key: "e", semitone: -2,  isBlack: true  }, // A#
  { key: "t", semitone: -1,  isBlack: false }, // B

  // One octave above the base -- RIGHT hand only, full chromatic.
  // White (bottom/home rows): L ; ' (ASDF-row remnant), then N M , .
  // Black (top rows): 8 9 0 (number row), then Y U (row above the rest).
  { key: "l", semitone: 12, isBlack: false }, // C
  { key: "8", semitone: 13, isBlack: true  }, // C#
  { key: ";", semitone: 14, isBlack: false }, // D
  { key: "9", semitone: 15, isBlack: true  }, // D#
  { key: "'", semitone: 16, isBlack: false }, // E
  { key: "n", semitone: 17, isBlack: false }, // F
  { key: "0", semitone: 18, isBlack: true  }, // F#
  { key: "m", semitone: 19, isBlack: false }, // G
  { key: "y", semitone: 20, isBlack: true  }, // G#
  { key: ",", semitone: 21, isBlack: false }, // A
  { key: "u", semitone: 22, isBlack: true  }, // A#
  { key: ".", semitone: 23, isBlack: false }, // B

  // Base octave -- full chromatic. Listed LAST so its "k" (not the octave
  // above's "l") wins as the displayed label for their shared note -- "k"
  // is the canonical label for C5.
  { key: "a", semitone: 0,  isBlack: false }, // C
  { key: "2", semitone: 1,  isBlack: true  }, // C#
  { key: "s", semitone: 2,  isBlack: false }, // D
  { key: "3", semitone: 3,  isBlack: true  }, // D#
  { key: "d", semitone: 4,  isBlack: false }, // E
  { key: "f", semitone: 5,  isBlack: false }, // F
  { key: "5", semitone: 6,  isBlack: true  }, // F#
  { key: "g", semitone: 7,  isBlack: false }, // G
  { key: "6", semitone: 8,  isBlack: true  }, // G#
  { key: "h", semitone: 9,  isBlack: false }, // A
  { key: "7", semitone: 10, isBlack: true  }, // A#
  { key: "j", semitone: 11, isBlack: false }, // B
  { key: "k", semitone: 12, isBlack: false }, // C (next octave, shared with "8")
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
 * (see noteToLetterLabel) -- deliberately fixed to the default base octave,
 * independent of whatever octave the live piano is currently showing. */
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
