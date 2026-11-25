import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import { BITE_AT, GULP_AT, HEAVES, HOP_TIMES, KICK_AT, LOOP_S, PFFFT_AT, PUMPS, seam, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT } from './story';

/** The short's "!", "+12", "Bigger!", "pffft", captions and its sound cues. */

/** Pops up: 0 hidden .. 1, overshooting, gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.1 ? (since / 0.1) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (since - 0.1) / 0.08);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The toad's "!", from the moment it spots the snake, up over the seam. */
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

/** A toad scores 12 in the game (logic/chapters/barrens.ts). */
export const SCORE_TEXT = '+12';
export const scoreAt = (t: number): FloatText | null => float(t - GULP_AT - 0.05, 1.1);
export const biggerAt = (t: number): FloatText | null => float(t - SPURT, 0.9);
export const PFFFT_TEXT = 'pffft';
export const pffftAt = (t: number): FloatText | null => float(t - PFFFT_AT - 0.04, 0.95);

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
}

export const CAPTIONS: readonly Caption[] = [
  { text: 'that’s a whole toad', y: 382, size: 118, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 382, size: 132, from: GULP_AT + 0.15, to: 8 },
  { text: 'he puffed up and everything', y: 382, size: 100, from: 8.9, to: 11.2 },
];
const CAPTION_FADE = 0.12;

export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

/** Where the credit sits: inside the clear area, in every frame. */
export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink', y: 1240, size: 46, alpha: 1 } as const;

// ---------------------------------------------------------------- the puff of air

export interface AirPuff {
  /** Out from the lips along the head (world units) and up off it. */
  readonly out: number;
  readonly up: number;
  readonly r: number;
  readonly alpha: number;
}

/** Little clouds of air from the lips at the "pffft". */
export function airPuffs(t: number): readonly AirPuff[] {
  return Array.from({ length: 6 }, (_, i): AirPuff => {
    const s = (t - PFFFT_AT - i * 0.06) / 0.75;
    if (s <= 0 || s >= 1) return { out: 0, up: 0, r: 0, alpha: 0 };
    const drag = 1 - (1 - s) ** 2;
    return { out: 24 + (170 + 34 * (i % 3)) * drag, up: ((i % 3) - 1) * 62 * drag + 30 * s, r: 18 + (44 + 12 * (i % 2)) * drag, alpha: 0.95 * (1 - ramp(s, 0.45, 1)) };
  }).filter((p) => p.alpha > 0);
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** A rubbery balloon squeak: the game's coil creak and mouse squeak, pitched to rubber. */
const balloon = (t: number, pitch: number, gain: number, pan = -0.15): SoundCue[] => [
  { id: 'squeeze', t, pitch: 2.3 * pitch, gain: 0.5 * gain, pan },
  { id: 'squeak', t: t + 0.03, pitch: 0.34 * pitch, gain, pan },
  { id: 'squeak', t: t + 0.15, pitch: 0.42 * pitch, gain: 0.8 * gain, pan },
];
/** A toad's croak-squeal. */
const peep = (t: number, pitch: number, gain: number, pan = -0.2): SoundCue => ({ id: 'squeak', t, pitch, gain, pan });

export const SOUNDS: readonly SoundCue[] = [
  peep(0.04, 0.5, 0.9, -0.25),
  { id: 'plop', t: 0.12, pitch: 0.7, gain: 0.6, pan: -0.2 },
  { id: 'bump', t: BITE_AT, pitch: 0.6, gain: 0.95, pan: 0 },
  peep(1.2, 0.46, 0.55),
  ...HEAVES.flatMap((h, i): SoundCue[] => [
    ...balloon(h - 0.22, 1 + 0.14 * i, 1.1),
    { id: 'squeeze', t: h, pitch: 0.75, gain: 0.8, pan: 0 },
    { id: 'gulp', t: h + 0.08, pitch: 0.55, gain: 0.75, pan: 0 },
  ]),
  { id: 'plop', t: KICK_AT, pitch: 1.1, gain: 0.55, pan: -0.1 },
  { id: 'plop', t: KICK_AT + 0.16, pitch: 1.3, gain: 0.45, pan: -0.1 },
  { id: 'gulp', t: SLURP_AT, pitch: 0.75, gain: 0.8, pan: 0 },
  { id: 'swallow', t: GULP_AT, pitch: 0.8, gain: 1, pan: 0 },
  { id: 'bump', t: GULP_AT, pitch: 0.5, gain: 0.8, pan: 0 },
  { id: 'grown', t: SPURT, pitch: 1, gain: 0.8, pan: 0 },
  // "pffft": the strike's hiss let out slow and low, stuttering as a balloon does.
  { id: 'strike', t: PFFFT_AT, pitch: 0.5, gain: 0.85, pan: -0.2 },
  { id: 'strike', t: PFFFT_AT + 0.12, pitch: 0.45, gain: 0.8, pan: -0.2 },
  { id: 'strike', t: PFFFT_AT + 0.24, pitch: 0.4, gain: 0.7, pan: -0.2 },
  { id: 'strike', t: PFFFT_AT + 0.36, pitch: 0.36, gain: 0.5, pan: -0.2 },
  { id: 'squeeze', t: PFFFT_AT + 0.02, pitch: 1.7, gain: 0.35, pan: -0.1 },
  { id: 'steps', t: 7.5, pitch: 0.9, gain: 0.45, pan: 0.1 },
  ...HOP_TIMES.flatMap((h, i): SoundCue[] => [
    { id: 'plop', t: h.up, pitch: 0.9, gain: 0.4, pan: -0.5 + 0.2 * i },
    { id: 'bump', t: h.down, pitch: 1.1, gain: 0.4, pan: -0.4 + 0.2 * i },
  ]),
  ...PUMPS.flatMap((p, i) => balloon(p, 0.9 + 0.12 * i, 0.9, -0.2)),
  { id: 'appear', t: SPOT_AT, pitch: 1.3, gain: 0.6, pan: -0.2 },
  peep(SPOT_AT + 0.05, 0.55, 0.6),
  { id: 'strike', t: STRIKE_AT, pitch: 1, gain: 1, pan: 0 },
];
