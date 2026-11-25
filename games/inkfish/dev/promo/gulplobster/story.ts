import { bodyProportions } from '../../../src/art/fishArt';
import { growthPointsFor, scoreFor } from '../../../src/logic/sizing';
import type { View, WorldFish } from '../gameplay/fish';
import { shake as gapeShake, viperEyes as gapeEyes } from '../gape/story';
import { lipsOf } from '../gape/swimmer';
import {
  DESSERT_FROM, GULP_AT, HEAVES, insertion, LOOP_S, pullAt, SCALE, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, BITE_AT, VIPER_LEN, viperFish, viperJaw, type Caption,
  type SoundCue,
} from '../lure/story';
import { clamp01, curveAt, lerp, ramp, window01, type Key } from '../short';
import { BAR_MARKS, GOAL, POINTS_BEFORE } from '../slurp/story';
import type { Pt } from './shell';

export type { Caption, Pt, SoundCue, View, WorldFish };
// The viper's side of it is #21's and #59's, beat for beat: the strike, three heaves, the last slurp, the gulp, the stage-up.
export {
  BAR_MARKS, BITE_AT, DESSERT_FROM, GOAL, GULP_AT, HEAVES, insertion, LOOP_S, POINTS_BEFORE, pullAt, SCALE, SLURP_AT, SPOT_AT, SPURT, STRIKE_AT, SUCK_FROM, VIPER_LEN,
  viperFish, viperJaw,
};
export { VIPER_SIZE, viperLength } from '../lure/story';
export { biggerText, captionAlpha, gulpSnap, seam, suction } from '../gape/story';
export { scoreText } from '../slurp/story';
export { anglerAlarm as lobsterAlarm } from '../lure/story';

/**
 * "How did that fit 139": the viperfish of gape/ (#21) and gulpshark/ (#96),
 * whose ability is `gape` (logic/abilities.ts: canSwallow lets it eat a
 * 'peer'), against a lobster as long as itself. It shoots backwards out of the
 * dark, tail first, with flicks of its tail, the way lobsters escape: straight
 * into the jaws. So its tail goes in first, and its face, its antennae and
 * both its huge claws stay outside and fight.
 *
 *   0     mid-lunge: the jaws swinging wide round the tail, both claws up, the eyes turned back, the "!"
 *   0.75  the bite; the abdomen goes in, ring by ring
 *   1.6   the claws swing back and brace against both jaws; 2.5 CLACK: one snaps shut on the viper's lip, a wince
 *   1.9   heave, 2.8 heave, 3.65 heave: at the third the claws come off
 *   4.0   only two claws and the antennae stick out: they wave goodbye, 4.3 one last snip
 *   4.55  the last slurp; 4.9 GULP (payoff, 41%): a lobster-shaped lump, one antenna still out of the lips
 *   5.0   "how did THAT fit"; 5.55 the antenna is slurped in like spaghetti, 6.0 pop
 *   5.6   "Bigger!"; the camera pulls back after it
 *   9.0   "dinner is served… again": the next lobster flicks backwards out of the dark
 *   11.0  its eyes turn; 11.35 "!"; 11.6 the viper strikes, which is frame 1.
 */

// ---------------------------------------------------------------- sizes, as the game has them

/** The lobster's size: a touch bigger than the viper (51), and so a peer of it. (The game's own lobsters are 20 to 40; this is a highlight's.) */
export const LOBSTER_SIZE = 54;
/** Its body in body units, fan to rostrum (parts.ts); as long as the viper, its claws more. */
export const BODY_UNITS = 480;
/** The abdomen and fan: from the fan's tip to where the carapace begins. */
export const TAIL_UNITS = 276;
export const K_L = (0.96 * VIPER_LEN) / BODY_UNITS;
const stageOf = (t: number): number => (t >= SPURT ? SCALE : 1);

// ---------------------------------------------------------------- the mouth's frame

/** A point of the viper's drawing (texture px, facing right) in the world. */
function onViper(v: WorldFish, tex: Pt): Pt {
  const k = v.length / (2 * bodyProportions('viperfish').hl);
  const lx = (tex.x - 128) * k;
  const ly = (tex.y - 128) * k;
  const c = Math.cos(-v.tilt);
  const s = Math.sin(-v.tilt);
  return { x: v.x + v.facing * (lx * c - ly * s), y: v.y + lx * s + ly * c };
}

