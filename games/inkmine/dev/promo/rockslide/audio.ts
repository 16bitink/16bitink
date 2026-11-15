import { foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import type { SfxId } from '../../../src/audio/recipes';
import { noise, synthesize, tone, type Voice } from '../../../src/audio/synth';
import { ramp } from '../short';
import { said } from './words';
import { BLOCKS_AT, CHARGE_AT, CUT_AT, DIG_FROM, EYE_OPEN_AT, EYE_TWITCH_AT, landingsIn, LOOP_S, RAIN_FIRST, RAIN_EVERY, WAKE_AT } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, from the loop's start, straight to
 * the output) on top, and quiet under him the game's own effects
 * (mineSounds.ts: the drill's grind and crumble, the giant's low swell) and a
 * few built from the same synth pieces: the chest thump of each block, the
 * roof letting go, a rock's landing, the giant's footfalls. The wind's hush
 * drops out for the held breath before "Its eyes OPEN!". Everything that
 * sounds past the loop's end (the rain and footfalls carry on into the file's
 * first two seconds) folds back onto the start, so the seam is inside one sound.
 */
const TAIL_S = 3;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The take peaks high: the voice sets the mix's peak. */
const VOICE_GAIN = 0.8;
/** Each phrase's lift (dB), from its first word: rides the quiet lines back to within about 5 dB of the loud ones. */
const LIFTS: readonly (readonly [number, number])[] = [[0, 0], [4, 5], [7, 3], [14, 2], [18, 2], [21, 2], [25, 5], [27, 6], [29, 1], [31, 0], [39, 0], [43, -2], [47, 2]];
/** The effects' master level, well under the voice. */
const SFX_GAIN = 0.62;
const WIND_GAIN = 0.07;
const WIND_SWELLS = 3;
/** The mix's peak: AAC adds a little, so this lands near -4 dB in the video. */
const PEAK = 10 ** (-4.0 / 20);
const SILENT_FROM = BLOCKS_AT[2]! + 0.12;
const SILENT_TO = EYE_OPEN_AT + 0.1;
/** The giant's step: one every 0.65 s while it is up. */
const STEP_S = 0.65;

/** Each block a thump in the chest, heavier as the noise climbs. */
function thump(v: Voice, k: number): void {
  tone(v, { from: 96, to: 48, dur: 0.42, gain: 0.26 + 0.12 * k, attack: 0.006 });
  noise(v, { dur: 0.2, gain: 0.2, filter: 'lowpass', from: 700, to: 150, attack: 0.004 });
}

/** A footfall of something the size of a hill: a body blow low down and grit shaken loose. */
function footfall(v: Voice, k: number): void {
  tone(v, { from: 62, to: 30, dur: 0.5, gain: 0.34 * k, attack: 0.004 });
  noise(v, { dur: 0.32, gain: 0.22 * k, filter: 'lowpass', from: 900, to: 120, attack: 0.003 });
}

/** The roof letting go: a dry crack and a patter of grit falling through the dark. */
function roofShake(v: Voice): void {
  noise(v, { dur: 0.5, gain: 0.16, filter: 'bandpass', from: 1800, to: 500, q: 1.2, attack: 0.02 });
  noise(v, { dur: 0.3, gain: 0.12, filter: 'highpass', from: 2600, to: 1800, attack: 0.05, delay: 0.15 });
}

async function addVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  for (const [word, db] of LIFTS) {
    // Moved in the pause before the phrase, so no word swells.
    level.gain.setTargetAtTime(VOICE_GAIN * 10 ** (db / 20), Math.max(0, said(word) - 0.18), 0.04);
  }
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

export async function renderRockslideAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  const at = (t: number): Voice => {
    const level = ctx.createGain();
    level.gain.value = 1;
    level.connect(master);
    // The offline context has every node factory the synth uses.
    return { ctx: ctx as unknown as AudioContext, out: level, t, pitch: 1 };
  };
  const fx = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): void => play(id, t, pitch, gain, pan);

  // The cut from the giant to the sleeper: the rumble stops dead, one low swell as it lies down in the dark.
  fx('swell', CUT_AT, 0.3, 2.6);

  // The dig: the grind ticking away, each block a crumble and a thump, the notch on the bar a step higher.
  const lastBlock = BLOCKS_AT[BLOCKS_AT.length - 1]!;
  for (let t = DIG_FROM; t < lastBlock; t += 0.2) fx('grindHard', t, 0.92 + ((t * 7) % 1) * 0.12, 0.62, 0.22);
  BLOCKS_AT.forEach((b, k) => {
    fx('crumbleHard', b, 0.86 + k * 0.05, 1.2 + k * 0.14, 0.2);
    thump(at(b), k / 2);
    fx('tick', b + 0.03, 0.8 + k * 0.28, 0.7, -0.4);
  });

  // The silence, then the eyes: a twitch of stone, and the swell as low as it goes for waking.
  fx('land', EYE_TWITCH_AT, 0.45, 0.35);
  fx('swell', EYE_OPEN_AT - 0.04, 0.25, 4.4);
  tone(at(EYE_OPEN_AT), { from: 41, to: 49, dur: 2.2, gain: 0.34, attack: 0.5 });
  noise(at(EYE_OPEN_AT + 0.05), { dur: 0.9, gain: 0.2, filter: 'lowpass', from: 1400, to: 200, attack: 0.01 });

  // Up and walking: a footfall every 0.65 s from the rain to past the loop point, the roof letting go every 1.3 s, every rock a landing.
  const end = LOOP_S + CUT_AT;
  for (let t = WAKE_AT, k = 0; t < end; t += STEP_S, k++) footfall(at(t), 0.7 + 0.3 * ramp(t, WAKE_AT, CHARGE_AT));
  for (let t = RAIN_FIRST; t < end; t += RAIN_EVERY) roofShake(at(t));
  landingsIn(RAIN_FIRST, end + 0.1).forEach((t, i) => {
    fx('land', t, 0.42 + (i % 3) * 0.08, 0.9, ((i % 3) - 1) * 0.35);
    fx('crumbleHard', t + 0.02, 0.6 + (i % 3) * 0.05, 0.7, ((i % 3) - 1) * 0.35);
  });
  fx('swell', WAKE_AT, 0.3, 3);
  fx('swell', CHARGE_AT, 0.25, 4);
  fx('jetStart', CHARGE_AT + 0.05, 0.8, 1.2, 0.3);

  await addVoice(ctx);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const wind = surf(loop[0]!.length, WIND_SWELLS);
  /** The wind's level at a sample: gone for the silence. */
  const hush = (i: number): number => {
    const t = i / RATE;
    return 1 - Math.min(ramp(t, SILENT_FROM - 0.1, SILENT_FROM), 1 - ramp(t, SILENT_TO, SILENT_TO + 0.4));
  };
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + WIND_GAIN * hush(i) * wind[c]![i]!));
  const peak = Math.max(...mixed.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
