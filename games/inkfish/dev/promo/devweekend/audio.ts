import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './script';

/**
 * The short's soundtrack: Dewy (voice.mp3, starting with the loop), the game's effects quiet under him (script.ts
 * lists them) and a low hum. The voice ends 0.3 s before the loop point, so the loop starts the story again.
 * Dewy's take: integrated -19.3 LUFS, every line within 2.5 dB of it (the deadpan "no Start button" the quietest),
 * so no ride is needed.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const VOICE_GAIN = 1.35;
const HUM_GAIN = 0.4;
const OUT_GAIN = 1.0;

export async function renderWeekendAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
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
