import { curveAt, type Key, ramp, window01 } from '../short';
import { pathAt, PERIOD } from '../gulphen/path';

/**
 * "How did that fit a whole caiman": chapter 10's flooded forest, played as a
 * highlight from a low three-quarter angle, the hen short's beats with the
 * green anaconda waiting on the bank over a young caiman in the shallows:
 *
 *   0     frame 1: the jaws gaping round the caiman's snout and head, its "!"
 *   0.75  the bite lands; stuck, legs paddling, the tail sweeping the water
 *   1.9   heave, 2.8 heave, 3.65 heave: the jaws walk on over the armoured back
 *   4.25  only its tail is left; it whips once, a splash
 *   4.55  the last slurp
 *   4.9   GULP: the jaws shoot on and snap shut, a long ridged lump, "+80"
 *   5.05  "how did THAT fit"
 *   5.6   "Bigger!"; 6.05 the tongue flicks
 *   6.4   the camera pulls back; the snake crawls on, digesting
 *   8.0   the next caiman swims in along the bank, eyes and snout above the water
 *   10.4  it climbs out a little; 11.35 "!"; 11.55 the strike, which is frame 1.
 *
 * World units are screen px at frame 1; the path is the hen short's (path.ts
 * there). caimanPose.ts has the caiman, camera.ts the view, words.ts the text
 * and sounds.
 */
export const LOOP_S = 12;

export const BITE_AT = 0.75;
export const HEAVES = [1.9, 2.8, 3.65] as const;
export const KICK_AT = 4.25;
export const SLURP_AT = 4.55;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const NEXT_AT = 8;
export const CLIMB_AT = 10.35;
export const SPOT_AT = 11.35;
export const STRIKE_AT = 11.55;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Seam time: seconds from the loop point, negative just before it. */
export const seam = (t: number): number => (t > LOOP_S / 2 ? t - LOOP_S : t);

// ---------------------------------------------------------------- sizes

/** The anaconda's body width (thick and heavy) and length, and its jaws' length. */
export const NECK_W = 150;
export const BODY_LEN = 2900;
export const JAW = 420;
const JAW_SWALLOW = 320;
const SKIN = 8;

/**
 * The young caiman's outline about its axis, snout tip (0) to tail tip: how
 * far above and below it. A short broad snout (about 1.3 times the skull behind the eyes),
 * blunt at the tip, the head rising to the raised eyes, a thick neck, the low armoured trunk, then the long tail tapering.
 */
/** How much bigger than its base drawing the caiman is: a stocky juvenile, big in frame. */
export const U = 1.25;
const BASE_KNOTS: readonly (readonly [number, number, number])[] = [
  [0, 22, 22], [20, 30, 28], [55, 37, 33], [85, 43, 38], [110, 54, 43], [145, 60, 50], [190, 64, 58], [230, 68, 64],
  [290, 82, 86], [380, 94, 98], [460, 96, 96], [520, 88, 80], [570, 70, 56], [650, 54, 40], [730, 38, 26], [790, 20, 14], [820, 3, 2],
];
const CAIMAN_KNOTS = BASE_KNOTS.map(([a, top, bottom]) => [a * U, top * U, bottom * U] as const);
export const CAIMAN_LEN = 820 * U;

function knot(a: number, side: 1 | 2): number {
  if (a <= 0 || a >= CAIMAN_LEN) return 0;
  for (let i = 1; i < CAIMAN_KNOTS.length; i++) {
    const k1 = CAIMAN_KNOTS[i]!;
    if (a > k1[0]) continue;
    const k0 = CAIMAN_KNOTS[i - 1]!;
    const s = (a - k0[0]) / (k1[0] - k0[0]);
    return k0[side] + (k1[side] - k0[side]) * (1 - Math.cos(Math.PI * s)) * 0.5;
  }
  return 0;
}
export const caimanTop = (a: number): number => knot(a, 1);
export const caimanBottom = (a: number): number => knot(a, 2);

/** The rim where frame 1 finds the jaws: round its snout, the eyes and spectacle just outside. */
export const RIM_0 = 72 * U;
/** How wide the jaws gape on frame 1, either side of its axis: wider than it needs, before they bite down. */
const FRAME_ONE_GAPE = 175;
/** The rim once the whole caiman is inside. */
export const RIM_FULL = 1130;
const WAIT_RIM = -190;

// ---------------------------------------------------------------- the head along the path

