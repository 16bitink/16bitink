import type { SfxId } from '../../../src/audio/recipes';
import { rulerAlpha } from './floor';
import {
  AFTER_AT, AGAIN_AT, AQUARIUM_AT, CRACK_AT, CROSSED_AT, CUTS, DRAIN_AT, EMPTY_AT, FLOOR_AT, FOUND_AT, INKY_AT, INKY2_AT, JUST_AT, LEAVE_AT, LID_AT, LOOP_S, MESSAGE_AT, NEW_AT,
  OCEAN_AT, OPEN_AT, OUT_AT, PIPE_AT, SIX_AT, SQUEEZED_AT, TRAIL_AT, WIDE_AT, WIPE_FROM, WIPE_MID, wrap, YEAR_AT, sceneAt, said,
} from './story';
import { WORDS, type Word } from './words';

/** What's written over the picture (captions and the one label), and the sound effects under the voice. */

/** The spoken line's baseline and size, screen px. */
export const CAPTION_Y = 1200;
export const CAPTION_SIZE = 96;

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into phrases, by how many words each takes: never a lone word left over. */
const PHRASES = [3, 4, 3, 5, 3, 3, 3, 4, 3, 4, 3, 2, 3, 3, 3, 3, 3, 3, 3] as const;

export const LINES: readonly Line[] = (() => {
  const starts = PHRASES.map((_, i) => PHRASES.slice(0, i).reduce<number>((sum, n) => sum + n, 0));
  const groups = PHRASES.map((n, i) => WORDS.slice(starts[i]!, starts[i]! + n));
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the loop's first frame.
    from: i === 0 ? 0 : g[0]!.start,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((best, w, i) => (u >= w.start ? i : best), -1) };
}

/** The drain's width, over the ruler. */
export const DRAIN_LABEL = { text: '6 in (15 cm)', x: 540, y: 1084, size: 80 } as const;
export const drainLabelAlpha = (t: number): number => (sceneAt(t).scene === 'drain' ? rulerAlpha(wrap(t)) : 0);

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });
const cutAt = (i: number): number => CUTS[i]!.at;
/** Drops falling, `n` of them from `t`, `gap` apart. */
const drops = (t: number, n: number, gap: number, gain = 0.06): SoundCue[] => Array.from({ length: n }, (_, i) => cue('drop', t + i * gap, 1.3 + 0.35 * ((i * 7) % 3), gain, ((i * 5) % 7) / 10 - 0.3));
/** Wet steps of the arms over the tiles. */
const STEPS = Array.from({ length: 6 }, (_, i) => cue('suck', CROSSED_AT + i * 0.17, 0.95 + 0.12 * (i % 2), 0.1, i % 2 ? 0.3 : -0.3));

