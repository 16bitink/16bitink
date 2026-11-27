import { poseAlong, type DrivePath } from './drivePath';
import { A_LAT_PLAYED, R_MIN, REVERSE_PLAYED } from './kinematics';
import { aisleIn, aisleOut, bayIn, bayOut, columnIn, columnOut, mouthIn, mouthOut, parallelIn, parallelOut, pullIn, shoulderIn, shoulderOut, type Planned } from './parkPaths';
import type { Pose } from './drivePath';
import type { Pt } from './types';

/**
 * A parking move, planned and timed (pure; shared by the city, which holds the lane that long, and the renderer,
 * which draws it). Paces from the car motion rules: forward at the most a R_MIN bend allows, reversing at walking pace.
 */
/** pullover: a bare kerb (no bays): in with a forward S from behind, out with a forward S (src/sim/parkPaths.ts). */
export type Mode = 'parallel' | 'pullover' | 'bay' | 'enter' | 'double' | 'aisle';

/** Forward pace on a manoeuvre: the most a car may take a R_MIN bend at (px/s). */
export const MANOEUVRE_SPEED = Math.sqrt(A_LAT_PLAYED * R_MIN);
/** Share of each leg spent speeding up, and again slowing down (a trapezoid: peak = 1 / (1 - RAMP) of the mean). */
export const RAMP = 0.25;
/** A 'bay' slot this close to the lane's line (|sin| of the angle between) is parked along the road, not across it. */
const ALONG = 0.5;
/** 'bay' slots face out of the bay toward their way in (homes, car parks, sand): the car backs in. */
const NOSE_IN = false;

export function planMove(mode: Mode, from: Pose, to: Pose, dir: 'in' | 'out', via?: readonly Pt[]): Planned {
  if (mode === 'bay' && Math.abs(Math.sin(to.a - from.a)) < ALONG) return dir === 'in' ? columnIn(from, to, NOSE_IN) : columnOut(to, from, NOSE_IN);
  const aisle = mode === 'aisle' && via && via.length > 0;
  if (dir === 'in') {
    if (aisle) return aisleIn(from, to, via);
    if (mode === 'parallel') return parallelIn(from, to);
    if (mode === 'pullover') return pullIn(from, to);
    if (mode === 'double') return shoulderIn(from, to);
    if (mode === 'enter') return mouthIn(from, to);
    return bayIn(from, to, NOSE_IN);
  }
  if (aisle) return aisleOut(to, from, via);
  if (mode === 'parallel' || mode === 'pullover') return parallelOut(to, from);
  if (mode === 'double') return shoulderOut(to, from);
  if (mode === 'enter') return mouthOut(to, from);
  return bayOut(to, from, NOSE_IN);
}

interface Leg { a: number; b: number; w: number; dir: number }

/** The gear legs of [s0, s1], each weighted by the seconds it takes at its pace (peak speed = pace). */
function legsOf(path: DrivePath, s0: number, s1: number): Leg[] {
  const legs: Leg[] = [];
  let at = 0;
  for (const g of path.segs) {
    const a = Math.max(s0, at), b = Math.min(s1, at + g.len);
    at += g.len;
    if (b - a < 1e-9) continue;
    const w = (b - a) / ((g.dir < 0 ? REVERSE_PLAYED : MANOEUVRE_SPEED) * (1 - RAMP));
    const last = legs[legs.length - 1];
    if (last && last.dir === g.dir) { last.b = b; last.w += w; } else legs.push({ a, b, w, dir: g.dir });
  }
  return legs;
}

/** Seconds to drive [s0, s1] of a path within the paces (standing still at every change of gear). */
export const secondsOf = (path: DrivePath, s0: number, s1: number): number => legsOf(path, s0, s1).reduce((n, l) => n + l.w, 0);

/**
 * Where the body leaves the road ('in') or first touches it ('out'): px along the path. The road is the band of
 * half-width `half` about the line through `centre` (heading `centre.a`); the body is len x wid about its pose.
 */
export function roadSplit(p: Planned, dir: 'in' | 'out', centre: Pose, half: number, size: { readonly len: number; readonly wid: number }): number {
  const L = p.path.len;
  const nx = -Math.sin(centre.a), ny = Math.cos(centre.a);
  const on = (d: number): boolean => {
    poseAlong(p.path, d, AT);
    const lat = (AT.x - centre.x) * nx + (AT.y - centre.y) * ny;
    const t = Math.abs(Math.sin(AT.a - centre.a)), q = Math.abs(Math.cos(AT.a - centre.a));
    return Math.abs(lat) - (size.len * t + size.wid * q) / 2 < half;
  };
  const n = Math.max(1, Math.ceil(L / SPLIT_STEP));
  if (dir === 'in') { for (let i = n; i >= 0; i--) if (on((L * i) / n)) return Math.min(L, (L * (i + 1)) / n); return 0; }
  for (let i = 0; i <= n; i++) if (on((L * i) / n)) return Math.max(0, (L * (i - 1)) / n);
  return L;
}

const SPLIT_STEP = 1;
const AT = { x: 0, y: 0, a: 0, dir: 1 as 1 | -1 };

/** The lane part and the off-road part of a planned move, in seconds ('in': lane first; 'out': off-road first). */
export function moveSeconds(p: Planned, dir: 'in' | 'out', split = p.split): { readonly lane: number; readonly off: number } {
  const L = p.path.len, sp = Math.max(0, Math.min(L, split));
  return dir === 'in' ? { lane: secondsOf(p.path, 0, sp), off: secondsOf(p.path, sp, L) } : { lane: secondsOf(p.path, sp, L), off: secondsOf(p.path, 0, sp) };
}

/** Trapezoid ease: 0..1 of a leg's length at 0..1 of its time, standing still at both ends. */
function ease(x: number): number {
  const k = Math.min(1, Math.max(0, x)), vp = 1 / (1 - RAMP);
  if (k < RAMP) return (0.5 * vp * k * k) / RAMP;
  if (k > 1 - RAMP) return 1 - (0.5 * vp * (1 - k) * (1 - k)) / RAMP;
  return vp * (k - RAMP / 2);
}

/** Px along the path at share x of the time spent on [s0, s1]. */
export function along(path: DrivePath, s0: number, s1: number, x: number): number {
  if (s1 - s0 < 1e-6) return s0;
  const legs = legsOf(path, s0, s1);
  let t = Math.min(1, Math.max(0, x)) * legs.reduce((n, l) => n + l.w, 0);
  for (const l of legs) {
    if (t <= l.w) return l.a + (l.b - l.a) * ease(l.w > 0 ? t / l.w : 1);
    t -= l.w;
  }
  return s1;
}
