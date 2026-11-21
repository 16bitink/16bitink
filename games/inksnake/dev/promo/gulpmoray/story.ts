import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import type { Pt } from '../sprites';
import { DRIFT, HOLE_S, pathAt, PERIOD } from './rail';
import { sectionAt } from './tint';

/**
 * "How did that fit": chapter 6's reef, played as a highlight, seen from a
 * low three-quarter angle so the krait and the moray read at a glance. The
 * beats are the chicken short's (gulphen/story.ts), the meal a moray eel
 * too big for a krait without venom, pulled out of its coral hole:
 *
 *   0     frame 1: the krait's jaws gaping round the moray's head, its "!"
 *   0.75  the bite lands; the venom makes it sleepy, the body still waves
 *   1.9   heave, 2.8 heave, 3.65 heave: the long body slides out of the
 *         hole and in, bubbles puff out; after the third the tail is out
 *   4.25  only the tail tip is left; it kicks once
 *   4.55  the last slurp
 *   4.9   GULP: the jaws snap shut, a long eel-shaped lump, "+35"
 *   5.05  "how did THAT fit"; 5.6 "Bigger!"; 6.05 the tongue flicks
 *   6.4   the camera pulls back; the krait crawls on, digesting
 *   8.8   the next moray pokes out of its hole, sways
 *   11.0  it looks; 11.35 "!"; 11.55 the strike, which is frame 1.
 *
 * World units are screen px at zoom 1. As in the chicken short the krait
 * grows GROW times over the loop and the camera pulls back as much, so only
 * the ground shows the change (groundAt).
 *
 * Two places along a line: u along the snake's path (headU, the rim of its
 * mouth), and a along the moray from its nose (the rim on the moray is
 * mealRim). The moray's nose sits at s = eelNose along its rail (rail.ts).
 */
export const LOOP_S = 12;
export const GROW = 1.25;

export const BITE_AT = 0.75;
export const HEAVES = [1.9, 2.8, 3.65] as const;
export const KICK_AT = 4.25;
export const SLURP_AT = 4.55;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const NEXT_EEL_AT = 8;
export const EMERGE_AT = 8.8;
export const LOOK_UP_AT = 11;
export const SPOT_AT = 11.35;
export const STRIKE_AT = 11.55;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Seam time: seconds from the loop point, negative just before it. */
export const seam = (t: number): number => (t > LOOP_S / 2 ? t - LOOP_S : t);

// ---------------------------------------------------------------- sizes

/** The krait's body width and length, and its jaws' length: a small head, hardly wider than the neck. */
export const NECK_W = 118;
export const BODY_LEN = 3000;
export const JAW = 270;
const SKIN = 8;

/** The moray: its length and its greatest half-depth (a full depth about 1.6 times the krait's width). */
export const EEL_LEN = 1500;
export const EEL_D = 94;

export const eelTop = (a: number): number => (a <= 0 || a >= EEL_LEN ? 0 : sectionAt(a / EEL_LEN, false).top * EEL_D);
export const eelBottom = (a: number): number => (a <= 0 || a >= EEL_LEN ? 0 : sectionAt(a / EEL_LEN, false).bottom * EEL_D);

/** The rim on the moray on frame 1: its whole head inside the gape, its eye just clear. */
export const RIM_0 = 150;
const FRAME_ONE_GAPE = 172;
/** Where the lump sits once it is all in: a little behind the head. */
const RIM_FULL = EEL_LEN + 80;
/** How far the lump moves back along the body as it digests. */
const LUMP_DRIFT = 520;
const WAIT_RIM = -190;

const spring = (s: number): number => 1 - Math.exp(-8 * s) * Math.cos(13 * s);

// ---------------------------------------------------------------- the krait and the moray along the line

