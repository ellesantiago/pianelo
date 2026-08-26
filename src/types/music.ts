// Shared music types.

export type NoteName = string; // e.g. "C4", "F#3"

/** A note-on/note-off event, as captured by the Recording feature. */
export interface RecordedNoteEvent {
  note: NoteName;
  action: "down" | "up";
  timestamp: number; // ms from recording start
}
