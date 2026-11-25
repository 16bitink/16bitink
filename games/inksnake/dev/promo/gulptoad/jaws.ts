import { ramp, window01 } from '../short';
import { BALL_A, BALL_R, ballEnd, BITE_AT, GULP_AT, headU, jawWalk, lumpSize, mealRim, NECK_W, PFFFT_AT, puffAt, seam } from './story';

/** The jaws as they sit on the toad, and the lump it makes inside the snake (story.ts has the beats). */

/** The jaws' length: long and gaping for the strike, drawn in once they've bitten. */
const JAW = 430;
const JAW_SWALLOW = 330;
const SKIN = 6;
/** How wide the jaws gape on frame 1, either side of its axis: wider than it needs, before they bite down. */
const FRAME_ONE_GAPE = 268;

/** The toad's head about its axis, nose (0) to the neck: how far above and below. */
const HEAD_KNOTS: readonly (readonly [number, number, number])[] = [
  [0, 30, 34], [14, 62, 60], [50, 90, 82], [100, 112, 92], [150, 108, 98], [230, 100, 100],
];
const HEAD_END = 230;

function headHalf(a: number, side: 1 | 2): number {
  if (a <= 0 || a >= HEAD_END) return 0;
  for (let i = 1; i < HEAD_KNOTS.length; i++) {
    const k1 = HEAD_KNOTS[i]!;
    if (a > k1[0]) continue;
    const k0 = HEAD_KNOTS[i - 1]!;
    const s = (a - k0[0]) / (k1[0] - k0[0]);
    return k0[side] + (k1[side] - k0[side]) * (1 - Math.cos(Math.PI * s)) * 0.5;
  }
  return 0;
}

/** The balloon's half height `a` along, for a toad puffed `puff`. */
export const ballHalf = (a: number, puff: number): number => {
  const r = BALL_R * puff;
  return Math.sqrt(Math.max(0, r * r - (a - BALL_A) ** 2));
};
export const toadTop = (a: number, puff: number): number => Math.max(headHalf(a, 1), ballHalf(a, puff));
export const toadBottom = (a: number, puff: number): number => Math.max(headHalf(a, 2), ballHalf(a, puff));

const smoothMax = (a: number, b: number): number => (a ** 6 + b ** 6) ** (1 / 6);
const withSkin = (v: number): number => v + (v > 0 ? SKIN : 0);

/**
 * The skin tents from the ball's shoulder down to the neck behind it while
 * the jaws still hold the ball: a straight fall, touching the circle.
 */
const TENT = { cos: 0.57, sin: 0.82, fall: 0.7 } as const;
const tentHalf = (a: number, puff: number): number => {
  const r = BALL_R * puff;
  const from = BALL_A - TENT.cos * r;
  return a >= from ? 0 : Math.max(0, TENT.sin * r - TENT.fall * (from - a));
};

/** The lips come off the ball's rump over its thighs: a straight fall, touching the circle behind. */
const rumpHalf = (a: number, puff: number): number => {
  const r = BALL_R * puff;
  const from = BALL_A + 0.75 * r;
  return a <= from ? 0 : Math.max(0, 0.66 * r - 1.14 * (a - from));
};

/** How much of the head's bump and the tent is left on the lump: gone soon after the gulp, so the lump is perfectly round. */
const bumpAt = (t: number): number => 1 - ramp(t, GULP_AT - 0.1, GULP_AT + 0.25);

/** The body's half widths at toad place `a` (the lump scaled about its own middle by its size). */
function swell(a: number, t: number, side: 1 | 2): number {
  const size = lumpSize(t);
  if (size <= 0.02) return NECK_W / 2;
  const at = BALL_A + (a - BALL_A) / size;
  const puff = Math.max(1, puffAt(Math.min(t, GULP_AT + 1)));
  const half = Math.max(Math.max(headHalf(at, side), tentHalf(at, puff)) * bumpAt(t), ballHalf(at, puff));
  return smoothMax(NECK_W / 2, size * withSkin(half));
}
export const swellTop = (a: number, t: number): number => swell(a, t, 1);
export const swellBottom = (a: number, t: number): number => swell(a, t, 2);

/** The gape when there's nothing to open round: wide through the strike, two chews after the gulp, the lips parting for the "pffft". */
export function freeGape(t: number): number {
  const u = seam(t);
  if (u >= -0.5 && u < 0.8) return FRAME_ONE_GAPE * Math.min(ramp(u, -0.5, -0.02), 1 - ramp(u, 0.25, BITE_AT + 0.05));
  let open = 0;
  for (const c of [GULP_AT + 0.4, GULP_AT + 0.8]) if (t > c && t < c + 0.2) open = Math.max(open, 26 * Math.sin((Math.PI * (t - c)) / 0.2));
  return Math.max(open, 16 * window01(t, PFFFT_AT, PFFFT_AT + 0.55, 0.12));
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

export function jawLen(t: number): number {
  const u = seam(t);
  return JAW_SWALLOW + (JAW - JAW_SWALLOW) * (u < 0 ? ramp(u, -1.2, -0.5) : 1 - ramp(u, 0.4, 1.6));
}

/** Where the toes end behind, along the axis. */
const FEET_END = 990;
/** The jaws still round the hind legs while only the feet are left, as they go in. */
const feetGape = (rim: number, t: number): number => (t < GULP_AT + 0.2 ? window01(rim, ballEnd(t) - 40, FEET_END, 60) : 0);

/** The jaws as they sit on the meal at time t. */
export function jawsAt(t: number): JawFrame {
  const swallowing = t < GULP_AT + 0.4 || seam(t) > -1;
  const rim = seam(t) < 0 && t > 8 ? 0 : t < GULP_AT + 0.4 ? headU(t) : 4000;
  const walk = jawWalk(t);
  const puff = Math.max(1, puffAt(Math.min(t, GULP_AT)));
  const free = freeGape(t);
  const feet = feetGape(rim, t);
  const top = swallowing && seam(t) >= 0 ? withSkin(Math.max(toadTop(rim + walk, puff), rumpHalf(rim + walk, puff))) : 0;
  const bottom = swallowing && seam(t) >= 0 ? withSkin(Math.max(toadBottom(rim - walk, puff), rumpHalf(rim - walk, puff))) : 0;
  const tipTop = Math.max(free, 46 * feet, top);
  const tipBottom = Math.max(free * 1.05, 104 * feet, bottom);
  const len = jawLen(t);
  let reach = len;
  let hingeTop = NECK_W / 2;
  let hingeBottom = NECK_W / 2;
  for (let i = 0; i < 3; i++) {
    const a = mealRim(t) - reach;
    hingeTop = swellTop(a, t);
    hingeBottom = swellBottom(a, t);
    const rise = Math.max(tipTop - hingeTop, tipBottom - hingeBottom, Math.min(120, hingeTop - tipTop, hingeBottom - tipBottom));
    reach = Math.sqrt(Math.max(len * len * 0.3, len * len - rise * rise));
  }
  return { tipTop, tipBottom, hingeTop, hingeBottom, reach };
}
