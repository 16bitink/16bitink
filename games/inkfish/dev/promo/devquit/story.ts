import { WORDS, LOOP_S, type Word } from './words';

/** Dewy's moods and the screen's beats, in voice time (seconds, see words.ts). Every beat starts on a word. */
export const BEAT = {
  /** Level 6, paused, the playtester's message. */
  pause: 0,
  /** The grid of level thumbnails that look alike. */
  grid: 3.4,
  /** Starting tiny, level after level. */
  tiny: 6.3,
  /** Dewy types; the thumbnails flip one by one. */
  flip: 11.9,
  fleet: 15.0,
  bait: 15.95,
  hunter: 16.85,
  /** Back on the paused level, the cursor over Quit. */
  quit: 18.6,
} as const;

export type Mood = 'neutral' | 'proud' | 'frustrated' | 'laughing' | 'hurt';
/** Pose changes: hurt → frustrated → proud → neutral → laughing → neutral (cheeky). */
export const MOODS: readonly { readonly at: number; readonly pose: Mood }[] = [
  { at: 0, pose: 'hurt' },
  { at: 6.3, pose: 'frustrated' },
  { at: 9.0, pose: 'proud' },
  { at: 11.9, pose: 'neutral' },
  { at: 15.0, pose: 'laughing' },
  { at: 18.5, pose: 'neutral' },
];

/** The phrases of the voiceover, as words per row. */
const PHRASES: readonly (readonly number[])[] = [[3], [4], [4], [5], [1], [5], [4], [3], [4], [3], [3], [3], [3], [5], [3], [4]];

export interface Line {
  readonly rows: readonly (readonly Word[])[];
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

export const LINES: readonly Line[] = (() => {
  let next = 0;
  const groups = PHRASES.map((rows) => rows.map((n) => WORDS.slice(next, (next += n))));
  return groups.map((rows, i) => ({ rows, words: rows.flat(), from: rows[0]![0]!.start, to: i + 1 < groups.length ? groups[i + 1]![0]![0]!.start : LOOP_S }));
})();

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** The caption line on screen at t and the word being said. Nothing before the first word. */
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

export interface Cue {
  readonly id: 'click' | 'lose' | 'drop' | 'hooked' | 'splash' | 'frenzy' | 'eat' | 'spotted' | 'lunge' | 'powerup' | 'grow' | 'squawk';
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}
const cue = (id: Cue['id'], t: number, pitch = 1, gain = 0.07, pan = 0): Cue => ({ id, t, pitch, gain, pan });
/** The game's own effects, quiet under the voice. */
export const SOUNDS: readonly Cue[] = [
  cue('click', 3.45, 1.2), cue('click', 5.3, 0.9, 0.09),
  cue('lose', 6.35, 0.8, 0.07),
  cue('drop', 7.4, 1.4, 0.05), cue('drop', 8.45, 1.4, 0.05), cue('drop', 9.5, 1.4, 0.05),
  cue('eat', 11.1, 1.2, 0.08), cue('grow', 11.2, 1.1, 0.06),
  ...[12.2, 12.4, 12.55, 12.7, 12.95].map((t) => cue('click', t, 1.6, 0.03)),
  ...Array.from({ length: 20 }, (_, i) => cue('drop', 13.0 + i * 0.095, 1.3 + (i % 5) * 0.08, 0.035, ((i % 5) - 2) * 0.15)),
  cue('hooked', 15.1, 1, 0.08), cue('splash', 15.45, 1.1, 0.07),
  cue('frenzy', 16.0, 1, 0.07), cue('eat', 16.25, 1.3, 0.06), cue('eat', 16.4, 1.5, 0.06), cue('eat', 16.55, 1.2, 0.06),
  cue('spotted', 16.9, 0.9, 0.08), cue('lunge', 17.5, 0.8, 0.08),
  cue('squawk', 18.9, 1.3, 0.04), cue('click', 20.5, 1.1, 0.05),
];

export { LOOP_S };
