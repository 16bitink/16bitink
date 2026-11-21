import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import { DRIFT, TILT } from '../gulphen/path';
import { BITE_AT, CLIMB_AT, GULP_AT, HEAVES, KICK_AT, LOOP_S, NEXT_AT, seam, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, U } from './story';

/** The short's "!", "+80", "Bigger!", captions, the water thrown up as it thrashes, and its sound cues. */

/** Pops up: 0 hidden .. 1, overshooting, gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.1 ? (since / 0.1) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (since - 0.1) / 0.08);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The caiman's "!", from the moment it spots the snake, up over the seam. */
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

/** A young caiman scores 80 in the game (logic/chapters/floodedPrey.ts). */
export const SCORE_TEXT = '+80';
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
  { text: 'that’s a whole caiman', y: 382, size: 108, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 382, size: 132, from: GULP_AT + 0.15, to: 8 },
  { text: 'he had teeth though', y: 382, size: 112, from: 8.9, to: 11.2 },
];
const CAPTION_FADE = 0.12;

export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

/** Where the credit sits: inside the clear area, in every frame. */
export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink', y: 1240, size: 46, alpha: 1 } as const;

// ---------------------------------------------------------------- water

export interface Drop {
  readonly x: number;
  readonly y: number;
  /** Its heading (radians) and radius, world units. */
  readonly dir: number;
  readonly r: number;
  readonly alpha: number;
}

/** A place along the frame-1 caiman (base units from its snout), in the world; `drop` world units below its axis. */
const onCaiman = (a: number, drop: number, shift = { x: 0, y: 0 }): { x: number; y: number } => ({
  x: shift.x - a * U * Math.cos(TILT), y: shift.y + a * U * Math.sin(TILT) + drop,
});

/** The water just in front of its belly (toward the camera) while it wades, world units below its axis: drops leave from there, clear of its side. */
const WATERLINE = 116;
const DROP_LIFE = 0.38;
const GRAVITY = 2600;

/** Water thrown up from the waterline: the hind legs thrashing at each heave, the tail's lash, the next one hauling out. */
const BURSTS = [
  ...HEAVES.map((h, i) => ({ t: h + 0.04, at: onCaiman(530 + 30 * i, WATERLINE), n: 6, size: 1 })),
  { t: KICK_AT + 0.18, at: onCaiman(800, 40), n: 10, size: 1.3 },
  { t: CLIMB_AT + 0.25, at: onCaiman(360, WATERLINE, DRIFT), n: 7, size: 1 },
] as const;

function burstDrop(b: (typeof BURSTS)[number], i: number, t: number): Drop | null {
  const k = i * 2.399 + b.t * 3.7;
  // Already in flight when first seen, so they never sit on the body.
  const s = t - b.t + 0.06 - (i % 3) * 0.025;
  const life = DROP_LIFE * (0.75 + 0.25 * Math.abs(Math.sin(k)));
  if (s < 0.06 || s > life || t < b.t) return null;
  // Up and out, away from its body (back along it, to the left).
  const vx = -(260 + 260 * Math.abs(Math.sin(k * 1.3))) * b.size;
  const vy = -(560 + 320 * Math.abs(Math.cos(k))) * b.size;
  const x0 = b.at.x + 70 * Math.sin(k * 2.1);
  return {
    x: x0 + vx * s,
    y: b.at.y + vy * s + 0.5 * GRAVITY * s * s,
    dir: Math.atan2(vy + GRAVITY * s, vx),
    r: (3.5 + 2.2 * Math.abs(Math.sin(k * 0.7))) * b.size,
    alpha: 1 - ramp(s, life * 0.6, life),
  };
}

export function splashesAt(t: number): readonly Drop[] {
  return BURSTS.flatMap((b) => Array.from({ length: b.n }, (_, i) => burstDrop(b, i, t))).filter((d): d is Drop => d !== null);
}

/** The ripples: rings spreading where it splashes, and the wake of the next one swimming in. */
export const swimmingAt = (t: number): boolean => t >= NEXT_AT && t < CLIMB_AT + 0.6;

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** A young caiman chirps for help, and grunts: the game's squeak pitched down and its growl pitched up. */
const chirp = (t: number, pitch: number, gain: number, pan = -0.2): SoundCue => ({ id: 'squeak', t, pitch, gain, pan });
const grunt = (t: number, gain: number): SoundCue => ({ id: 'growl', t, pitch: 1.7, gain, pan: -0.2 });

export const SOUNDS: readonly SoundCue[] = [
  chirp(0.04, 0.82, 0.85, -0.25),
  { id: 'plop', t: 0.12, pitch: 0.7, gain: 0.5, pan: -0.3 },
  { id: 'bump', t: BITE_AT, pitch: 0.55, gain: 0.95, pan: 0 },
  grunt(1.15, 0.6),
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'squeeze', t: h, pitch: 0.7, gain: 0.85, pan: 0 },
    { id: 'gulp', t: h + 0.08, pitch: 0.5, gain: 0.8, pan: 0 },
    { id: 'plop', t: h + 0.06, pitch: 0.6, gain: 0.45, pan: -0.3 },
  ]),
  chirp(3.1, 0.88, 0.5),
  { id: 'plop', t: KICK_AT + 0.2, pitch: 0.5, gain: 0.75, pan: -0.35 },
  { id: 'gulp', t: SLURP_AT, pitch: 0.7, gain: 0.85, pan: 0 },
  { id: 'swallow', t: GULP_AT, pitch: 0.72, gain: 1, pan: 0 },
  { id: 'bump', t: GULP_AT, pitch: 0.45, gain: 0.85, pan: 0 },
  { id: 'grown', t: SPURT, pitch: 1, gain: 0.8, pan: 0 },
  { id: 'steps', t: 7, pitch: 0.8, gain: 0.45, pan: 0.1 },
  { id: 'plop', t: 8.7, pitch: 1.1, gain: 0.3, pan: -0.4 },
  { id: 'plop', t: 9.4, pitch: 1.2, gain: 0.3, pan: -0.3 },
  { id: 'plop', t: CLIMB_AT + 0.25, pitch: 0.8, gain: 0.45, pan: -0.2 },
  { id: 'steps', t: CLIMB_AT + 0.35, pitch: 0.7, gain: 0.4, pan: -0.2 },
  { id: 'appear', t: SPOT_AT, pitch: 1.3, gain: 0.6, pan: -0.2 },
  chirp(SPOT_AT + 0.05, 0.9, 0.65),
  { id: 'strike', t: STRIKE_AT, pitch: 0.9, gain: 1, pan: 0 },
];
