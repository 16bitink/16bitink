import { clamp01, curveAt, type Key, lerp, ramp } from '../short';
import type { Pt } from '../sprites';
import { pathAt, PERIOD } from '../gulphen/path';
import { HEAD_A, PY_LEN } from './profile';
import { BITE_AT, GULP_AT, headU, HEAVES, KICK_AT, LOOK_UP_AT, LOOP_S, mealRim, NEXT_AT, RIM_0, seam, SPOT_AT, STRIKE_AT } from './story';

/**
 * The rock python in play: snout first, facing the cobra. What the cobra has
 * swallowed lies along the cobra's path, behind its lips; the rest lies out
 * in front on its own S-shaped track (TRACK, fixed to the cobra's lips), so
 * a fat snake's shape and its tapering tail read in the frame. Pulled in, it
 * slides along that track like a noodle. On the spine: a lifted head, the
 * yank of each heave running down it, a crawl's wave, the tail's last curl.
 */
export type PyEye = 'wide' | 'dozy' | 'asleep';

export interface PythonPose {
  /** The path place of the lips its track starts from, and where the lips are along the python. */
  readonly tipU: number;
  readonly rim: number;
  /** How high its head is lifted off the ground, world units. */
  readonly lift: number;
  readonly eye: PyEye;
  /** The tail tip's curl, 0 .. 1. */
  readonly curl: number;
  /** A crawl's sideways wave. */
  readonly wave: number;
  /** Seconds since the start, for the heave ripples (or -1 for none). */
  readonly t: number;
  /** Where it disappears inside the cobra: only `a` past this is drawn. */
  readonly from: number;
}

const FRAME_ONE_LIFT = 10;

function eyeAfterStrike(t: number): PyEye {
  if (t < 0.45) return 'wide';
  return t < BITE_AT + 0.1 ? 'dozy' : 'asleep';
}

const kickAt = (t: number): number => (t > KICK_AT - 0.05 && t < KICK_AT + 0.45 ? Math.sin(((t - KICK_AT + 0.05) / 0.5) * Math.PI) : 0);

function swallowed(t: number): PythonPose {
  const rim = mealRim(t);
  return { tipU: headU(t), rim, lift: FRAME_ONE_LIFT * (1 - ramp(t, 0.35, 1.3)), eye: eyeAfterStrike(t), curl: kickAt(t), wave: 0, t, from: rim - 340 };
}

/** The next one crawling in along its track, snout first: how far out it still is. */
const SLIDE_IN: readonly Key[] = [
  { t: NEXT_AT, at: 1150, rate: -520 },
  { t: 10.3, at: 0, rate: 0 },
  { t: LOOP_S, at: 0, rate: 0 },
];

function next(t: number): PythonPose {
  const c = curveAt(SLIDE_IN, t);
  const up = ramp(t, LOOK_UP_AT, LOOK_UP_AT + 0.22);
  const lift = lerp(lerp(0, 120, up), FRAME_ONE_LIFT, ramp(t, SPOT_AT, STRIKE_AT));
  return { tipU: PERIOD + RIM_0, rim: RIM_0 - Math.max(0, c.at), lift, eye: t >= SPOT_AT - 0.1 ? 'wide' : 'dozy', curl: 0, wave: clamp01(-c.rate / 300), t: -1, from: 0 };
}

export function pythonAt(t: number): PythonPose | null {
  if (t < GULP_AT - 0.02) return swallowed(t);
  return t >= NEXT_AT ? next(t) : null;
}

export const onlyTailLeft = (t: number): boolean => t < GULP_AT && PY_LEN - mealRim(t) > 0 && PY_LEN - mealRim(t) < 240;

// ---------------------------------------------------------------- its track and spine

export interface SpinePoint extends Pt {
  readonly a: number;
}

const STEP = 4;
const LIFT_REACH = 380;
const CURL_LEN = 200;

/** The track's turn from the cobra's heading at `s` out from the lips: straight for the head, then down and round, then back (an S). */
const DEG = Math.PI / 180;
const turnAt = (s: number): number => -115 * DEG * ramp(s, 280, 680) + 55 * DEG * ramp(s, 680, 980) - 40 * DEG * ramp(s, 1080, 1500);
const TRACK_LEN = 3200;
/** The track in the lips' frame (x forward along the cobra's heading, y to its left), from s = 0. */
const TRACK: readonly { x: number; y: number; turn: number }[] = (() => {
  const out = [{ x: 0, y: 0, turn: 0 }];
  for (let s = STEP; s <= TRACK_LEN; s += STEP) {
    const q = out[out.length - 1]!;
    const a = turnAt(s - STEP / 2);
    out.push({ x: q.x + Math.cos(a) * STEP, y: q.y + Math.sin(a) * STEP, turn: turnAt(s) });
  }
  return out;
})();

/** A place `s` out along the track from lips at path place `tipU` (s < 0: back along the path, into the mouth). */
export function trackAt(tipU: number, s: number): { x: number; y: number; heading: number } {
  if (s <= 0) return pathAt(tipU + s);
  const tip = pathAt(tipU);
  const k = Math.min(TRACK.length - 1, s / STEP);
  const i = Math.floor(k);
  const [q0, q1] = [TRACK[i]!, TRACK[Math.min(TRACK.length - 1, i + 1)]!];
  const f = k - i;
  const lx = q0.x + (q1.x - q0.x) * f;
  const ly = q0.y + (q1.y - q0.y) * f;
  const [c, sn] = [Math.cos(tip.heading), Math.sin(tip.heading)];
  return { x: tip.x + lx * c - ly * sn, y: tip.y + lx * sn + ly * c, heading: tip.heading + q0.turn };
}

