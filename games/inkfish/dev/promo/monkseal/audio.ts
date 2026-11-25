import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { BUT_AT, endOf, LOOP_S, ONE_AT, PULL3_AT, SCIENTISTS_AT } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * and a low hum of surf. The voice's last words ("nobody knows why") end
 * 0.3 s before the loop point, and the loop's first line finishes the
 * sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.4;
/** The voice goes straight to the output; brought down so the whole mix, lifted by OUT_GAIN, peaks around -4 dB. */
export const VOICE_GAIN = 0.7;
const OUT_GAIN = 1.29;
/**
 * Lines brought nearer the take's level (dB over VOICE_GAIN): "PULL!" peaks
 * about 5 dB over it, the quiet lines measure 3 to 5 dB under it.
 */
export const LEVELS: readonly { readonly from: number; readonly to: number; readonly db: number }[] = [
  { from: SCIENTISTS_AT, to: endOf('pull…'), db: 1.5 },
  { from: PULL3_AT - 0.1, to: endOf('PULL!'), db: -3 },
  { from: ONE_AT, to: endOf('trend.'), db: 1.5 },
  { from: BUT_AT, to: endOf('why'), db: 3 },
];

export async function renderMonkSealAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  for (const l of LEVELS) {
    const g = VOICE_GAIN * 10 ** (l.db / 20);
    level.gain.setValueAtTime(VOICE_GAIN, l.from - 0.14);
    level.gain.linearRampToValueAtTime(g, l.from - 0.04);
    level.gain.setValueAtTime(g, l.to + 0.04);
    level.gain.linearRampToValueAtTime(VOICE_GAIN, Math.min(LOOP_S, l.to + 0.16));
  }
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 4);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
