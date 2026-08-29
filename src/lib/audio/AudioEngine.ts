// Dedicated Web Audio API abstraction -- piano UI components call these
// methods and never touch AudioContext/oscillators/gain nodes directly.
//
// Uses a synthesized placeholder tone, not a licensed piano sample; swap
// for a licensed sample set (AudioBufferSourceNode) before launch.

import { noteToFrequency } from "./noteFrequency";

interface Voice {
  oscillators: OscillatorNode[];
  gain: GainNode;
  /** true if the key was physically released but is being held by sustain */
  heldBySustain: boolean;
}

const ATTACK_SECONDS = 0.008;
// Exponential decay (loudness is roughly logarithmic) rather than a linear ramp.
const DECAY_TIME_CONSTANT = 0.12;
const SUSTAIN_LEVEL = 0.35;
// A held piano string keeps decaying slowly rather than holding flat.
const SUSTAIN_DECAY_START_SECONDS = 0.5;
const SUSTAIN_DECAY_TIME_CONSTANT = 4;
const RELEASE_TIME_CONSTANT = 0.12;
// Fast enough to not smear retriggered/trilled notes, smoother than a hard cutoff.
const RETRIGGER_RELEASE_TIME_CONSTANT = 0.02;
const RELEASE_STOP_TIME_CONSTANTS = 6;

// Stretches the upper partials slightly, like a real string's inharmonicity.
const INHARMONICITY = 0.0004;
// Subtle unison detune, like a piano's multiple strings per note beating together.
const DETUNE_CENTS = 4;

const PARTIALS: { harmonic: number; gain: number }[] = [
  { harmonic: 1, gain: 0.5 },
  { harmonic: 2, gain: 0.22 },
  { harmonic: 3, gain: 0.12 },
  { harmonic: 4, gain: 0.08 },
  { harmonic: 5, gain: 0.05 },
  { harmonic: 6, gain: 0.03 },
];

function partialFrequency(fundamental: number, harmonic: number): number {
  return fundamental * harmonic * Math.sqrt(1 + INHARMONICITY * harmonic * harmonic);
}

export class AudioEngine {
  private ctx: BaseAudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private volume = 0.8;
  private sustainOn = false;

  /** Optionally inject a pre-built context (e.g. OfflineAudioContext for
   * export) instead of lazily creating a live AudioContext. */
  constructor(options?: { context?: BaseAudioContext }) {
    if (options?.context) {
      this.ctx = options.context;
      this.masterGain = this.buildMasterChain(options.context);
    }
  }

  /**
   * Master gain feeding a gentle limiter, so stacked notes/chords compress
   * instead of clipping at the destination.
   */
  private buildMasterChain(ctx: BaseAudioContext): GainNode {
    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);
    return masterGain;
  }

  /** Lazily creates the AudioContext on first use (required by browser autoplay policy). */
  private ensureContext(): { ctx: BaseAudioContext; masterGain: GainNode } {
    if (!this.ctx || !this.masterGain) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.buildMasterChain(this.ctx);
    }
    if (this.ctx instanceof AudioContext && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return { ctx: this.ctx, masterGain: this.masterGain };
  }

  playNote(note: string, atTime?: number): void {
    const { ctx, masterGain } = this.ensureContext();

    if (this.voices.has(note)) {
      this.stopVoice(note, true, atTime);
    }

    const freq = noteToFrequency(note);
    const now = atTime ?? ctx.currentTime;

    // Starts bright (hammer strike) and settles into a warmer tone.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(Math.min(freq * 10, 12000), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 3, 1200), now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + ATTACK_SECONDS);
    gain.gain.setTargetAtTime(SUSTAIN_LEVEL, now + ATTACK_SECONDS, DECAY_TIME_CONSTANT);
    gain.gain.setTargetAtTime(
      0,
      now + ATTACK_SECONDS + SUSTAIN_DECAY_START_SECONDS,
      SUSTAIN_DECAY_TIME_CONSTANT
    );

    filter.connect(gain);
    gain.connect(masterGain);

    // A small harmonic series with slight inharmonicity, not a bare tone.
    const oscillators: OscillatorNode[] = [];
    for (const partial of PARTIALS) {
      const centerFreq = partialFrequency(freq, partial.harmonic);
      const detunes = partial.harmonic === 1 ? [-DETUNE_CENTS, DETUNE_CENTS] : [0];
      const gainPerOscillator = partial.gain / detunes.length;

      for (const cents of detunes) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = centerFreq * Math.pow(2, cents / 1200);

        const partialGain = ctx.createGain();
        partialGain.gain.value = gainPerOscillator;

        osc.connect(partialGain);
        partialGain.connect(filter);
        osc.start(now);
        oscillators.push(osc);
      }
    }

    this.voices.set(note, { oscillators, gain, heldBySustain: false });
  }

  releaseNote(note: string, atTime?: number): void {
    const voice = this.voices.get(note);
    if (!voice) return;

    if (this.sustainOn) {
      voice.heldBySustain = true;
      return;
    }
    this.stopVoice(note, false, atTime);
  }

  private stopVoice(note: string, immediate: boolean, atTime?: number): void {
    const voice = this.voices.get(note);
    if (!voice || !this.ctx) return;

    const now = atTime ?? this.ctx.currentTime;
    const timeConstant = immediate
      ? RETRIGGER_RELEASE_TIME_CONSTANT
      : RELEASE_TIME_CONSTANT;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.setTargetAtTime(0, now, timeConstant);

    const stopAt = now + timeConstant * RELEASE_STOP_TIME_CONSTANTS;
    for (const osc of voice.oscillators) {
      osc.stop(stopAt);
    }
    this.voices.delete(note);
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    }
  }

  /** Releasing a key while sustain is on keeps it sounding until sustain turns off. */
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
