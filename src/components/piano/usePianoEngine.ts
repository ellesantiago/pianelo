"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import {
  DEFAULT_BASE_OCTAVE,
  MAX_OCTAVE,
  MIN_OCTAVE,
  clampOctave,
  getFullKeyboardKeys,
  getOctaveMapping,
} from "@/lib/keyboard/mapping";

interface UsePianoEngineOptions {
  /** Called every time a note is actually triggered (key press, click, or tap). */
  onNotePlayed?: (note: string) => void;
  /** Called every time a note is released. Used by the recording feature. */
  onNoteReleased?: (note: string) => void;
  /**
   * When true, no sound is produced and no note is ever considered
   * "played" -- `onLockedAttempt` fires instead. This is the paywall gate:
   * a guest or unpaid user can see and press every key, but the very first
   * press opens the signup/payment modal rather than making a sound.
   */
  locked?: boolean;
  onLockedAttempt?: () => void;
}

/**
 * Owns the AudioEngine instance and all piano input handling (computer
 * keyboard, mouse, touch) for one <Piano /> instance. The piano UI
 * components only render state from this hook and call playNote/releaseNote
 * -- no audio logic lives in the components themselves.
 */
export function usePianoEngine({
  onNotePlayed,
  onNoteReleased,
  locked = false,
  onLockedAttempt,
}: UsePianoEngineOptions = {}) {
  const engineRef = useRef<AudioEngine | null>(null);
  const [octave, setOctaveState] = useState(DEFAULT_BASE_OCTAVE);
  const [sustain, setSustainState] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  // Physical keys currently held down, so we can ignore OS key-repeat and
  // correctly map key-up even if the octave changed mid-press.
  const heldKeys = useRef<Map<string, string>>(new Map());

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const mapping = useMemo(() => getOctaveMapping(octave), [octave]);
  // The full on-screen piano range never changes -- only the QWERTY overlay
  // (mapping, above) moves as the player shifts octaves.
  const fullKeys = useMemo(() => getFullKeyboardKeys(), []);

  const playNote = useCallback(
    (note: string) => {
      if (locked) {
        onLockedAttempt?.();
        return;
      }
      getEngine().playNote(note);
      setActiveNotes((prev) => new Set(prev).add(note));
      onNotePlayed?.(note);
    },
    [getEngine, onNotePlayed, locked, onLockedAttempt]
  );

  const releaseNote = useCallback(
    (note: string) => {
      if (locked) return;
      getEngine().releaseNote(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      onNoteReleased?.(note);
    },
    [getEngine, onNoteReleased, locked]
  );

  const setSustain = useCallback(
    (enabled: boolean) => {
      setSustainState(enabled);
      getEngine().setSustain(enabled);
    },
    [getEngine]
  );

  const setVolume = useCallback(
    (value: number) => {
      setVolumeState(value);
      getEngine().setVolume(value);
    },
    [getEngine]
  );

  const octaveUp = useCallback(() => setOctaveState((o) => clampOctave(o + 1)), []);
  const octaveDown = useCallback(() => setOctaveState((o) => clampOctave(o - 1)), []);
  const setOctave = useCallback((value: number) => setOctaveState(clampOctave(value)), []);

  // Computer keyboard input.
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTypingTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        octaveDown();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        octaveUp();
        return;
      }

      const key = event.key.toLowerCase();
      const note = mapping.keyToNote[key];
      if (!note || heldKeys.current.has(key)) return;
      heldKeys.current.set(key, note);
      playNote(note);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const note = heldKeys.current.get(key);
      if (!note) return;
      heldKeys.current.delete(key);
      releaseNote(note);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mapping, playNote, releaseNote, octaveDown, octaveUp]);

  // Stop everything on unmount (route change, etc.).
  useEffect(() => {
    return () => {
      engineRef.current?.stopAll();
    };
  }, []);

  return {
    mapping,
    fullKeys,
    octave,
    octaveUp,
    octaveDown,
    setOctave,
    canOctaveUp: octave < MAX_OCTAVE,
    canOctaveDown: octave > MIN_OCTAVE,
    sustain,
    setSustain,
    volume,
    setVolume,
    activeNotes,
    playNote,
    releaseNote,
  };
}
