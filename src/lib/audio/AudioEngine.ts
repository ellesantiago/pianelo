// Dedicated Web Audio API abstraction. All audio behavior lives here --
// piano UI components call these methods and never touch
// AudioContext/oscillators/gain nodes directly.
//
// NOTE: this uses a synthesized placeholder tone, not a licensed piano
// sample. It exists so the instrument is fully playable end-to-end during
// development. Before launch this should be swapped for a properly licensed
// piano sample set (e.g. sample playback via AudioBufferSourceNode instead
// of the oscillators below).

import { noteToFrequency } from "./noteFrequency";

interface Voice {
  oscillators: OscillatorNode[];
  gain: GainNode;
  /** true if the key was physically released but is being held by sustain */
  heldBySustain: boolean;
}

const ATTACK_SECONDS = 0.008;
const DECAY_SECONDS = 0.25;
const SUSTAIN_LEVEL = 0.35;
const RELEASE_SECONDS = 0.35;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private volume = 0.8;
  private sustainOn = false;

  /** Lazily creates the AudioContext on first use (required by browser autoplay policy). */
  private ensureContext(): { ctx: AudioContext; masterGain: GainNode } {
    if (!this.ctx || !this.masterGain) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return { ctx: this.ctx, masterGain: this.masterGain };
  }

  playNote(note: string): void {
    const { ctx, masterGain } = this.ensureContext();

    // Re-triggering an already-sounding note: stop the old voice first.
    if (this.voices.has(note)) {
      this.stopVoice(note, true);
    }

    const freq = noteToFrequency(note);
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + ATTACK_SECONDS);
    gain.gain.linearRampToValueAtTime(
      SUSTAIN_LEVEL,
      now + ATTACK_SECONDS + DECAY_SECONDS
    );
    gain.connect(masterGain);

    // Two detuned oscillators layered for a slightly richer tone than a bare sine.
    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2; // octave harmonic
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.15;
    osc2.connect(harmonicGain);
    harmonicGain.connect(gain);

    osc1.connect(gain);

    osc1.start(now);
    osc2.start(now);

    this.voices.set(note, { oscillators: [osc1, osc2], gain, heldBySustain: false });
  }

  releaseNote(note: string): void {
    const voice = this.voices.get(note);
    if (!voice) return;

    if (this.sustainOn) {
      voice.heldBySustain = true;
      return;
    }
    this.stopVoice(note, false);
  }

  private stopVoice(note: string, immediate: boolean): void {
    const voice = this.voices.get(note);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    const releaseTime = immediate ? 0.02 : RELEASE_SECONDS;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + releaseTime);

    for (const osc of voice.oscillators) {
      osc.stop(now + releaseTime + 0.02);
    }
    this.voices.delete(note);
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    }
  }

  /**
   * Sustain affects real audio behavior, independent of the piano UI's
   * visual key state: releasing a key while sustain is on keeps the note
   * sounding until sustain itself is turned off.
   */
  setSustain(enabled: boolean): void {
    this.sustainOn = enabled;
    if (!enabled) {
      for (const note of Array.from(this.voices.keys())) {
        const voice = this.voices.get(note);
        if (voice?.heldBySustain) {
          this.stopVoice(note, false);
        }
      }
    }
  }

  stopAll(): void {
    for (const note of Array.from(this.voices.keys())) {
      this.stopVoice(note, true);
    }
  }
}
