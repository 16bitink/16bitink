import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { DRIFT, pathAt, PERIOD, TILT } from '../gulphen/path';
import { BITE_AT, GULP_AT, HEAVES, jawLen, jawWalk, KICK_AT, LOOP_S, lumpSize, NECK_W, seam, SLURP_AT } from '../gulpcapy/story';
import { skinBottom, skinTop, TURTLE_LEN, turtleBottom, turtleTop } from './shape';

/**
 * "How did that fit a whole turtle": the capybara short's flooded bank, its
 * green anaconda, its camera and its beats (../gulpcapy/story.ts), and a
 * meal in a hard shell:
 *
 *   0     frame 1: the jaws gaping round the river turtle's head and neck, its "!"
 *   0.75  the bite lands on the front of the dome; stuck, feet paddling
 *   1.9   heave: the lip rides up the dome and slips back, "tok"
 *   2.8   heave: up to the dome's top
 *   3.65  heave: the jaws snap over the top
 *   4.25  only its hind feet and its little tail are left; they waggle once
 *   4.55  the last slurp
 *   4.9   GULP: the jaws snap shut, a dome-shaped lump with its scutes showing, "+18"
 *   5.05  "how did THAT fit"; 5.6 "Bigger!"; 6.05 the tongue flicks
 *   6.4   the camera pulls back; the snake crawls on, digesting
 *   8.0   the next turtle plods up the bank; 10 it waits, its neck drawn in
 *   11.0  it stretches its neck; 11.35 "!"; 11.55 the strike, which is frame 1.
 */
export { BITE_AT, GULP_AT, HEAVES, KICK_AT, LOOP_S, lumpSize, NECK_W, seam, SLURP_AT };
export type { EyeState } from '../gulpcapy/story';
export { BODY_LEN, jawLen, jawWalk, sideView, snakeEye, SPURT, tongue, wrap } from '../gulpcapy/story';

/** The lip slips off the dome, and later claps down over its far side. */
export const TOK_AT = 2.3;
export const SNAP_AT = HEAVES[2] + 0.24;
export const NEXT_TURTLE_AT = 8;
export const LOOK_UP_AT = 11;
export const SPOT_AT = 11.35;
export const STRIKE_AT = 11.55;

const SKIN = 8;
/** The rim where frame 1 finds the jaws: round its head. */
export const RIM_0 = 180;
/** How wide the jaws gape on frame 1, either side of its axis: wide enough for the dome, before they bite down. */
const FRAME_ONE_GAPE = 300;
/** Its head on frame 1: lifted a little. */
const FRAME_ONE_NECK = -0.06;
export const RIM_FULL = 1080;
const WAIT_RIM = -190;

// ---------------------------------------------------------------- the head along the path

const STRIKE: readonly Key[] = [
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: LOOP_S, at: PERIOD + RIM_0, rate: 160 },
];
const CRAWL: readonly Key[] = [
  { t: 6.5, at: RIM_FULL, rate: 0 },
  { t: 7.4, at: RIM_FULL + 220 },
  { t: 10.1, at: PERIOD + WAIT_RIM - 110 },
  { t: 11, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
];
/** Up the dome and over it: bitten, ridden up and slipped back, up to the top, snapped over. */
const SWALLOW: readonly Key[] = [
  { t: 0, at: RIM_0, rate: 160 },
  { t: BITE_AT, at: 282, rate: 0 },
  { t: HEAVES[0] - 0.12, at: 274, rate: 0 },
  { t: HEAVES[0] + 0.24, at: 376, rate: 0 },
  { t: TOK_AT - 0.02, at: 382, rate: 0 },
  { t: TOK_AT + 0.14, at: 288, rate: 0 },
  { t: TOK_AT + 0.24, at: 298, rate: 0 },
  { t: HEAVES[1] - 0.1, at: 290, rate: 0 },
  { t: HEAVES[1] + 0.3, at: 432, rate: 0 },
  { t: HEAVES[2] - 0.1, at: 424, rate: 0 },
  { t: HEAVES[2] + 0.4, at: 740, rate: 120 },
  { t: KICK_AT - 0.05, at: 758, rate: 0 },
  { t: SLURP_AT, at: 758, rate: 0 },
  { t: GULP_AT - 0.06, at: 862, rate: 600 },
  { t: GULP_AT + 0.1, at: RIM_FULL, rate: 0 },
];

/** Where the rim of the mouth is along the path, u: on the turtle (u = its `a`) while swallowing, then crawling on to the next one. */
export function headU(t: number): number {
  if (t >= STRIKE_AT) return curveAt(STRIKE, t).at;
  return t >= 6.5 ? curveAt(CRAWL, t).at : curveAt(SWALLOW, t).at;
}

/** The rim on the meal, for reading the lump: stays put once the meal is whole inside. */
export const mealRim = (t: number): number => Math.min(RIM_FULL, t < NEXT_TURTLE_AT ? headU(t) : RIM_FULL);

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

/** The body's half widths at turtle place `a` for a meal scaled `size`: the dome above, the flat underside below. */
export const swellTop = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(skinTop(a)));
export const swellBottom = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(skinBottom(a)));

