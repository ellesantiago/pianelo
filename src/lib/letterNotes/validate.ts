// Shared create/update validation for the admin letter-notes API routes.
//
// Outside brackets: a single note, octave optional -- loose on purpose,
// since older content is octave-less and it's still a valid visual reading
// aid without one (see noteToLetterLabel's fallback).
// Inside brackets ("[C4 D3 G4]"): a chord -- octave mandatory on every note,
// since a chord must resolve to literal, distinct keys to be meaningful.
// A bracket may also carry one "|" splitting it into explicit left/right
// hand groups ("[D2|A3 D4]", or one side empty like "[D2|]") -- how the
// admin's row editor (grid.ts) records which column a note belongs to.
// Either side may be empty, but not both.

const SINGLE_NOTE_PATTERN = /^[A-Ga-g](#|b)?\d*$/;
const CHORD_NOTE_PATTERN = /^[A-Ga-g](#|b)?\d+$/;
const TOP_LEVEL_TOKEN_PATTERN = /\[[^\]]*\]|\S+/g;

export type ValidationResult =
  | { ok: true; title: string; notes: string }
  | { ok: false; error: string };

function validateNotes(notes: string): { ok: true; notes: string } | { ok: false; error: string } {
  const rawTokens = notes.trim().match(TOP_LEVEL_TOKEN_PATTERN) ?? [];
  const normalized: string[] = [];

  for (const raw of rawTokens) {
    if (raw.startsWith("[")) {
      if (!raw.endsWith("]")) {
        return { ok: false, error: `"${raw}" isn't a closed chord — expected something like "[C4 D3]".` };
      }
      const inner = raw.slice(1, -1);
      if (inner.trim().length === 0) {
        return { ok: false, error: "A chord can't be empty — expected something like \"[C4 D3]\"." };
      }

      const pipeIndex = inner.indexOf("|");
      const parts = pipeIndex === -1 ? [inner] : [inner.slice(0, pipeIndex), inner.slice(pipeIndex + 1)];
      const groups = parts.map((part) => part.trim().split(/\s+/).filter(Boolean));

      if (groups.every((group) => group.length === 0)) {
        return { ok: false, error: "A chord can't be empty — expected something like \"[C4 D3]\"." };
      }
      const invalid = groups.flat().find((note) => !CHORD_NOTE_PATTERN.test(note));
      if (invalid) {
        return {
          ok: false,
          error: `"${invalid}" isn't a valid chord note — chord notes need an octave (e.g. C4, D#3).`,
        };
      }
      normalized.push(`[${groups.map((group) => group.join(" ")).join("|")}]`);
    } else {
      if (!SINGLE_NOTE_PATTERN.test(raw)) {
        return { ok: false, error: `"${raw}" isn't a valid note letter (e.g. C, D#, Eb4).` };
      }
      normalized.push(raw);
    }
  }

  return { ok: true, notes: normalized.join(" ") };
}

export function validateLetterNotesInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }
  const { title, notes } = body as { title?: unknown; notes?: unknown };

  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, error: "Title is required." };
  }
  if (typeof notes !== "string" || notes.trim().length === 0) {
    return { ok: false, error: "Notes are required." };
  }

  const result = validateNotes(notes);
  if (!result.ok) return result;

  return { ok: true, title: title.trim(), notes: result.notes };
}
