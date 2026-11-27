import { poseAlong } from '../../sim/drivePath';
import { along, planMove, type Mode } from '../../sim/parkMove';
import type { Planned } from '../../sim/parkPaths';
import type { Pt } from '../../sim/types';
import { clamp, smooth } from '../geom';

/**
 * Where a car turning into (or out of) its space is drawn: along a path a real car can drive (src/render/cars/parkPaths.ts),
 * heading on the path's tangent, reversing only inside the move and at walking pace. Pure; writes into `out`.
 * `u` runs 0..1 from the lane pose to the slot pose ('in') or back (the 'out' clock of ManoeuvreCore: 1 at the slot,
 * `h` at the edge, 0 in the lane). The first `h` of an 'in' (the last of an 'out') is the lane part.
 */
export interface Pose { x: number; y: number; a: number }
export interface Step extends Pose { /** 0..1 how much of the car shows (it fades into a car park's mouth). */ alpha: number; /** -1 left, 1 right, 0 none: which blinker is on. */ blink: -1 | 0 | 1 }

/** Car parks: the fade starts here. */
const FADE_FROM = 0.45;
/** Share of the move spent in the lane when the city does not say. */
export const HOLD_SHARE = 0.5;
const CACHE = 96;

export const turnBy = (a: number, b: number): number => {
  const d = (b - a) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d;
};

const cache = new Map<string, Planned>();
function planned(mode: Mode, from: Pose, to: Pose, dir: 'in' | 'out', via?: readonly Pt[]): Planned {
  const key = `${mode}|${dir}|${from.x},${from.y},${from.a}|${to.x},${to.y},${to.a}|${via ? via.map((p) => `${p.x},${p.y}`).join(';') : ''}`;
  let p = cache.get(key);
  if (!p) {
    p = planMove(mode, from, to, dir, via);
    if (cache.size >= CACHE) cache.delete(cache.keys().next().value!);
    cache.set(key, p);
  }
  return p;
}

/** Px along a planned move at the clock `u` (see the file note). */
export function distanceAt(p: Planned, u: number, h: number, dir: 'in' | 'out', split = p.split): number {
  const L = p.path.len, sp = clamp(split, 0, L);
  if (dir === 'in') return u <= h ? along(p.path, 0, sp, h > 0 ? u / h : 1) : along(p.path, sp, L, (u - h) / (1 - h));
  return u >= h ? along(p.path, 0, sp, h < 1 ? (1 - u) / (1 - h) : 1) : along(p.path, sp, L, h > 0 ? (h - u) / h : 1);
}

const at = { x: 0, y: 0, a: 0, dir: 1 as 1 | -1 };

/** Where a move is at the clock `u`; `h` is the share of the move spent in the lane. */
export function pathPose(mode: Mode, from: Pose, to: Pose, u: number, out: Step, h = HOLD_SHARE, via?: readonly Pt[], dir: 'in' | 'out' = 'in', split?: number): Step {
  const k = clamp(u, 0, 1);
  const hold = clamp(h, 0, 1);
  const p = planned(mode, from, to, dir, via);
  poseAlong(p.path, distanceAt(p, k, hold, dir, split ?? p.split), at);
  out.x = at.x; out.y = at.y; out.a = to.a + turnBy(to.a, at.a);
  if (p.path.len < 1e-6) { const end = dir === 'in' ? (k >= 1 ? to : from) : k <= 0 ? from : to; out.x = end.x; out.y = end.y; out.a = end.a; }
  const side = (to.x - from.x) * -Math.sin(from.a) + (to.y - from.y) * Math.cos(from.a);
  out.blink = k > 0 && k < 1 ? (side >= 0 ? 1 : -1) : 0;
  out.alpha = mode === 'enter' ? 1 - smooth((k - FADE_FROM) / (1 - FADE_FROM)) : 1;
  return out;
}
