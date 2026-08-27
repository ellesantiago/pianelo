// Converts between the letter-notes syntax string and a two-column grid of
// { left, right } rows for the admin's notebook-style editor -- one row per
// beat, split by hand the same way LetterNotesViewer splits a beat for
// display, so what the admin builds row by row is exactly what players see.

import { parseBeats } from "./parseBeats";
import { isLeftHandNote } from "@/lib/keyboard/mapping";

export interface NoteRow {
  left: string;
  right: string;
}

export function notesToRows(notes: string): NoteRow[] {
  return parseBeats(notes).map((beat) => {
    const left: string[] = [];
    const right: string[] = [];
    for (const note of beat.notes) {
      (isLeftHandNote(note) ? left : right).push(note);
    }
    return { left: left.join(" "), right: right.join(" ") };
  });
}

const HAS_OCTAVE = /\d/;

/**
 * Blank rows (nothing typed in either column) are dropped rather than
 * becoming an empty beat -- the syntax has no "rest" token, and a stray
 * blank row while editing shouldn't block saving.
 *
 * A token typed without a trailing octave digit (e.g. "C" rather than "C4")
 * gets `defaultOctave` appended -- the song's chosen octave from the admin
 * grid -- so the built syntax always carries an explicit octave per note.
 * That satisfies the chord rule in validate.ts (every chord note needs one)
 * without the admin having to type a digit on every note; typing one
 * explicitly still overrides the default for just that note.
 */
export function rowsToNotes(rows: NoteRow[], defaultOctave: number): string {
  const withOctave = (token: string) => (HAS_OCTAVE.test(token) ? token : `${token}${defaultOctave}`);
  const beats = rows
    .map((row) =>
      [...row.left.trim().split(/\s+/), ...row.right.trim().split(/\s+/)].filter(Boolean).map(withOctave)
    )
    .filter((tokens) => tokens.length > 0);
  return beats.map((tokens) => (tokens.length === 1 ? tokens[0] : `[${tokens.join(" ")}]`)).join(" ");
}