const STRIKE: readonly Key[] = [
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: LOOP_S, at: PERIOD + RIM_0, rate: 300 },
];
/** Where the head is after the gulp's lunge. */
const HEAD_FED = 420;
const CRAWL: readonly Key[] = [
  { t: 6.5, at: HEAD_FED, rate: 0 },
  { t: 7.4, at: HEAD_FED + 240 },
  { t: 10.1, at: PERIOD + WAIT_RIM - 110 },
  { t: 11, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
];
const HEAD_BITE: readonly Key[] = [
  { t: 0, at: RIM_0, rate: 300 },
  { t: BITE_AT, at: 200, rate: 0 },
];
const EEL_BITE: readonly Key[] = [
  { t: 0, at: RIM_0, rate: 300 },
  { t: BITE_AT, at: 260, rate: 0 },
];

const heaveSum = (t: number, each: number): number => HEAVES.reduce((sum, h) => sum + each * ramp(t, h, h + 0.3), 0);

/** The rim on the moray while it goes down: the bite, a steady pull, three heaves, the slurp and the gulp. */
export function rimOnEel(t: number): number {
  let r = curveAt(EEL_BITE, t).at + 115 * clamp01((t - BITE_AT) / (KICK_AT - BITE_AT)) * (KICK_AT - BITE_AT) + heaveSum(t, 240);
  for (const h of HEAVES) r -= 12 * window01(t, h - 0.45, h + 0.1, 0.25);
  return r + 60 * ramp(t, SLURP_AT, GULP_AT - 0.05) + 220 * ramp(t, GULP_AT - 0.05, GULP_AT + 0.1);
}

/** Where the rim of the mouth is along the path, u: the krait holds its place and hauls, then crawls on. */
export function headU(t: number): number {
  if (t >= STRIKE_AT) return curveAt(STRIKE, t).at;
  if (t >= 6.5) return curveAt(CRAWL, t).at;
  const r = curveAt(HEAD_BITE, t).at + heaveSum(t, 25) + 20 * ramp(t, SLURP_AT, GULP_AT - 0.05);
  return r + (HEAD_FED - 295) * ramp(t, GULP_AT - 0.05, GULP_AT + 0.1);
}

/** The swallowed moray's nose along its rail: hauled back into the snake as the rim runs on along it. */
export const eelNose = (t: number): number => headU(t) - rimOnEel(t);

/** The rim on the meal, for reading the lump: once the meal is whole inside, it slides slowly back along the body. */
export const mealRim = (t: number): number => (t < GULP_AT + 0.1 ? Math.min(RIM_FULL, rimOnEel(t)) : RIM_FULL + LUMP_DRIFT * ramp(t, GULP_AT + 0.3, 9.5));

/** The jaws walking: each side's rim leads in turn (world units, upper + / lower −). */
export function jawWalk(t: number): number {
  return 16 * Math.sin(2 * Math.PI * 1.1 * t) * window01(t, 0.9, GULP_AT - 0.2, 0.3);
}

/** The gape when there's nothing to open round: wide through the strike, two chews after the gulp. */
export function freeGape(t: number): number {
  const u = seam(t);
  if (u >= -0.5 && u < 0.7) return FRAME_ONE_GAPE * Math.min(ramp(u, -0.5, -0.02), 1 - ramp(u, 0.2, BITE_AT));
  let open = 0;
  for (const c of [GULP_AT + 0.4, GULP_AT + 0.8]) if (t > c && t < c + 0.2) open = Math.max(open, 22 * Math.sin((Math.PI * (t - c)) / 0.2));
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
const withSkin = (h: number): number => h + (h > 0 ? SKIN : 0);

/** The body's half widths at moray place `a` for a meal scaled `size`. */
export const swellTop = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(eelTop(a)));
export const swellBottom = (a: number, size: number): number => smoothMax(NECK_W / 2, size * withSkin(eelBottom(a)));

/** The jaws as they sit on the meal at time t. */
export function jawsAt(t: number): JawFrame {
  const swallowing = t < GULP_AT + 0.4 || seam(t) > -1;
  const rim = seam(t) < 0 && t > 8 ? 0 : t < GULP_AT + 0.4 ? mealRim(t) : EEL_LEN + 900;
  const walk = jawWalk(t);
  const free = freeGape(t);
  const tipTop = Math.max(free, swallowing ? withSkin(eelTop(rim + walk)) : 0);
  const tipBottom = Math.max(free * 1.05, swallowing ? withSkin(eelBottom(rim - walk)) : 0);
  let reach = JAW;
  let hingeTop = NECK_W / 2;
  let hingeBottom = NECK_W / 2;
  const size = lumpSize(t);
  for (let i = 0; i < 3; i++) {
    const a = mealRim(t) - reach;
    hingeTop = swellTop(a, size);
    hingeBottom = swellBottom(a, size);
    const rise = Math.max(Math.abs(tipTop - hingeTop), Math.abs(tipBottom - hingeBottom));
    reach = Math.sqrt(Math.max(JAW * JAW * 0.3, JAW * JAW - rise * rise));
  }
  return { tipTop, tipBottom, hingeTop, hingeBottom, reach };
}

/** The meal's size inside: whole until it digests away. */
export const lumpSize = (t: number): number => {
  if (t >= 9.5) return 0;
  const s = t - GULP_AT;
  const pop = s > 0 ? 1 + 0.12 * Math.exp(-6 * s) * Math.sin(16 * s) : 1;
  return pop * (1 - ramp(t, 7.3, 9.5));
};

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

// ---------------------------------------------------------------- the moray

export interface EelPose {
  /** Which eel (0 the swallowed one, 1 the next, a period on) and its nose along its rail. */
  readonly k: 0 | 1;
  readonly nose: number;
  /** The rim on it (where the jaws are), 0 if it is free. */
  readonly rim: number;
  /** Side-to-side, world units: the head swaying, the free body waving, the tail's kick. */
  readonly sway: number;
  readonly wave: number;
  readonly kick: number;
  readonly alarm: boolean;
  /** A ripple in time with a heave, 0 .. 1. */
  readonly shudder: number;
}

/** A pulse at each heave. */
export const heaveAt = (t: number): number => Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.05) / 0.35))));

