/**
 * The speed a car may have at each sample of a reference leg (played px/s): the leg's cap, the curve rule
 * v ≤ √(aLat/|κ|), a curvature-change rule (the wheels turn at steerRate, so where the curvature changes the car
 * slows until it rolls at most LAG px while the wheels swing), then forward (accel) and backward (planBrake)
 * passes so it can be reached and stops at the end.
 * Pure: arrays in, a new array out.
 */
import type { Leg } from './path';
import type { VehicleParams } from './params';

/**
 * Px a car may roll while its wheels swing to a new curvature (the tracker previews half of it, so the swing is
 * centred on the change; the error left is a fraction of it): tight while manoeuvring among bodies, looser on roads,
 * where a driver swings the wheel through a roundabout's S over a few metres.
 */
export const LAG = 3, LAG_ROAD = 4;
/** The lag allowed at sample i: on the road where the leg's cap is above the manoeuvring pace. */
export const lagAt = (l: Leg, i: number, p: VehicleParams): number => (l.vcap[Math.max(0, Math.min(l.vcap.length - 1, i))]! > p.manoeuvre + 0.01 ? LAG_ROAD : LAG);
/** Share of the sideways limit planned on a curve: the tracker's corrections bend a little tighter than the reference. */
const CURVE_SHARE = 0.85;
/** Px of preview the tracker adds at road speed (u·0.15 s at ~40 px/s): the curvature it will already steer for. */
const PREVIEW_PX = 6;

/** The sharpest |κ| from sample i to `ahead` px on (the tracker previews the curvature to come). */
function kAhead(l: Leg, i: number, ahead: number): number {
  let k = 0;
  for (let j = i; j < l.xs.length && l.ss[j]! - l.ss[i]! <= ahead; j++) k = Math.max(k, Math.abs(l.ks[j]!));
  return k;
}

/** A car never plans to crawl slower than this between stops (px/s), so a tight reference can't stall it. */
export const CREEP = 0.8;

/** `open`: the leg runs off the map at speed, so its end is not a stop. */
export function speedProfile(l: Leg, p: VehicleParams, u0: number, open = false): Float64Array {
  const n = l.xs.length;
  const cap = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const k = kAhead(l, i, lagAt(l, i, p) / 2 + PREVIEW_PX);
    const curve = k > 1e-9 ? Math.sqrt((CURVE_SHARE * p.aLat) / k) : Infinity;
    const lag = lagAt(l, i, p);
    const swing = wheelSwing(l, i, p.wheelbase, lag / 2);
    const steer = swing > 1e-6 ? (lag * p.steerRate) / swing : Infinity;
    const gear = l.dir === 1 ? l.vcap[i]! : Math.min(l.vcap[i]!, p.reverse);
    cap[i] = Math.max(CREEP, Math.min(gear, curve, steer));
  }
  cap[0] = Math.min(cap[0]!, Math.max(u0, 0));
  // (the backward pass may bring cap[0] under u0: the start was too fast to stop or turn in time)
  if (!open) cap[n - 1] = 0;
  for (let i = 1; i < n; i++) cap[i] = Math.min(cap[i]!, Math.sqrt(cap[i - 1]! ** 2 + 2 * p.accel * (l.ss[i]! - l.ss[i - 1]!)));
  for (let i = n - 2; i >= 0; i--) cap[i] = Math.min(cap[i]!, Math.sqrt(cap[i + 1]! ** 2 + 2 * p.planBrake * (l.ss[i + 1]! - l.ss[i]!)));
  return cap;
}

/** How far the road wheels must swing (rad) for the curvature within ±window px of sample i. */
function wheelSwing(l: Leg, i: number, wheelbase: number, window: number): number {
  const s = l.ss[i]!;
  let a = i, b = i;
  while (a > 0 && s - l.ss[a]! < window) a--;
  while (b < l.xs.length - 1 && l.ss[b]! - s < window) b++;
  let lo = Infinity, hi = -Infinity;
  for (let j = a; j <= b; j++) { lo = Math.min(lo, l.ks[j]!); hi = Math.max(hi, l.ks[j]!); }
  return Math.atan(hi * wheelbase) - Math.atan(lo * wheelbase);
}

/** The profile's speed at a length along (linear between samples). */
export function profileAt(l: Leg, prof: Float64Array, s: number): number {
  if (s <= 0) return prof[0]!;
  if (s >= l.len) return prof[prof.length - 1]!;
  let lo = 0, hi = l.xs.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (l.ss[m]! <= s) lo = m; else hi = m; }
  const t = (s - l.ss[lo]!) / Math.max(1e-9, l.ss[hi]! - l.ss[lo]!);
  return prof[lo]! + (prof[hi]! - prof[lo]!) * t;
}
