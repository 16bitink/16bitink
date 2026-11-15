import { foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS, VOICE_LIFT } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, starting with the loop) on top,
 * InkSnake's own sound effects quiet under him, one mood per beat (story.ts
 * SOUNDS): tense through the bite, a thud and a hush at the collapse, comic
 * from the wake-up. Folded into a loop and set to peak at −4 dB. His last
 * word ("Because") runs up to the loop point, so the loop finishes his
 * sentence. The quiet sad beat rides a gain envelope (story.ts VOICE_LIFT),
 * 80 ms ramps at the word edges, as cobra/audio.ts does.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 0.9;
const PEAK = 10 ** (-4 / 20);
const RAMP_S = 0.08;

const gainOf = (db: number): number => 10 ** (db / 20);

/** The voice, straight to the output, through the gain envelope. */
async function addLiftedVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  const g = level.gain;
  g.setValueAtTime(1, 0);
  for (const lift of VOICE_LIFT) {
    const target = gainOf(lift.db);
    g.setValueAtTime(1, Math.max(0, lift.from - RAMP_S));
    g.linearRampToValueAtTime(target, lift.from);
    g.setValueAtTime(target, lift.to);
    g.linearRampToValueAtTime(1, lift.to + RAMP_S);
  }
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

export async function renderBadgerAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addLiftedVoice(ctx);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const peak = Math.max(...loop.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  if (peak <= 0) throw new Error('badger: silent soundtrack');
  return rotatedWav(loop.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