function swallowedEel(t: number): EelPose {
  // Fighting at first, sleepier after each heave as the venom works.
  const fight = lerp(1, 0.35, ramp(t, BITE_AT, HEAVES[2]));
  const kick = t > KICK_AT && t < KICK_AT + 0.3 ? Math.sin(((t - KICK_AT) / 0.3) * Math.PI) : 0;
  return {
    k: 0, nose: eelNose(t), rim: mealRim(t), sway: 0, wave: 30 * fight * Math.sin(2 * Math.PI * 2.4 * t) * window01(t, 0.2, KICK_AT, 0.3), kick: 75 * kick, alarm: true, shudder: heaveAt(t),
  };
}

const EMERGE: readonly Key[] = [
  { t: EMERGE_AT, at: HOLE_S + 60, rate: 0 },
  { t: 10.2, at: 0, rate: 0 },
];

function nextEel(t: number): EelPose {
  const sway = 46 * Math.sin(2 * Math.PI * 1.25 * (t - 9.4)) * window01(t, 9.4, LOOK_UP_AT + 0.1, 0.45);
  return { k: 1, nose: curveAt(EMERGE, t).at, rim: 0, sway, wave: 0, kick: 0, alarm: t >= SPOT_AT - 0.1, shudder: 0 };
}

/** The moray in play at time t, if any. */
export function eelAt(t: number): EelPose | null {
  if (t < GULP_AT - 0.02) return swallowedEel(t);
  return t >= NEXT_EEL_AT ? nextEel(t) : null;
}

/** How far its body stands off the rail, up the screen, at `a` from its nose. */
export function eelOffset(e: EelPose, a: number, t: number): number {
  const holeA = HOLE_S - e.nose;
  const head = e.sway * clamp01(1 - a / Math.max(200, holeA)) ** 1.5;
  const free = Math.sin(Math.PI * clamp01((a - e.rim) / Math.max(1, holeA - e.rim)));
  const wave = e.wave * free * Math.sin(0.011 * a - 2 * Math.PI * 1.7 * t);
  const tail = e.kick * clamp01((a - (EEL_LEN - 260)) / 260) ** 2;
  return head + wave + tail;
}

/** Only its tail tip still out (for the audio and the tests). */
export const onlyTailLeft = (t: number): boolean => t < GULP_AT && EEL_LEN - mealRim(t) > 0 && EEL_LEN - mealRim(t) < 160;

// ---------------------------------------------------------------- the camera

export const SCREEN_ANCHOR: Pt = { x: 540, y: 800 };

