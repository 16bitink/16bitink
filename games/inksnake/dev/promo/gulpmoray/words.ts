import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import type { Pt } from '../sprites';
import { pathAt } from './rail';
import { BITE_AT, EMERGE_AT, GULP_AT, HEAVES, headU, KICK_AT, LOOP_S, seam, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT } from './story';

/** The short's words, marks, bubbles and sounds (story.ts has the beats). */

// ---------------------------------------------------------------- "!", "+35", "Bigger!"

/** Pops up: 0 hidden .. 1, overshooting, gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.1 ? (since / 0.1) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (since - 0.1) / 0.08);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The moray's "!", from the moment it spots the krait, up over the seam. */
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

/** The game's points for a moray eel (logic/chapters/reefPrey.ts: moray, points 35). */
export const SCORE_TEXT = '+35';
export const scoreAt = (t: number): FloatText | null => float(t - GULP_AT - 0.05, 1.1);
export const biggerAt = (t: number): FloatText | null => float(t - SPURT, 0.9);

// ---------------------------------------------------------------- bubbles

export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

/** Bubbles puffing out of the jaws at the bite, each heave, the kick and the gulp, rising and wobbling. */
const BURSTS = [{ t: BITE_AT, n: 5 }, ...HEAVES.map((h) => ({ t: h + 0.05, n: 7 })), { t: KICK_AT, n: 4 }, { t: GULP_AT, n: 10 }] as const;
const LIFE = 1.7;

function burstBubble(b: (typeof BURSTS)[number], i: number, t: number): Bubble | null {
  const s = t - b.t - (i % 4) * 0.05;
  if (s < 0 || s > LIFE) return null;
  const k = i * 2.399 + b.t * 7;
  const from = pathAt(headU(b.t) - 40);
  const spread = Math.cos(k) * (90 + (i % 3) * 40);
  return {
    x: from.x + spread * (1 - Math.exp(-4 * s)) + 22 * Math.sin(6 * s + k),
    y: from.y - 40 - (170 + (i % 3) * 70) * s - 30 * (i % 2),
    r: 9 + (i % 5) * 4,
    alpha: Math.min(1, s * 10) * (1 - ramp(s, LIFE - 0.4, LIFE)),
  };
}

export function bubblesAt(t: number): readonly Bubble[] {
  return BURSTS.flatMap((b) => Array.from({ length: b.n }, (_, i) => burstBubble(b, i, t))).filter((x): x is Bubble => x !== null);
}

// ---------------------------------------------------------------- words

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
}

export const CAPTIONS: readonly Caption[] = [
  { text: 'that’s a whole eel', y: 382, size: 120, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 382, size: 132, from: GULP_AT + 0.15, to: 8 },
  { text: 'wait he’s wider than me', y: 382, size: 108, from: 8.9, to: 11.2 },
];
const CAPTION_FADE = 0.12;

export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

/** Where the credit sits: inside the clear area, in every frame. */
export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink', y: 1240, size: 46, alpha: 1 } as const;

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  { id: 'plop', t: 0.04, pitch: 0.7, gain: 0.8, pan: -0.2 },
  { id: 'appear', t: 0.08, pitch: 1.3, gain: 0.45, pan: -0.2 },
  { id: 'bump', t: BITE_AT, pitch: 0.6, gain: 0.9, pan: 0 },
  { id: 'plop', t: BITE_AT + 0.05, pitch: 1.2, gain: 0.5, pan: 0.1 },
  { id: 'plop', t: 1.25, pitch: 0.85, gain: 0.45, pan: -0.25 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'squeeze', t: h, pitch: 0.75, gain: 0.8, pan: 0 },
    { id: 'gulp', t: h + 0.08, pitch: 0.55, gain: 0.75, pan: 0 },
    { id: 'plop', t: h + 0.12, pitch: 1.35, gain: 0.4, pan: 0.15 },
  ]),
  { id: 'plop', t: KICK_AT, pitch: 1.1, gain: 0.55, pan: -0.1 },
  { id: 'gulp', t: SLURP_AT, pitch: 0.75, gain: 0.8, pan: 0 },
  { id: 'swallow', t: GULP_AT, pitch: 0.8, gain: 1, pan: 0 },
  { id: 'bump', t: GULP_AT, pitch: 0.5, gain: 0.8, pan: 0 },
  { id: 'plop', t: GULP_AT + 0.1, pitch: 1.5, gain: 0.4, pan: 0.2 },
  { id: 'grown', t: SPURT, pitch: 1, gain: 0.8, pan: 0 },
  { id: 'steps', t: 7, pitch: 0.9, gain: 0.45, pan: 0.1 },
  { id: 'steps', t: 8.7, pitch: 0.9, gain: 0.4, pan: 0.1 },
  { id: 'appear', t: EMERGE_AT, pitch: 0.8, gain: 0.5, pan: -0.4 },
  { id: 'plop', t: 9.9, pitch: 0.9, gain: 0.35, pan: -0.3 },
  { id: 'appear', t: SPOT_AT, pitch: 1.3, gain: 0.6, pan: -0.2 },
  { id: 'strike', t: STRIKE_AT, pitch: 1, gain: 1, pan: 0 },
];

/** Where the "!" floats: above the moray's head. */
export const ALARM_LIFT: Pt = { x: -300, y: -150 };
