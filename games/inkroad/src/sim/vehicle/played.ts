/**
 * A manoeuvre played once (docs/inkroad-vehicle-model.md "Phase B"): a plan of Reeds–Shepp legs driven by the
 * tracker through the bicycle model, frame by frame at 1/60 played second, kept as the drawn poses (the body's
 * middle and heading). The city times its lane holds from it and the view and the sim's turning-round cars draw it
 * frame by frame, so what is drawn is exactly what was timed and every frame keeps the vehicle's limits. Pure.
 */
import { steerStill, type CarState } from './bicycle';
import { middleOf, type VehicleParams } from './params';
import { pathOf, type Pose } from './path';
import type { Run } from './reedsShepp';
import { driveStep, startDrive, type PlanItem } from './tracker';

/** Played seconds between two frames. */
export const PLAY_DT = 1 / 60;
/** Floats per frame: x, y, heading (the body's middle). */
export const PLAY_STRIDE = 3;
/** A plan that has not ended by then is cut (the tracker never got there: a bad plan, counted as unfit). */
const MAX_SECONDS = 90;

export interface Played {
  readonly frames: Float64Array;
  readonly n: number;
  /** Seconds from the first frame to the last. */
  readonly seconds: number;
  /** The rear-axle state at the last frame. A lane merge can finish rolling. */
  readonly end: CarState;
  /** The plan fits the ground and clears the bodies around it (false: drawn anyway, the best there was). */
  readonly fits: boolean;
  /** The Reeds–Shepp word(s) driven, for the lab. */
  readonly word: string;
}

export interface MutablePose { x: number; y: number; a: number }

/** A car standing still at a pose of its middle (a move with nothing to drive). */
export function standingAt(p: VehicleParams, middle: { readonly x: number; readonly y: number; readonly a: number }): Played {
  const frames = new Float64Array([middle.x, middle.y, middle.a]);
  const x = middle.x - p.toMiddle * Math.cos(middle.a), y = middle.y - p.toMiddle * Math.sin(middle.a);
  return { frames, n: 1, seconds: 0, end: { x, y, th: middle.a, u: 0, dir: 1, delta: 0, a: 0 }, fits: true, word: '' };
}

/** Plays runs (one path, a stop at every change of gear and at its end) from a standing car. */
export function playRuns(start: CarState, runs: readonly Run[], p: VehicleParams, fits: boolean, word: string, open = false): Played {
  const kept = runs.filter((r) => r.pts.length > 1);
  if (kept.length === 0) return standingAt(p, { ...middleOf(p, start.x, start.y, start.th), a: start.th });
  const path = pathOf(kept);
  const rollingEnd = open && path.legs[path.legs.length - 1]!.dir === 1;
  const plan: PlanItem[] = [{ kind: 'path', path, open: rollingEnd }];
  const out: number[] = [];
  const put = (q: CarState): void => { const m = middleOf(p, q.x, q.y, q.th); out.push(m.x, m.y, q.th); };
  const most = Math.ceil(MAX_SECONDS / PLAY_DT);
  let k = 0;
  // A driver turns the wheels for the first bend before setting off (dry steering, as at every change of gear).
  const first = path.legs[0]!;
  const want = Math.max(-p.steerMax, Math.min(p.steerMax, Math.atan(first.ks[Math.min(first.ks.length - 1, 2)]! * p.wheelbase)));
  // A car still rolling forward (it lagged the sim's stop) goes on at its speed; one standing turns its wheels first.
  const rolling = start.u > 0 && first.dir === 1;
  let car: CarState = rolling ? { ...start, dir: 1 } : { ...start, u: 0, a: 0, dir: first.dir };
  put(car);
  for (; !rolling && k < most && Math.abs(car.delta - want) > 0.01; k++) { car = steerStill(car, want, p, PLAY_DT); put(car); }
  // A rolling car keeps its speed (it brakes along its first leg within its limits, never by a jump).
  let d = startDrive(car, plan, p);
  if (rolling && d.car.u < car.u) d = { ...d, car: { ...d.car, u: car.u, a: car.a } };
  for (; k < most && d.phase !== 'done'; k++) { d = driveStep(d, plan, p, PLAY_DT); put(d.car); }
  const n = out.length / PLAY_STRIDE;
  return { frames: Float64Array.from(out), n, seconds: (n - 1) * PLAY_DT, end: rollingEnd && d.phase === 'done' ? d.car : { ...d.car, u: 0, a: 0 }, fits: fits && k < most, word };
}

