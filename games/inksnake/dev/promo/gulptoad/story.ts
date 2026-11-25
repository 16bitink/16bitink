import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { DRIFT, pathAt, PERIOD, TILT } from './path';

/**
 * "How did that fit a puffed-up toad": chapter 2's pine barrens, played as a
 * highlight from a low three-quarter angle, the hen short's beats with an
 * eastern hognose and a toad that blows itself up like a balloon:
 *
 *   0     frame 1: the jaws gaping round the toad's head and shoulders, the huge round body outside, its "!"
 *   0.75  the bite lands; stuck, legs paddling
 *   1.9   heave, 2.8 heave, 3.65 heave: before each, the toad puffs up bigger and the jaws must stretch wider
 *   4.25  only its hind feet are left, toes splayed; they kick once
 *   4.55  the last slurp
 *   4.9   GULP: the jaws shoot on and snap shut, a perfectly round lump, "+12"
 *   5.05  "how did THAT fit"
 *   5.6   "Bigger!"; 6.1 the tongue flicks
 *   6.4   the camera pulls back; the snake crawls on; 6.75 "pffft": the lump shrinks, a puff of air at the lips
 *   8.0   the next toad hops in; 10.3 it has landed, sits and puffs up
 *   11.35 "!"; 11.55 the strike, which is frame 1.
 *
 * World units are screen px at zoom 1 (path.ts). camera.ts has the view,
 * words.ts the text, puffs of air and sounds; jaws.ts the jaws on the meal.
 */
export const LOOP_S = 12;

export const BITE_AT = 0.75;
export const HEAVES = [1.9, 2.8, 3.65] as const;
export const KICK_AT = 4.25;
export const SLURP_AT = 4.55;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const PFFFT_AT = 6.75;
export const NEXT_TOAD_AT = 8;
export const LANDED_AT = 10.2;
/** The next toad's pumps of air, as it blows itself up to frame 1's size. */
export const PUMPS = [10.4, 10.75, 11.1] as const;
export const SPOT_AT = 11.35;
export const STRIKE_AT = 11.55;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Seam time: seconds from the loop point, negative just before it. */
export const seam = (t: number): number => (t > LOOP_S / 2 ? t - LOOP_S : t);

// ---------------------------------------------------------------- the toad's size

/** The hognose's body width (stout) and length. */
export const NECK_W = 150;
export const BODY_LEN = 2560;

/** The toad's balloon of a body: its centre along the axis from the nose, its radius on frame 1. */
export const BALL_A = 408;
export const BALL_R = 240;

/** A springy step 0 → 1 over about 0.4 s from t = 0. */
const boing = (s: number): number => (s <= 0 ? 0 : 1 - Math.exp(-11 * s) * Math.cos(17 * s));

/** How much bigger each gulp of air blows it: before each heave. */
const PUFF_LEAD = 0.22;
const PUFF_STEPS = [0.09, 0.1, 0.09] as const;
const LIMP = 0.62;

/** The toad's size against frame 1's, 1 on frame 1. */
export function puffAt(t: number): number {
  if (t >= NEXT_TOAD_AT) return LIMP + (1 - LIMP) * PUMPS.reduce((s, p) => s + boing(t - p) / PUMPS.length, 0);
  return 1 + HEAVES.reduce((s, h, i) => s + PUFF_STEPS[i]! * boing(t - (h - PUFF_LEAD)), 0);
}

/** A pulse while air goes in, 0 .. 1, for the swelling marks. */
export function swellMarks(t: number): number {
  const starts = t >= NEXT_TOAD_AT ? PUMPS : HEAVES.map((h) => h - PUFF_LEAD);
  return Math.max(0, ...starts.map((p) => window01(t, p, p + 0.5, 0.16)));
}

/** Where its balloon ends behind, along the axis. */
export const ballEnd = (t: number): number => BALL_A + BALL_R * puffAt(t);

// ---------------------------------------------------------------- the head along the path

/** The rim where frame 1 finds the jaws: behind the toad's eyes, its shoulders at the lips. */
export const RIM_0 = 178;
const RIM_FULL = 1150;
const WAIT_RIM = -200;

