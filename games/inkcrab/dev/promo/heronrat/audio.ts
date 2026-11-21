import { addVoice, foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { AT, LOOP_S, said } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, starting with the loop) straight to
 * the output, with the park quiet under him: the pond lapping and a far hum
 * of the city the whole way round, the rat's paddling, the heron's strike
 * (the game's stoop) and splashes, the dunk, wet gulps as the rat goes down
 * (the game's eat sound on "head" and "tail", its grow on "whole"), a short
 * crowd cheer with the game's win, and a phone's beep for the birder. No
 * music. The whole mix is normalised so the peak sits at -4 dB.
 */
const TAIL_S = 2;
const PEAK = 10 ** (-4 / 20);
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const UNDER_VOICE = 0.42;
const BED = 0.5;

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE * 2, RATE);
  const data = buffer.getChannelData(0);
  let seed = 2021;
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

function tone(ctx: OfflineAudioContext, out: AudioNode, t: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function splash(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, size: number, pan = 0): void {
  burst(ctx, out, noise, { t, dur: 0.18 + 0.3 * size, freq: 2200, to: 900, gain: 0.25 + 0.45 * size, q: 0.8, pan });
  burst(ctx, out, noise, { t: t + 0.03, dur: 0.12 + 0.2 * size, freq: 600, gain: 0.2 + 0.3 * size, q: 0.9, pan });
  for (let i = 0; i < 4; i++) tone(ctx, out, t + 0.05 + i * 0.05, 1200 + i * 340, 2200 + i * 300, 0.04, 0.05 * size + 0.02);
}

/** A wet gulp: a low falling glug with a soft click of the bill. */
function gulp(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, gain: number): void {
  tone(ctx, out, t, 260, 90, 0.22, gain);
  tone(ctx, out, t + 0.05, 180, 70, 0.2, gain * 0.6, 'triangle');
  burst(ctx, out, noise, { t, dur: 0.06, freq: 3200, gain: gain * 0.4, q: 2 });
}

/** A crowd cheering on the bank: a swell of voices (formant-ish noise) and a few "woo!"s. */
function cheer(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number): void {
  for (let i = 0; i < 6; i++) burst(ctx, out, noise, { t: t + i * 0.07, dur: 1.1 - i * 0.08, freq: 700 + i * 260, gain: 0.16, q: 3, attack: 0.15, pan: -0.5 + i * 0.2 });
  for (const [dt, f, pan] of [[0.05, 520, 0.4], [0.25, 640, -0.3], [0.45, 580, 0.1]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, t + dt);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + dt + 0.3);
    const fl = ctx.createBiquadFilter();
    fl.type = 'bandpass';
    fl.frequency.value = 1100;
    fl.Q.value = 2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t + dt);
    env.gain.exponentialRampToValueAtTime(0.08, t + dt + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.45);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    osc.connect(fl).connect(env).connect(p).connect(out);
    osc.start(t + dt);
    osc.stop(t + dt + 0.5);
  }
}

export async function renderHeronRatAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, UNDER_VOICE);
  const noise = noiseBuffer(ctx);
  // The hook: the rat going down, a gulp on "RAT", a big one on "whole!".
  gulp(ctx, master, noise, AT.rat + 0.05, 0.35);
  gulp(ctx, master, noise, AT.whole + 0.05, 0.45);
  play('grow', AT.whole + 0.1, 0.8, 0.5);
  // The pond: the rat paddling in.
  for (let t = AT.hookOut + 0.4; t < AT.strike - 0.1; t += 0.32) burst(ctx, master, noise, { t, dur: 0.08, freq: 1800, gain: 0.07, q: 1.4, pan: 0.3 });
  // The strike, the snatch, water off the rat.
  play('stoop', AT.strike - 0.08, 1.4, 0.7);
  splash(ctx, master, noise, AT.strike + 0.05, 0.8, 0.1);
  for (let i = 0; i < 8; i++) tone(ctx, master, AT.lift + i * 0.12, 1500 + (i % 3) * 400, 2600, 0.035, 0.05);
  // The dunk: in and out.
  splash(ctx, master, noise, AT.dunk + 0.05, 0.7, 0.1);
  splash(ctx, master, noise, AT.up + 0.02, 0.4, 0.1);
  // The toss and the swallow: gulp after gulp, the tail slurped in last.
  play('jump', AT.toss - 0.02, 1.2, 0.5);
  gulp(ctx, master, noise, said('goes!') + 0.05, 0.4);
  play('eat', said('Head') + 0.05, 0.7, 0.8);
  gulp(ctx, master, noise, said('first…') + 0.1, 0.45);
  play('eat', said('tail') + 0.05, 0.9, 0.8);
  burst(ctx, master, noise, { t: said('LAST.') - 0.1, dur: 0.35, freq: 900, to: 3000, gain: 0.2, q: 4, attack: 0.05 });
  gulp(ctx, master, noise, said('LAST.') + 0.3, 0.55);
  // The crowd cheering.
  cheer(ctx, master, noise, AT.cheer - 0.05);
  play('win', AT.cheer + 0.1, 1, 0.45);
  // The birder: the phone's recording beep, a curious little note on "never".
  tone(ctx, master, AT.birder + 0.15, 1320, 1320, 0.12, 0.12, 'square');
  play('find', said('never') + 0.05, 1, 0.4);
  await addVoice(ctx, VOICE_URL);

  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  // The pond lapping and a far hum of traffic, seamless across the loop point.
  const bed = surf(loop[0]!.length, 4);
  // Low-passed twice round, so the filter's state at the end matches the start.
  const hum = surf(loop[0]!.length, 2).map((ch) => {
    let lo = 0;
    ch.forEach((v) => (lo += (v - lo) * 0.02));
    return ch.map((v) => (lo += (v - lo) * 0.02));
  });
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + UNDER_VOICE * (BED * bed[c]![i]! + 1.6 * hum[c]![i]!)));
  const peak = mixed.reduce((m, ch) => ch.reduce((p, v) => Math.max(p, Math.abs(v)), m), 1e-6);
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