/** The viper's mouth: origin at the middle of its lips, x out of the mouth, y across it (down), `k` world px per body unit. */
export interface Frame {
  readonly origin: Pt;
  readonly ex: Pt;
  readonly ey: Pt;
  readonly k: number;
}

export function mouthFrame(t: number): Frame {
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const mid = onViper(v, lips.mid);
  const hinge = onViper(v, lips.hinge);
  const d = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  const ex = { x: (mid.x - hinge.x) / d, y: (mid.y - hinge.y) / d };
  return { origin: mid, ex, ey: { x: -ex.y, y: ex.x }, k: K_L * stageOf(t) };
}

export const frameAngle = (f: Frame): number => Math.atan2(f.ex.y, f.ex.x);

export const toWorld = (f: Frame, p: Pt): Pt => ({
  x: f.origin.x + (f.ex.x * p.x + f.ey.x * p.y) * f.k,
  y: f.origin.y + (f.ex.y * p.x + f.ey.y * p.y) * f.k,
});

/** The tips of the viper's jaws in the mouth's frame, body units. */
export function jawTips(t: number): { readonly upper: Pt; readonly lower: Pt } {
  const f = mouthFrame(t);
  const v = viperFish(t);
  const lips = lipsOf('viperfish', viperJaw(t));
  const to = (dy: number): Pt => {
    const w = onViper(v, { x: lips.mid.x, y: lips.mid.y + dy });
    const dx = (w.x - f.origin.x) / f.k;
    const dz = (w.y - f.origin.y) / f.k;
    return { x: dx * f.ex.x + dz * f.ex.y, y: dx * f.ey.x + dz * f.ey.y };
  };
  return { upper: to(-lips.height / 2), lower: to(lips.height / 2) };
}

// ---------------------------------------------------------------- how far in

/** How deep the fan's tip is past the lips (body units) at the bite, once only the claws are out, and when the last of it has gone in. */
const S_BITE = 118;
export const S_PRE = 496;
const S_END = 800;
/** Where the heaves leave the viper's insertion (gape/story.ts): the last slurp is the rest. */
const PRE_INS = 0.585;

/** The strike: the jaws are already round the fan and two rings on frame 1, and have the whole abdomen by the end of the bite (where the heaves take over). */
const REACH_0 = 150;
const REACH_RATE = 230;
const STRIKE_IN = BITE_AT + 0.3;
const STRIKE_DEPTH: readonly Key[] = [
  { t: 0, at: REACH_0, rate: REACH_RATE },
  { t: 0.3, at: 196 },
  { t: BITE_AT, at: 226 },
  { t: STRIKE_IN, at: S_BITE + (S_PRE - S_BITE) * (0.28 / PRE_INS) ** 1.35, rate: 0 },
];

/** The fan's depth in the mouth, body units: dragged in, a step at each heave, then the last slurp takes the rest. */
export function depth(t: number): number {
  if (t < STRIKE_IN) return curveAt(STRIKE_DEPTH, t).at;
  const d = insertion(t);
  if (t < SLURP_AT) return S_BITE + (S_PRE - S_BITE) * clamp01(d / PRE_INS) ** 1.35;
  return S_PRE + (S_END - S_PRE) * clamp01((d - PRE_INS) / (1 - PRE_INS));
}

export const isDessert = (t: number): boolean => t >= DESSERT_FROM;
export const lobsterGone = (t: number): boolean => t >= GULP_AT && t < DESSERT_FROM;

/** The flicks of the tail as the next one shoots backwards out of the dark. */
export const FLICKS = [8.8, 9.7, 10.5] as const;

/** The next lobster backs in out of the dark: how deep its fan's tip is (negative is out in front of the lips), and how far it is off the mouth's line. */
const APPROACH_X: readonly Key[] = [
  { t: DESSERT_FROM, at: -1180, rate: 0 },
  { t: FLICKS[0], at: -1080, rate: 160 },
  { t: 9.25, at: -700 },
  { t: FLICKS[1], at: -600, rate: 140 },
  { t: 10.1, at: -300 },
  { t: FLICKS[2], at: -250, rate: 120 },
  { t: 10.85, at: -105 },
  { t: 11.35, at: -78, rate: 40 },
  { t: 11.65, at: -40 },
  { t: LOOP_S, at: REACH_0, rate: REACH_RATE },
];
const APPROACH_Y: readonly Key[] = [
  { t: DESSERT_FROM, at: -120 },
  { t: 9.3, at: -90 },
  { t: 10.2, at: -40 },
  { t: 11.3, at: -14 },
  { t: LOOP_S, at: 0, rate: 0 },
];
/** How deep (or far out, negative) the fan's tip is, at any time. */
export const reach = (t: number): number => (isDessert(t) ? curveAt(APPROACH_X, t).at : depth(t));
export const offLine = (t: number): number => (isDessert(t) ? curveAt(APPROACH_Y, t).at : 0);