/** The jaws still round the hind feet while only they and the tail are left. */
const feetGape = (rim: number, t: number): number => (t < GULP_AT + 0.1 ? Math.min(ramp(rim, 640, 690), 1 - ramp(rim, 770, 985)) : 0);

/** The jaws as they sit on the meal at time t. */
export function jawsAt(t: number): JawFrame {
  const swallowing = t < GULP_AT + 0.4 || seam(t) > -1;
  const rim = seam(t) < 0 && t > 8 ? 0 : t < GULP_AT + 0.4 ? headU(t) : TURTLE_LEN + 900;
  const walk = jawWalk(t);
  const free = freeGape(t);
  const feet = feetGape(rim, t);
  const tipTop = Math.max(free, 120 * feet, swallowing ? withSkin(turtleTop(rim + walk)) : 0);
  const tipBottom = Math.max(free * 1.05, 112 * feet, swallowing ? withSkin(turtleBottom(rim - walk)) : 0);
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

// ---------------------------------------------------------------- the turtle

export interface TurtlePose {
  /** Its nose in the world, and its axis's tilt (nose up when positive). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** Head about the neck's root: 0 along the axis, negative up. */
  readonly neck: number;
  /** How far the head is drawn back into the shell (world units). */
  readonly drawnIn: number;
  readonly alarm: boolean;
  /** Each leg's swing about its root, 0 down .. PI/2 trailing back. */
  readonly foreNear: number;
  readonly foreFar: number;
  readonly hindNear: number;
  readonly hindFar: number;
  /** How far the hind legs and the tail have slid back along it as they go in (world units). */
  readonly hindBack: number;
  /** The tail's swing. */
  readonly tail: number;
  /** Ground shadow, 0 .. 1, and how far the turtle is heaved up off it (world units). */
  readonly shadow: number;
  readonly lifted: number;
}

/** The leg swing that stands a leg plumb on the ground with the body tilted up by TILT. */
const PLUMB = TILT;

/** The shell rocking as the lip slips off it, and as the jaws clap over. */
function rock(t: number): number {
  const hit = (at: number, amp: number): number => (t > at && t < at + 0.8 ? amp * Math.exp(-6 * (t - at)) * Math.sin(24 * (t - at)) : 0);
  return hit(TOK_AT + 0.04, 0.05) + hit(BITE_AT, 0.03);
}

/** The tail and the two hind feet waggling, once: there and back. */
const waggle = (t: number): number => (t > KICK_AT && t < KICK_AT + 0.36 ? Math.sin(((t - KICK_AT) / 0.36) * 2 * Math.PI) : 0);

function swallowedTurtle(t: number): TurtlePose {
  const a = headU(t);
  const fore = ramp(a, 190, 380);
  const hind = ramp(a, 400, 690);
  // Off the ground, they kick out behind it.
  const back = 0.28 * ramp(t, 0.7, 1.2);
  const paddle = Math.sin(2 * Math.PI * 2.75 * t) * 0.55 * ramp(t, 0, 0.5);
  const w = waggle(t);
  return {
    x: 0, y: 0, tilt: TILT + rock(t), neck: FRAME_ONE_NECK * (1 - ramp(t, 0.3, 1.2)), drawnIn: 0, alarm: true,
    foreNear: PLUMB + 0.1 + 0.5 * paddle * (1 - fore) + fore * 1.2,
    foreFar: PLUMB - 0.5 * paddle * (1 - fore) + fore * 1.25,
    hindNear: PLUMB + 0.05 + back * (1 - hind) + paddle * (1 - hind) + hind * 1.0 + 0.42 * w,
    hindFar: PLUMB - 0.05 + back * (1 - hind) - paddle * (1 - hind) + hind * 1.45 - 0.42 * w,
    hindBack: 112 * hind,
    tail: 0.5 * w + 0.1 * Math.sin(9 * t) * ramp(t, 0.1, 0.6) * (1 - ramp(t, 3.9, 4.2)),
    shadow: 1 - ramp(a, 560, 760),
    lifted: 60 * ramp(t, 0.6, 1.1) + 25 * window01(t, HEAVES[0], TOK_AT + 0.1, 0.15) + 25 * ramp(t, HEAVES[1], HEAVES[1] + 0.3),
  };
}

const WANDER: readonly Key[] = [
  { t: NEXT_TURTLE_AT, at: -900, rate: 300 },
  { t: 9.4, at: -250 },
  { t: 10, at: -40, rate: 0 },
  { t: 10.95, at: -40, rate: 0 },
];

function nextTurtle(t: number): TurtlePose {
  const walked = curveAt(WANDER, t);
  const rear = ramp(t, SPOT_AT - 0.05, LOOP_S - 0.2);
  const to = 1 - ramp(t, 11, 11.45);
  const pace = clamp01(walked.rate / 160);
  const stride = pace * Math.sin(2 * Math.PI * 2 * t);
  // Plodding with its neck half out; it stops and draws it in; then it stretches it right out to look.
  const drawnIn = lerp(34 + 8 * stride, 74, ramp(t, 9.9, 10.4)) * (1 - ramp(t, LOOK_UP_AT, LOOK_UP_AT + 0.28));
  const neck = lerp(0.1, 0.02, ramp(t, 9.9, 10.4)) - 0.12 * ramp(t, LOOK_UP_AT, LOOK_UP_AT + 0.28);
  const stand = ramp(t, 10.8, 11.3);
  return {
    x: DRIFT.x + walked.at * to,
    y: DRIFT.y + 40 * to - 6 * Math.abs(stride),
    tilt: TILT * rear + 0.02 * stride,
    neck: lerp(neck, FRAME_ONE_NECK, ramp(t, SPOT_AT, STRIKE_AT)),
    drawnIn,
    alarm: t >= SPOT_AT - 0.1,
    foreNear: lerp(0.45 * stride, PLUMB + 0.1, stand * rear),
    foreFar: lerp(-0.45 * stride, PLUMB, stand * rear),
    hindNear: lerp(-0.45 * stride, PLUMB + 0.05, stand * rear),
    hindFar: lerp(0.45 * stride, PLUMB - 0.05, stand * rear),
    hindBack: 0,
    tail: 0.2 * stride,
    shadow: 1,
    lifted: 0,
  };
}

/** The turtle in play at time t, if any. */
export function turtleAt(t: number): TurtlePose | null {
  if (t < GULP_AT - 0.02) return swallowedTurtle(t);
  return t >= NEXT_TURTLE_AT ? nextTurtle(t) : null;
}

/** Its hind feet and tail still sticking out: the shell hidden, they not. */
export const onlyFeetLeft = (t: number): boolean => headU(t) >= TURTLE_LEN && headU(t) < 900 && t < GULP_AT;

/** Used by the test: where the head would be next on the path. */
export const headPoint = (t: number): ReturnType<typeof pathAt> => pathAt(headU(t));
