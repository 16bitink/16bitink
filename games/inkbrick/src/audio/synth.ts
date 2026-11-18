/**
 * Every InkBrick sound, synthesized with Web Audio: tones with pitch slides
 * and bursts of filtered noise, the same voice as the other 16bit.ink games.
 * No audio files.
 */
export const SFX_IDS = ['bounce', 'paddle', 'stone', 'hit', 'break', 'blast', 'split', 'pickup', 'breakIn', 'lifeLost', 'launch', 'crumble', 'win', 'lose', 'click'] as const;
export type SfxId = (typeof SFX_IDS)[number];

/** Shortest gap between two plays of one sound, ms (hundreds of stones hit at once). */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  bounce: 45, paddle: 40, stone: 45, hit: 35, break: 30, blast: 80, split: 120, pickup: 100,
  breakIn: 1000, lifeLost: 500, launch: 100, crumble: 500, win: 1000, lose: 1000, click: 40,
};

interface Voice {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
  readonly t: number;
  readonly pitch: number;
}

interface ToneOpts { readonly type?: OscillatorType; readonly from: number; readonly to?: number; readonly dur: number; readonly gain: number; readonly delay?: number }
interface NoiseOpts { readonly dur: number; readonly gain: number; readonly filter: BiquadFilterType; readonly from: number; readonly to?: number; readonly q?: number; readonly delay?: number }

function envelope(v: Voice, start: number, dur: number, peak: number): GainNode {
  const g = v.ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(v.out);
  return g;
}

function tone(v: Voice, o: ToneOpts): void {
  const start = v.t + (o.delay ?? 0);
  const osc = v.ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * v.pitch), start + o.dur);
  osc.connect(envelope(v, start, o.dur, o.gain));
  osc.start(start);
  osc.stop(start + o.dur + 0.05);
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buf);
  return buf;
}

function noise(v: Voice, o: NoiseOpts): void {
  const start = v.t + (o.delay ?? 0);
  const src = v.ctx.createBufferSource();
  src.buffer = noiseBuffer(v.ctx);
  const f = v.ctx.createBiquadFilter();
  f.type = o.filter;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * v.pitch), start + o.dur);
  src.connect(f).connect(envelope(v, start, o.dur, o.gain));
  src.start(start);
  src.stop(start + o.dur + 0.05);
}

const notes = (v: Voice, freqs: readonly number[], step: number, dur: number, gain: number, type: OscillatorType = 'triangle'): void =>
  freqs.forEach((f, i) => tone(v, { type, from: f, dur, gain, delay: i * step }));

export const VOICES: Readonly<Record<SfxId, (v: Voice) => void>> = {
  bounce: (v) => tone(v, { type: 'sine', from: 520, to: 380, dur: 0.06, gain: 0.12 }),
  paddle: (v) => {
    tone(v, { type: 'triangle', from: 300, to: 420, dur: 0.08, gain: 0.2 });
    noise(v, { dur: 0.05, gain: 0.06, filter: 'lowpass', from: 900 });
  },
  stone: (v) => tone(v, { type: 'square', from: 260, to: 200, dur: 0.05, gain: 0.06 }),
  hit: (v) => noise(v, { dur: 0.07, gain: 0.14, filter: 'bandpass', from: 1400, q: 3 }),
  break: (v) => {
    noise(v, { dur: 0.12, gain: 0.16, filter: 'bandpass', from: 2200, to: 700, q: 2 });
    tone(v, { type: 'triangle', from: 660, to: 990, dur: 0.07, gain: 0.08 });
  },
  blast: (v) => {
    noise(v, { dur: 0.45, gain: 0.4, filter: 'lowpass', from: 1600, to: 120 });
    tone(v, { type: 'sine', from: 120, to: 40, dur: 0.35, gain: 0.35 });
  },
  split: (v) => notes(v, [880, 1175, 1568], 0.04, 0.1, 0.1, 'sine'),
  pickup: (v) => notes(v, [660, 880, 1320], 0.05, 0.12, 0.14),
  breakIn: (v) => {
    notes(v, [523, 659, 784, 1047], 0.09, 0.35, 0.18, 'square');
    noise(v, { dur: 0.6, gain: 0.12, filter: 'highpass', from: 3000, delay: 0.3 });
  },
  lifeLost: (v) => tone(v, { type: 'triangle', from: 440, to: 140, dur: 0.5, gain: 0.22 }),
  launch: (v) => noise(v, { dur: 0.12, gain: 0.1, filter: 'bandpass', from: 600, to: 2400, q: 2 }),
  crumble: (v) => noise(v, { dur: 0.9, gain: 0.22, filter: 'lowpass', from: 900, to: 200 }),
  win: (v) => notes(v, [523, 659, 784, 1047, 1319], 0.11, 0.4, 0.16),
  lose: (v) => notes(v, [392, 330, 262], 0.16, 0.4, 0.16),
  click: (v) => tone(v, { type: 'sine', from: 900, to: 700, dur: 0.04, gain: 0.08 }),
};

export type { Voice };
