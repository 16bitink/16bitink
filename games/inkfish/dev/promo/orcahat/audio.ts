import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { endOf, LOOP_S, THEN_AT } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * and a low hum of water. The voice's last words ("He wasn't even BORN")
 * end 0.3 s before the loop point, and the loop's chuckle and "In 1987…"
 * finish the sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** The voice goes straight to the output; brought down so the whole mix, lifted by OUT_GAIN, peaks around -4 dB. */
const VOICE_GAIN = 0.7;
const OUT_GAIN = 1.29;
/** The soft line ("Then, next summer… the fad just vanished.") measures -29.6 LUFS against the take's -23.9: lift it 2.5 dB, to within 4. */
export const SOFT_LIFT_DB = 2.5;
const SOFT_LIFT = 10 ** (SOFT_LIFT_DB / 20);

export async function renderOrcaHatAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  const [from, to] = [THEN_AT - 0.05, endOf('vanished.') + 0.05];
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  level.gain.setValueAtTime(VOICE_GAIN, from - 0.15);
  level.gain.linearRampToValueAtTime(VOICE_GAIN * SOFT_LIFT, from);
  level.gain.setValueAtTime(VOICE_GAIN * SOFT_LIFT, to);
  level.gain.linearRampToValueAtTime(VOICE_GAIN, to + 0.25);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
