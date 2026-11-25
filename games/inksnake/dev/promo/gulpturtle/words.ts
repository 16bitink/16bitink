import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import { pathAt } from '../gulphen/path';
import { BITE_AT, GULP_AT, HEAVES, KICK_AT, LOOP_S, seam, SLURP_AT, SNAP_AT, SPOT_AT, SPURT, STRIKE_AT, TOK_AT } from './story';

/** The short's "!", "+18", "Bigger!", captions, the water flying off at each heave, the knock lines, and its sound cues. */

/** Pops up: 0 hidden .. 1, overshooting, gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.1 ? (since / 0.1) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (since - 0.1) / 0.08);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The turtle's "!", from the moment it spots the snake, up over the seam. */
export const alarmAt = (t: number): number => pop(seam(t) - (SPOT_AT - LOOP_S), LOOP_S - SPOT_AT + 0.85);

export interface FloatText {
  readonly rise: number;
  readonly alpha: number;
}

function float(since: number, life: number): FloatText | null {
  if (since < 0 || since >= life) return null;
  const s = since / life;
  return { rise: 1 - (1 - s) ** 2, alpha: Math.min(1, since / 0.08) * (1 - ramp(s, 0.65, 1)) };
}

/** A river turtle scores 18 in the game (logic/chapters/floodedPrey.ts). */
export const SCORE_TEXT = '+18';
export const scoreAt = (t: number): FloatText | null => float(t - GULP_AT - 0.05, 1.1);
export const biggerAt = (t: number): FloatText | null => float(t - SPURT, 0.9);

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
}

export const CAPTIONS: readonly Caption[] = [
  { text: 'that’s a whole turtle', y: 382, size: 116, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 382, size: 132, from: GULP_AT + 0.15, to: 8 },
  { text: 'he had a shell though', y: 382, size: 112, from: 8.9, to: 11.2 },
];
const CAPTION_FADE = 0.12;

export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

/** Where the credit sits: inside the clear area, in every frame. */
export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink', y: 1240, size: 46, alpha: 1 } as const;

// ---------------------------------------------------------------- water and knocks

export interface Drop {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly size: number;
  readonly alpha: number;
}

/** River water shaken off at a burst, from `a` along the turtle. */
const BURSTS = [
  { t: BITE_AT, a: 330, n: 5 }, { t: HEAVES[0] + 0.08, a: 430, n: 4 }, { t: TOK_AT + 0.06, a: 400, n: 5 },
  { t: HEAVES[1] + 0.08, a: 520, n: 5 }, { t: SNAP_AT, a: 700, n: 6 }, { t: GULP_AT, a: 860, n: 6 },
] as const;

function burstDrop(b: (typeof BURSTS)[number], i: number, t: number): Drop | null {
  const s = t - b.t;
  if (s < 0 || s > 0.9) return null;
  const k = i * 2.399 + b.t * 7;
  const vx = Math.cos(k) * (240 + (i % 3) * 110) - 60;
  const off = i % 2 ? -1 : 1;
  const vy = off > 0 ? 60 + 60 * Math.sin(k) : -420 - 130 * Math.sin(k);
  const p = pathAt(b.a);
  return {
    x: p.x + vx * s,
    y: p.y + (off > 0 ? 130 : -200) + vy * s + 900 * s * s,
    rot: Math.atan2(vy + 1800 * s, vx),
    size: 0.7 + (i % 3) * 0.25,
    alpha: 1 - ramp(s, 0.55, 0.9),
  };
}

export function dropsAt(t: number): readonly Drop[] {
  return BURSTS.flatMap((b) => Array.from({ length: b.n }, (_, i) => burstDrop(b, i, t))).filter((d): d is Drop => d !== null);
}

/** The knock lines springing off the shell where the lip slips, 0 none .. 1 new, with how far they have sprung. */
export function knockAt(t: number): { readonly out: number; readonly alpha: number } | null {
  for (const at of [TOK_AT + 0.05, SNAP_AT]) {
    const s = (t - at) / 0.35;
    if (s >= 0 && s < 1) return { out: 1 - (1 - s) ** 3, alpha: 1 - ramp(s, 0.5, 1) };
  }
  return null;
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
/** A lip off a hard shell: "tok", the game's knock pitched up hollow, with a click on its front. */
const tok = (t: number, gain: number, pitch = 2.3): readonly SoundCue[] => [cue('bump', t, pitch, gain, -0.1), cue('nip', t, 0.42, gain * 0.45, -0.1)];
const peep = (t: number, pitch: number, gain: number): SoundCue => cue('squeak', t, pitch, gain, -0.2);

export const SOUNDS: readonly SoundCue[] = [
  peep(0.04, 0.5, 0.8),
  cue('plop', 0.12, 0.8, 0.5, 0.2),
  cue('bump', BITE_AT, 0.6, 0.8),
  ...tok(BITE_AT + 0.01, 0.8, 1.9),
  cue('steps', 1.15, 0.7, 0.35, -0.2),
  ...HEAVES.map((h) => cue('squeeze', h, 0.7, 0.85)),
  ...tok(TOK_AT + 0.05, 1.5),
  cue('miss', TOK_AT + 0.08, 1.3, 0.22, -0.1),
  cue('gulp', HEAVES[1] + 0.12, 0.5, 0.75),
  ...tok(HEAVES[1] + 0.3, 0.7, 2),
  peep(3.3, 0.56, 0.4),
  ...tok(SNAP_AT, 1.2, 1.6),
  cue('gulp', SNAP_AT + 0.04, 0.5, 0.9),
  cue('plop', KICK_AT, 0.9, 0.55, -0.1),
  cue('plop', KICK_AT + 0.18, 1.05, 0.45, -0.1),
  cue('gulp', SLURP_AT, 0.7, 0.85),
  cue('swallow', GULP_AT, 0.72, 1),
  cue('bump', GULP_AT, 0.45, 0.85),
  ...tok(GULP_AT + 0.03, 0.6, 1.5),
  cue('grown', SPURT, 1, 0.8),
  cue('steps', 7, 0.8, 0.45, 0.1),
  ...[8.9, 9.25, 9.6].map((t) => cue('steps', t, 0.55, 0.4, -0.25)),
  cue('appear', 11, 1, 0.45, -0.2),
  cue('appear', SPOT_AT, 1.3, 0.6, -0.2),
  peep(SPOT_AT + 0.05, 0.55, 0.65),
  cue('strike', STRIKE_AT, 0.9, 1),
];
