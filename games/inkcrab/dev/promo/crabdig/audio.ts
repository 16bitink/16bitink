import { addVoice, foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { AT, BURIED, LOOP_S, said } from './story';

/**
 * The soundtrack: Dewy's voice (voice.mp3, starting with the loop) straight
 * to the output, the "WEEKS" line lifted (it read ~5 dB under the take),
 * and the beach quiet under it: surf the whole way round; the crab's digs
 * (the game's own dig) fast in the hook, slowing as it settles; a low hush
 * and trickle as the tunnel closes; a soft slither and the game's grow as
 * the old skin comes off; whooshes for the days racing past; the son's
 * spade; the game's digs, a clink and sparkle for each buried shell, its
 * move-in and win for the bigger home. The mix peaks at -4 dB.
 */
const TAIL_S = 2;
const PEAK = 10 ** (-4 / 20);
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const UNDER_VOICE = 0.4;
const BED = 0.55;
/** The "and stays hidden for WEEKS." line, lifted to sit with the rest of the take. */
const LIFT = { from: said('and', 1) - 0.05, to: said('My') - 0.05, gain: 10 ** (2.5 / 20) } as const;

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE * 2, RATE);
  const data = buffer.getChannelData(0);
  let seed = 152;
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
  readonly to?: number;
  readonly pan?: number;
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
  const attack = b.attack ?? 0.005;
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

/** A shell's clink: two glassy partials. */
function clink(ctx: OfflineAudioContext, out: AudioNode, t: number, pitch: number, gain: number): void {
  tone(ctx, out, t, 2300 * pitch, 2250 * pitch, 0.35, gain, 'sine', 0.003);
  tone(ctx, out, t + 0.01, 3650 * pitch, 3600 * pitch, 0.25, gain * 0.5, 'sine', 0.003);
}

/** The voice, with the quiet line lifted. */
async function addLiftedVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const src = ctx.createBufferSource();
  src.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, 0);
  gain.gain.setValueAtTime(1, LIFT.from - 0.05);
  gain.gain.linearRampToValueAtTime(LIFT.gain, LIFT.from);
  gain.gain.setValueAtTime(LIFT.gain, LIFT.to - 0.05);
  gain.gain.linearRampToValueAtTime(1, LIFT.to);
  src.connect(gain).connect(ctx.destination);
  src.start(0);
}

export async function renderCrabDigAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, UNDER_VOICE);
  const noise = noiseBuffer(ctx);
  // The hook: quick digs, the claws scraping sand. They run on past the loop point into the next loop's start (folded back).
  for (let t = 0; t < 2.9; t += 0.16 + 0.06 * Math.min(1, t / 2.9)) {
    play('dig', t, 0.85 + 0.25 * ((t * 7.3) % 1), 0.55 * (1 - 0.6 * Math.max(0, (t - 2.0) / 0.9)), -0.2);
    burst(ctx, master, noise, { t: t + 0.02, dur: 0.09, freq: 2600, gain: 0.08, q: 1.5, pan: 0.3 });
  }
  for (let t = AT.back + 0.2; t < LOOP_S; t += 0.16) play('dig', t, 0.85 + 0.25 * ((t * 7.3) % 1), 0.4, -0.2);
  // Settling in: a low hush, and sand trickling in over it.
  tone(ctx, master, AT.bury + 0.2, 110, 70, 3.2, 0.12, 'sine', 0.8);
  for (let i = 0; i < 14; i++) burst(ctx, master, noise, { t: AT.buries + i * 0.11, dur: 0.18, freq: 4200 - i * 120, gain: 0.05, q: 2.5, pan: -0.1 });
  burst(ctx, master, noise, { t: AT.damp - 0.1, dur: 1.0, freq: 500, to: 260, gain: 0.12, q: 0.8, attack: 0.3 });
  // The old skin sliding off, and the crab a little bigger.
  burst(ctx, master, noise, { t: AT.sheds + 0.05, dur: 1.0, freq: 1200, to: 2400, gain: 0.1, q: 3, attack: 0.25, pan: 0.3 });
  play('out', AT.sheds + 0.1, 0.8, 0.4);
  play('grow', AT.skin + 0.2, 0.9, 0.45);
  // Weeks: a whoosh for each day going by.
  for (let i = 0; i < 3; i++) burst(ctx, master, noise, { t: AT.weeks + 0.1 + i * 0.53, dur: 0.5, freq: 600, to: 1800, gain: 0.12, q: 1.4, attack: 0.2, pan: -0.6 + 0.6 * i });
  play('dark', AT.weeks + 0.25, 1, 0.25);
  // The son's spade, bright and happy.
  for (let t = AT.son - 0.05; t < AT.wash + 0.1; t += 1 / 2.4) {
    play('dig', t + 0.16, 1.35, 0.55, -0.35);
    burst(ctx, master, noise, { t: t + 0.22, dur: 0.14, freq: 3400, gain: 0.07, q: 1.2, pan: -0.3 });
  }
  play('jump', AT.son - 0.4, 1.3, 0.35);
  // The game: the ink wash in, then the crab digging tile by tile.
  play('click', AT.wash + 0.1, 1, 0.4);
  for (let t = AT.game + 0.2; t < AT.bigger - 0.5; t += 0.22) {
    if (t > AT.shells - 0.2 && t < AT.treasure + 0.15) continue;
    play('dig', t, 1.0 + 0.2 * ((t * 5.1) % 1), 0.55, 0.15);
  }
  // Buried shells: a clink and a sparkle as each glints.
  BURIED.forEach((s, i) => {
    clink(ctx, master, s.glint, 1 + 0.12 * i, 0.12);
    play('find', s.glint + 0.03, 1 + 0.1 * i, 0.35);
  });
  clink(ctx, master, AT.treasure + 0.4, 0.9, 0.14);
  // The bigger home: the move-in, a puff, and the son's win.
  play('movein', AT.bigger - 0.25, 1, 0.8);
  burst(ctx, master, noise, { t: AT.bigger - 0.05, dur: 0.3, freq: 900, gain: 0.18, q: 0.9 });
  play('win', AT.bigger + 0.05, 1, 0.5);
  play('grow', AT.home + 0.05, 1.1, 0.4);
  play('jump', AT.trophy, 1.2, 0.3);
  await addLiftedVoice(ctx);

  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const bed = surf(loop[0]!.length, 4);
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + UNDER_VOICE * BED * bed[c]![i]!));
  const peak = mixed.reduce((m, ch) => ch.reduce((p, v) => Math.max(p, Math.abs(v)), m), 1e-6);
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
