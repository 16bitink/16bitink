import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This Snake Fakes Its Own Death": narrated, a pure function of time, every
 * beat timed from the words. The eastern hognose (InkSnake chapter 2, the
 * Pine Barrens) when a predator finds it: first it bluffs (flattens and
 * spreads its neck, hisses, strikes with its mouth shut), then it rolls
 * belly-up, mouth open, tongue hanging out, and gives off a foul musk; turned
 * right side up it rolls over again, and once the predator has gone it lifts
 * its head to check. Harmless to people. Never blood, never a bite, never a
 * hand.
 *
 * Two viewpoints: the death beats low on the sand at the snake's eye level
 * (the hognose side on, the fox's face sniffing in), the arrival and the
 * bluff from above as in the game.
 *
 *   0     frame 1, low: belly-up, mouth gaping, tongue hanging in the sand,
 *         the Red Fox's face sniffing in over it (hook)
 *   2.45  above: "A fox shows up…": the hognose alive in the sand, the fox walks in
 *   3.95  "so first, it bluffs: Neck flat, a huge HISS!": the neck spread
 *         wide and flat, false strikes with the mouth shut, the hiss
 *   8.53  "Fox isn't buying it.": the fox steps closer, the hood droops
 *   9.84  low again: "So it rolls over… tongue out…": belly-up, mouth open, tongue
 *   12.14 "it even STINKS!": faint stink lines; the fox jerks back
 *   13.68 "Flip it back over?": the fox's nose nudges it right side up
 *   14.93 "It rolls right BACK!": over it goes again, with a thud
 *   16.43 "Drama queen.": the fox turns away and leaves
 *   17.57 "Then it peeks…": the head turns up and lifts to look;
 *         "coast is clear…": it rolls right side up; the call to action
 *   20.1  "and that's how": the fox comes back, it flops over: frame 1
 */
export const LOOP_S = 21;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 3, 4, 4, 2, 3, 4, 4, 2, 3, 4, 4, 2, 3, 3, 3];
const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

/** The moments the picture hangs on (word indices into WORDS). */
export const AT = {
  fox: startOf(7),
  shows: startOf(8),
  bluff: startOf(13),
  neck: startOf(14),
  flat: startOf(15),
  huge: startOf(17),
  hiss: startOf(18),
  notBuying: startOf(19),
  buying: startOf(21),
  rolls: startOf(25),
  over: startOf(26),
  tongue: startOf(27),
  stinks: startOf(31),
  flip: startOf(32),
  backOver: startOf(35),
  rollsAgain: startOf(37),
  back: startOf(39),
  drama: startOf(40),
  queen: startOf(41),
  peeks: startOf(44),
  coast: startOf(45),
  clear: startOf(47),
  and: startOf(48),
} as const;
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts: up to the view from above for the fox's arrival, and down to the low view for the roll. */
export const CUT = { arrive: startOf(6) - 0.1, low: startOf(23) - 0.1 } as const;
/** "and that's how": the fox comes back and the hognose flops over, running into frame 1. */
export const RETURN = startOf(48) + 0.15;

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** When the hook's words come up over the last of the loop, ready for frame 1. */
const HOOK_FROM = LOOP_S - 0.24;

/** The voiceover cut into short lines, each on screen from its first word until the next takes over. */
export const LINES: readonly Line[] = LINE_WORDS.map((n, i) => {
  const first = FIRST[i]!;
  return {
    words: WORDS.slice(first, first + n),
    from: i === 0 ? 0 : startOf(first),
    to: i + 1 < LINE_WORDS.length ? startOf(FIRST[i + 1]!) : HOOK_FROM,
  };
});

/** The two hook lines stand together from frame 1, in full, so it works with the sound off. */
export const HOOK_LINES = 2;
export const HOOK_TO = LINES[HOOK_LINES]!.from;

export const hookAlpha = (t: number): number => {
  const u = wrap(t);
  return u < HOOK_TO ? 1 : ramp(u, HOOK_FROM, LOOP_S - 0.04);
};

export const TEXT = {
  hook: { y: 380, gap: 128, size: 136 },
  line: { y: 452, size: 128 },
} as const;

/** The line on screen after the hook, and the word being said in it (−1 none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

/** The word being said in the hook lines, counted through both (−1 none). */
export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, w, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

// ---------------------------------------------------------------- the call to action

export const CTA_AT = startOf(42) - 0.05;
/** Gone as the fox comes back. */
export const CTA_END = RETURN - 0.02;

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '10 levels free', y: 790, size: 150 },
  small: { text: 'tap the channel name', y: 895, size: 84 },
  arrow: { from: { x: 236, y: 945 }, c0: { x: 262, y: 1160 }, c1: { x: 220, y: 1360 }, tip: { x: 160, y: 1480 } },
} as const;

// ---------------------------------------------------------------- the sound

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** Quiet under the voice, one mood per beat: the creeping fox, the hiss, the thunk of the roll, the stink, the thud of rolling back. */
export const SOUNDS: readonly SoundCue[] = [
  cue('bump', 0.05, 0.5, 0.3),
  cue('steps', CUT.arrive + 0.1, 0.8, 0.25, 0.3),
  cue('steps', CUT.arrive + 0.8, 0.75, 0.22, 0.2),
  cue('appear', AT.fox, 0.7, 0.3),
  cue('strike', AT.hiss - 0.12, 0.5, 0.5),
  cue('strike', AT.hiss + 0.12, 0.45, 0.45),
  cue('strike', AT.flat + 0.1, 0.8, 0.3, -0.2),
  cue('miss', AT.buying, 1.2, 0.2, 0.3),
  cue('bump', AT.rolls + 0.2, 0.6, 0.55),
  cue('plop', AT.tongue + 0.05, 0.9, 0.3),
  cue('squeak', AT.stinks + 0.1, 1.4, 0.3, 0.3),
  cue('squeeze', AT.stinks - 0.1, 0.6, 0.3),
  cue('steps', AT.flip, 0.8, 0.25, 0.2),
  cue('bump', AT.backOver + 0.1, 0.9, 0.35),
  cue('bump', AT.back - 0.1, 0.4, 0.7),
  cue('yowl', AT.back + 0.05, 1.5, 0.18, 0.3),
  cue('tick', AT.drama + 0.1, 1, 0.25),
  cue('steps', AT.queen + 0.4, 0.7, 0.22, 0.3),
  cue('click', AT.peeks, 1.2, 0.25),
  cue('plop', AT.coast, 1, 0.25),
  cue('appear', AT.clear, 0.8, 0.28),
  cue('steps', AT.and + 0.1, 0.8, 0.25, 0.3),
  cue('bump', RETURN + 0.45, 0.5, 0.5),
];
