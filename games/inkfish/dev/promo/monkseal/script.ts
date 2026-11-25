import type { SfxId } from '../../../src/audio/recipes';
import {
  BULGE, BUT_AT, CATCH_AT, DART, EEL_AT, EEL2_AT, EXIT_AT, FINE_AT, FOUR_AT, GULP_AT, LOOP_S, MAYBE_AT, NOBODY_AT, NOSE_AT, POP_AT, PULL1_AT, PULL2_AT, PULL3_AT, SCIENTISTS_AT, SNEEZE_AT, SWALLOWED_AT,
  TEENAGE_AT, THE_SEAL_AT, THREE_AT, TOOK_AT, TOTALLY_AT, TREND_AT, WHY_AT, WRONG_AT, said, wrap,
} from './story';
import { WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). The captions sit in the sky, clear of the faces. */
export const TEXT = {
  caption: { y: 366, size: 120 },
  caption2: { y: 480, size: 120 },
  question: { y: 600, size: 210 },
  nose: { y: 666, size: 72 },
  mouth: { y: 1046, size: 66 },
} as const;

export interface Line {
  readonly words: readonly Word[];
  /** The words by row, top to bottom: one or two. */
  readonly rows: readonly (readonly Word[])[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover's phrases, as how many words are in each row: two to five words a phrase, never a word left alone. */
const PHRASES: readonly (readonly number[])[] = [
  [3], [5], [3], [3], [4], // This seal has / an EEL up its nose! / Scientists in Hawaii / have seen it / three or four times.
  [4], [2], [2], [2], // They catch the seal, / gently pull… / and pull… / and PULL!
  [2], [2], [5], // The seal? / Totally fine. / Maybe the eel was hiding…
  [3], [2, 3], // or got swallowed, / and took + the WRONG exit!
  [2, 2], [4], // One scientist + compared it / to a teenage trend.
  [2], [3], // But honestly… / nobody knows why
];

export const LINES: readonly Line[] = (() => {
  let next = 0;
  const groups = PHRASES.map((rows) => rows.map((n) => WORDS.slice(next, (next += n))));
  return groups.map((rows, i) => ({ words: rows.flat(), rows, from: rows[0]![0]!.start, to: i + 1 < groups.length ? groups[i + 1]![0]![0]!.start : LOOP_S }));
})();

/** The line on screen at time t, and the word being spoken in it. Nothing before the first word. */
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
 * Quiet under the voice, one mood a sentence: a silly squelch and a ding for
 * the eel (excited), a pop per seal (curious), creaks that climb with each
 * pull and a loud POP (dramatic), birdsong chirps and a sneeze (a chuckle), a
 * sneaky dart (mischievous), a gulp, a wrong-answer buzz (the exit), a cool
 * twang (sarcastic), and near silence with one squelch for the mystery.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook.
  cue('yuck', EEL_AT - 0.04, 1.4, 0.08),
  cue('powerup', NOSE_AT, 1.4, 0.06),
  cue('lash', 0.1, 1.5, 0.03, 0.2),
  // The line-up: the camera backs off, a pop a seal.
  cue('dash', SCIENTISTS_AT - 0.1, 0.7, 0.06),
  cue('drop', THREE_AT - 0.1, 1.0, 0.1, 0.3),
  cue('drop', said('or'), 1.2, 0.1, 0.1),
  cue('drop', FOUR_AT, 1.45, 0.1, 0.35),
  cue('spotted', said('times.') + 0.1, 1.4, 0.05),
  // The pull: hands on, three rising creaks, the pop, a tumble.
  cue('rustle', CATCH_AT, 0.8, 0.1, -0.2),
  cue('suck', PULL1_AT - 0.02, 0.7, 0.09),
  cue('suck', PULL2_AT - 0.02, 0.95, 0.11),
  cue('suck', PULL3_AT - 0.02, 1.25, 0.13),
  cue('eatBig', POP_AT, 1.6, 0.16),
  cue('boom', POP_AT + 0.02, 1.8, 0.08),
  cue('squawk', POP_AT + 0.16, 1.2, 0.08, 0.4),
  cue('smash', POP_AT + 0.5, 0.8, 0.08, 0.5),
  // Totally fine: bright, then the sneeze.
  cue('powerup', TOTALLY_AT - 0.1, 1.6, 0.08),
  cue('win', FINE_AT, 1.5, 0.04),
  cue('splash', SNEEZE_AT, 1.5, 0.16),
  cue('squawk', SNEEZE_AT - 0.02, 0.8, 0.07),
  // Hiding: hushed, then the dart.
  cue('rustle', MAYBE_AT, 0.5, 0.05),
  cue('spotted', EEL2_AT, 0.7, 0.05),
  cue('dash', DART.from, 1.4, 0.14),
  cue('yuck', DART.from + 0.32, 1.5, 0.09),
  // The wrong exit: a slurp, a gulp, a wriggle up the cheek, a buzzer, the pop.
  cue('dash', SWALLOWED_AT - 0.1, 1.2, 0.06, -0.2),
  cue('suck', GULP_AT - 0.2, 0.9, 0.09),
  cue('eat', GULP_AT, 0.5, 0.14),
  cue('lash', BULGE.from + 0.1, 0.7, 0.06, 0.2),
  cue('rustle', TOOK_AT + 0.3, 1.3, 0.06, 0.2),
  cue('clang', WRONG_AT, 0.7, 0.1),
  cue('lose', WRONG_AT + 0.05, 1.5, 0.04),
  cue('eatBig', EXIT_AT, 1.7, 0.13, 0.1),
  // The trend.
  cue('click', said('scientist'), 0.9, 0.06),
  cue('drop', TEENAGE_AT + 0.12, 1.5, 0.12, 0.3),
  cue('powerup', TEENAGE_AT + 0.16, 1.1, 0.07, 0.3),
  cue('clang', TREND_AT, 2.2, 0.06, 0.4),
  // Nobody knows: the hush, one squelch of the eel swinging into the seam.
  cue('rustle', BUT_AT, 0.35, 0.04),
  cue('clang', NOBODY_AT, 0.5, 0.05),
  cue('drop', WHY_AT, 0.5, 0.06),
  cue('lash', LOOP_S - 0.3, 1.2, 0.04),
];

export { THE_SEAL_AT };
