import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { DRIFT, pathAt, PERIOD, TILT } from '../gulphen/path';

/**
 * "How did that fit a whole capybara": chapter 10's flooded forest, played as
 * a highlight from a low three-quarter angle, the hen short's beats with a
 * green anaconda lying in wait at the water's edge:
 *
 *   0     frame 1: the jaws gaping round the capybara's head and shoulders, its "!"
 *   0.75  the bite lands; stuck, legs paddling
 *   1.9   heave, 2.8 heave, 3.65 heave: the jaws walk on, the fur puffs
 *   4.25  only its hind feet are left; they kick once
 *   4.55  the last slurp
 *   4.9   GULP: the jaws shoot on and snap shut, a capybara-shaped lump, "+70"
 *   5.05  "how did THAT fit"
 *   5.6   "Bigger!"; 6.05 the tongue flicks
 *   6.4   the camera pulls back; the snake crawls on, digesting
 *   8.0   the next capybara strolls down to the water
 *   10    it drinks; 11.0 looks up; 11.35 "!"; 11.55 the strike, which is frame 1.
 *
 * World units are screen px at frame 1; the path is the hen short's (path.ts
 * there). camera.ts has the view, words.ts the text and sounds.
 */
export const LOOP_S = 12;

export const BITE_AT = 0.75;
export const HEAVES = [1.9, 2.8, 3.65] as const;
export const KICK_AT = 4.25;
export const SLURP_AT = 4.55;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const NEXT_CAPY_AT = 8;
export const DRINK_AT = 10;
export const LOOK_UP_AT = 11;
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
 * The capybara's outline about its axis, nose (0) to rump: how far above and
 * below it. A big blunt box of a head (the muzzle squared off at the front),
 * hardly any neck, then the barrel, the rump round, no tail.
 */
const CAPY_KNOTS: readonly (readonly [number, number, number])[] = [
  [0, 52, 60], [12, 66, 72], [45, 74, 80], [95, 84, 84], [145, 98, 88], [190, 108, 92], [228, 112, 100], [268, 128, 126],
  [320, 152, 148], [400, 170, 160], [500, 178, 164], [590, 176, 158], [660, 162, 136], [712, 132, 100], [746, 86, 56], [766, 32, 16], [772, 2, 2],
];
export const CAPY_LEN = 772;

function knot(a: number, side: 1 | 2): number {
  if (a <= 0 || a >= CAPY_LEN) return 0;
  for (let i = 1; i < CAPY_KNOTS.length; i++) {
    const k1 = CAPY_KNOTS[i]!;
    if (a > k1[0]) continue;
    const k0 = CAPY_KNOTS[i - 1]!;
    const s = (a - k0[0]) / (k1[0] - k0[0]);
    return k0[side] + (k1[side] - k0[side]) * (1 - Math.cos(Math.PI * s)) * 0.5;
  }
  return 0;
}
export const capyTop = (a: number): number => knot(a, 1);
export const capyBottom = (a: number): number => knot(a, 2);

/** The rim where frame 1 finds the jaws: round its cheeks, its muzzle inside. */
export const RIM_0 = 120;
/** How wide the jaws gape on frame 1, either side of its axis: wider than it needs, before they bite down. */
const FRAME_ONE_GAPE = 280;
/** Its head on frame 1: lifted a little, so the muzzle stands clear in the mouth. */
const FRAME_ONE_NECK = -0.08;
const RIM_FULL = 1080;
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
  { t: BITE_AT, at: 310, rate: 0 },
];
const HEAVE_STEPS = [150, 160, 170] as const;

/** Where the rim of the mouth is along the path, u: on the capybara (u = its `a`) while swallowing, then crawling on to the next one. */
export function headU(t: number): number {
  if (t >= STRIKE_AT) return curveAt(STRIKE, t).at;
  if (t >= 6.5) return curveAt(CRAWL, t).at;
  let r = curveAt(BITE, t).at;
  // The last heave, over the round rump, takes a little longer.
  HEAVES.forEach((h, i) => (r += HEAVE_STEPS[i]! * ramp(t, h, h + (i === 2 ? 0.34 : 0.25))));
  // Slipping back a little before each heave.
  for (const h of HEAVES) r -= 10 * window01(t, h - 0.45, h + 0.1, 0.25);
  r += 60 * ramp(t, SLURP_AT, GULP_AT - 0.05);
  return r + 230 * ramp(t, GULP_AT - 0.05, GULP_AT + 0.1);
}

/** The rim on the meal, for reading the lump: stays put once the meal is whole inside. */
export const mealRim = (t: number): number => Math.min(RIM_FULL, t < NEXT_CAPY_AT ? headU(t) : RIM_FULL);

/** The jaws walking: each side's rim leads in turn (world units, upper + / lower −). */
export function jawWalk(t: number): number {
  return 20 * Math.sin(2 * Math.PI * 1.1 * t) * window01(t, 0.9, GULP_AT - 0.2, 0.3);
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

/** The body's half widths at capybara place `a` for a meal scaled `size`. */
export const swellTop = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(capyTop(a)));
export const swellBottom = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(capyBottom(a)));
/** Its ears pressing out through the skin, on top of the lump's front. */
export const earBump = (a: number, size: number): number => size * 16 * window01(a, 150, 230, 25);

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

/** The jaws still round the hind legs while only the feet are left, as they go in. */
const feetGape = (rim: number, t: number): number => (t < GULP_AT ? window01(rim, 700, 880, 40) : 0);

