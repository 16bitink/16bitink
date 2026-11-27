import { foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { OPEN_AT, STEP_AT } from './game';
import { AT, LOOP_S, RINGS, said } from './story';

/**
 * The soundtrack: Dewy (voice.mp3, from the loop's start) straight to the
 * output, the beach quiet under him: surf the whole way round; a seaplane's
 * drone passing over "The Maldives!"; a hush on the still shell, a tiny
 * knock inside it, the boing as its legs pop out and its little steps; a
 * twinkle on "hooked"; a soft whoosh as Dewy rises; the game's own digs and
 * the shell's clink in the level; a pen's scratch for each ring; a warm swell
 * for the golden ending. No music. The mix is normalised to peak at -4 dB.
 */
const TAIL_S = 2;
const PEAK = 10 ** (-4 / 20);
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const UNDER_VOICE = 0.42;

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE * 2, RATE);
  const data = buffer.getChannelData(0);
  let seed = 150;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  return buffer;
}

interface Burst {
  readonly t: number;
  readonly dur: number;
  readonly freq: number;
  readonly gain: number;
  readonly q?: number;
  readonly attack?: number;
  readonly pan?: number;
  readonly to?: number;
}

function burst(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, b: Burst): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(b.freq, b.t);
  if (b.to) f.frequency.exponentialRampToValueAtTime(b.to, b.t + b.dur);
  f.Q.value = b.q ?? 1.2;
  const env = ctx.createGain();
  const attack = b.attack ?? 0.004;
  env.gain.setValueAtTime(0.0001, b.t);
  env.gain.exponentialRampToValueAtTime(b.gain, b.t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, b.t + b.dur);
  const pan = ctx.createStereoPanner();
  pan.pan.value = b.pan ?? 0;
  src.connect(f).connect(env).connect(pan).connect(out);
  src.start(b.t, (b.t * 3.7) % 1.8);
  src.stop(b.t + b.dur + 0.05);
}

function tone(ctx: OfflineAudioContext, out: AudioNode, t: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine', attack = 0.008): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A comic spring: a rising tone with a fast wobble. */
function boing(ctx: OfflineAudioContext, out: AudioNode, t: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.12);
  osc.frequency.exponentialRampToValueAtTime(330, t + 0.5);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 18;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(90, t);
  depth.gain.exponentialRampToValueAtTime(4, t + 0.5);
  lfo.connect(depth).connect(osc.frequency);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(env).connect(out);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 0.6);
  lfo.stop(t + 0.6);
}

/** A small prop plane droning across: a buzzing saw, low-passed, swelling and fading, panned right to left. */
function plane(ctx: OfflineAudioContext, out: AudioNode, t: number, dur: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(92, t);
  osc.frequency.linearRampToValueAtTime(80, t + dur);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 23;
  const depth = ctx.createGain();
  depth.gain.value = 6;
  lfo.connect(depth).connect(osc.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.45);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(0.8, t);
  pan.pan.linearRampToValueAtTime(-0.8, t + dur);
  osc.connect(lp).connect(env).connect(pan).connect(out);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur);
  lfo.stop(t + dur);
}

/** A warm chord swelling and fading (the golden ending). */
function swell(ctx: OfflineAudioContext, out: AudioNode, t: number, dur: number): void {
  for (const [f, g] of [[262, 0.07], [330, 0.055], [392, 0.05], [523, 0.03]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(g, t + dur * 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

/** The last line ("the place it all began.") came out ~3.4 dB under the rest of the take: lifted this much. */
const LAST_LINE_LIFT = 10 ** (2.5 / 20);

/** Dewy's take from the loop's start, straight to the output, with the soft last line lifted (audioKit's addVoice plus a gain). */
async function addVoiceLifted(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const gain = ctx.createGain();
  const from = said('the') - 0.12;
  gain.gain.setValueAtTime(1, 0);
  gain.gain.setValueAtTime(1, from);
  gain.gain.linearRampToValueAtTime(LAST_LINE_LIFT, from + 0.08);
  voice.connect(gain).connect(ctx.destination);
  voice.start(0);
}

export async function renderCrabMaldivesAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, UNDER_VOICE);
  const noise = noiseBuffer(ctx);
  // The hook: his crab's little wriggle, a twinkle on "first".
  play('find', said('first') + 0.05, 1.3, 0.25);
  // "The Maldives!": the seaplane droning over, a bright lift on the name.
  plane(ctx, master, 3.0, 2.2);
  play('win', said('Maldives!') + 0.05, 1.1, 0.35);
  for (let i = 0; i < 4; i++) tone(ctx, master, said('Maldives!') + 0.1 + i * 0.16, 2093 + i * 260, 2637 + i * 260, 0.16, 0.035);
  // The shell: a knock inside on "with", the boing, its little steps.
  play('tok', AT.wiggle + 0.02, 1.3, 0.5);
  boing(ctx, master, AT.pop + 0.02);
  for (let i = 0; i < 6; i++) burst(ctx, master, noise, { t: AT.walk + 0.05 + i * 0.13, dur: 0.05, freq: 3200 + (i % 2) * 600, gain: 0.12, q: 3, pan: -0.2 + i * 0.08 });
  // "He was hooked": a twinkle as the hearts rise.
  play('find', AT.hooked + 0.05, 1.5, 0.45);
  tone(ctx, master, AT.hooked + 0.3, 1568, 2093, 0.25, 0.06);
  // Dewy rising in: a soft whoosh.
  burst(ctx, master, noise, { t: AT.dewyIn - 0.05, dur: 0.5, freq: 500, to: 1800, gain: 0.18, q: 0.8, attack: 0.2 });
  // The beach turning into the level, and the digs.
  burst(ctx, master, noise, { t: AT.morphFrom, dur: 0.7, freq: 2400, to: 700, gain: 0.16, q: 0.7, attack: 0.25 });
  play('grow', AT.morphTo - 0.1, 1.1, 0.4);
  for (const at of [...STEP_AT, OPEN_AT]) {
    for (let i = 0; i < 3; i++) play('dig', at - 0.5 + i * 0.16, 0.9 + i * 0.05, 0.45);
  }
  play('find', OPEN_AT + 0.05, 1, 0.7);
  // A pen's scratch for each ring as it's drawn on.
  for (const r of RINGS) {
    burst(ctx, master, noise, { t: r.at, dur: 0.34, freq: 4200, to: 2600, gain: 0.11, q: 2.5, attack: 0.03 });
    tone(ctx, master, r.at + 0.3, 1760, 2349, 0.18, 0.05);
  }
  // The golden ending: a warm swell, Dewy sinking away, the son's hop back in and landing.
  swell(ctx, master, AT.backFrom, 1.9);
  burst(ctx, master, noise, { t: AT.dewyOut, dur: 0.45, freq: 1600, to: 400, gain: 0.14, q: 0.8, attack: 0.1 });
  play('find', AT.backFrom + 0.3, 1.2, 0.3);
  await addVoiceLifted(ctx);

  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  // Waves the whole way round, seamless across the loop point.
  const bed = surf(loop[0]!.length, 6);
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + UNDER_VOICE * 0.75 * bed[c]![i]!));
  const peak = mixed.reduce((m, ch) => ch.reduce((p, v) => Math.max(p, Math.abs(v)), m), 1e-6);
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
