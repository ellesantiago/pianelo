// Tokenizes a letter-notes `notes` string into beats -- one note, or several
// for a chord ("[C4 D4 G4]"). Shared by admin validation and the viewer so
// there's exactly one definition of the syntax.

export interface Beat {
  notes: string[];
}

const BEAT_PATTERN = /\[([^\]]*)\]|(\S+)/g;

export function parseBeats(notes: string): Beat[] {
  const beats: Beat[] = [];
  let match: RegExpExecArray | null;
  while ((match = BEAT_PATTERN.exec(notes)) !== null) {
    const [, chordInner, single] = match;
    beats.push({ notes: chordInner !== undefined ? chordInner.trim().split(/\s+/) : [single] });
  }
  return beats;
}
