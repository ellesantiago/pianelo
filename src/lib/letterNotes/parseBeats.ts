// Tokenizes a letter-notes string into beats: one note, or a chord
// ("[C4 D4 G4]"), optionally split "|" into left/right hand groups
// ("[D2|A3 D4]") -- how grid.ts records which column a note was typed
// into. Shared by admin validation and the viewer for one syntax definition.

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
