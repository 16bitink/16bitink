/**
 * Speed caps along a track from its own shape (docs/inkroad-vehicle-model.md "Step 2"): the curve rule v ≤ √(aLat/κ)
 * and the steering rule (where the curvature changes, the wheels swing at a car's steering rate, so the car is slow
 * enough to follow), so the sim never drives a curve faster than the drawn car can. Pure in the track's samples.
 */
import { paramsOf } from './vehicle/params';
import { curveCap } from './vehicle/shift';
import type { Track } from './track';

const CAR = paramsOf('car');
/** Share of the steering rate the sim plans with (the drawn car corrects with the rest). */
const WHEEL_SHARE = 0.8;
/** Px over which curvature is measured (lanes are sampled every 4 px, turns every 1). */
const WINDOW = 4;

/**
 * Curvature at each sample: the sharpest of the segments within about WINDOW px of it (the drawn car steers by each
 * segment's own curvature, src/sim/drawn.ts lineAt).
 */
export function curvatures(t: Track): Float32Array {
  const seg = (j: number): number => (t.hs[j + 1]! - t.hs[j]!) * t.inv;
  const out = new Float32Array(t.n + 1);
  const w = Math.max(1, Math.round((WINDOW * t.inv) / 2));
  for (let i = 0; i <= t.n; i++) {
    let k = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(t.n - 1, i + w - 1); j++) if (Math.abs(seg(j)) > Math.abs(k)) k = seg(j);
    out[i] = k;
  }
  return out;
}

/** The cap at each sample (played px/s), or null where the whole track is straight enough for `vmax`. */
export function capsOf(t: Track, vmax: number): Float32Array | null {
  const k = curvatures(t);
  const caps = new Float32Array(t.n + 1);
  let any = false;
  // The wheels' swing per px, over about WINDOW px (sampling noise in a short stretch is not steering).
  const w = Math.max(1, Math.round((WINDOW * t.inv) / 2));
  for (let i = 0; i <= t.n; i++) {
    const lo = Math.max(0, i - w), hi = Math.min(t.n, i + w);
    const swing = hi > lo ? (Math.abs(Math.atan(k[hi]! * CAR.wheelbase) - Math.atan(k[lo]! * CAR.wheelbase)) * t.inv) / (hi - lo) : 0;
    const steer = swing > 1e-6 ? (WHEEL_SHARE * CAR.steerRate) / swing : Infinity;
    caps[i] = Math.min(vmax, curveCap(k[i]!), steer);
    if (caps[i]! < vmax - 0.01) any = true;
  }
  return any ? caps : null;
}

/** Lowest cap of a track (its whole-track limit). */
export const lowestCap = (caps: Float32Array | null, vmax: number): number => (caps ? Math.min(vmax, ...caps) : vmax);

/** The speed a car at s may have now so it can brake (at `brake` px/s²) to every cap on the rest of the track. */
export function capAhead(t: Track, s: number, brake: number): number {
  const caps = t.caps;
  if (!caps) return Infinity;
  let lim = Infinity;
  const i0 = Math.max(0, Math.floor(s * t.inv));
  for (let i = i0; i <= t.n; i++) {
    const d = Math.max(0, i / t.inv - s);
    const v = Math.sqrt(caps[i]! * caps[i]! + 2 * brake * d);
    if (v < lim) lim = v;
    if (d > 200) break;
  }
  return lim;
}
