import type { SfxId } from '../../../src/audio/recipes';
import { WORDS, type Word } from './words';
import { LOOP_S, DECOYS_AT, SWITCH_AT, ENDS_AT, ESCAPE_AT, ONE_AT, SURFACE_AT, STEALS_AT, MISS_AT, wrap } from './story';

/** The voiceover cut into phrases by word count (never a lone word). */
const PHRASES = [3, 4, 2, 2, 4, 3, 2, 4, 4, 4, 2, 4, 5, 5, 5, 3, 3] as const;

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

export const LINES: readonly Line[] = (() => {
  const starts = PHRASES.map((_, i) => PHRASES.slice(0, i).reduce<number>((s, n) => s + n, 0));
  const groups = PHRASES.map((n, i) => WORDS.slice(starts[i]!, starts[i]! + n));
  return groups.map((g, i) => ({
    words: g,
    from: i === 0 ? 0 : g[0]!.start,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start : LOOP_S,
  }));
})();

export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((best, w, i) => (u >= w.start ? i : best), -1) };
}

export interface SoundCue { readonly id: SfxId; readonly t: number; readonly pitch: number; readonly gain: number; readonly pan: number }
const cue = (id: SfxId, t: number, pitch = 1, gain = 0.2, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

const ticks = (from: number, to: number, step: number): SoundCue[] => {
  const out: SoundCue[] = [];
  for (let t = from, i = 0; t < to; t += step * (0.8 + ((i * 7) % 5) * 0.1), i++) out.push(cue('click', t, 1.6 + (i % 3) * 0.15, 0.06, 0.1));
  return out;
};

/** The game's own effects, quiet under the voice. */
export const SOUNDS: readonly SoundCue[] = [
  cue('squawk', 0.2, 1.1, 0.1, 0.3),
  cue('squawk', 1.9, 0.95, 0.08, 0.35),
  cue('lunge', DECOYS_AT - 0.2, 0.8, 0.14, 0.4),
  cue('spotted', SWITCH_AT, 1, 0.12, -0.2),
  cue('squawk', ENDS_AT + 0.35, 1, 0.14, 0.3),
  cue('clang', ENDS_AT + 0.9, 0.9, 0.1),
  cue('clang', ENDS_AT + 1.6, 0.85, 0.1),
  cue('clang', ENDS_AT + 2.3, 0.8, 0.1),
  cue('squawk', ESCAPE_AT + 0.1, 1.2, 0.16, -0.3),
  cue('squawk', ESCAPE_AT + 0.45, 0.9, 0.16, 0.3),
  cue('splash', ESCAPE_AT + 0.7, 0.8, 0.2, -0.3),
  cue('lunge', ESCAPE_AT + 0.9, 0.7, 0.18, 0.3),
  cue('splash', ESCAPE_AT + 1.2, 0.7, 0.2, 0.3),
  cue('lunge', ESCAPE_AT + 1.5, 0.6, 0.16, -0.3),
  ...ticks(ONE_AT + 0.2, SURFACE_AT - 0.2, 0.075),
  cue('powerup', SURFACE_AT - 0.15, 1, 0.12),
  cue('splash', SURFACE_AT + 0.35, 1.3, 0.12),
  cue('drop', SURFACE_AT + 0.75, 1.1, 0.08),
  cue('squawk', STEALS_AT - 0.05, 1.3, 0.2, 0.3),
  cue('hurt', STEALS_AT + 0.05, 0.9, 0.08),
  cue('click', MISS_AT + 0.7, 1, 0.1),
];
