import type { SfxId } from './sfx';

/**
 * Every sound effect, synthesized with the Web Audio API: tones with pitch
 * slides and bursts of filtered noise (the same voice as the other 16bit.ink
 * games), tuned heavier here: low thumps under the guns and explosions.
 */
export interface Voice {
  readonly ctx: AudioContext;
  /** Where this sound plays into (its own pan and level). */
  readonly out: AudioNode;
  /** Start time, seconds on the context clock. */
  readonly t: number;
  /** Pitch multiplier. */
  readonly pitch: number;
}

interface ToneOpts {
  readonly type?: OscillatorType;
  readonly from: number;
  readonly to?: number;
  readonly dur: number;
  readonly gain: number;
  readonly delay?: number;
  readonly attack?: number;
  /** Wobble depth in Hz and rate. */
  readonly vibrato?: { readonly depth: number; readonly rate: number };
}

function envelope(v: Voice, start: number, dur: number, peak: number, attack: number): GainNode {
  const g = v.ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(v.out);
  return g;
}

export function tone(v: Voice, o: ToneOpts): void {
  const start = v.t + (o.delay ?? 0);
  const osc = v.ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * v.pitch), start + o.dur);
  if (o.vibrato) {
    const lfo = v.ctx.createOscillator();
    const depth = v.ctx.createGain();
    lfo.frequency.value = o.vibrato.rate;
    depth.gain.value = o.vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + o.dur + 0.05);
  }
  osc.connect(envelope(v, start, o.dur, o.gain, o.attack ?? 0.006));
  osc.start(start);
  osc.stop(start + o.dur + 0.05);
}

interface NoiseOpts {
  readonly dur: number;
  readonly gain: number;
  readonly filter: BiquadFilterType;
  readonly from: number;
  readonly to?: number;
  readonly q?: number;
  readonly delay?: number;
  readonly attack?: number;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, made once per context. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buf);
  return buf;
}

export function noise(v: Voice, o: NoiseOpts): void {
  const start = v.t + (o.delay ?? 0);
  const src = v.ctx.createBufferSource();
  src.buffer = noiseBuffer(v.ctx);
  const filter = v.ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.from * v.pitch, start);
  if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * v.pitch), start + o.dur);
  src.connect(filter).connect(envelope(v, start, o.dur, o.gain, o.attack ?? 0.004));
  src.start(start, Math.random() * 1.2);
  src.stop(start + o.dur + 0.05);
}

/** A run of notes (Hz), one after another. */
function notes(v: Voice, freqs: readonly number[], step: number, o: Omit<ToneOpts, 'from' | 'delay'>): void {
  freqs.forEach((f, i) => tone(v, { ...o, from: f, delay: i * step }));
}

/** The low punch under every gun and blast. */
function thump(v: Voice, from: number, dur: number, gain: number, delay = 0): void {
  tone(v, { from, to: from * 0.35, dur, gain, delay, attack: 0.003 });
}

function explosion(v: Voice, size: number): void {
  noise(v, { dur: 0.9 * size, gain: 0.55, filter: 'lowpass', from: 2200, to: 70, attack: 0.004 });
  thump(v, 95, 0.75 * size, 0.6);
  // Debris settling after the blast.
  noise(v, { dur: 0.6 * size, gain: 0.16, filter: 'bandpass', from: 500, to: 220, q: 0.8, delay: 0.08 });
}

function metal(v: Voice, gain: number, delay = 0): void {
  tone(v, { type: 'square', from: 920, to: 700, dur: 0.05, gain: gain * 0.4, delay });
  tone(v, { type: 'triangle', from: 1480, to: 1350, dur: 0.16, gain: gain * 0.5, delay });
  noise(v, { dur: 0.05, gain: gain * 1.2, filter: 'bandpass', from: 3200, q: 3, delay });
}

