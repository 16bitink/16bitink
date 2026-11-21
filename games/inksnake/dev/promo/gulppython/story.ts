import type { SfxId } from '../../../src/audio/recipes';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import type { Pt } from '../sprites';
import { DRIFT, pathAt, PERIOD } from '../gulphen/path';
import { PY_LEN, pyHalf } from './profile';

/**
 * "How did that fit", chapter 9's jungle floor: the king cobra and a rock
 * python, the gulphen short's beats with a snake for the meal. The python is
 * far too wide to swallow awake; the cobra's strike puts it to sleep (the
 * game's venom), then it goes down whole, head first, like a noodle:
 *
 *   0     frame 1: the jaws gaping round the python's head, its "!"
 *   0.75  the bite lands; the venom works, its eyes close, it goes limp
 *   1.9   heave, 2.8 heave, 3.65 heave: the jaws walk on, the body is hauled in
 *   4.25  only the tail is left; its tip curls once
 *   4.55  the last slurp
 *   4.9   GULP: the jaws snap shut, a long python-shaped lump, "+80"
 *   5.05  "how did THAT fit"; a leaf drifts down
 *   5.6   "Bigger!"; 6.05 the tongue flicks
 *   6.4   the camera pulls back; the cobra crawls on, digesting
 *   8.0   the next python, already dozy, slides in
 *   11.0  it lifts its head; 11.35 "!"; 11.55 the strike, which is frame 1.
 *
 * The path, camera and growth are gulphen's (gulphen/path.ts): world units
 * are screen px at frame 1 over BASE_ZOOM.
 */
export const LOOP_S = 12;
export const GROW = 1.25;

export const BITE_AT = 0.75;
export const HEAVES = [1.9, 2.8, 3.65] as const;
export const KICK_AT = 4.25;
export const SLURP_AT = 4.55;
export const GULP_AT = 4.9;
export const SPURT = 5.6;
export const NEXT_AT = 8;
export const LOOK_UP_AT = 11;
export const SPOT_AT = 11.35;
export const STRIKE_AT = 11.55;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Seam time: seconds from the loop point, negative just before it. */
export const seam = (t: number): number => (t > LOOP_S / 2 ? t - LOOP_S : t);

// ---------------------------------------------------------------- sizes

export const NECK_W = 122;
export const BODY_LEN = 3400;
export const JAW = 300;
const SKIN = 8;

/** The rim where frame 1 finds the jaws: the python's whole head inside. */
export const RIM_0 = 45;
const FRAME_ONE_GAPE = 118;
/** Where the head is when the gulp is done, and the rim on the python then (the lump lies 300 behind the head). */
const HEAD_FULL = 340;
export const RIM_FULL = PY_LEN + 300;
const WAIT_RIM = -190;

const spring = (s: number): number => 1 - Math.exp(-8 * s) * Math.cos(13 * s);

// ---------------------------------------------------------------- the head along the path

const STRIKE: readonly Key[] = [
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: LOOP_S, at: PERIOD + RIM_0, rate: 80 },
];
const CRAWL: readonly Key[] = [
  { t: 6.5, at: HEAD_FULL, rate: 0 },
  { t: 7.4, at: HEAD_FULL + 300 },
  { t: 10.1, at: PERIOD + WAIT_RIM - 110 },
  { t: 11, at: PERIOD + WAIT_RIM, rate: 0 },
  { t: STRIKE_AT, at: PERIOD + WAIT_RIM, rate: 0 },
];
const BITE: readonly Key[] = [
  { t: 0, at: RIM_0, rate: 80 },
  { t: BITE_AT, at: RIM_0 + 60, rate: 0 },
];

