import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, BORN_AT, BREACH, BUT_AT, CAUGHT_AT, COPIED_AT, EVERYWHERE_AT, FAD_AT, HATS_AT, HEAD_AT, HER_AT, HE_AT, HIS_HEAD_AT, J27_AT, J27_UP, LOOP_S, NEXT_AT,
  NOBODY_AT, ORCA_AT, OTHER_AT, PHOTOGRAPHER_AT, PUSH, ROW, SALMON_AT, THEN_AT, VANISHED_AT, WHY_AT, wrap,
} from './story';
import { WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  tag: { y: 400, size: 76 },
  question: { y: 600, size: 300 },
  caption: { y: 1200, size: 96 },
} as const;

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short phrases: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start : LOOP_S,
  }));
})();

/**
 * The line on screen at time t, and the word being spoken in it. Nothing
 * before the first word: frame 1 has the chuckle under it, and no writing.
 */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start) word = i;
  });
  return { line, word };
}

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/**
 * Quiet under the voice, one mood a sentence: a splash as the head breaks
 * through at the seam and a silly plop for the hat (the chuckle), a splash
 * for every orca that copies her and bright chirps for the hats everywhere
 * (excited), almost nothing for the fad's end (soft), a sting, the
 * camera's beep and shutter and a whoosh on the push-in (surprised), and a
 * low boom and a cheeky squawk on "BORN" (dramatic).
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: the breach just before frame 1, the hat's plop, a playful ding.
  cue('splash', LOOP_S + BREACH - 0.04, 0.8, 0.14),
  cue('lunge', LOOP_S + BREACH - 0.3, 1.0, 0.08, 0.2),
  cue('powerup', ORCA_AT, 1.3, 0.06),
  cue('eat', SALMON_AT, 0.7, 0.08, 0.2),
  cue('drop', HEAD_AT, 1.4, 0.09),
  // The row: a splash for each one that surfaces, chirps for the hats.
  cue('spotted', AND_AT, 1.2, 0.08),
  ...ROW.filter((s) => s.up > 0).map((s, i) => cue('splash', s.up - 0.05, 1.0 + 0.12 * i, 0.07 + 0.01 * Math.min(i, 3), i % 2 ? 0.3 : -0.3)),
  cue('powerup', COPIED_AT, 1.5, 0.08),
  cue('squawk', HER_AT, 1.6, 0.06, 0.2),
  cue('powerup', HATS_AT, 1.7, 0.08),
  cue('powerup', EVERYWHERE_AT, 2.0, 0.09),
  cue('eat', OTHER_AT + 0.1, 1.3, 0.06, -0.2),
  // The fad's end: hushed, a low drift, the hats going.
  cue('rustle', THEN_AT, 0.35, 0.04),
  cue('powerup', NEXT_AT, 0.45, 0.035),
  cue('suck', FAD_AT, 0.6, 0.04),
  cue('drop', VANISHED_AT, 0.35, 0.045),
  // J27: a sting, his splash, the camera, the push-in.
  cue('spotted', BUT_AT, 1.0, 0.1),
  cue('splash', J27_UP - 0.1, 0.85, 0.11, 0.2),
  cue('click', PHOTOGRAPHER_AT + 0.2, 2.2, 0.07),
  cue('click', PHOTOGRAPHER_AT + 0.32, 2.2, 0.07),
  cue('click', CAUGHT_AT, 1.1, 0.12),
  cue('clang', CAUGHT_AT + 0.02, 1.8, 0.05),
  cue('powerup', J27_AT + 0.1, 1.2, 0.07),
  cue('dash', PUSH.from, 0.9, 0.09, -0.2),
  cue('powerup', HIS_HEAD_AT, 1.6, 0.08),
  // The mystery: a low boom, a hang, a cheeky squawk on "BORN", the swell into the seam.
  cue('boom', NOBODY_AT, 0.45, 0.12),
  cue('clang', WHY_AT, 0.5, 0.06),
  cue('rustle', HE_AT, 0.5, 0.05),
  cue('squawk', BORN_AT + 0.1, 1.4, 0.07, 0.2),
  cue('suck', LOOP_S - 0.55, 0.8, 0.06),
];
