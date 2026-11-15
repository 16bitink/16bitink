import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop,
 * straight to the output), the game's effects quiet under it (script.ts
 * lists them, one mood a beat), and a low hum of wind. The voice's last words
 * ("So, trust me:") run up to the loop point, so the loop finishes the line.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 3;
const HUM_GAIN = 0.35;
/** This take peaks at -4.2 dB: kept a little under, where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.8;
/** The whole mix, lifted to peak around -4 dB (measured -3.9 dB). */
const OUT_GAIN = 1.27;

export async function renderPenguinAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