const STRIKE: readonly Key[] = [
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: LOOP_S, at: PERIOD + RIM_0, rate: 230 },
];
const CRAWL: readonly Key[] = [
  { t: 6.5, at: RIM_FULL, rate: 0 },
  { t: 7.4, at: RIM_FULL + 200 },
  { t: 10.1, at: PERIOD + WAIT_RIM - 230, rate: 420 },
  { t: 11, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
];
const BITE: readonly Key[] = [
  { t: 0, at: RIM_0, rate: 230 },
  { t: BITE_AT, at: 300, rate: 0 },
];
const HEAVE_STEPS = [118, 130, 188] as const;
const SLURP = 90;
const SNAP = 220;
/** What's left of the way to RIM_FULL after the bite, heaves, slurp and snap: the head gliding on as the lump slides back. */
const GLIDE = RIM_FULL - BITE[1]!.at - HEAVE_STEPS.reduce((a, b) => a + b, 0) - SLURP - SNAP;

/** Where the rim of the mouth is along the path, u: on the toad (u = its `a`) while swallowing, then crawling on to the next one. */
export function headU(t: number): number {
  if (t >= STRIKE_AT) return curveAt(STRIKE, t).at;
  if (t >= 6.5) return curveAt(CRAWL, t).at;
  let r = curveAt(BITE, t).at;
  // The last heave, over the round rump, takes a little longer.
  HEAVES.forEach((h, i) => (r += HEAVE_STEPS[i]! * ramp(t, h, h + (i === 2 ? 0.42 : 0.25))));
  // Slipping back a little as it puffs up before each heave.
  for (const h of HEAVES) r -= 16 * window01(t, h - 0.4, h + 0.1, 0.2);
  r += SLURP * ramp(t, SLURP_AT, GULP_AT - 0.05);
  r += SNAP * ramp(t, GULP_AT - 0.1, GULP_AT + 0.1);
  return r + GLIDE * ramp(t, GULP_AT + 0.04, GULP_AT + 0.6);
}

/** The rim on the meal, for reading the lump: stays put once the meal is whole inside. */
export const mealRim = (t: number): number => Math.min(RIM_FULL, t < NEXT_TOAD_AT ? headU(t) : RIM_FULL);

/** The jaws walking: each side's rim leads in turn (world units, upper + / lower −). */
export function jawWalk(t: number): number {
  return 18 * Math.sin(2 * Math.PI * 1.1 * t) * window01(t, 0.9, GULP_AT - 0.2, 0.3);
}

/** The meal's size inside: whole, a comic "pffft", then it digests away. */
export const lumpSize = (t: number): number => {
  if (t >= 9.6) return 0;
  const s = t - GULP_AT;
  const pop = s > 0 ? 1 + 0.12 * Math.exp(-6 * s) * Math.sin(16 * s) : 1;
  const f = t - PFFFT_AT;
  const flap = f > 0 ? 0.03 * Math.exp(-4 * f) * Math.sin(58 * f) : 0;
  const out = 1 - 0.3 * ramp(t, PFFFT_AT, PFFFT_AT + 0.5) + flap;
  return Math.max(0, pop * out * (1 - ramp(t, 7.6, 9.6)));
};

/** How much of the head is the side view (1) rather than the game's top-down sprite (0). */
export const sideView = (t: number): number => Math.max(1 - ramp(t, 7.3, 7.6), ramp(t, 10.8, 11.2));

/** The hood: the neck spread a little, through the strike and the swallow. */
export const hoodAt = (t: number): number => Math.max(1 - ramp(t, GULP_AT - 0.1, GULP_AT + 0.4), ramp(t, 11.2, 11.6));

export type EyeState = 'open' | 'squeeze' | 'happy';
export function snakeEye(t: number): EyeState {
  if (HEAVES.some((h) => t > h - 0.05 && t < h + 0.4)) return 'squeeze';
  if (t > SLURP_AT - 0.05 && t < GULP_AT + 0.3) return 'squeeze';
  return t >= GULP_AT + 0.3 && t < PFFFT_AT + 0.9 ? 'happy' : 'open';
}

/** The tongue, 0 in .. 1 out. */
export function tongue(t: number): number {
  for (const s of [6.05, 6.32, 10.55, 10.85]) if (t >= s && t < s + 0.24) return Math.sin(((t - s) / 0.24) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the toad

export interface ToadPose {
  /** Its nose in the world (where frame 1's nose is, when full), and its axis's tilt (nose up when positive). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** Size against frame 1's. */
  readonly puff: number;
  /** Head about the neck: 0 along the axis, negative up. */
  readonly neck: number;
  readonly alarm: boolean;
  /** Each front leg's swing about its shoulder, 0 standing .. positive trailing back. */
  readonly armNear: number;
  readonly armFar: number;
  /** Each hind leg: 0 folded under it .. 1 stretched out behind. */
  readonly legNear: number;
  readonly legFar: number;
  /** The feet's kick, radians. */
  readonly kickNear: number;
  readonly kickFar: number;
  /** Where the hips are along the axis, at least (they slide back ahead of the lips). */
  readonly hipAt: number;
  readonly hipBack: number;
  /** A shudder in time with a heave, 0 .. 1. */
  readonly shudder: number;
  /** Ground shadow, 0 .. 1, and how high it is off the ground (world units). */
  readonly shadow: number;
  readonly air: number;
}

/** Frame 1's head: lifted a little, so the eye and mouth stand clear between the jaws. */
const FRAME_ONE_NECK = -0.05;

/** A pulse at each heave. */
export const heaveAt = (t: number): number => Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.05) / 0.35))));

