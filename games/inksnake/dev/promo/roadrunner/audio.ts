import { foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { GOOD_AT, LOOP_S, SOUNDS } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, starting with the loop) on top,
 * InkSnake's own sound effects quiet under him, one mood per beat (story.ts
 * SOUNDS). Folded into a loop and set to peak at −4 dB. His last words
 * ("Good thing") run up to the loop point, so the loop finishes his sentence.
 * That nervous line measures −26.9 LUFS against −21.0 for the whole take
 * (5.9 dB), so it is lifted by LIFT_DB in the pause before it, to within 4 dB.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 0.9;
const LIFT_DB = 3.2;
const PEAK = 10 ** (-4 / 20);

/** The narrator straight to the output, his last line lifted. */
async function addLiftedVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.setValueAtTime(1, 0);
  level.gain.setValueAtTime(1, GOOD_AT - 0.22);
  level.gain.linearRampToValueAtTime(10 ** (LIFT_DB / 20), GOOD_AT - 0.04);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

export async function renderRoadrunnerAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addLiftedVoice(ctx);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const peak = Math.max(...loop.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  if (peak <= 0) throw new Error('roadrunner: silent soundtrack');
  return rotatedWav(loop.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
