// Tokenizes a letter-notes `notes` string into beats -- one note, or several
// for a chord ("[C4 D4 G4]"). A bracketed beat may also carry a "|" splitting
// it into explicit left/right-hand groups ("[D2|A3 D4]") -- that's how the
// admin's row editor (grid.ts) records which column a note was typed into,
// since hand assignment can't be reliably reconstructed from pitch alone
// (see mapping.ts's isLeftHandNote for why that heuristic still exists, as a
// fallback for older content saved without an explicit split). Shared by
// admin validation and the viewer so there's exactly one definition of the
// syntax.

export interface Beat {
  /** All notes in this beat, both hands flattened together. */
  notes: string[];
  /** Present only when the beat encodes an explicit hand split. */
  left?: string[];
  right?: string[];
}

const BEAT_PATTERN = /\[([^\]]*)\]|(\S+)/g;

export function parseBeats(notes: string): Beat[] {
  const beats: Beat[] = [];
  let match: RegExpExecArray | null;
  while ((match = BEAT_PATTERN.exec(notes)) !== null) {
    const [, chordInner, single] = match;
    if (chordInner === undefined) {
      beats.push({ notes: [single] });
      continue;
    }
    const pipeIndex = chordInner.indexOf("|");
    if (pipeIndex === -1) {
      beats.push({ notes: chordInner.trim().split(/\s+/).filter(Boolean) });
      continue;
    }
    const left = chordInner.slice(0, pipeIndex).trim().split(/\s+/).filter(Boolean);
    const right = chordInner.slice(pipeIndex + 1).trim().split(/\s+/).filter(Boolean);
    beats.push({ notes: [...left, ...right], left, right });
  }
  return beats;
}
