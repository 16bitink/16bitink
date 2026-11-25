import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them), and a low hum of
 * water. The voice's last words run up to the loop point, so the loop
 * finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
const VOICE_GAIN = 0.64;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.35;
/** Quiet lines lifted to sit near the rest of the take: dB from one time to another, seconds. */
export const LIFTS: readonly { readonly from: number; readonly to: number; readonly db: number }[] = [
  { from: 2.36, to: 4.4, db: 4 },
  { from: 4.45, to: 7.0, db: 4.5 },
  { from: 16.5, to: 17.4, db: 2 },
  { from: 20.15, to: 21.65, db: 1.5 },
  { from: 21.72, to: 22.4, db: 8 },
];
const EASE_S = 0.04;

export async function renderInkyAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  for (const l of LIFTS) {
    level.gain.setValueAtTime(VOICE_GAIN, l.from);
    level.gain.linearRampToValueAtTime(VOICE_GAIN * 10 ** (l.db / 20), l.from + EASE_S);
    level.gain.setValueAtTime(VOICE_GAIN * 10 ** (l.db / 20), l.to - EASE_S);
    level.gain.linearRampToValueAtTime(VOICE_GAIN, l.to);
  }
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const frames = loop[0]!.length;
  const hum = ambience(frames, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