/** The jaws as they sit on the meal at time t. */
export function jawsAt(t: number): JawFrame {
  const swallowing = t < GULP_AT + 0.4 || seam(t) > -1;
  const rim = seam(t) < 0 && t > 8 ? 0 : t < GULP_AT + 0.4 ? headU(t) : CAPY_LEN + 900;
  const walk = jawWalk(t);
  const free = freeGape(t);
  const feet = feetGape(rim, t);
  const tipTop = Math.max(free, 30 * feet, swallowing ? withSkin(capyTop(rim + walk)) : 0);
  const tipBottom = Math.max(free * 1.05, 120 * feet, swallowing ? withSkin(capyBottom(rim - walk)) : 0);
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

// ---------------------------------------------------------------- the capybara

export interface CapyPose {
  /** Its nose in the world, and its axis's tilt (nose up when positive). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** Head about the neck: 0 along the axis, negative up, positive down to drink. */
  readonly neck: number;
  readonly alarm: boolean;
  /** Each leg's swing about its hip, 0 down .. PI/2 trailing back. */
  readonly foreNear: number;
  readonly foreFar: number;
  readonly hindNear: number;
  readonly hindFar: number;
  /** How far the hind hips have slid back along it as they go in (world units). */
  readonly hindBack: number;
  /** A ruffle in time with a heave, 0 .. 1. */
  readonly shudder: number;
  /** Ground shadow, 0 .. 1. */
  readonly shadow: number;
}

/** The leg swing that stands a leg plumb on the ground with the body tilted up by TILT. */
const PLUMB = TILT;

/** A pulse at each heave. */
export const heaveAt = (t: number): number => Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.05) / 0.35))));

function swallowedCapy(t: number): CapyPose {
  const a = headU(t);
  const fore = ramp(a, 250, 430);
  const hind = ramp(a, 560, 760);
  const paddle = Math.sin(2 * Math.PI * 3.2 * t) * 0.32;
  const kick = t > KICK_AT && t < KICK_AT + 0.3 ? Math.sin(((t - KICK_AT) / 0.3) * Math.PI) : 0;
  return {
    x: 0, y: 0, tilt: TILT, neck: FRAME_ONE_NECK * (1 - ramp(t, 0.3, 1.5)), alarm: true,
    foreNear: PLUMB + 0.1 + paddle * (1 - fore) + fore * 1.25,
    foreFar: PLUMB - paddle * (1 - fore) + fore * 1.3,
    hindNear: PLUMB - 0.05 + 0.6 * paddle * (1 - hind) + hind * 1.3 + 0.45 * kick,
    hindFar: PLUMB + 0.05 - 0.6 * paddle * (1 - hind) + hind * 1.34 - 0.5 * kick,
    hindBack: 150 * hind,
    shudder: heaveAt(t), shadow: 1 - ramp(a, 620, 800),
  };
}

const WANDER: readonly Key[] = [
  { t: NEXT_CAPY_AT, at: -1020, rate: 170 },
  { t: 9.55, at: -140 },
  { t: 9.95, at: -40, rate: 0 },
  { t: 10.95, at: -40, rate: 0 },
];
/** Its sips: when its nose dips to the water. */
const SIPS = [10.2, 10.5] as const;

function nextCapy(t: number): CapyPose {
  const walked = curveAt(WANDER, t);
  const rear = ramp(t, SPOT_AT - 0.05, LOOP_S - 0.2);
  const to = 1 - ramp(t, 11, 11.45);
  const sip = Math.max(0, ...SIPS.map((p) => Math.sin(Math.PI * clamp01((t - p) / 0.3))));
  const stride = Math.abs(walked.rate) > 20 ? Math.sin(2 * Math.PI * 2.4 * t) : 0;
  const drink = window01(t, DRINK_AT - 0.15, LOOK_UP_AT, 0.25);
  const neck = lerp(0.08, 0.62 + 0.12 * sip, drink) - 0.3 * ramp(t, LOOK_UP_AT, LOOK_UP_AT + 0.15);
  const stand = ramp(t, 10.8, 11.3);
  return {
    x: DRIFT.x + walked.at * to,
    y: DRIFT.y + 40 * to,
    tilt: TILT * rear,
    neck: lerp(neck, FRAME_ONE_NECK, ramp(t, SPOT_AT, STRIKE_AT)),
    alarm: t >= SPOT_AT - 0.1,
    foreNear: lerp(0.3 * stride, PLUMB + 0.1, stand * rear),
    foreFar: lerp(-0.3 * stride, PLUMB, stand * rear),
    hindNear: lerp(-0.3 * stride, PLUMB - 0.05, stand * rear),
    hindFar: lerp(0.3 * stride, PLUMB + 0.05, stand * rear),
    hindBack: 0,
    shudder: 0,
    shadow: 1,
  };
}

/** The capybara in play at time t, if any. */
export function capyAt(t: number): CapyPose | null {
  if (t < GULP_AT - 0.02) return swallowedCapy(t);
  return t >= NEXT_CAPY_AT ? nextCapy(t) : null;
}

/** Its hind feet still sticking out (for the audio and the tests): the body hidden, the feet not. */
export const onlyFeetLeft = (t: number): boolean => headU(t) >= CAPY_LEN && headU(t) < 880 && t < GULP_AT;

/** Used by the test: where the head would be next on the path. */
export const headPoint = (t: number): ReturnType<typeof pathAt> => pathAt(headU(t));