/** How far back its hips slide, stretched out behind; past that the lips take the feet in. */
const HIP_MAX = 650;
/** The jaws have shut over its toes. */
const GONE_AT = GULP_AT + 0.03;

function swallowedToad(t: number): ToadPose {
  const a = headU(t);
  const arms = ramp(a, 230, 420);
  const legs = ramp(a, 432, 545);
  const paddle = Math.sin(2 * Math.PI * 3.2 * t);
  const kick = t > KICK_AT && t < KICK_AT + 0.32 ? Math.sin(((t - KICK_AT) / 0.32) * 2 * Math.PI) * 0.8 : 0;
  return {
    x: 0, y: 0, tilt: TILT, puff: puffAt(t), neck: FRAME_ONE_NECK * (1 - ramp(t, 0.3, 1.5)), alarm: true,
    armNear: 0.3 * paddle * (1 - arms) + 1.1 * arms, armFar: -0.3 * paddle * (1 - arms) + 1.1 * arms,
    legNear: legs + 0.1 * Math.max(0, paddle) * (1 - legs), legFar: legs + 0.1 * Math.max(0, -paddle) * (1 - legs),
    kickNear: kick + 0.14 * paddle * (1 - legs), kickFar: -kick - 0.14 * paddle * (1 - legs),
    hipAt: Math.min(a - 60, HIP_MAX), hipBack: 50 * ramp(a, 290, 430),
    shudder: heaveAt(t), shadow: 1 - ramp(a, 560, 700), air: 0,
  };
}

/** Its hops in from the left: each from → to along the ground (from the spot where frame 1 finds it), and when. */
interface Hop { readonly from: number; readonly to: number; readonly at: number; readonly end: number; readonly high: number }
const HOPS: readonly Hop[] = [
  { from: -1500, to: -1010, at: 8.15, end: 8.65, high: 170 },
  { from: -1010, to: -500, at: 8.95, end: 9.45, high: 170 },
  { from: -500, to: 0, at: 9.7, end: LANDED_AT, high: 150 },
];
export const HOP_TIMES = HOPS.map((h) => ({ up: h.at, down: h.end }));

/** How far the un-puffed toad sits below frame 1's axis, world units (its feet stay on the ground). */
const SIT_DROP = 46;

function nextToad(t: number): ToadPose {
  const hop = HOPS.find((h) => t < h.end) ?? HOPS[HOPS.length - 1]!;
  const u = clamp01((t - hop.at) / (hop.end - hop.at));
  const air = 4 * hop.high * u * (1 - u);
  const x = lerp(hop.from, hop.to, u);
  const puff = puffAt(t);
  const size = clamp01((puff - LIMP) / (1 - LIMP));
  const rear = ramp(t, SPOT_AT - 0.05, LOOP_S - 0.25);
  const reach = Math.sin(Math.PI * u);
  // A squash as it lands.
  const land = Math.max(0, ...HOPS.map((h) => Math.sin(Math.PI * clamp01((t - h.end) / 0.2))));
  const drop = SIT_DROP * (1 - size);
  return {
    x: DRIFT.x + x, y: DRIFT.y + 40 * (1 - rear) + drop - air + 14 * land,
    tilt: TILT * rear + 0.32 * Math.cos(Math.PI * u) * (u > 0 && u < 1 ? reach : 0) + 0.06 * (1 - size) * (1 - reach),
    puff: puff * (1 - 0.06 * land),
    neck: lerp(-0.12 * (1 - size), FRAME_ONE_NECK, rear),
    alarm: t >= SPOT_AT - 0.1,
    armNear: -0.9 * reach * (u > 0.4 ? 1 : -0.4) + 0.12 * (1 - size), armFar: -0.8 * reach * (u > 0.4 ? 1 : -0.4),
    legNear: reach ** 0.6 * 0.9, legFar: reach ** 0.6 * 0.85,
    kickNear: 0, kickFar: 0, hipAt: 0, hipBack: 0, shudder: 0, shadow: 1 - 0.35 * (air / 170), air: air - drop - 14 * land,
  };
}

/** The toad in play at time t, if any. */
export function toadAt(t: number): ToadPose | null {
  if (t < GONE_AT) return swallowedToad(t);
  return t >= NEXT_TOAD_AT ? nextToad(t) : null;
}

/** Its hind feet still sticking out (for the audio and the tests): the body hidden, the feet not. */
export const onlyFeetLeft = (t: number): boolean => headU(t) >= ballEnd(t) && headU(t) < ballEnd(t) + 160 && t < GULP_AT;

/** Used by the test: where the head would be next on the path. */
export const headPoint = (t: number): ReturnType<typeof pathAt> => pathAt(headU(t));