/** The tail's flick: 0 .. 1, snapping under and opening out again. */
export function flick(t: number): number {
  return Math.max(0, ...FLICKS.map((f) => ramp(t, f - 0.1, f + 0.06) * (1 - ramp(t, f + 0.14, f + 0.5))));
}

/** Out of the dark: 1 hidden .. 0 in plain view. */
export const murk = (t: number): number => (isDessert(t) ? 1 - ramp(t, 8.85, 9.9) : 0);
/** The glint of its eyes in the dark, before the rest shows. */
export const glint = (t: number): number => (isDessert(t) ? ramp(t, 8.6, 8.9) * murk(t) : 0);
/** Its eyes: 0 ahead .. 1 turned back to the jaws. */
export const eyeTurn = (t: number): number => (isDessert(t) ? ramp(t, 10.95, 11.2) : 1);
/** Its eyes wide. */
export const eyeWide = (t: number): number => (isDessert(t) ? ramp(t, SPOT_AT - 0.03, SPOT_AT + 0.08) : 1);

// ---------------------------------------------------------------- the fight, the wave, the antenna

export const CLACK_AT = 2.5;
export const SNIP_AT = 4.34;
/** The last antenna: out of the lips at the gulp, slurped in like spaghetti, gone with a pop. */
export const POKE_FROM = GULP_AT;
export const POKE_PULL = GULP_AT + 0.62;
export const POKE_POP = GULP_AT + 1.1;
export const ANTENNA_LEFT = 210;
export function poke(t: number): { readonly out: number; readonly wiggle: number } | null {
  if (t < POKE_FROM || t >= POKE_POP) return null;
  const out = ANTENNA_LEFT * (1 - 0.18 * ramp(t, POKE_PULL - 0.2, POKE_PULL - 0.05) - 0.82 * ramp(t, POKE_PULL, POKE_POP) ** 1.5);
  return { out, wiggle: 26 * Math.sin(2 * Math.PI * 2.6 * (t - POKE_FROM)) * (1 + 0.8 * ramp(t, POKE_PULL, POKE_POP)) };
}

/** The viper's eyes: the heaves' squeeze, and a wince as the claw snaps shut on its lip. */
export function viperEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= CLACK_AT && t < CLACK_AT + 0.24) return 'squeeze';
  return gapeEyes(t);
}

export function shake(t: number): Pt {
  const g = gapeShake(t);
  const s = t - CLACK_AT;
  if (s < 0 || s > 0.25) return g;
  const amp = 9 * (1 - s / 0.25) ** 2;
  return { x: g.x + amp * Math.sin(s * 130), y: g.y + amp * 0.7 * Math.cos(s * 150) };
}

// ---------------------------------------------------------------- the viper's belly

/** The lobster in the belly: the swelling's size, centre and length, in body lengths. */
export function viperBelly(t: number): { readonly size: number; readonly at: number; readonly width: number } {
  if (t < GULP_AT) {
    const d = depth(t);
    return { size: Math.min(1.05, Math.max(0, (d - 100) / 300) * 1.05) * ramp(t, 0.3, STRIKE_IN), at: 0.32 + 0.12 * clamp01((d - 100) / 340), width: 0.22 + 0.42 * clamp01((d - 90) / 420) };
  }
  // The gulp lands: the belly balloons (overshooting), then shrinks as it's digested and the viper grows.
  const s = t - GULP_AT;
  const pop = 1 + 0.18 * Math.exp(-6 * s) * Math.sin(16 * s);
  return { size: 1.36 * pop * (1 - ramp(t, 7.2, 9.6)), at: lerp(0.42, 0.5, ramp(t, GULP_AT, 6)), width: 0.62 };
}