/** Where the rim of the mouth is along the path. */
export function headU(t: number): number {
  if (t >= STRIKE_AT) return curveAt(STRIKE, t).at;
  if (t >= 6.5) return curveAt(CRAWL, t).at;
  let r = curveAt(BITE, t).at;
  r += 40 * ramp(t, HEAVES[0], HEAVES[0] + 0.25) + 40 * ramp(t, HEAVES[1], HEAVES[1] + 0.25) + 40 * ramp(t, HEAVES[2], HEAVES[2] + 0.25);
  for (const h of HEAVES) r -= 6 * window01(t, h - 0.45, h + 0.1, 0.25);
  r += 20 * ramp(t, SLURP_AT, GULP_AT - 0.05);
  return r + (HEAD_FULL - RIM_0 - 200) * ramp(t, GULP_AT - 0.05, GULP_AT + 0.1);
}

/** How far the python has been hauled back along the path towards the cobra: each heave drags it in. */
const SLIDES: readonly (readonly [number, number, number])[] = [
  [0.2, BITE_AT, 60], [HEAVES[0], HEAVES[0] + 0.45, 330], [HEAVES[1], HEAVES[1] + 0.45, 350], [HEAVES[2], HEAVES[2] + 0.45, 300],
  [3.95, KICK_AT, 60], [SLURP_AT, GULP_AT - 0.1, 140], [GULP_AT - 0.1, GULP_AT + 0.15, 220],
];
export const slide = (t: number): number => SLIDES.reduce((s, [a, b, n]) => s + n * ramp(t, a, b), 0);

/** The rim on the python: where the lips are along it. Stays put once it's whole inside. */
export const mealRim = (t: number): number => (t < GULP_AT + 0.4 ? Math.min(RIM_FULL, headU(t) + slide(t)) : RIM_FULL);

export function jawWalk(t: number): number {
  return 18 * Math.sin(2 * Math.PI * 1.1 * t) * window01(t, 0.9, GULP_AT - 0.2, 0.3);
}

/** The gape when there's nothing to open round: wide through the strike, two chews after the gulp. */
export function freeGape(t: number): number {
  const u = seam(t);
  if (u >= -0.5 && u < 0.7) return FRAME_ONE_GAPE * Math.min(ramp(u, -0.5, -0.02), 1 - ramp(u, 0.2, BITE_AT));
  let open = 0;
  for (const c of [GULP_AT + 0.4, GULP_AT + 0.8]) if (t > c && t < c + 0.2) open = Math.max(open, 24 * Math.sin((Math.PI * (t - c)) / 0.2));
  return open;
}

export interface JawFrame {
  readonly tipTop: number;
  readonly tipBottom: number;
  readonly hingeTop: number;
  readonly hingeBottom: number;
  readonly reach: number;
}

/** Squeezed in the cobra's gut, the lump is a little shallower than the python lying out (about 1.4 times the neck at its deepest). */
const LUMP = 0.83;
const smoothMax = (a: number, b: number): number => (a ** 6 + b ** 6) ** (1 / 6);
const skinned = (a: number): number => pyHalf(a) + (pyHalf(a) > 0 ? SKIN : 0);

/** The body's half depth at python place `a`, for a meal scaled `size` (the same above and below): the stretched skin runs on a little ahead of the thick part. */
export const swell = (a: number, size: number): number => smoothMax(NECK_W / 2, LUMP * size * smoothMax(skinned(a), 0.9 * skinned(a + 150)));

/** The meal's size inside: whole until it digests away. */
/** Behind the hinge the swallowed python lies bunched up, its length packed into COMPRESS of the cobra's. */
const COMPRESS = 0.6;
const HINGE_D = 300;
/** The python's place `a` lying `d` behind the cobra's lips, with the lips at `rim` along it. */
export const pyPlaceAt = (rim: number, d: number): number => rim - (d <= HINGE_D ? d : HINGE_D + (d - HINGE_D) / COMPRESS);
/** How far behind the lips python place `a` lies: pyPlaceAt's inverse. */
export const lumpDepthOf = (rim: number, a: number): number => (rim - a <= HINGE_D ? rim - a : HINGE_D + (rim - a - HINGE_D) * COMPRESS);
export const PACKED = COMPRESS;

