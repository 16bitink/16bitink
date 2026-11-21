import { foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { LOOP_S } from './story';
import { SOUNDS } from './words';

/** The soundtrack: InkSnake's own effects, no voice, over the krait short's faint hush of water (at its level there), folded into a loop and set to peak at −4 dB. */
const TAIL_S = 2;
const SFX_GAIN = 2.2;
const PEAK = 10 ** (-4 / 20);
/** The hush's level against the effects, as in krait/audio.ts. */
const SURF_GAIN = 0.35;

export async function renderGulpMorayAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const folded = foldLoop(await ctx.startRendering(), LOOP_S);
  const hush = surf(folded[0]!.length, 3);
  const loop = folded.map((ch, c) => ch.map((v, i) => v + SURF_GAIN * (hush[c]?.[i] ?? 0)));
  const peak = Math.max(...loop.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  if (peak <= 0) throw new Error('gulpmoray: silent soundtrack');
  return rotatedWav(loop.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
