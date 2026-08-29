// Converts between the letter-notes syntax string and a two-column
// { left, right } grid for the admin's row-per-beat editor. Round-trips
// through each beat's explicit hand split (see parseBeats.ts) rather than
// guessing from pitch; beats saved before that split existed fall back to
// the same pitch-based guess LetterNotesViewer uses for display.

import { parseBeats } from "./parseBeats";
import { isLeftHandNote } from "@/lib/keyboard/mapping";

export interface NoteRow {
  left: string;
  right: string;
}

export function notesToRows(notes: string): NoteRow[] {
  return parseBeats(notes).map((beat) => {
    if (beat.left !== undefined || beat.right !== undefined) {
      return { left: (beat.left ?? []).join(" "), right: (beat.right ?? []).join(" ") };
    }
    const left: string[] = [];
    const right: string[] = [];
    for (const note of beat.notes) {
      (isLeftHandNote(note) ? left : right).push(note);
    }
    return { left: left.join(" "), right: right.join(" ") };
  });
}

/**
 * Blank rows are dropped (the syntax has no "rest" token). Octaves are
 * never defaulted -- the admin always types the explicit note+octave.
 * Every row is written as "[left|right]", always bracketed and split, so
 * a reload never has to guess a note's hand from pitch.
 */
export function rowsToNotes(rows: NoteRow[]): string {
  const tokenize = (value: string) => value.trim().split(/\s+/).filter(Boolean);
  const beats = rows
    .map((row) => ({ left: tokenize(row.left), right: tokenize(row.right) }))
    .filter((beat) => beat.left.length > 0 || beat.right.length > 0);
  return beats.map(({ left, right }) => `[${left.join(" ")}|${right.join(" ")}]`).join(" ");
}