const STRIKE: readonly Key[] = [
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: LOOP_S, at: PERIOD + RIM_0, rate: 260 },
];
const CRAWL: readonly Key[] = [
  { t: 6.5, at: RIM_FULL, rate: 0 },
  { t: 7.4, at: RIM_FULL + 220 },
  { t: 10.1, at: PERIOD + WAIT_RIM - 110 },
  { t: 11, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
];
const BITE: readonly Key[] = [
  { t: 0, at: RIM_0, rate: 260 },
  { t: BITE_AT, at: 300 * U, rate: 0 },
];
const HEAVE_STEPS = [110 * U, 110 * U, 120 * U] as const;

/** Where the rim of the mouth is along the path, u: on the caiman (u = its `a`) while swallowing, then crawling on to the next one. */
export function headU(t: number): number {
  if (t >= STRIKE_AT) return curveAt(STRIKE, t).at;
  if (t >= 6.5) return curveAt(CRAWL, t).at;
  let r = curveAt(BITE, t).at;
  HEAVES.forEach((h, i) => (r += HEAVE_STEPS[i]! * ramp(t, h, h + (i === 2 ? 0.34 : 0.25))));
  // Slipping back a little before each heave.
  for (const h of HEAVES) r -= 10 * window01(t, h - 0.45, h + 0.1, 0.25);
  r += 100 * ramp(t, SLURP_AT, GULP_AT - 0.05);
  return r + (RIM_FULL - 300 * U - 340 * U - 100) * ramp(t, GULP_AT - 0.05, GULP_AT + 0.1);
}

/** The rim on the meal, for reading the lump: stays put once the meal is whole inside. */
export const mealRim = (t: number): number => Math.min(RIM_FULL, t < NEXT_AT ? headU(t) : RIM_FULL);

/** The jaws walking: each side's rim leads in turn (world units, upper + / lower −). */
export function jawWalk(t: number): number {
  return 18 * Math.sin(2 * Math.PI * 1.1 * t) * window01(t, 0.9, GULP_AT - 0.2, 0.3);
}

/** The gape when there's nothing to open round: wide through the strike, two chews after the gulp. */
export function freeGape(t: number): number {
  const u = seam(t);
  if (u >= -0.5 && u < 0.7) return FRAME_ONE_GAPE * Math.min(ramp(u, -0.5, -0.02), 1 - ramp(u, 0.2, BITE_AT));
  let open = 0;
  for (const c of [GULP_AT + 0.4, GULP_AT + 0.8]) if (t > c && t < c + 0.2) open = Math.max(open, 26 * Math.sin((Math.PI * (t - c)) / 0.2));
  return open;
}

export interface JawFrame {
  /** Half openings at the tips and at the hinges, above and below the axis. */
  readonly tipTop: number;
  readonly tipBottom: number;
  readonly hingeTop: number;
  readonly hingeBottom: number;
  /** How far behind the rim the hinges are, along the axis. */
  readonly reach: number;
}

const smoothMax = (a: number, b: number): number => (a ** 6 + b ** 6) ** (1 / 6);
const withSkin = (v: number): number => v + (v > 0 ? SKIN : 0);

/** The body's half widths at caiman place `a` for a meal scaled `size`. */
export const swellTop = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(caimanTop(a)));
export const swellBottom = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(caimanBottom(a)));
/** Its armoured back pressing out through the skin: a row of low ridges along the top of the lump. */
export const ridgeBump = (a: number, size: number): number => size * 15 * Math.sin(Math.PI * ((a / U - 250) / 46)) ** 2 * window01(a / U, 250, 700, 40);

/** The meal's size inside: whole until it digests away. */
export const lumpSize = (t: number): number => {
  if (t >= 9.5) return 0;
  const s = t - GULP_AT;
  const pop = s > 0 ? 1 + 0.16 * Math.exp(-6 * s) * Math.sin(16 * s) : 1;
  return pop * (1 - ramp(t, 7.3, 9.5));
};

/** The jaws' length: long and gaping for the strike, drawn in to the head's own length once they've bitten. */
export function jawLen(t: number): number {
  const u = seam(t);
  return JAW_SWALLOW + (JAW - JAW_SWALLOW) * (u < 0 ? ramp(u, -1.2, -0.5) : 1 - ramp(u, 0.4, 1.6));
}

/** The jaws as they sit on the meal at time t. */
export function jawsAt(t: number): JawFrame {
  const swallowing = t < GULP_AT + 0.4 || seam(t) > -1;
  const rim = seam(t) < 0 && t > 8 ? 0 : t < GULP_AT + 0.4 ? headU(t) : CAIMAN_LEN + 900;
  const walk = jawWalk(t);
  const free = freeGape(t);
  const tipTop = Math.max(free, swallowing ? withSkin(caimanTop(rim + walk)) : 0);
  const tipBottom = Math.max(free * 1.05, swallowing ? withSkin(caimanBottom(rim - walk)) : 0);
  const len = jawLen(t);
  let reach = len;
  let hingeTop = NECK_W / 2;
  let hingeBottom = NECK_W / 2;
  const size = lumpSize(t);
  for (let i = 0; i < 3; i++) {
    const a = mealRim(t) - reach;
    hingeTop = swellTop(a, size);
    hingeBottom = swellBottom(a, size);
    const rise = Math.max(Math.abs(tipTop - hingeTop), Math.abs(tipBottom - hingeBottom));
    reach = Math.sqrt(Math.max(len * len * 0.3, len * len - rise * rise));
  }
  return { tipTop, tipBottom, hingeTop, hingeBottom, reach };
}

/** How much of the head is the side view (1) rather than the game's top-down sprite (0). */
export const sideView = (t: number): number => Math.max(1 - ramp(t, 6.45, 6.85), ramp(t, 10.8, 11.25));

export type EyeState = 'open' | 'squeeze' | 'happy';
export function snakeEye(t: number): EyeState {
  if (HEAVES.some((h) => t > h - 0.05 && t < h + 0.4)) return 'squeeze';
  if (t > SLURP_AT - 0.05 && t < GULP_AT + 0.3) return 'squeeze';
  return t >= GULP_AT + 0.3 && t < 6.2 ? 'happy' : 'open';
}

/** The tongue, 0 in .. 1 out. */
export function tongue(t: number): number {
  for (const s of [6.05, 6.32, 10.55, 10.85]) if (t >= s && t < s + 0.24) return Math.sin(((t - s) / 0.24) * Math.PI);
  return 0;
}

/** Only its tail still sticking out (for the audio and the tests): the hind legs gone in, the tail not. */
export const onlyTailLeft = (t: number): boolean => headU(t) >= 600 * U && headU(t) < CAIMAN_LEN && t < GULP_AT;

/** Used by the test: where the head would be next on the path. */
export const headPoint = (t: number): ReturnType<typeof pathAt> => pathAt(headU(t));