export const viperLureGlow = (_t: number): number => 0.22;

// ---------------------------------------------------------------- the camera

/** Screen px per world px before the camera pulls back: the viper about 600 px long, its head, the lobster's face and both claws filling the width. */
export const VIPER_PX = 600;
export const BASE_ZOOM = VIPER_PX / VIPER_LEN;

/** Where the viper's lips are on screen, x, over the loop. */
const LIPS_X: readonly { readonly t: number; readonly at: number }[] = [
  { t: 0, at: 262 },
  { t: 1.5, at: 375 },
  { t: 3.4, at: 430 },
  { t: 4.6, at: 520 },
  { t: 5.8, at: 690 },
  { t: 6.5, at: 790 },
  { t: 8.2, at: 560 },
  { t: 9.2, at: 290 },
  { t: 10.8, at: 285 },
  { t: 11.5, at: 265 },
  { t: LOOP_S, at: 262 },
];
/** Closer in for the strike: the gape and the lobster share the frame. */
const STRIKE_ZOOM = 1.15;
/** The camera backs off while the next lobster backs in (all of it in view), then closes in on the strike. */
const ZOOM_EXTRA: readonly Key[] = [
  { t: 0, at: STRIKE_ZOOM, rate: 0 },
  { t: 1.5, at: 1, rate: 0 },
  { t: 8.2, at: 1 },
  { t: 9.1, at: 0.7 },
  { t: 10.1, at: 0.73 },
  { t: 10.8, at: 0.79 },
  { t: 11.35, at: 0.82 },
  { t: LOOP_S, at: STRIKE_ZOOM, rate: 0 },
];
export const zoomExtra = (t: number): number => curveAt(ZOOM_EXTRA, t).at;

const LEAD: readonly Key[] = LIPS_X.map((k, i, all) => {
  const z = zoomExtra(k.t);
  return { t: k.t, at: (540 - k.at + (VIPER_PX / 2) * z) / (VIPER_PX * z), ...(i === 0 || i === all.length - 1 ? { rate: 0 } : {}) };
});

/** The viper's path followed past the loop's ends, scaled as the camera's zoom repeats. */
function viperUnwrapped(t: number): Pt {
  let k = Math.floor(t / LOOP_S);
  if (t - k * LOOP_S >= LOOP_S) k += 1;
  const f = viperFish(Math.max(0, t - k * LOOP_S));
  const s = SCALE ** k;
  return { x: f.x * s, y: f.y * s };
}

export function viewAt(t: number): View {
  const pull = pullAt(t);
  // The camera trails the viper by a beat (an average over the last half second), so the strike moves on screen.
  const n = 10;
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const p = viperUnwrapped(t - (0.5 * i) / (n - 1));
    x += p.x / n;
    y += p.y / n;
  }
  const lead = curveAt(LEAD, t).at * VIPER_LEN * SCALE ** pull;
  // A little lower in the frame for the strike: the raised claw stays clear of the caption.
  const low = isDessert(t) ? ramp(t, 11.1, LOOP_S) : 1 - ramp(t, 0, 1.5);
  return { x: x + lead, y: y + (0.06 - 0.04 * low) * VIPER_LEN * SCALE ** pull, zoom: BASE_ZOOM * SCALE ** -pull * zoomExtra(t) };
}

// ---------------------------------------------------------------- the score, the bar, the words

/** The score for the meal, and the growth points it is worth, as the game counts them. */
export const SCORE_TEXT = `+${scoreFor(LOBSTER_SIZE, 1)}`;
export const MEAL_POINTS = growthPointsFor(LOBSTER_SIZE);

/** The growth bar: a few points short of the last stage, past its mark with the lobster; hidden at the seam. */
export function growthBar(t: number): { readonly fill: number; readonly alpha: number } {
  const fill = lerp(POINTS_BEFORE, POINTS_BEFORE + MEAL_POINTS, ramp(t, GULP_AT, GULP_AT + 0.4)) / GOAL;
  return { fill, alpha: window01(t, 0.45, 8.6, 0.4) };
}

/** Captions; a "\n" breaks a line. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'he’s got TWO claws…', y: 380, size: 104, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 390, size: 124, from: 5.0, to: 8.3 },
  { text: 'dinner is served…\nagain', y: 340, size: 104, from: 9.0, to: 11.25 },
];
