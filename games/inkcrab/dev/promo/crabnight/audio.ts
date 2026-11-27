import { foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { AT, EMERGERS, LOOP_S, said } from './story';

/**
 * The soundtrack: Dewy's voice (voice.mp3, starting with the loop) straight to
 * the output, its quieter lines lifted to within ~2 dB of the rest; under it a
 * soft beach: the surf the whole way round, the son's footsteps in the sand,
 * the crab's tiny steps, the game's "hide" as it ducks into its shell and
 * "out" as a shell stands up, a wave washing up and back, the game's "dark"
 * as night falls, the torch's click, sand puffs as crabs dig out, the game's
 * find chime on its last beach and sparkles in the plankton, and a warm swell
 * at sunrise. No music. The mix is normalised so the peak sits at -4 dB.
 */
const TAIL_S = 2;
const PEAK = 10 ** (-4 / 20);
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const UNDER_VOICE = 0.4;
const BED = 0.55;
const db = (x: number): number => 10 ** (x / 20);

/** Lines read quieter than the take (measured with ebur128 on voice-take.mp3), lifted: [from, to, dB]. */
export const LIFTS: readonly (readonly [number, number, number])[] = [
  [said("Here's") - 0.1, said('trick.') + 0.35, 3],
  [said('Look') - 0.1, said('WALK.') + 0.36, 1.5],
  [said('and') - 0.1, said('DARK.') + 0.36, 2],
  [said('A') - 0.1, LOOP_S - 0.05, 2],
];

async function addVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, 0);
  for (const [from, to, lift] of LIFTS) {
    gain.gain.setValueAtTime(1, from - 0.04);
    gain.gain.linearRampToValueAtTime(db(lift), from);
    gain.gain.setValueAtTime(db(lift), to);
    gain.gain.linearRampToValueAtTime(1, to + 0.04);
  }
  voice.connect(gain).connect(ctx.destination);
  voice.start(0);
}

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE * 2, RATE);
  const data = buffer.getChannelData(0);
  let seed = 1515;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  return buffer;
}

/** A band of noise swelling in and dying away: a wave's wash, a footstep's crunch. */
function wash(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, dur: number, freq: number, gain: number, attack: number, to?: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = 0.9;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(env).connect(out);
  src.start(t, (t * 1.7) % 1.5);
  src.stop(t + dur + 0.05);
}

export async function renderCrabNightAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, UNDER_VOICE);
  const noise = noiseBuffer(ctx);
  // Frame 1: the son's steps in soft sand, the crab's little steps behind him (the loop's end runs into them).
  for (let t = 0.05; t < AT.hide - 0.1; t += 0.6) wash(ctx, master, noise, t, 0.16, 900, 0.18, 0.02, 500);
  for (let t = 0.2; t < AT.hide; t += 0.35) play('tok', t, 2.2, 0.12, -0.3);
  // "Here's the trick": the crab ducks in, the son spins round.
  play('hide', AT.hide, 1.1, 0.7, -0.3);
  play('jump', AT.turn, 1.3, 0.35);
  // "Look for shells that WALK": the shell stands up and tiptoes off.
  play('out', AT.stand + 0.05, 1.1, 0.7);
  for (let t = AT.stand + 0.3; t < AT.shore; t += 0.18) play('tok', t, 2.6, 0.15, 0.2);
  // The wave washes up the sand and draws back, leaving its line.
  play('tide', AT.waveIn - 0.1, 1, 0.5);
  wash(ctx, master, noise, AT.waveIn, AT.waveTop - AT.waveIn + 0.5, 600, 0.5, 0.5, 2200);
  wash(ctx, master, noise, AT.waveTop + 0.1, 0.9, 2400, 0.3, 0.1, 700);
  play('find', AT.waveTop + 0.35, 0.9, 0.3);
  // Night falls; the torch clicks on; crabs dig out into the light.
  play('dark', AT.dusk, 1, 0.55);
  play('click', AT.torch, 1, 0.8);
  for (const e of EMERGERS) {
    play('dig', e.at + 0.02, 1.1, 0.55);
    play('out', e.at + 0.25, 1.2, 0.5);
  }
  play('find', said('night.') + 0.2, 1.2, 0.35);
  // The game's last beach: its chime, then a sparkle in the plankton under each step.
  play('win', AT.game + 0.1, 1, 0.4);
  for (let t = AT.game + 0.5; t < AT.dawn; t += 0.42) play('find', t, 1.6 + 0.1 * Math.sin(t * 3), 0.12, 0.2);
  play('find', said('glowing') + 0.05, 1.3, 0.35);
  // Sunrise: a warm swell back into the day.
  play('join', AT.dawn + 0.1, 0.8, 0.3);
  await addVoice(ctx);

  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const bed = surf(loop[0]!.length, 6);
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + UNDER_VOICE * BED * bed[c]![i]!));
  const peak = mixed.reduce((m, ch) => ch.reduce((p, v) => Math.max(p, Math.abs(v)), m), 1e-6);
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