export const lumpSize = (t: number): number => {
  if (t >= 9.5) return 0;
  const s = t - GULP_AT;
  const pop = s > 0 ? 1 + 0.12 * Math.exp(-6 * s) * Math.sin(16 * s) : 1;
  // From nothing on frame 1 (as at the loop's end), so the seam matches.
  return pop * ramp(t, 0, 0.4) * (1 - ramp(t, 7.3, 9.5));
};

export function jawsAt(t: number): JawFrame {
  const swallowing = t < GULP_AT + 0.4 || seam(t) > -1;
  const rim = seam(t) < 0 && t > 8 ? 0 : t < GULP_AT + 0.4 ? mealRim(t) : PY_LEN + 900;
  const walk = jawWalk(t);
  const free = freeGape(t);
  const tipTop = Math.max(free, swallowing ? skinned(rim + walk) : 0);
  const tipBottom = Math.max(free * 1.05, swallowing ? skinned(rim - walk) : 0);
  let reach = JAW;
  let hingeTop = NECK_W / 2;
  let hingeBottom = NECK_W / 2;
  const size = lumpSize(t);
  for (let i = 0; i < 3; i++) {
    const a = mealRim(t) - reach;
    hingeTop = swell(a, size);
    hingeBottom = swell(a, size);
    const rise = Math.max(Math.abs(tipTop - hingeTop), Math.abs(tipBottom - hingeBottom));
    reach = Math.sqrt(Math.max(JAW * JAW * 0.3, JAW * JAW - rise * rise));
  }
  return { tipTop, tipBottom, hingeTop, hingeBottom, reach };
}

/** The hood behind the head: a narrow flare, flattened while it swallows. */
export const hoodAt = (t: number): number => 1 - 0.4 * window01(t, 0.55, 6.3, 0.45);

export const sideView = (t: number): number => Math.max(1 - ramp(t, 6.45, 6.85), ramp(t, 10.8, 11.25));

export type EyeState = 'open' | 'squeeze' | 'happy';
export function snakeEye(t: number): EyeState {
  if (HEAVES.some((h) => t > h - 0.05 && t < h + 0.4)) return 'squeeze';
  if (t > SLURP_AT - 0.05 && t < GULP_AT + 0.3) return 'squeeze';
  return t >= GULP_AT + 0.3 && t < 6.2 ? 'happy' : 'open';
}

