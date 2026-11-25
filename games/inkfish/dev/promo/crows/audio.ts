import { foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop,
 * straight to the output) and the game's effects quiet under it (script.ts
 * lists them, one mood a beat). The voice's last word ("because") runs up to
 * the loop point, so the loop finishes the line.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 3;
const VOICE_GAIN = 0.8;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.1;
/** The nervous line ("But now lunch is…") is 2.9 dB under the take (mean -26.5 vs -23.6 dB): lifted 1.6 dB. */
const QUIET = { from: 13.3, to: 15.5, ramp: 0.1, gain: 1.2 } as const;

export async function renderCrowsAudio(start = 0): Promise<Blob> {
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
  return rotatedWav(loop.map((ch) => ch.map((v) => OUT_GAIN * v)), LOOP_S, start);
}
