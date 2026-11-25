import type { SfxId } from '../../../src/audio/recipes';
import { AGAIN, AT, IMPACT, LAND, LOOP_S, PASS_S, PASSES, PECKS, REACH, sceneFrom, wrap } from './story';
import { CHUCKLE, WORDS, type Word } from './words';

/** What's written over the picture (the hook, the spoken phrases) and the sound effects under the voice. */

/** Every text's baseline and size, all inside the band the apps' buttons leave clear (y 270 to 1250), above the crow. */
export const TEXT = {
  hook1: { y: 366, size: 112 },
  hook2: { y: 486, size: 122 },
  caption: { y: 392, size: 108 },
  /** A phrase on two rows. */
  row1: { y: 360, size: 104 },
  row2: { y: 470, size: 104 },
  /** A phrase of one word: CRUNCH! */
  shout: { y: 392, size: 148 },
} as const;

/** The hook: the first sentence, on two lines at the top, over frame 1. */
export const HOOK_WORDS: readonly Word[] = WORDS.slice(0, 6);
export const HOOK_ROWS: readonly (readonly Word[])[] = [HOOK_WORDS.slice(0, 4), HOOK_WORDS.slice(4)];

export interface Line {
  /** One or two rows of words. */
  readonly rows: readonly (readonly Word[])[];
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover after the hook as whole phrases: the words in each row. */
const PHRASES: readonly (readonly number[])[] = [
  [3], // In Sendai, Japan,
  [2, 4], // walnuts are / too hard to crack.
  [5], // So a crow drops one
  [3], // on the road…
  [2], // and waits.
  [1], // CRUNCH!
  [1], // Missed?
  [4], // It moves the nut…
  [3, 3], // right in front / of a TIRE!
  [4], // But now lunch is
  [3, 2], // in the middle / of traffic…
  [3, 3], // so some wait / at the CROSSWALK,
  [4], // until the cars STOP!
  [2, 3], // Better than / most people do,
  [1], // because (the loop's first words follow it)
];

export const LINES: readonly Line[] = (() => {
  const said = WORDS.slice(HOOK_WORDS.length);
  let i = 0;
  const rowsOf = PHRASES.map((counts) => counts.map((n) => said.slice(i, (i += n))));
  // "because" never stands alone: the loop's first words wait beside it, and the seam says them.
  const last = rowsOf[rowsOf.length - 1]!;
  rowsOf[rowsOf.length - 1] = [[...last[0]!, ...[['these', 0], ['crows…', 1]].map(([text, k]) => {
    const w = HOOK_WORDS[k as number]!;
    return { text: text as string, start: w.start + LOOP_S, end: w.end + LOOP_S };
  })]];
  return rowsOf.map((rows, n) => ({ rows, words: rows.flat(), from: rows[0]![0]!.start, to: n + 1 < rowsOf.length ? rowsOf[n + 1]![0]![0]!.start : LOOP_S }));
})();

/** The hook is up from the loop's first frame until the first phrase. */
export const HOOK_TO = LINES[0]!.from;

function spoken(words: readonly Word[], u: number): number {
  let word = -1;
  words.forEach((w, i) => {
    if (u >= w.start) word = i;
  });
  return word;
}

/** The hook's word being spoken (0 .. 5, -1 before the first), or null once it's gone. */
export function hookAt(t: number): number | null {
  const u = wrap(t);
  return u < HOOK_TO ? spoken(HOOK_WORDS, u) : null;
}

/** The phrase on screen at time t, and the word being spoken in it. */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  return line ? { line, word: spoken(line.words, u) } : null;
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** A whoosh for each car in the traffic, panned the way it goes. */
const WHOOSHES: readonly SoundCue[] = PASSES.map((p) => cue('lunge', Math.max(sceneFrom('traffic'), p.from + PASS_S * 0.3), p.lane === 'near' ? 0.55 : 0.75, p.lane === 'near' ? 0.15 : 0.08, p.dir * 0.3));

/**
 * Quiet under the voice, one mood a beat: a low rumble of tyre and a bright
 * chime for the hook; a soft caw for Sendai; tok, tok, tok on the shell and a
 * cross squawk; a drop and a bounce on the road; foot taps for the wait; a
 * smash, a crack and a boom on CRUNCH; a whoosh and a squeak for the miss; a
 * scrape and a click as the nut is set at the tyre; whooshes for the traffic;
 * the light's chirps and soft steps on the crossing; a horn for the phone
 * walker; the tyre rolling in again.
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('rustle', 0.05, 0.5, 0.12, -0.3),
  cue('click', AT.cars, 1.0, 0.18, -0.1),
  cue('powerup', AT.nutcrackers, 1.25, 0.09),
  cue('squawk', AT.in, 0.8, 0.07, 0.1),
  ...PECKS.map((p, i) => cue('click', p, 1.5 + i * 0.1, 0.32, 0.2)),
  ...PECKS.map((p, i) => cue('clang', p, 2 + i * 0.1, 0.05, 0.2)),
  cue('squawk', AT.crack + 0.28, 0.65, 0.09, -0.1),
  cue('drop', AT.drops, 1.3, 0.1, 0.1),
  cue('suck', AT.drops + 0.05, 1.3, 0.05, 0.1),
  cue('click', LAND, 0.9, 0.3, 0.2),
  cue('click', LAND + 0.3, 1.1, 0.16, 0.2),
  ...[0, 1, 2].map((i) => cue('click', sceneFrom('wait') + 0.2 + i * 0.26, 0.6, 0.14, -0.1)),
  cue('lunge', AT.crunch - 0.14, 0.6, 0.16, -0.3),
  cue('smash', IMPACT, 0.9, 0.32),
  cue('click', IMPACT + 0.02, 0.6, 0.34),
  cue('boom', IMPACT + 0.01, 0.45, 0.2),
  cue('eat', IMPACT + 0.42, 1.1, 0.08),
  cue('lunge', AT.missed - 0.1, 0.65, 0.22),
  cue('spotted', AT.missed + 0.3, 1.1, 0.08, 0.2),
  cue('rustle', AT.moves - 0.04, 0.8, 0.16, -0.1),
  cue('rustle', AT.right, 0.9, 0.14, 0.1),
  cue('click', AT.tire - 0.06, 0.8, 0.28, 0.2),
  cue('powerup', AT.tire + 0.1, 1.45, 0.07),
  ...WHOOSHES,
  cue('squawk', CHUCKLE.start + 0.02, 1.15, 0.06),
  cue('squawk', CHUCKLE.start + 0.2, 1.25, 0.05),
  cue('lunge', AT.so2 + 0.3, 0.7, 0.1, 0.3),
  cue('spotted', AT.until, 1.5, 0.08, -0.3),
  cue('spotted', AT.until + 0.3, 1.5, 0.06, -0.3),
  cue('free', AT.cars2, 0.7, 0.05, 0.3),
  ...[0, 1, 2].map((i) => cue('click', AT.stop - 0.1 + i * 0.15, 0.7, 0.1)),
  cue('eat', REACH, 1.2, 0.1, 0.2),
  cue('hooked', AT.better + 0.3, 0.6, 0.08, 0.4),
  cue('yuck', AT.people, 1.2, 0.05),
  cue('rustle', AGAIN + 0.15, 0.5, 0.14, -0.3),
];
