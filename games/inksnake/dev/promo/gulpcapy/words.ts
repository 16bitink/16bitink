import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import { pathAt } from '../gulphen/path';
import { BITE_AT, DRINK_AT, GULP_AT, HEAVES, KICK_AT, LOOP_S, seam, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT } from './story';

/** The short's "!", "+70", "Bigger!", captions, the fur puffing off at each heave, and its sound cues. */

/** Pops up: 0 hidden .. 1, overshooting, gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.1 ? (since / 0.1) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (since - 0.1) / 0.08);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The capybara's "!", from the moment it spots the snake, up over the seam. */
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

/** A capybara scores 70 in the game (logic/chapters/floodedPrey.ts). */
export const SCORE_TEXT = '+70';
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
  { text: 'that’s a whole capybara', y: 382, size: 108, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 382, size: 132, from: GULP_AT + 0.15, to: 8 },
  { text: 'he was so chill though', y: 382, size: 112, from: 8.9, to: 11.2 },
];
const CAPTION_FADE = 0.12;

export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

/** Where the credit sits: inside the clear area, in every frame. */
export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink', y: 1240, size: 46, alpha: 1 } as const;

// ---------------------------------------------------------------- fur

export interface Tuft {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly size: number;
  readonly alpha: number;
}

/** Tufts of coarse hair puffing out at a burst, from `a` along the capybara. */
const BURSTS = [...HEAVES.map((h, i) => ({ t: h + 0.06, a: 400 + i * 150, n: 4 })), { t: GULP_AT, a: 860, n: 6 }] as const;

function burstTuft(b: (typeof BURSTS)[number], i: number, t: number): Tuft | null {
  const s = t - b.t;
  if (s < 0 || s > 1.3) return null;
  const k = i * 2.399 + b.t * 7;
  const vx = Math.cos(k) * (260 + (i % 3) * 100) - 80;
  const vy = Math.sin(k) * 150 + (i % 2 ? -240 : 240);
  const drag = (1 - Math.exp(-3 * s)) / 3;
  const p = pathAt(b.a);
  const off = i % 2 ? -1 : 1;
  return {
    x: p.x + vx * drag + 20 * Math.sin(3 * s + k),
    y: p.y + off * 180 + vy * drag + 110 * s * s,
    rot: k + s * (2 + (i % 3)) * off,
    size: 0.6 + (i % 3) * 0.15,
    alpha: 1 - ramp(s, 0.85, 1.3),
  };
}

export function tuftsAt(t: number): readonly Tuft[] {
  return BURSTS.flatMap((b) => Array.from({ length: b.n }, (_, i) => burstTuft(b, i, t))).filter((f): f is Tuft => f !== null);
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** A capybara squeals and whistles: the game's squeak, pitched down. */
const squeal = (t: number, pitch: number, gain: number, pan = -0.2): SoundCue => ({ id: 'squeak', t, pitch, gain, pan });

export const SOUNDS: readonly SoundCue[] = [
  squeal(0.04, 0.62, 0.9, -0.25),
  { id: 'plop', t: 0.12, pitch: 0.8, gain: 0.5, pan: 0.2 },
  { id: 'bump', t: BITE_AT, pitch: 0.55, gain: 0.95, pan: 0 },
  squeal(1.2, 0.56, 0.6),
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'squeeze', t: h, pitch: 0.7, gain: 0.85, pan: 0 },
    { id: 'gulp', t: h + 0.08, pitch: 0.5, gain: 0.8, pan: 0 },
  ]),
  squeal(3.1, 0.68, 0.5),
  { id: 'plop', t: KICK_AT, pitch: 0.9, gain: 0.55, pan: -0.1 },
  { id: 'gulp', t: SLURP_AT, pitch: 0.7, gain: 0.85, pan: 0 },
  { id: 'swallow', t: GULP_AT, pitch: 0.72, gain: 1, pan: 0 },
  { id: 'bump', t: GULP_AT, pitch: 0.45, gain: 0.85, pan: 0 },
  { id: 'grown', t: SPURT, pitch: 1, gain: 0.8, pan: 0 },
  { id: 'steps', t: 7, pitch: 0.8, gain: 0.45, pan: 0.1 },
  { id: 'steps', t: 8.6, pitch: 0.75, gain: 0.4, pan: -0.3 },
  { id: 'steps', t: 9.3, pitch: 0.75, gain: 0.4, pan: -0.2 },
  { id: 'plop', t: DRINK_AT + 0.25, pitch: 1.4, gain: 0.35, pan: 0 },
  { id: 'plop', t: DRINK_AT + 0.55, pitch: 1.5, gain: 0.32, pan: 0 },
  { id: 'appear', t: SPOT_AT, pitch: 1.3, gain: 0.6, pan: -0.2 },
  squeal(SPOT_AT + 0.05, 0.7, 0.7),
  { id: 'strike', t: STRIKE_AT, pitch: 0.9, gain: 1, pan: 0 },
];