export function tongue(t: number): number {
  for (const s of [6.05, 6.32, 10.55, 10.85]) if (t >= s && t < s + 0.24) return Math.sin(((t - s) / 0.24) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the camera

export const SCREEN_ANCHOR: Pt = { x: 540, y: 800 };

const pull = (t: number): number => ramp(t, 6.4, 8.2);
export const growth = (t: number): number => (t <= SPURT ? 1 : GROW ** spring(t - SPURT));
const wide = (t: number): number => BASE_ZOOM * lerp(1, 0.72, Math.min(ramp(t, 4.95, 6.6), 1 - ramp(t, 10.5, 11.75)));

/** Screen px per world unit on frame 1. */
const BASE_ZOOM = 0.95;

export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const C0 = { x: -40, y: 130 };
const camKeys = (pick: (p: Pt) => number): readonly Key[] => [
  { t: 0, at: pick(C0), rate: 0 },
  { t: BITE_AT, at: pick(C0) },
  { t: 3.9, at: pick({ x: -150, y: 130 }) },
  { t: 5.1, at: pick({ x: 60, y: 270 }) },
  { t: 6.5, at: pick({ x: 40, y: 250 }), rate: 0 },
  { t: 8.6, at: pick({ x: -1060, y: -130 }) },
  { t: 10.2, at: pick({ x: DRIFT.x - 140, y: DRIFT.y + 40 }) },
  { t: 11.75, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
  { t: LOOP_S, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
];
const CAM_X = camKeys((p) => p.x);
const CAM_Y = camKeys((p) => p.y);

export function viewAt(t: number): View {
  return { x: curveAt(CAM_X, t).at, y: curveAt(CAM_Y, t).at, zoom: (growth(t) * wide(t)) / GROW ** pull(t) };
}

export const toScreen = (v: View, p: Pt): Pt => ({ x: SCREEN_ANCHOR.x + (p.x - v.x) * v.zoom, y: SCREEN_ANCHOR.y + (p.y - v.y) * v.zoom });

export interface GroundLayer {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

/** The ground zooms out for good by GROW a loop: two copies, the bigger fading in over the wide shot (gulphen's groundAt). */
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

export function shakeAt(t: number): Pt {
  const jolts = [{ at: BITE_AT, amp: 10 }, ...HEAVES.map((h) => ({ at: h + 0.1, amp: 9 })), { at: GULP_AT, amp: 20 }, { at: SPURT, amp: 7 }];
  return jolts.reduce<Pt>((sum, j) => {
    const s = t - j.at;
    if (s < 0 || s > 0.3) return sum;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    return { x: sum.x + amp * Math.sin(s * 120), y: sum.y + amp * 0.7 * Math.cos(s * 150) };
  }, { x: 0, y: 0 });
}

// ---------------------------------------------------------------- "!", "+80", "Bigger!"

function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.1 ? (since / 0.1) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (since - 0.1) / 0.08);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The python's "!", from the moment it spots the cobra, up over the seam. */
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

/** The game's points for swallowing a rock python (logic/chapters/jungleRival.ts ROCK_PYTHON.points). */
export const SCORE_TEXT = '+80';
export const scoreAt = (t: number): FloatText | null => float(t - GULP_AT - 0.05, 1.1);
export const biggerAt = (t: number): FloatText | null => float(t - SPURT, 0.9);

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
}

export const CAPTIONS: readonly Caption[] = [
  { text: 'that’s a whole python', y: 382, size: 112, from: 0.2, to: 2.5 },
  { text: 'how did THAT fit', y: 382, size: 132, from: GULP_AT + 0.15, to: 8 },
  { text: 'snakes eat snakes?!', y: 382, size: 118, from: 8.9, to: 11.2 },
];
const CAPTION_FADE = 0.12;

export const captionAlpha = (c: Caption, t: number): number => window01(t, c.from, c.to, CAPTION_FADE);

export const CREDIT_TEXT = { text: 'InkSnake · 16bit.ink', y: 1240, size: 46, alpha: 1 } as const;

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  { id: 'nip', t: 0.05, pitch: 0.8, gain: 0.8, pan: -0.1 },
  { id: 'bump', t: BITE_AT, pitch: 0.6, gain: 0.9, pan: 0 },
  { id: 'knot', t: 1.1, pitch: 0.7, gain: 0.45, pan: -0.2 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'squeeze', t: h, pitch: 0.75, gain: 0.8, pan: 0 },
    { id: 'gulp', t: h + 0.08, pitch: 0.55, gain: 0.75, pan: 0 },
    { id: 'steps', t: h + 0.12, pitch: 0.65, gain: 0.35, pan: -0.2 },
  ]),
  { id: 'plop', t: KICK_AT, pitch: 1.1, gain: 0.5, pan: -0.1 },
  { id: 'gulp', t: SLURP_AT, pitch: 0.75, gain: 0.8, pan: 0 },
  { id: 'swallow', t: GULP_AT, pitch: 0.75, gain: 1, pan: 0 },
  { id: 'bump', t: GULP_AT, pitch: 0.5, gain: 0.8, pan: 0 },
  { id: 'grown', t: SPURT, pitch: 1, gain: 0.8, pan: 0 },
  { id: 'steps', t: 7, pitch: 0.8, gain: 0.4, pan: 0.1 },
  { id: 'steps', t: 8.4, pitch: 0.6, gain: 0.35, pan: -0.4 },
  { id: 'steps', t: 9.4, pitch: 0.6, gain: 0.35, pan: -0.3 },
  { id: 'appear', t: SPOT_AT, pitch: 1.3, gain: 0.6, pan: -0.2 },
  { id: 'strike', t: STRIKE_AT, pitch: 1, gain: 1, pan: 0 },
];

export const headPoint = (t: number): Pt => pathAt(headU(t));
