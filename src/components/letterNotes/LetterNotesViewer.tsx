"use client";

import { useEffect, useRef, useState } from "react";
import { parseBeats, type Beat } from "@/lib/letterNotes/parseBeats";
import { noteToLetterLabel } from "@/lib/keyboard/mapping";

interface LetterNotesViewerProps {
  title: string;
  notes: string;
}

type Speed = "slow" | "medium" | "fast";
// Whether each slot shows the computer-keyboard letter that plays it, or the
// plain note name -- a chord like "G2+D2" only makes sense in the latter,
// since G2/D2 may fall outside the keyboard's mapped octave range and have
// no letter of their own.
type Format = "letters" | "cde";

const SPEED_PX_PER_SEC: Record<Speed, number> = {
  slow: 40,
  medium: 80,
  fast: 140,
};
const SPEED_OPTIONS: Speed[] = ["slow", "medium", "fast"];

// Fixed regardless of chord size, so the scroll offset maps to a slot index
// by pure arithmetic (no DOM measurement needed to find "what's currently
// at the playhead").
const SLOT_WIDTH = 56;
const SLOT_GAP = 8;
const SLOT_STRIDE = SLOT_WIDTH + SLOT_GAP;

/**
 * Visual-only reading aid: scrolls the song's note letters from start to end
 * once, at a user-selectable speed and pausable at any point. No audio --
 * the user plays the keys themselves while following along.
 */
export function LetterNotesViewer({ title, notes }: LetterNotesViewerProps) {
  const slots = parseBeats(notes);
  const [format, setFormat] = useState<Format>("letters");
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const speedRef = useRef<Speed>("medium");
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [speed, setSpeed] = useState<Speed>("medium");
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const trackWidth = () => slotsRef.current.length * SLOT_STRIDE - SLOT_GAP;

  const maxScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    return Math.max(0, trackWidth() - viewport.clientWidth);
  };

  const applyPosition = () => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${-positionRef.current}px)`;
    }
  };

  const step = (time: number) => {
    if (lastTimeRef.current == null) lastTimeRef.current = time;
    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const max = maxScroll();
    positionRef.current = Math.min(max, positionRef.current + SPEED_PX_PER_SEC[speedRef.current] * dt);
    applyPosition();

    if (positionRef.current >= max) {
      setDone(true);
      setPlaying(false);
      frameRef.current = null;
      return;
    }
    frameRef.current = requestAnimationFrame(step);
  };

  // Resets lastTimeRef so the next frame's dt doesn't include time spent
  // paused (or before the very first frame), which would otherwise jump the
  // scroll position forward.
  const startLoop = () => {
    if (frameRef.current != null) return;
    lastTimeRef.current = null;
    frameRef.current = requestAnimationFrame(step);
  };

  const stopLoop = () => {
    if (frameRef.current == null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };

  // Mount-only: the parent keys this component by song id (see
  // LetterNotesSearch), so a different song selection remounts it fresh
  // instead of needing to reset state here.
  useEffect(() => {
    startLoop();
    return () => stopLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlaying = () => {
    if (playing) {
      stopLoop();
      setPlaying(false);
    } else {
      setPlaying(true);
      startLoop();
    }
  };

  const resetAndRestart = () => {
    positionRef.current = 0;
    lastTimeRef.current = null;
    setDone(false);
    setPlaying(true);
    applyPosition();
    startLoop();
  };

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={done ? resetAndRestart : togglePlaying}
            aria-label={done ? "Restart" : playing ? "Pause" : "Play"}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 font-medium hover:bg-neutral-100"
          >
            {done ? "↻" : playing ? "⏸" : "▶"}
          </button>
          <div className="flex items-center gap-1">
            {(["letters", "cde"] as Format[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormat(option)}
                className={`rounded-md px-2 py-1 font-medium ${
                  format === option
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-200 bg-white hover:bg-neutral-100"
                }`}
              >
                {option === "letters" ? "Letter Notes" : "CDE"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSpeed(option)}
                className={`rounded-md px-2 py-1 font-medium capitalize ${
                  speed === option
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-200 bg-white hover:bg-neutral-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        <div ref={trackRef} className="flex" style={{ gap: SLOT_GAP }}>
          {slots.map((slot, i) => (
            <SlotChip key={i} beat={slot} format={format} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SlotChip({ beat, format }: { beat: Beat; format: Format }) {
  const isChord = beat.notes.length > 1;
  const labels = format === "cde" ? beat.notes : beat.notes.map(noteToLetterLabel);

  return (
    <div
      style={{ width: SLOT_WIDTH }}
      className={`flex h-10 shrink-0 items-center justify-center rounded-md border px-1 font-bold ${
        isChord
          ? "border-amber-400 bg-amber-50 text-xs text-amber-900"
          : "border-neutral-300 bg-white text-sm"
      }`}
    >
      <span className="truncate">{labels.join("+")}</span>
    </div>
  );
}