/**
 * Quiet under the voice: it does the talking. Wet heave and drips in the
 * hook; a hush of sea at the map; a tense pulse as the arm creeps out; a
 * stretchy squeeze and a pop; padding wet steps; a ruler's clack, a gulping
 * pour; the pipe's rush and a great splash into the sea with a cheer of
 * bubbles; a comic tick of a morning; a paper rustle and a deflating shrug;
 * a soft low sea; and the whoosh of the arm back into the hook.
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('splash', 0.02, 0.8, 0.24, -0.1),
  cue('suck', 0.2, 0.5, 0.18),
  ...drops(0.5, 4, 0.19),
  cue('lash', OUT_AT, 0.8, 0.16, 0.3),
  cue('suck', OUT_AT + 0.06, 0.45, 0.22),
  cue('clang', AQUARIUM_AT + 0.1, 0.7, 0.1, 0.4),
  ...drops(AQUARIUM_AT + 0.25, 2, 0.2),
  // The map, the hall: hush.
  cue('dash', cutAt(1), 0.5, 0.12),
  cue('drop', NEW_AT + 0.1, 0.8, 0.1),
  cue('drop', NEW_AT + 0.62, 0.8, 0.07),
  cue('boom', YEAR_AT, 0.3, 0.14),
  cue('drop', YEAR_AT + 0.42, 1.4, 0.06, -0.3),
  // The gap: a low pulse, a creeping rustle.
  cue('clang', LID_AT + 0.12, 1.3, 0.06, -0.2),
  cue('boom', OPEN_AT - 0.1, 0.26, 0.2),
  cue('rustle', OPEN_AT, 0.45, 0.08, -0.3),
  cue('boom', JUST_AT - 0.05, 0.27, 0.2),
  cue('suck', JUST_AT + 0.2, 1.1, 0.1, -0.3),
  cue('boom', CRACK_AT - 0.06, 0.28, 0.22),
  cue('suck', CRACK_AT + 0.25, 0.9, 0.12, -0.2),
  // Squeezed through, and out with a pop.
  cue('rustle', INKY_AT, 0.4, 0.18),
  cue('suck', SQUEEZED_AT, 0.4, 0.24),
  cue('rustle', SQUEEZED_AT + 0.2, 0.55, 0.16, 0.2),
  cue('drop', said('out,') + 0.04, 0.5, 0.3),
  cue('splash', said('out,') + 0.08, 1.1, 0.16),
  ...STEPS,
  cue('drop', FLOOR_AT, 1.5, 0.06, 0.2),
  // The drain, the ruler, the pour, the eye's blink.
  cue('drop', FOUND_AT + 0.2, 0.7, 0.14),
  cue('suck', DRAIN_AT + 0.1, 0.6, 0.16),
  cue('click', SIX_AT, 0.8, 0.28),
  cue('click', SIX_AT + 0.05, 1.2, 0.16),
  cue('suck', SIX_AT + 0.3, 0.42, 0.26),
  cue('suck', WIDE_AT - 0.1, 0.36, 0.26),
  cue('drop', WIDE_AT + 0.16, 1.7, 0.14),
  cue('drop', WIDE_AT + 0.5, 0.45, 0.22),
  // Down the pipe and out into the sea.
  cue('dash', PIPE_AT - 0.06, 0.8, 0.22, -0.3),
  cue('dash', PIPE_AT + 0.35, 1.0, 0.2),
  cue('dash', PIPE_AT + 0.75, 1.25, 0.22, 0.3),
  cue('splash', OCEAN_AT - 0.04, 0.7, 0.38),
  cue('boom', OCEAN_AT - 0.02, 0.5, 0.18),
  cue('powerup', OCEAN_AT + 0.1, 0.9, 0.16),
  ...drops(OCEAN_AT + 0.35, 4, 0.1, 0.07),
  // Morning: a quick comic cut; a gasp; the trail.
  cue('click', cutAt(9), 1.1, 0.14),
  cue('spotted', EMPTY_AT - 0.05, 1.0, 0.1),
  cue('dash', said('and', 2) - 0.08, 1.4, 0.1),
  cue('drop', TRAIL_AT, 0.7, 0.1),
  // The note, the shrug.
  cue('rustle', LEAVE_AT - 0.5, 1.5, 0.14, -0.4),
  cue('rustle', LEAVE_AT - 0.1, 1.7, 0.1, -0.4),
  cue('lose', MESSAGE_AT + 0.02, 1.2, 0.08),
  cue('rustle', MESSAGE_AT, 0.8, 0.1),
  // The deep: soft and low; then the arm sweeps in.
  cue('dash', INKY2_AT - 0.1, 0.4, 0.14),
  ...drops(INKY2_AT + 0.4, 3, 0.32, 0.06),
  cue('boom', AGAIN_AT, 0.24, 0.12),
  cue('suck', WIPE_FROM + 0.1, 0.45, 0.16, -0.4),
  cue('dash', AFTER_AT - 0.1, 0.6, 0.2, -0.2),
  cue('suck', WIPE_MID + 0.1, 0.6, 0.14, 0.3),
];

