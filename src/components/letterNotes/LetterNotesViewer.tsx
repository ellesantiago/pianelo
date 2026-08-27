"use client";

import { useEffect, useRef, useState } from "react";
import { parseBeats, type Beat } from "@/lib/letterNotes/parseBeats";
import { isLeftHandNote, noteToLetterLabel } from "@/lib/keyboard/mapping";
import { PurchaseModal } from "@/components/paywall/PurchaseModal";
import { formatPeso, PRODUCTS } from "@/lib/payments/products";

interface LetterNotesViewerProps {
  title: string;
  /** null when the caller hasn't paid for content_unlock -- shows a locked teaser instead. */
  notes: string | null;
  isLoggedIn?: boolean;
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

// Fixed regardless of chord size, so the scroll offset maps to a row index
// by pure arithmetic (no DOM measurement needed to find "what's currently
// at the playhead"). Row width is left flexible -- it's the height (the
// scroll axis) that has to stay constant, not the two hand-columns' width.
const ROW_HEIGHT = 48;
const ROW_GAP = 8;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;
const VIEWPORT_HEIGHT = 5 * ROW_STRIDE - ROW_GAP;

/**
 * Visual-only reading aid: scrolls the song's note letters from start to end
 * once, at a user-selectable speed and pausable at any point. No audio --
 * the user plays the keys themselves while following along.
 *
 * Split into a thin wrapper + the actual viewer (rather than an early return
 * inside one component) so a locked song never runs the scroll-animation
 * hooks below with an empty `notes` string.
 */
export function LetterNotesViewer({ title, notes, isLoggedIn }: LetterNotesViewerProps) {
  if (notes === null) {
    return <LockedTeaser title={title} isLoggedIn={isLoggedIn ?? false} />;
  }
  return <UnlockedViewer title={title} notes={notes} />;
}

function LockedTeaser({ title, isLoggedIn }: { title: string; isLoggedIn: boolean }) {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm text-neutral-500">
        Unlock letter notes + recording for a one-time{" "}
        {formatPeso(PRODUCTS.content_unlock.priceCentavos)} to read along.
      </p>
      <button
        type="button"
        onClick={() => setPurchaseModalOpen(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
      >
        Unlock — {formatPeso(PRODUCTS.content_unlock.priceCentavos)}
      </button>
      {purchaseModalOpen && (
        <PurchaseModal
          product="content_unlock"
          isLoggedIn={isLoggedIn}
          onClose={() => setPurchaseModalOpen(false)}
        />
      )}
    </div>
  );
}

function UnlockedViewer({ title, notes }: { title: string; notes: string }) {
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

  const trackHeight = () => slotsRef.current.length * ROW_STRIDE - ROW_GAP;

  const maxScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    return Math.max(0, trackHeight() - viewport.clientHeight);
  };

  const applyPosition = () => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateY(${-positionRef.current}px)`;
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

      <div className="flex justify-center gap-8 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        <span>Left hand</span>
        <span>Right hand</span>
      </div>

      <div ref={viewportRef} className="overflow-hidden" style={{ height: VIEWPORT_HEIGHT }}>
        <div ref={trackRef} className="flex flex-col" style={{ gap: ROW_GAP }}>
          {slots.map((slot, i) => (
            <BeatRow key={i} beat={slot} format={format} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Splits one beat's simultaneous notes across the two hand columns, so a
// beat that needs both hands at once shows both side by side in the same
// row, and a beat only one hand plays leaves the other column blank.
function splitByHand(notes: string[]): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];
  for (const note of notes) {
    (isLeftHandNote(note) ? left : right).push(note);
  }
  return { left, right };
}

function BeatRow({ beat, format }: { beat: Beat; format: Format }) {
  const { left, right } = splitByHand(beat.notes);
  const label = (handNotes: string[]) =>
    (format === "cde" ? handNotes : handNotes.map(noteToLetterLabel)).join(" ");

  return (
    <div style={{ height: ROW_HEIGHT }} className="flex shrink-0 items-stretch gap-3">
      <HandCell notes={left} label={label(left)} isChord={left.length > 1} align="end" />
      <div className="w-px shrink-0 bg-neutral-200" />
      <HandCell notes={right} label={label(right)} isChord={right.length > 1} align="start" />
    </div>
  );
}

function HandCell({
  notes,
  label,
  isChord,
  align,
}: {
  notes: string[];
  label: string;
  isChord: boolean;
  align: "start" | "end";
}) {
  if (notes.length === 0) {
    return <div className="flex-1" />;
  }

  return (
    <div
      className={`flex flex-1 items-center rounded-md border px-2 font-bold ${
        align === "end" ? "justify-end" : "justify-start"
      } ${
        isChord
          ? "border-amber-400 bg-amber-50 text-xs text-amber-900"
          : "border-neutral-300 bg-white text-sm"
      }`}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}