const RECIPES: Readonly<Record<SfxId, (v: Voice) => void>> = {
  // A machine gun round: a short crack.
  mg: (v) => {
    noise(v, { dur: 0.06, gain: 0.3, filter: 'bandpass', from: 1700, to: 900, q: 1.6 });
    thump(v, 160, 0.06, 0.18);
  },
  // The cannon: a crack, a deep boom, and the blast rolling off.
  cannon: (v) => {
    noise(v, { dur: 0.05, gain: 0.25, filter: 'highpass', from: 2600 });
    noise(v, { dur: 0.42, gain: 0.5, filter: 'lowpass', from: 2400, to: 160 });
    thump(v, 120, 0.32, 0.55);
  },
  // A rocket leaving its tube: a pop and a rising whoosh.
  rocket: (v) => {
    thump(v, 180, 0.08, 0.25);
    noise(v, { dur: 0.5, gain: 0.24, filter: 'bandpass', from: 900, to: 2800, q: 1.2, attack: 0.04 });
  },
  // A mortar: a hollow thoomp up the tube.
  mortar: (v) => {
    thump(v, 85, 0.28, 0.55);
    noise(v, { dur: 0.22, gain: 0.22, filter: 'lowpass', from: 700, to: 200 });
    tone(v, { type: 'triangle', from: 260, to: 210, dur: 0.12, gain: 0.05 });
  },
  // A flamer's burst: a soft roar.
  flame: (v) => {
    noise(v, { dur: 0.22, gain: 0.2, filter: 'bandpass', from: 520, to: 380, q: 0.7, attack: 0.03 });
    noise(v, { dur: 0.2, gain: 0.14, filter: 'lowpass', from: 260, attack: 0.03 });
  },
  // A laser's zap.
  laser: (v) => {
    tone(v, { type: 'sawtooth', from: 1900, to: 380, dur: 0.24, gain: 0.06 });
    tone(v, { from: 2600, to: 900, dur: 0.22, gain: 0.07 });
    noise(v, { dur: 0.08, gain: 0.08, filter: 'highpass', from: 5000 });
  },
  // A rail slug: a sharp electric crack and a falling whistle.
  rail: (v) => {
    noise(v, { dur: 0.32, gain: 0.3, filter: 'highpass', from: 4200, to: 1400 });
    tone(v, { from: 3200, to: 220, dur: 0.38, gain: 0.08 });
    thump(v, 140, 0.25, 0.45);
  },
  // A big gun charging: a rising whine.
  charge: (v) => tone(v, { from: 280, to: 1300, dur: 0.85, gain: 0.05, attack: 0.3, vibrato: { depth: 14, rate: 22 } }),
  // A shell off armour.
  clang: (v) => {
    metal(v, 0.14);
    noise(v, { dur: 0.12, gain: 0.25, filter: 'lowpass', from: 900, to: 220 });
  },
  // A shell into ground, sand or a wall.
  thud: (v) => noise(v, { dur: 0.16, gain: 0.32, filter: 'lowpass', from: 900, to: 140 }),
  // The player's own tank hit: a heavy clank close up.
  hurt: (v) => {
    metal(v, 0.2);
    noise(v, { dur: 0.22, gain: 0.42, filter: 'lowpass', from: 1100, to: 160 });
    thump(v, 150, 0.2, 0.4);
  },
  boom: (v) => explosion(v, 1),
  // A tank wrecked: the blast, then pieces of it falling.
  wreck: (v) => {
    explosion(v, 1.3);
    metal(v, 0.1, 0.18);
    metal(v, 0.07, 0.34);
    noise(v, { dur: 1.2, gain: 0.1, filter: 'bandpass', from: 700, to: 300, q: 0.6, delay: 0.25, attack: 0.2 });
  },
  // A wall cracking.
  crack: (v) => {
    noise(v, { dur: 0.07, gain: 0.3, filter: 'bandpass', from: 1600, q: 2 });
    noise(v, { dur: 0.2, gain: 0.25, filter: 'lowpass', from: 800, to: 200, delay: 0.03 });
  },
  // A wall coming down: a crash and rubble.
  crumble: (v) => {
    noise(v, { dur: 1.1, gain: 0.45, filter: 'lowpass', from: 1400, to: 90 });
    thump(v, 90, 0.5, 0.4);
    for (let i = 0; i < 4; i++) noise(v, { dur: 0.08, gain: 0.18, filter: 'bandpass', from: 700 + i * 180, q: 2, delay: 0.15 + i * 0.13 });
  },
  // A crate splintering.
  crate: (v) => {
    for (let i = 0; i < 3; i++) noise(v, { dur: 0.06, gain: 0.3, filter: 'bandpass', from: 1100 - i * 150, q: 2.5, delay: i * 0.04 });
    thump(v, 200, 0.1, 0.15);
  },
  // Fire catching: a soft whoomp.
  whoomp: (v) => {
    noise(v, { dur: 0.6, gain: 0.35, filter: 'lowpass', from: 200, to: 1300, attack: 0.08 });
    tone(v, { from: 60, to: 95, dur: 0.4, gain: 0.25, attack: 0.05 });
  },
  // Water rushing through a broken dam.
  rush: (v) => {
    noise(v, { dur: 2.2, gain: 0.3, filter: 'bandpass', from: 700, to: 500, q: 0.6, attack: 0.25 });
    noise(v, { dur: 2.0, gain: 0.22, filter: 'lowpass', from: 350, attack: 0.3 });
  },
  // An avalanche: a long low roar.
  rumble: (v) => {
    noise(v, { dur: 2.6, gain: 0.5, filter: 'lowpass', from: 320, to: 120, attack: 0.4 });
    thump(v, 55, 1.6, 0.35, 0.2);
  },
  // Ice cracking.
  ice: (v) => {
    noise(v, { dur: 0.05, gain: 0.25, filter: 'highpass', from: 3600 });
    noise(v, { dur: 0.05, gain: 0.2, filter: 'highpass', from: 3000, delay: 0.09 });
    tone(v, { type: 'triangle', from: 2100, to: 1100, dur: 0.08, gain: 0.05 });
  },
  // Something into water, or oil poured out.
  splash: (v) => {
    noise(v, { dur: 0.45, gain: 0.3, filter: 'lowpass', from: 1700, to: 300, attack: 0.01 });
    noise(v, { dur: 0.3, gain: 0.14, filter: 'bandpass', from: 650, q: 1.5, delay: 0.05 });
  },
  // Timber snapping: a log bridge or a tree.
  snap: (v) => {
    noise(v, { dur: 0.05, gain: 0.4, filter: 'bandpass', from: 1300, q: 3 });
    noise(v, { dur: 0.35, gain: 0.25, filter: 'lowpass', from: 700, to: 150, delay: 0.04 });
    thump(v, 140, 0.25, 0.3, 0.05);
  },
  // A pickup into the hatch.
  pickup: (v) => notes(v, [880, 1175, 1568], 0.05, { type: 'triangle', dur: 0.16, gain: 0.07 }),
  // A blueprint: a brighter chime.
  intel: (v) => notes(v, [1047, 1319, 1568, 2093], 0.06, { type: 'sine', dur: 0.22, gain: 0.07 }),
  // A repair kit: a ratchet and a rising hum.
  repair: (v) => {
    for (let i = 0; i < 5; i++) noise(v, { dur: 0.025, gain: 0.2, filter: 'bandpass', from: 2600, q: 5, delay: i * 0.07 });
    tone(v, { type: 'triangle', from: 380, to: 820, dur: 0.45, gain: 0.05, attack: 0.05 });
  },
  // A part swapped: clunk, clunk.
  swap: (v) => {
    noise(v, { dur: 0.07, gain: 0.3, filter: 'bandpass', from: 700, q: 2 });
    noise(v, { dur: 0.07, gain: 0.3, filter: 'bandpass', from: 520, q: 2, delay: 0.14 });
    tone(v, { type: 'square', from: 220, to: 180, dur: 0.05, gain: 0.03, delay: 0.14 });
  },
  // A mine set down.
  drop: (v) => {
    tone(v, { from: 300, to: 170, dur: 0.07, gain: 0.12 });
    noise(v, { dur: 0.09, gain: 0.2, filter: 'lowpass', from: 600 });
    tone(v, { type: 'square', from: 1800, dur: 0.03, gain: 0.02, delay: 0.18 });
  },
  // Smoke popping out of its canister.
  hiss: (v) => {
    thump(v, 220, 0.06, 0.2);
    noise(v, { dur: 1.0, gain: 0.16, filter: 'highpass', from: 2400, to: 1600, attack: 0.08 });
  },
  // The radio: two beeps over static.
  radio: (v) => {
    noise(v, { dur: 0.16, gain: 0.05, filter: 'bandpass', from: 2200, q: 0.8 });
    tone(v, { type: 'square', from: 1250, dur: 0.05, gain: 0.025, delay: 0.02 });
    tone(v, { type: 'square', from: 1250, dur: 0.05, gain: 0.025, delay: 0.1 });
  },
  // A camp's alarm siren.
  siren: (v) => {
    tone(v, { type: 'sawtooth', from: 560, to: 880, dur: 0.4, gain: 0.04, attack: 0.04 });
    tone(v, { type: 'sawtooth', from: 880, to: 560, dur: 0.4, gain: 0.04, delay: 0.4 });
  },
  // A boss's horn: low and wobbling.
  horn: (v) => {
    tone(v, { type: 'sawtooth', from: 98, dur: 0.8, gain: 0.07, attack: 0.06, vibrato: { depth: 3, rate: 6 } });
    tone(v, { type: 'sawtooth', from: 147, dur: 0.8, gain: 0.045, attack: 0.06 });
  },
  // Our flag up: a bugle.
  flagUp: (v) => notes(v, [523, 659, 784, 1047], 0.1, { type: 'square', dur: 0.18, gain: 0.04 }),
  // Our flag lost.
  flagLost: (v) => notes(v, [494, 392], 0.16, { type: 'triangle', dur: 0.26, gain: 0.08 }),
  // A camp photographed.
  shutter: (v) => {
    noise(v, { dur: 0.025, gain: 0.3, filter: 'bandpass', from: 3200, q: 4 });
    noise(v, { dur: 0.03, gain: 0.25, filter: 'bandpass', from: 2400, q: 4, delay: 0.08 });
  },
  // A base gate rolling open.
  gate: (v) => {
    tone(v, { type: 'sawtooth', from: 110, to: 150, dur: 0.7, gain: 0.025, attack: 0.05 });
    noise(v, { dur: 0.7, gain: 0.08, filter: 'bandpass', from: 900, q: 1.5 });
    metal(v, 0.12, 0.7);
  },
  // Mission passed: a bugle call.
  win: (v) => {
    notes(v, [392, 523, 659], 0.13, { type: 'square', dur: 0.2, gain: 0.045 });
    tone(v, { type: 'square', from: 784, dur: 0.6, gain: 0.045, delay: 0.42 });
  },
  // Mission failed: falling notes.
  lose: (v) => notes(v, [392, 349, 311, 262], 0.16, { type: 'triangle', dur: 0.3, gain: 0.09 }),
  // A button: a switch's click.
  click: (v) => noise(v, { dur: 0.03, gain: 0.22, filter: 'bandpass', from: 2200, q: 4 }),
};

/**
 * Level trims, measured against the cannon (each recipe rendered offline,
 * peak and RMS): tunes and voices carry over a battle only a few times
 * louder than they were written.
 */
const TRIM: Partial<Readonly<Record<SfxId, number>>> = {
  radio: 3.5, siren: 3, flagUp: 2.5, flagLost: 1.6, win: 2.5, lose: 1.5, horn: 2.2,
  pickup: 1.7, intel: 1.7, repair: 2.2, swap: 2.2, drop: 1.6, shutter: 1.5, gate: 2.2,
  flame: 2.4, charge: 2.2, rocket: 1.6, laser: 1.5, clang: 1.6, thud: 1.8, crack: 2, crate: 1.4, splash: 1.6, rush: 2,
};

export function synthesize(id: SfxId, v: Voice): void {
  const trim = TRIM[id];
  if (trim === undefined) return RECIPES[id](v);
  const g = v.ctx.createGain();
  g.gain.value = trim;
  g.connect(v.out);
  RECIPES[id]({ ...v, out: g });
}
