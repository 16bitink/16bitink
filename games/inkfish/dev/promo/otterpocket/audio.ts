import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop,
 * straight to the output), the game's effects quiet under it (script.ts
 * lists them, one mood a beat), and a low hum of the sea. The voice's last
 * word ("remember,") runs up to the loop point, so the loop finishes the line.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 3;
const HUM_GAIN = 0.35;
/** Mark's takes peak around -3 to -6 dB: kept a little under, where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.8;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 0.92;
/**
 * The curious line ("A loose flap of skin under each arm…", 1.9–3.95 s) came
 * out 4.1 dB under the take (mean -27.4 vs -23.3 dB): lifted 2.5 dB so it
 * sits within ~2 dB of the rest.
 */
const QUIET = { from: 1.75, to: 4.05, ramp: 0.1, gain: 1.33 } as const;

export async function renderOtterPocketAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  level.gain.setValueAtTime(VOICE_GAIN, QUIET.from);
  level.gain.linearRampToValueAtTime(VOICE_GAIN * QUIET.gain, QUIET.from + QUIET.ramp);
  level.gain.setValueAtTime(VOICE_GAIN * QUIET.gain, QUIET.to - QUIET.ramp);
  level.gain.linearRampToValueAtTime(VOICE_GAIN, QUIET.to);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
