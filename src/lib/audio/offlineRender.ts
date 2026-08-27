// Renders a recorded event log through the same synth voice logic as live
// playback, but offline (no real-time audio output), producing a PCM
// AudioBuffer suitable for encoding to a file. See AudioEngine's `atTime`
// params and BaseAudioContext-typed `ctx` -- both exist specifically to let
// this module drive the engine deterministically instead of in real time.

import { AudioEngine } from "./AudioEngine";
import type { RecordedNoteEvent } from "@/types/music";

const TAIL_PADDING_SECONDS = 0.8; // covers the ~0.72s release curve so it isn't hard-cut

/**
 * A recording can end with a key still held down (GatedPiano.stopRecording
 * never force-releases held keys) -- left unclosed, that voice's oscillator
 * never stops and instead plays at sustain level until the buffer's fixed
 * length runs out, ending in a hard sample-boundary click. This synthesizes
 * an "up" event for every note still down at the end of the log.
 */
function closeDanglingNotes(sortedEvents: RecordedNoteEvent[]): RecordedNoteEvent[] {
  if (sortedEvents.length === 0) return sortedEvents;

  const down = new Set<string>();
  for (const event of sortedEvents) {
    if (event.action === "down") down.add(event.note);
    else down.delete(event.note);
  }
  if (down.size === 0) return sortedEvents;

  const endTimestamp = sortedEvents[sortedEvents.length - 1].timestamp;
  const closingEvents: RecordedNoteEvent[] = Array.from(down).map((note) => ({
    note,
    action: "up",
    timestamp: endTimestamp,
  }));
  return [...sortedEvents, ...closingEvents];
}

/** Renders a recording's note-event log to a mono PCM AudioBuffer, offline. */
export async function renderEventsToAudioBuffer(
  events: RecordedNoteEvent[],
  options?: { sampleRate?: number }
): Promise<AudioBuffer> {
  if (events.length === 0) {
    throw new Error("Cannot render an empty recording");
  }

  const sampleRate = options?.sampleRate ?? 44100;
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const closed = closeDanglingNotes(sorted);

  const lastMs = closed[closed.length - 1].timestamp;
  const length = Math.ceil((lastMs / 1000 + TAIL_PADDING_SECONDS) * sampleRate);

  const ctx = new OfflineAudioContext({ numberOfChannels: 1, length, sampleRate });
  const engine = new AudioEngine({ context: ctx });

  for (const event of closed) {
    const atTime = event.timestamp / 1000;
    if (event.action === "down") engine.playNote(event.note, atTime);
    else engine.releaseNote(event.note, atTime);
  }

  return ctx.startRendering();
}
