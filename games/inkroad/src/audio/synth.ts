/**
 * Every InkRoad sound, synthesized with Web Audio: tones with pitch slides and
 * bursts of filtered noise, the same voice as the other 16bit.ink games. These are the
 * fallback: where a recorded take exists (src/audio/sfx, see samples.ts) that plays instead.
 */
export const SFX_IDS = ['click', 'honk', 'stamp', 'cash', 'build', 'chime', 'cleared', 'letter', 'error', 'remove', 'jam', 'toots', 'thump', 'night', 'truck', 'till', 'digger', 'tram', 'ship', 'page', 'plate'] as const;
export type SfxId = (typeof SFX_IDS)[number];

/** Shortest gap between two plays of one sound, ms (a jam honks a lot). */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  click: 40, honk: 700, stamp: 200, cash: 120, build: 150, chime: 1000, cleared: 800, letter: 800, error: 200, remove: 150, jam: 3000, toots: 800, thump: 250, night: 2000,
  truck: 1500, till: 300, digger: 600, tram: 4000, ship: 20000, page: 200, plate: 250,
};

export interface Voice { readonly ctx: AudioContext; readonly out: AudioNode; readonly t: number; readonly pitch: number }
interface ToneOpts { readonly type?: OscillatorType; readonly from: number; readonly to?: number; readonly dur: number; readonly gain: number; readonly delay?: number }
interface NoiseOpts { readonly dur: number; readonly gain: number; readonly filter: BiquadFilterType; readonly from: number; readonly to?: number; readonly q?: number; readonly delay?: number }

function envelope(v: Voice, start: number, dur: number, peak: number): GainNode {
  const g = v.ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.006);
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

const buffers = new WeakMap<BaseAudioContext, AudioBuffer>();
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = buffers.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  buffers.set(ctx, buf);
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
  click: (v) => tone(v, { from: 900, to: 700, dur: 0.04, gain: 0.1 }),
  // A small car horn: two close square tones, a beep and a half.
  honk: (v) => {
    tone(v, { type: 'square', from: 420, dur: 0.16, gain: 0.07 });
    tone(v, { type: 'square', from: 520, dur: 0.16, gain: 0.055 });
    tone(v, { type: 'square', from: 420, dur: 0.1, gain: 0.055, delay: 0.2 });
  },
  // A rubber stamp hitting paper: a dull thud and a pat of noise.
  stamp: (v) => {
    tone(v, { from: 150, to: 55, dur: 0.18, gain: 0.38 });
    noise(v, { dur: 0.08, gain: 0.22, filter: 'lowpass', from: 1400, to: 300 });
  },
  cash: (v) => notes(v, [1319, 1760], 0.07, 0.18, 0.09, 'sine'),
  build: (v) => {
    noise(v, { dur: 0.1, gain: 0.14, filter: 'bandpass', from: 800, q: 3 });
    tone(v, { type: 'triangle', from: 330, to: 440, dur: 0.12, gain: 0.12, delay: 0.06 });
  },
  chime: (v) => notes(v, [523, 659, 784, 1047], 0.12, 0.6, 0.12, 'sine'),
  cleared: (v) => {
    notes(v, [784, 988, 1319, 1760], 0.06, 0.3, 0.07, 'sine');
    noise(v, { dur: 0.35, gain: 0.04, filter: 'highpass', from: 4000, delay: 0.1 });
  },
  letter: (v) => {
    noise(v, { dur: 0.25, gain: 0.1, filter: 'bandpass', from: 2200, to: 900, q: 2 });
    notes(v, [330, 262], 0.16, 0.3, 0.1);
  },
  error: (v) => tone(v, { type: 'triangle', from: 220, to: 160, dur: 0.18, gain: 0.12 }),
  remove: (v) => noise(v, { dur: 0.18, gain: 0.24, filter: 'lowpass', from: 1200, to: 200 }),
  // Happy horns: three little two-note toots, each higher.
  toots: (v) => [0, 0.3, 0.52].forEach((delay, i) => {
    for (const f of [466, 587]) tone(v, { type: 'square', from: f * (1 + i * 0.12), dur: 0.09, gain: 0.05, delay: 0.25 + delay });
    for (const f of [587, 740]) tone(v, { type: 'square', from: f * (1 + i * 0.12), dur: 0.12, gain: 0.05, delay: 0.36 + delay });
  }),
  // A stamp on the plan and the ground tamped down under it.
  thump: (v) => {
    tone(v, { from: 170, to: 48, dur: 0.24, gain: 0.4 });
    noise(v, { dur: 0.12, gain: 0.26, filter: 'lowpass', from: 1500, to: 260 });
    noise(v, { dur: 0.5, gain: 0.05, filter: 'bandpass', from: 900, to: 400, delay: 0.08 });
    notes(v, [523, 784], 0.09, 0.22, 0.08);
  },
  // Dusk: three soft falling notes and a few crickets.
  night: (v) => {
    notes(v, [659, 523, 392], 0.28, 0.9, 0.07, 'sine');
    for (let i = 0; i < 6; i++) tone(v, { from: 4300, dur: 0.05, gain: 0.012, delay: 0.7 + i * 0.16 });
  },
  jam: (v) => notes(v, [330, 311], 0.18, 0.35, 0.09, 'sawtooth'),
  truck: (v) => {
    tone(v, { type: 'sawtooth', from: 150, dur: 0.7, gain: 0.07 });
    tone(v, { type: 'sawtooth', from: 190, dur: 0.7, gain: 0.05 });
  },
  till: (v) => notes(v, [1568, 2093], 0.08, 0.35, 0.08, 'sine'),
  digger: (v) => noise(v, { dur: 0.9, gain: 0.12, filter: 'lowpass', from: 220, to: 120, q: 2 }),
  tram: (v) => notes(v, [1760, 1760], 0.22, 0.4, 0.06, 'sine'),
  ship: (v) => tone(v, { type: 'sawtooth', from: 98, dur: 1.6, gain: 0.03 }),
  page: (v) => noise(v, { dur: 0.2, gain: 0.08, filter: 'bandpass', from: 3000, to: 1500, q: 1.5 }),
  plate: (v) => {
    tone(v, { from: 120, to: 50, dur: 0.2, gain: 0.36 });
    noise(v, { dur: 0.06, gain: 0.2, filter: 'bandpass', from: 1800, q: 4 });
  },
};