/**
 * A played move with the drawn frames that came before it in front (the car's last sim step as drawn, at PLAY_DT
 * apart, the last of them where the move starts): the view goes on from what it drew, never skipping a step.
 */
export function withPrefix(prefix: Float64Array, m: Played): Played {
  const k = prefix.length / PLAY_STRIDE - 1;
  if (k <= 0) return m;
  const frames = new Float64Array((k + m.n) * PLAY_STRIDE);
  frames.set(prefix.subarray(0, k * PLAY_STRIDE));
  frames.set(m.frames, k * PLAY_STRIDE);
  return { ...m, frames, n: k + m.n, seconds: m.seconds + k * PLAY_DT };
}

/** Two played moves one after the other (the second starts where the first stood still). */
export function joinPlayed(a: Played, b: Played): Played {
  const frames = new Float64Array((a.n + b.n - 1) * PLAY_STRIDE);
  frames.set(a.frames);
  frames.set(b.frames.subarray(PLAY_STRIDE), a.n * PLAY_STRIDE);
  return { frames, n: a.n + b.n - 1, seconds: a.seconds + b.seconds, end: b.end, fits: a.fits && b.fits, word: `${a.word}+${b.word}` };
}

/** The drawn pose at t seconds into a played move (clamped to its ends), into `out`. */
export function playedAt(m: Played, t: number, out: MutablePose): MutablePose {
  const f = Math.max(0, Math.min(m.n - 1, t / PLAY_DT));
  const i = Math.min(m.n - 2, Math.floor(f));
  if (i < 0) { out.x = m.frames[0]!; out.y = m.frames[1]!; out.a = m.frames[2]!; return out; }
  const u = f - i, o = i * PLAY_STRIDE, q = o + PLAY_STRIDE, fr = m.frames;
  out.x = fr[o]! + (fr[q]! - fr[o]!) * u;
  out.y = fr[o + 1]! + (fr[q + 1]! - fr[o + 1]!) * u;
  const da = Math.atan2(Math.sin(fr[q + 2]! - fr[o + 2]!), Math.cos(fr[q + 2]! - fr[o + 2]!));
  out.a = fr[o + 2]! + da * u;
  return out;
}

/** The pose of the middle at the first and last frames. */
export const firstPose = (m: Played): Pose => ({ x: m.frames[0]!, y: m.frames[1]!, th: m.frames[2]! });
export const lastPose = (m: Played): Pose => { const o = (m.n - 1) * PLAY_STRIDE; return { x: m.frames[o]!, y: m.frames[o + 1]!, th: m.frames[o + 2]! }; };

/** A band of road: the line through `centre` (its heading `a`) and `half` px either side of it. */
export interface Band { readonly x: number; readonly y: number; readonly a: number; readonly half: number }

/** Does a body (len x wid at a middle pose) reach into the band? */
export function inBand(b: Band, x: number, y: number, a: number, len: number, wid: number): boolean {
  const lat = (x - b.x) * -Math.sin(b.a) + (y - b.y) * Math.cos(b.a);
  const t = Math.abs(Math.sin(a - b.a)), q = Math.abs(Math.cos(a - b.a));
  return Math.abs(lat) - (len * t + wid * q) / 2 < b.half;
}

/** Seconds of the move from its start until the body has left the band for good (0: it never was in it). */
export function secondsUntilOut(m: Played, b: Band, len: number, wid: number): number {
  for (let i = m.n - 1; i >= 0; i--) {
    const o = i * PLAY_STRIDE;
    if (inBand(b, m.frames[o]!, m.frames[o + 1]!, m.frames[o + 2]!, len, wid)) return Math.min(m.seconds, (i + 1) * PLAY_DT);
  }
  return 0;
}