/** How far the camera has pulled back to make up for the growth, 0 .. 1, after you've seen it grow. */
const pull = (t: number): number => ramp(t, 6.4, 8.2);
/** The snake's growth: a springy spurt on "Bigger!". */
export const growth = (t: number): number => (t <= SPURT ? 1 : GROW ** spring(t - SPURT));
/** Screen px per world unit on frame 1. */
const BASE_ZOOM = 1;
/** The wide shot over the crawl, 1 on frame 1. */
const wide = (t: number): number => BASE_ZOOM * lerp(1, 0.72, Math.min(ramp(t, 6.4, 8.4), 1 - ramp(t, 10.5, 11.75)));

export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export const C0: Pt = { x: -200, y: 110 };
const camKeys = (pick: (p: Pt) => number): readonly Key[] => [
  { t: 0, at: pick(C0), rate: 0 },
  { t: BITE_AT, at: pick(C0) },
  // Back along the krait as the lump grows, to see the whole long meal in it.
  { t: 3.9, at: pick({ x: C0.x + 120, y: C0.y - 10 }) },
  { t: 5.1, at: pick({ x: C0.x + 150, y: C0.y - 30 }) },
  { t: 6.5, at: pick({ x: C0.x + 120, y: C0.y - 30 }), rate: 0 },
  { t: 8.6, at: pick({ x: -1060, y: -130 }) },
  { t: 10.2, at: pick({ x: C0.x + DRIFT.x + 30, y: C0.y + DRIFT.y - 20 }) },
  { t: 11.75, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
  { t: LOOP_S, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
];
const CAM_X = camKeys((p) => p.x);
const CAM_Y = camKeys((p) => p.y);

export function viewAt(t: number): View {
  return { x: curveAt(CAM_X, t).at, y: curveAt(CAM_Y, t).at, zoom: (growth(t) * wide(t)) / GROW ** pull(t) };
}

/** World to screen, shake not included. */
export const toScreen = (v: View, p: Pt): Pt => ({ x: SCREEN_ANCHOR.x + (p.x - v.x) * v.zoom, y: SCREEN_ANCHOR.y + (p.y - v.y) * v.zoom });

export interface GroundLayer {
  /** Screen px per ground unit, and where the ground's origin lands. */
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

/** The reef floor zooming out for good by GROW a loop, two copies crossfading (as gulphen's groundAt). */
export function groundAt(t: number): readonly [GroundLayer, GroundLayer] {
  const v = viewAt(t);
  const zoom = v.zoom / growth(t) / BASE_ZOOM;
  const trackOf = (u: number): Pt => {
    const c = { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at };
    if (u <= SPURT) return c;
    const s = { x: curveAt(CAM_X, SPURT).at, y: curveAt(CAM_Y, SPURT).at };
    return { x: s.x + GROW * (c.x - s.x), y: s.y + GROW * (c.y - s.y) };
  };
  const c = trackOf(t);
  const [c0, c1] = [trackOf(0), trackOf(LOOP_S)];
  const first = { zoom, x: SCREEN_ANCHOR.x - c.x * zoom, y: SCREEN_ANCHOR.y - c.y * zoom, alpha: 1 };
  const second = {
    zoom: zoom * GROW,
    x: SCREEN_ANCHOR.x + (c1.x - c.x) * zoom - c0.x * zoom * GROW,
    y: SCREEN_ANCHOR.y + (c1.y - c.y) * zoom - c0.y * zoom * GROW,
    alpha: ramp(t, 6.8, 10),
  };
  return [first, second];
}

/** Screen shake, px. */
export function shakeAt(t: number): Pt {
  const jolts = [{ at: BITE_AT, amp: 10 }, ...HEAVES.map((h) => ({ at: h + 0.1, amp: 9 })), { at: GULP_AT, amp: 20 }, { at: SPURT, amp: 7 }];
  return jolts.reduce<Pt>((sum, j) => {
    const s = t - j.at;
    if (s < 0 || s > 0.3) return sum;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    return { x: sum.x + amp * Math.sin(s * 120), y: sum.y + amp * 0.7 * Math.cos(s * 150) };
  }, { x: 0, y: 0 });
}

/** Used by the tests: the head's place on the path. */
export const headPoint = (t: number): Pt => pathAt(headU(t));