/** A heave's jolt running down the body from the mouth. */
function ripple(a: number, rim: number, t: number): number {
  if (t < 0) return 0;
  let v = 0;
  for (const h of HEAVES) {
    const s = (t - h - 0.05 - (a - rim) / 1400) / 0.6;
    if (s > 0 && s < 1) v += 16 * Math.sin(Math.PI * s) ** 2;
  }
  return v;
}

/** The spine from `p.from` (or the snout) to the tail tip, in world units. */
export function pythonSpine(p: PythonPose): SpinePoint[] {
  const pts: SpinePoint[] = [];
  const start = Math.max(0, Math.floor(p.from / STEP) * STEP);
  const curlFrom = PY_LEN - CURL_LEN;
  for (let a = start; a <= PY_LEN; a += STEP) {
    if (p.curl > 0 && a > Math.max(curlFrom, p.rim) && pts.length > 1) {
      // The tail curls up and over: each step turns a little more.
      const prev = pts[pts.length - 1]!;
      const before = pts[pts.length - 2]!;
      const dir = Math.atan2(prev.y - before.y, prev.x - before.x);
      const s = (a - curlFrom) / CURL_LEN;
      pts.push({ x: prev.x + Math.cos(dir - p.curl * 0.2 * s) * STEP, y: prev.y + Math.sin(dir - p.curl * 0.2 * s) * STEP, a });
      continue;
    }
    const b = trackAt(p.tipU, a - p.rim);
    // The side that's up on screen.
    const flip = Math.cos(b.heading) > 0 ? -1 : 1;
    const up = { x: -Math.sin(b.heading) * flip, y: Math.cos(b.heading) * flip };
    const rise = p.lift * (1 - ramp(a, 0, LIFT_REACH)) ** 1.4;
    const sway = p.wave * 22 * Math.sin((a - p.rim) / 150) * ramp(a, 120, 400) + ripple(a, p.rim, p.t);
    const off = rise + sway;
    pts.push({ x: b.x + up.x * off, y: b.y + up.y * off, a });
  }
  return pts;
}

/** The head: where its origin sits and the way its snout points. */
export function pythonHead(spine: readonly SpinePoint[]): { at: Pt; angle: number } | null {
  const find = (a: number): SpinePoint | undefined => spine.find((q) => q.a >= a);
  const back = find(HEAD_A);
  const nose = spine[0];
  if (!back || !nose || nose.a > 8) return null;
  const mid = find(HEAD_A * 0.45) ?? nose;
  return { at: back, angle: Math.atan2(mid.y - back.y, mid.x - back.x) };
}

/** Where its "!" goes: above the head. */
export const alarmAnchor = (spine: readonly SpinePoint[]): Pt | null => {
  const h = pythonHead(spine);
  return h ? { x: h.at.x - 110, y: h.at.y - 175 } : null;
};

// ---------------------------------------------------------------- leaves kicked up

export interface Leaf {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly size: number;
  readonly alpha: number;
}

const BURSTS = [...HEAVES.map((h, i) => ({ t: h + 0.06, u: 120 + i * 50, n: 3 })), { t: GULP_AT, u: 420, n: 7 }] as const;

function burstLeaf(b: (typeof BURSTS)[number], i: number, t: number): Leaf | null {
  const s = t - b.t;
  if (s < 0 || s > 1.1) return null;
  const k = i * 2.399 + b.t * 7;
  const vx = Math.cos(k) * (260 + (i % 3) * 100) - 60;
  const vy = -260 - (i % 2) * 140;
  const drag = (1 - Math.exp(-3 * s)) / 3;
  const p = pathAt(b.u);
  return {
    x: p.x + vx * drag + 22 * Math.sin(3 * s + k),
    y: p.y + 60 + vy * drag + 160 * s * s,
    rot: k + s * (2 + (i % 3)),
    size: 0.7 + (i % 3) * 0.15,
    alpha: 1 - ramp(s, 0.7, 1.1),
  };
}

function driftLeaf(t: number): Leaf | null {
  const s = t - GULP_AT - 0.1;
  if (s < 0 || s > 3.2) return null;
  const p = pathAt(380);
  return { x: p.x + 90 * Math.sin(1.9 * s) - 40 * s, y: p.y - 40 + 120 * s, rot: 0.5 + 0.55 * Math.cos(1.9 * s), size: 1.2, alpha: Math.min(1, s * 8) * (1 - ramp(s, 2.7, 3.2)) };
}

export function leavesAt(t: number): readonly Leaf[] {
  const burst = BURSTS.flatMap((b) => Array.from({ length: b.n }, (_, i) => burstLeaf(b, i, t)));
  return [...burst, driftLeaf(t)].filter((f): f is Leaf => f !== null);
}

/** Its shadow on the ground, 0 .. 1 (it fades as the last of it goes in). */
export const pythonShadow = (t: number): number => (seam(t) >= 0 && t < GULP_AT ? 1 - ramp(mealRim(t), PY_LEN - 400, PY_LEN) : 1);
