"use client";

import { useEffect, useRef, useState } from "react";
import type { FullKeyboardKey, OctaveMapping } from "@/lib/keyboard/mapping";

const WHITE_KEY_WIDTH = 32; // px
const BLACK_KEY_WIDTH = 21; // px

/** What text (if any) is printed on each key: nothing, the note name (e.g.
 * "C#4"), or the computer-keyboard letter that plays it. */
type LabelMode = "off" | "cde" | "keys";
const LABEL_MODES: { value: LabelMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "cde", label: "CDE" },
  { value: "keys", label: "Keys" },
];

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
  // Deliberately local (not threaded through usePianoEngine, unlike
  // sustain/volume/octave): it has no AudioEngine side effect and no other
  // consumer, so it doesn't belong in the shared engine state.
  const [labelMode, setLabelMode] = useState<LabelMode>("keys");

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

  // Lock landscape orientation once fullscreen (mobile-only) engages --
  // most browsers only allow the lock while fullscreen. Not supported on
  // iOS Safari (fails silently there). lock/unlock are missing from TS's
  // ScreenOrientation type despite being implemented everywhere else.
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
        // `left-1/2 -translate-x-1/2` centers regardless of rendered width,
        // unlike the old `-mx-[50vw]` trick which broke once `max-w-[1400px]`
        // capped the box below `w-screen`. Fullscreen needs none of this --
        // requestFullscreen() already sizes/positions it via `:fullscreen`.
        isFullscreen
          ? "fixed inset-0 z-50 h-dvh w-dvw max-w-none"
          : "relative left-1/2 w-screen max-w-[1400px] -translate-x-1/2"
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
          <span>Note labels</span>
          <div className="flex items-center gap-1">
            {LABEL_MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLabelMode(option.value)}
                aria-pressed={labelMode === option.value}
                className={`rounded-md px-2 py-1 font-medium ${
                  labelMode === option.value
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-200 bg-white hover:bg-neutral-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

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
                  label={labelForMode(labelMode, qwertyLabel, k.note)}
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
                  label={labelForMode(labelMode, qwertyLabel, k.note)}
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
    </div>
  );
}

/** What text a key shows for the current label mode. "keys" mode keeps the
 * key blank when nothing maps to it -- there's no letter to show. */
function labelForMode(mode: LabelMode, qwertyLabel: string | undefined, note: string): string {
  if (mode === "off") return "";
  if (mode === "cde") return note;
  return qwertyLabel ?? "";
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
  // Black keys are only 21px wide -- a 1-2 char QWERTY letter fits at
  // text-sm, but a CDE label with an accidental (e.g. "C#4") needs to drop
  // down further or it overflows the key.
  const labelSizeClass = isBlack ? (label.length > 2 ? "text-[9px] leading-none" : "text-xs") : "text-sm";

  // Mutually exclusive classes, never a base + conditional override --
  // Tailwind's stylesheet order isn't guaranteed to break the tie.
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
        "absolute top-0 flex flex-col items-center justify-end gap-1 overflow-hidden rounded-b-lg border pb-2 text-xs font-semibold transition-colors duration-75",
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
      {isMapped ? (
        <span className={`${labelSizeClass} font-bold`}>{label}</span>
      ) : (
        <span className={labelSizeClass}>{label}</span>
      )}
    </button>
  );
}
