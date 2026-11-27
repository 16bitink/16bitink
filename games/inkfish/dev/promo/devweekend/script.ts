import type { SfxId } from '../../../src/audio/recipes';
import { LOOP_S, SPEECH_WORDS, type Word } from './words';

/**
 * "I Built This In One Weekend. Here's Every Hour": the beats (loop time, s), the captions cut from the voiceover
 * and the sound cues. The clock keys use the real times of the weekend: tail 6:42 pm, squid 10:23 pm, sharks 10:56 pm,
 * Start button Sunday 5:43 pm (it is the one thing the to-do list never has).
 */
export { LOOP_S };

/** Where each beat starts. */
export const BEAT = {
  hook: 0, fish: 2.15, tail: 5.5, squid: 7.95, sharks: 11.1, ocean: 13.1, map: 16.9, back: 20.4,
} as const;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of SPEECH_WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,!?…:]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: i === 0 ? 0 : g[0]!.start,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
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

/** Dewy's moods: the pose from `at` on. */
export const MOODS = [
  { at: 0, key: 'proud' }, { at: 2.3, key: 'neutral' }, { at: 5.7, key: 'proud' }, { at: 8.0, key: 'neutral' },
  { at: 13.1, key: 'proud' }, { at: 17.2, key: 'frustrated' }, { at: 18.7, key: 'laughing' },
] as const;

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}
const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The game's own effects, quiet under the voice. */
export const SOUNDS: readonly SoundCue[] = [
  // The squid's gulp in the hook, and again at the loop's end.
  cue('suck', 0.1, 0.7, 0.5, 0.1), cue('eat', 0.45, 0.5, 0.55, 0.1),
  cue('suck', 20.5, 0.7, 0.5, 0.1),
  // Saturday 4 pm: the pen, the stiff wobble.
  cue('click', 2.3, 1.2, 0.35), cue('rustle', 2.9, 1.1, 0.25, -0.2), cue('click', 4.3, 0.9, 0.3), cue('click', 4.7, 0.9, 0.3), cue('click', 5.1, 0.9, 0.3),
  // The tail: bones, the swing, the wash.
  cue('click', 5.95, 1.3, 0.35), cue('lash', 6.5, 1.0, 0.3, -0.2), cue('lash', 6.85, 1.1, 0.3, -0.2), cue('powerup', 7.05, 1.0, 0.45),
  // Eight arms: a tick for each.
  ...Array.from({ length: 8 }, (_, i) => cue('click', 8.5 + i * 0.22, 0.9 + i * 0.06, 0.32, 0.2)), cue('grow', 10.4, 0.8, 0.4),
  // The shark fin.
  cue('splash', 11.6, 0.8, 0.4, -0.3), cue('lunge', 12.0, 0.6, 0.45), cue('splash', 12.4, 0.9, 0.35, 0.3),
  // 100 levels racing, the ocean filling up.
  ...Array.from({ length: 7 }, (_, i) => cue('click', 13.35 + i * 0.2, 1.0 + i * 0.05, 0.25)),
  cue('squawk', 15.0, 1.1, 0.25, 0.3), cue('splash', 15.55, 0.8, 0.3, -0.3), cue('rustle', 16.2, 0.9, 0.3), cue('rustle', 16.5, 1.0, 0.3, 0.2),
  // The cursor clicks on the map and nothing happens.
  cue('click', 17.8, 1.0, 0.3), cue('click', 18.3, 0.9, 0.3), cue('click', 18.75, 0.85, 0.3), cue('hurt', 19.0, 1.4, 0.12),
];
