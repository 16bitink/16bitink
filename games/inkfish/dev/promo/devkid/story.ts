import type { SfxId } from '../../../src/audio/recipes';
import { ramp } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "I Remade My Favorite Childhood Game In One Weekend": Dewy remembers (words.ts), told on his screen.
 * Everything is a function of time over LOOP_S. The monitor is a CRT with young Dewy at the start and
 * the end (so the loop seam is invisible) and the laptop in between.
 *
 *   0    CRT: a perch gulps a tiny fish (frame 1 is mid-gulp), young Dewy below
 *   4.2  "tiny fish" -> "eat smaller fish" -> "the BIG fish": three sizes, each eating the last
 *   8.6  "That's the whole game": the big fish gulps on
 *   11.45 "grew up": the CRT morphs into the laptop (0.8 s), young Dewy crossfades to grown-up Dewy
 *   12.3 "forgot about it": an empty window and a blinking caret
 *   14.3 "built my OWN": the pen inks a fish, code types, the wash floods in, it comes alive (16.4)
 *   16.5 "two days": it swallows a big fish that fills the frame, then swells to fill the frame
 *   18.35 "that kid again": the laptop morphs back to the CRT and young Dewy
 */
export const LOOP_S = 19.5;

export const said = (text: string, nth = 0): number => {
  const w = WORDS.filter((x) => x.text === text)[nth];
  if (!w) throw new Error(`"${text}" isn't in the voiceover`);
  return w.start / TEMPO;
};

/** Eating events (when the jaws are shut on the prey). */
export const CYCLE_TE0 = 0.3;
export const CYCLE_S = 1.5;
export const TINY_AT = 4.2;
export const MOUTHFUL_AT = 5.55;
export const PERCH_TE = 6.1;
export const SHARK_AT = 7.05;
export const SHARK_TE = 7.85;
export const BIG_CYCLE_TE0 = 9.4;
export const MORPH_OUT = 11.45;
export const MORPH_IN = 18.35;
export const MORPH_S = 0.8;
export const EMPTY_AT = 12.3;
export const BUILD_AT = 14.3;
export const ALIVE_AT = 16.4;
export const SWALLOW_AT = 17.4;

/** CRT amount (0 laptop .. 1 CRT) at t. */
export const crtAmount = (t: number): number => (t < 15 ? 1 - ramp(t, MORPH_OUT, MORPH_OUT + MORPH_S) : ramp(t, MORPH_IN, MORPH_IN + MORPH_S));

/** Dewy's pose changes: each pose from its time. Kid poses never lip-sync. */
export const POSES: readonly { readonly key: 'kid-wonder' | 'moved' | 'proud' | 'laughing'; readonly at: number }[] = [
  { key: 'kid-wonder', at: 0 },
  { key: 'moved', at: 11.5 },
  { key: 'proud', at: 15.4 },
  { key: 'laughing', at: 18.15 },
  { key: 'kid-wonder', at: 18.85 },
];

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,…!]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? Math.min(groups[i + 1]![0]!.start / TEMPO, g[g.length - 1]!.end / TEMPO + 0.6) : LOOP_S,
  }));
})();

export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

/** 1 while a word is being said (the bob's amount). */
export const talking = (t: number): number => (WORDS.some((w) => t >= w.start / TEMPO - 0.05 && t < w.end / TEMPO + 0.1) ? 1 : 0);

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  { id: 'eat', t: CYCLE_TE0, pitch: 1, gain: 0.3, pan: 0 },
  { id: 'eat', t: CYCLE_TE0 + 1.5, pitch: 1.05, gain: 0.3, pan: 0 },
  { id: 'eat', t: CYCLE_TE0 + 3, pitch: 0.95, gain: 0.3, pan: 0 },
  { id: 'eat', t: PERCH_TE, pitch: 1.1, gain: 0.35, pan: 0 },
  { id: 'eatBig', t: SHARK_TE, pitch: 0.9, gain: 0.4, pan: 0 },
  { id: 'eatBig', t: BIG_CYCLE_TE0, pitch: 0.85, gain: 0.3, pan: 0 },
  { id: 'eatBig', t: BIG_CYCLE_TE0 + 1.5, pitch: 0.9, gain: 0.3, pan: 0 },
  { id: 'suck', t: MORPH_OUT, pitch: 1.2, gain: 0.2, pan: 0 },
  { id: 'click', t: BUILD_AT + 0.05, pitch: 1, gain: 0.25, pan: 0 },
  { id: 'powerup', t: ALIVE_AT + 0.05, pitch: 1.1, gain: 0.25, pan: 0 },
  { id: 'eatBig', t: SWALLOW_AT, pitch: 0.8, gain: 0.45, pan: 0 },
  { id: 'grow', t: SWALLOW_AT + 0.4, pitch: 1, gain: 0.3, pan: 0 },
  { id: 'suck', t: MORPH_IN, pitch: 0.9, gain: 0.2, pan: 0 },
];
