// Converts between the letter-notes syntax string and a two-column grid of
// { left, right } rows for the admin's notebook-style editor -- one row per
// beat. Each row's columns round-trip through the beat's explicit left/right
// split (see parseBeats.ts) rather than being reconstructed from pitch, so
// what the admin builds row by row is exactly what players see -- a right
// hand chord that happens to sit below the left hand's notes stays right
// hand. Beats saved before this split existed (or edited outside this UI)
// have no explicit split; those fall back to the same pitch-based guess
// LetterNotesViewer uses for display.

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
 * Blank rows (nothing typed in either column) are dropped rather than
 * becoming an empty beat -- the syntax has no "rest" token, and a stray
 * blank row while editing shouldn't block saving.
 *
 * Every token is written exactly as the admin typed it -- no default octave
 * gets appended, so an octave-less note (e.g. "C" instead of "C4") is passed
 * through as-is and fails validate.ts's chord-note check. That's deliberate:
 * a shared default was ambiguous about which octave a note actually meant,
 * so the admin now always types the explicit note+octave they want (e.g.
 * "C4"), the same name the keyboard-letter conversion and on-screen piano
 * use, rather than a shorthand digit that could be misread against a
 * separately-chosen default.
 *
 * Every row is written as "[left|right]" -- always bracketed with the "|"
 * split, even for a single note in just one column -- rather than the bare
 * "C4" / unmarked "[C4 D4]" chord shorthand that would otherwise need
 * mapping.ts's pitch guess to untangle. Explicit beats every time means a
 * right-hand note that happens to sit below the left hand's (like the bug
 * this fixed: a right-hand chord under a low left-hand bass note) is never
 * silently reassigned to the wrong column on reload.
 */
export function rowsToNotes(rows: NoteRow[]): string {
  const tokenize = (value: string) => value.trim().split(/\s+/).filter(Boolean);
  const beats = rows
    .map((row) => ({ left: tokenize(row.left), right: tokenize(row.right) }))
    .filter((beat) => beat.left.length > 0 || beat.right.length > 0);
  return beats.map(({ left, right }) => `[${left.join(" ")}|${right.join(" ")}]`).join(" ");
}
