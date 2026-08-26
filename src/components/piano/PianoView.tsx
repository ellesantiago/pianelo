"use client";

import { useEffect, useRef, useState } from "react";
import type { FullKeyboardKey, OctaveMapping } from "@/lib/keyboard/mapping";

const WHITE_KEY_WIDTH = 32; // px
const BLACK_KEY_WIDTH = 21; // px

export interface PianoViewProps {
  mapping: OctaveMapping;
  fullKeys: FullKeyboardKey[];
  octave: number;
  octaveUp: () => void;
  octaveDown: () => void;
  canOctaveUp: boolean;
  canOctaveDown: boolean;
  sustain: boolean;
  setSustain: (enabled: boolean) => void;
  volume: number;
  setVolume: (value: number) => void;
  activeNotes: Set<string>;
  playNote: (note: string) => void;
  releaseNote: (note: string) => void;
  className?: string;
}

/**
 * Pure presentation for the piano: keys + controls. All state comes from
 * usePianoEngine via props.
 */
export function PianoView({
  mapping,
  fullKeys,
  octave,
  octaveUp,
  octaveDown,
  canOctaveUp,
  canOctaveDown,
  sustain,
  setSustain,
  volume,
  setVolume,
  activeNotes,
  playNote,
  releaseNote,
  className,
}: PianoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track each key's index among the white keys (needed to position black
  // keys relative to the white key immediately before them) and total width.
  const positionedKeys = fullKeys.map((k, i) => {
    const whiteBefore = fullKeys.slice(0, i).filter((kk) => !kk.isBlack).length;
    const whiteIndex = k.isBlack ? whiteBefore - 1 : whiteBefore;
    return { ...k, whiteIndex };
  });
  const whiteKeyCount = fullKeys.filter((k) => !k.isBlack).length;
  const trackWidth = whiteKeyCount * WHITE_KEY_WIDTH;

  // Keep whichever octave the computer keyboard currently controls in view,
  // and scrolled to roughly the center, when it changes.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const activeKeyIndex = positionedKeys.find(
      (k) => !k.isBlack && k.octave === octave && k.pitchClass === "C"
    )?.whiteIndex;
    if (activeKeyIndex == null) return;
    const targetLeft =
      activeKeyIndex * WHITE_KEY_WIDTH - scrollEl.clientWidth / 2 + WHITE_KEY_WIDTH * 3.5;
    scrollEl.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [octave]);

  // Fullscreen is mobile-only (see the button's `sm:hidden`), so lock
  // landscape orientation the moment fullscreen actually engages -- most
  // browsers only allow an orientation lock while the document is
  // fullscreen. Not supported on iOS Safari; failing silently there just
  // leaves the device in whatever orientation the user is already holding.
  // lock/unlock are omitted from TS's ScreenOrientation type despite being
  // implemented in every Chromium-based browser -- hence the cast.
  useEffect(() => {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
      unlock?: () => void;
    };
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      if (active) {
        orientation.lock?.("landscape").catch(() => {});
      } else {
        orientation.unlock?.();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${
        // The `left-1/2 -mx-[50vw]` full-bleed trick only works in normal
        // document flow. requestFullscreen() forces `position: fixed` (via
        // the browser's own :fullscreen UA styles), which breaks that trick
        // -- left:50% + the negative margin resolve against the viewport
        // instead of this element's static position, leaving the box
        // pinned to the left edge at its old capped width with blank space
        // filling the rest of the screen. Fullscreen doesn't need the
        // trick at all: the UA styles already size it to the viewport.
        isFullscreen
          ? "fixed inset-0 z-50 h-dvh w-dvw max-w-none"
          : "relative left-1/2 right-1/2 -mx-[50vw] w-screen max-w-[1400px]"
      } flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={octaveDown}
            disabled={!canOctaveDown}
            aria-label="Octave down"
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 font-medium hover:bg-neutral-100 disabled:opacity-40"
          >
            − Octave
          </button>
          <span className="w-10 text-center tabular-nums">{octave}</span>
          <button
            type="button"
            onClick={octaveUp}
            disabled={!canOctaveUp}
            aria-label="Octave up"
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 font-medium hover:bg-neutral-100 disabled:opacity-40"
          >
            + Octave
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSustain(!sustain)}
          aria-pressed={sustain}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            sustain
              ? "bg-neutral-900 text-white"
              : "border border-neutral-200 bg-white hover:bg-neutral-100"
          }`}
        >
          Sustain
        </button>

        <div className="flex items-center gap-2">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 accent-neutral-900"
            aria-label="Volume"
          />
        </div>

        <button
          type="button"
          onClick={handleFullscreen}
          className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 font-medium hover:bg-neutral-100 sm:hidden"
        >
          Fullscreen
        </button>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden pb-1">
        <div
          className={`relative h-40 select-none sm:h-48 ${isFullscreen ? "mx-auto" : ""}`}
          style={{ width: trackWidth, minWidth: isFullscreen ? undefined : "100%" }}
        >
          {positionedKeys
            .filter((k) => !k.isBlack)
            .map((k) => {
              const qwertyLabel = mapping.noteToKey[k.note];
              return (
                <PianoKey
                  key={k.note}
                  note={k.note}
                  label={qwertyLabel ?? ""}
                  isMapped={Boolean(qwertyLabel)}
                  isBlack={false}
                  isActive={activeNotes.has(k.note)}
                  style={{ left: k.whiteIndex * WHITE_KEY_WIDTH, width: WHITE_KEY_WIDTH }}
                  onPress={playNote}
                  onRelease={releaseNote}
                />
              );
            })}
          {positionedKeys
            .filter((k) => k.isBlack)
            .map((k) => {
              const qwertyLabel = mapping.noteToKey[k.note];
              const centerPx = (k.whiteIndex + 1) * WHITE_KEY_WIDTH;
              return (
                <PianoKey
                  key={k.note}
                  note={k.note}
                  label={qwertyLabel ?? ""}
                  isMapped={Boolean(qwertyLabel)}
                  isBlack
                  isActive={activeNotes.has(k.note)}
                  style={{ left: centerPx - BLACK_KEY_WIDTH / 2, width: BLACK_KEY_WIDTH }}
                  onPress={playNote}
                  onRelease={releaseNote}
                />
              );
            })}
        </div>
      </div>
      <p className="text-center text-xs text-neutral-500">
        Click or tap any key to play it. Your computer keyboard plays three octaves at once,
        split by hand like the piano itself: your left hand plays the lower octave (white Z X C
        V B R T, black 1 4 Q W E), your right hand plays the higher octave (white L ; &apos; N M
        , ., black 8 9 0 Y U), and the highlighted octave in the middle (white A–K, black
        2 3 5 6 7) spans both hands. In every octave, black-key letters/numbers come from the
        row above their white keys. ↑ / ↓ (or the Octave buttons) shift all three.
      </p>
    </div>
  );
}

interface PianoKeyProps {
  note: string;
  label: string;
  isBlack: boolean;
  isMapped: boolean;
  isActive: boolean;
  style: React.CSSProperties;
  onPress: (note: string) => void;
  onRelease: (note: string) => void;
}

function PianoKey({ note, label, isBlack, isMapped, isActive, style, onPress, onRelease }: PianoKeyProps) {
  // Only ever emit ONE background-color utility class at a time. Mixing a
  // base color with a conditional active color relies on Tailwind's
  // generated stylesheet order to break the tie, which isn't guaranteed --
  // keeping the classes mutually exclusive is what actually guarantees the
  // active highlight wins.
  const colorClasses = isActive
    ? isBlack
      ? "bg-sky-500 text-white border-sky-600"
      : "bg-sky-200 text-neutral-900 border-sky-400"
    : isBlack
      ? "bg-neutral-800 text-neutral-300 border-neutral-950 active:bg-sky-500 active:text-white"
      : "bg-white text-neutral-400 border-neutral-300 active:bg-sky-200 active:text-neutral-900";

  return (
    <button
      type="button"
      aria-label={`Key ${label || note} (${note})`}
      style={style}
      className={[
        "absolute top-0 flex flex-col items-center justify-end gap-1 rounded-b-lg border pb-2 text-xs font-semibold transition-colors duration-75",
        isBlack ? "z-10 h-24 sm:h-28" : "h-40 sm:h-48",
        colorClasses,
        !isMapped && !isActive && "opacity-50",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onPress(note);
      }}
      onPointerUp={() => onRelease(note)}
      onPointerLeave={(e) => {
        if (e.buttons > 0 || e.pointerType === "touch") onRelease(note);
      }}
      onPointerCancel={() => onRelease(note)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isMapped ? <span className="text-sm font-bold">{label}</span> : <span>{label}</span>}
    </button>
  );
}
