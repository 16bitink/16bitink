import { addVoice, foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { AT, DIG_S, DIGS, GAME_SWAP, LOOP_S, SCUTTLE, SET_DOWN, SQUEEZE, SWAP, UNCOVER } from './story';

/**
 * The soundtrack: Dewy (voice.mp3, starting with the loop) straight to the
 * output, over a soft beach: waves washing in and out the whole way round.
 * Each beat its own sound, matching its mood: the spade's scoops of sand,
 * the crab's little feet, a bright clink when the spade hits treasure, a
 * curious note for the "?", sparkles as the big shell comes up, the game's
 * stuck sound for the crammed crab, its move-in for the swap, a whoosh into
 * the game, the game's digs, find, move-in and grow, and a wash of surf back
 * to the beach. No music. The mix is normalised so the peak sits at -4 dB.
 */
const TAIL_S = 2;
const PEAK = 10 ** (-4 / 20);
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const UNDER_VOICE = 0.85;
const BED = 0.75;

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE * 2, RATE);
  const data = buffer.getChannelData(0);
  let seed = 4049;
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

function tone(ctx: OfflineAudioContext, out: AudioNode, t: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine', pan = 0): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  osc.connect(env).connect(p).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A spade scooping sand: the blade going in, then the sand thrown off it. */
function scoop(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, gain: number): void {
  burst(ctx, out, noise, { t, dur: 0.12, freq: 900, to: 500, gain: 0.3 * gain, q: 0.9, pan: 0.1 });
  burst(ctx, out, noise, { t: t + 0.13, dur: 0.32, freq: 3200, to: 1800, gain: 0.18 * gain, q: 0.7, attack: 0.03, pan: 0.25 });
}

/** A bright clink: the spade on a shell. */
function clink(ctx: OfflineAudioContext, out: AudioNode, t: number): void {
  for (const [f, g, d] of [[2350, 0.22, 0.5], [3530, 0.14, 0.38], [5210, 0.07, 0.25]] as const) tone(ctx, out, t, f, f * 0.995, d, g, 'sine', 0.1);
}

/** Sparkles: little high notes rising in a run. */
function sparkle(ctx: OfflineAudioContext, out: AudioNode, t: number, n: number, gain: number): void {
  const notes = [1568, 1976, 2349, 2637, 3136, 3520, 3951, 4699];
  for (let i = 0; i < n; i++) tone(ctx, out, t + i * 0.055, notes[i % notes.length]!, notes[i % notes.length]! * 1.01, 0.32, gain, 'triangle', -0.4 + (i % 5) * 0.2);
}

/** The air rushing as the beach opens into the game. */
function whoosh(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, dur: number, gain: number): void {
  burst(ctx, out, noise, { t, dur, freq: 400, to: 2600, gain, q: 0.8, attack: dur * 0.6 });
}

/** The dig strokes heard: every stroke while he digs on the beach (hook, and again before the find; also the run-in to the loop point). */
function strokeTimes(): readonly { readonly t: number; readonly gain: number }[] {
  const out: { t: number; gain: number }[] = [];
  for (let k = 0; k * DIG_S < LOOP_S; k++) {
    const t = k * DIG_S + DIG_S * 0.3;
    const hook = t < AT.hermit - 0.05 || t > AT.back + 0.25;
    const find = t > AT.and + 0.15 && t < AT.treasure;
    if (hook || find) out.push({ t, gain: find ? 1.15 : 0.9 });
  }
  return out;
}

export async function renderCrabTreasureAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, UNDER_VOICE);
  const noise = noiseBuffer(ctx);
  // The son digging.
  for (const s of strokeTimes()) scoop(ctx, master, noise, s.t, s.gain);
  // "Hermit crabs…": out it pops, and its little feet scuttle.
  play('out', AT.hermit - 0.02, 1.1, 0.6);
  for (let t = SCUTTLE.from; t < SCUTTLE.to; t += 0.08) tone(ctx, master, t, 2400, 1900, 0.03, 0.05, 'square', 0.3);
  // "TREASURE!": the spade hits it.
  clink(ctx, master, AT.treasure + 0.02);
  play('find', AT.treasure + 0.08, 1, 0.5);
  // "So what's treasure to a hermit crab?": a curious little note for the "?".
  tone(ctx, master, AT.so + 0.3, 520, 780, 0.22, 0.12, 'triangle');
  tone(ctx, master, AT.so + 0.55, 660, 990, 0.26, 0.1, 'triangle');
  // "A BIGGER shell!": up it comes in a shower of sparkles; the hop.
  burst(ctx, master, noise, { t: AT.a, dur: 0.45, freq: 1200, to: 3000, gain: 0.12, q: 0.8, attack: 0.2 });
  sparkle(ctx, master, AT.bigger - 0.05, 8, 0.06);
  play('grow', AT.shell, 1.2, 0.45);
  play('jump', AT.shell + 0.02, 1, 0.4);
  // "It can't grow its own…": crammed in, the game's stuck sound with each shrug.
  play('full', SQUEEZE.from + 0.25, 1, 0.55);
  play('full', SQUEEZE.from + 0.9, 0.95, 0.5);
  // "…so it has to FIND one": set down, and the move.
  play('place', SET_DOWN.to - 0.02, 0.8, 0.6);
  play('movein', (SWAP.from + SWAP.to) / 2 - 0.05, 1, 0.75);
  // Into the game.
  whoosh(ctx, master, noise, AT.wipe - 0.1, 0.55, 0.22);
  play('jump', AT.crab, 1.3, 0.35);
  for (const [at] of DIGS.slice(0, -1)) play('dig', at, 1, 0.7);
  play('find', UNCOVER, 1, 0.7);
  sparkle(ctx, master, UNCOVER + 0.05, 5, 0.045);
  play('movein', (GAME_SWAP.from + GAME_SWAP.to) / 2 - 0.05, 1, 0.75);
  play('grow', GAME_SWAP.to + 0.05, 1, 0.6);
  // Back to the beach: a wave washing in.
  burst(ctx, master, noise, { t: AT.back - 0.1, dur: 1.2, freq: 700, to: 1500, gain: 0.16, q: 0.6, attack: 0.5 });
  await addVoice(ctx, VOICE_URL);

  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  // Waves washing in and out, seamless across the loop point.
  const bed = surf(loop[0]!.length, 4);
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + UNDER_VOICE * BED * bed[c]![i]!));
  const peak = mixed.reduce((m, ch) => ch.reduce((p, v) => Math.max(p, Math.abs(v)), m), 1e-6);
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
