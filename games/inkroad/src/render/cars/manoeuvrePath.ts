import { PARALLEL_OVERSHOOT } from '../../sim/slotGeometry';
import type { Pt } from '../../sim/types';
import { clamp, smooth } from '../geom';
import type { Mode } from './parkingSlots';

/**
 * The path of a car turning into a space (u 0..1: lane pose to slot pose). Pure; writes into `out`.
 * Pulling out is the same path played backwards (`u` from 1 to 0), so the car reverses out of a bay
 * and swings out of a kerb space nose first.
 */
export interface Pose { x: number; y: number; a: number }
export interface Step extends Pose { /** 0..1 how much of the car shows (it fades into a car park's mouth). */ alpha: number; /** -1 left, 1 right, 0 none: which blinker is on. */ blink: -1 | 0 | 1 }

/**
 * Parallel parking. While the lane is held (u up to `h`, the share of the move spent in the lane) the car
 * pulls past the space and reverses in at an angle; by u = h it stands at the slot's side-to-side place
 * with its nose out by only TIDY, which keeps its whole body off the road. The rest (the straighten and the
 * last bit of reverse) happens off the road.
 */
const OVERSHOOT = PARALLEL_OVERSHOOT;
const SWING = 0.55;
/** A move this far sideways (px) swings the nose the full angle; shorter moves swing less. */
const SWING_AT = 12;
const SWING_MIN = 0.45;
const PULL_SHARE = 0.3;
/** Nose angle left at the end of the hold (finished off the road); no reverse is left, so the body never leaves its own slot's length. */
export const TIDY = 0.1;
const REVERSE_LEFT = 0;
/** Bays: a turn off the lane (the lane hold), then this straight run. */
const RUN = 9;
const CURVE_PULL = 0.55;
const TURN_BLEND = 0.7;
/** Car parks: the fade starts here. */
const FADE_FROM = 0.45;
/** Car park aisles: px before and after a corner over which the heading turns. */
const CORNER = 6;
/** Share of the move spent in the lane when the city does not say. */
export const HOLD_SHARE = 0.5;

export const turnBy = (a: number, b: number): number => {
  const d = (b - a) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d;
};

/** Where an `in` is, at progress `u`, from the lane pose to the slot pose; `h` is the share of the move spent in the lane. */
export function pathPose(mode: Mode, from: Pose, to: Pose, u: number, out: Step, h = HOLD_SHARE, via?: readonly Pt[]): Step {
  const k = clamp(u, 0, 1);
  const hold = clamp(h, 0.05, 0.95);
  if (mode === 'aisle' && via && via.length > 0) aisle(from, to, via, k, hold, out);
  else if (mode === 'parallel') parallel(from, to, k, hold, out);
  else if (mode === 'double') shoulder(from, to, k, hold, out);
  else bay(from, to, k, hold, out);
  out.alpha = mode === 'enter' ? 1 - smooth((k - FADE_FROM) / (1 - FADE_FROM)) : 1;
  return out;
}

/** Double-parked (or queuing at a pump): it stands in the lane while the lane is held, then edges onto the shoulder. */
function shoulder(from: Pose, to: Pose, u: number, h: number, out: Step): void {
  const k = u <= h ? 0 : smooth((u - h) / (1 - h));
  out.x = from.x + (to.x - from.x) * k;
  out.y = from.y + (to.y - from.y) * k;
  out.a = from.a + turnBy(from.a, to.a) * k;
  out.blink = 0;
}

function parallel(from: Pose, to: Pose, u: number, h: number, out: Step): void {
  const fx = Math.cos(to.a), fy = Math.sin(to.a);
  const dx = to.x - from.x, dy = to.y - from.y;
  const along = dx * fx + dy * fy;
  const lat = dx * -fy + dy * fx;
  const toKerb = lat >= 0 ? 1 : -1;
  let a: number, l: number, ang: number, rev: number;
  if (u <= h) {
    const x = u / h;
    const pull = smooth(x / PULL_SHARE);
    const back = smooth((x - PULL_SHARE) / (1 - PULL_SHARE));
    const swing = SWING * clamp(Math.abs(lat) / SWING_AT, SWING_MIN, 1);
    a = (along + OVERSHOOT) * pull - OVERSHOOT * back;
    rev = REVERSE_LEFT * back;
    l = lat * back;
    ang = from.a + turnBy(from.a, to.a) * back - toKerb * (swing * Math.sin(Math.PI * back) + TIDY * back);
  } else {
    const k = smooth((u - h) / (1 - h));
    a = along;
    rev = REVERSE_LEFT * (1 - k);
    l = lat;
    ang = to.a - toKerb * TIDY * (1 - k);
  }
  // The last stretch of reverse runs along the lane's heading, not the (maybe skewed) slot's, so it never drifts toward the road.
  out.x = from.x + fx * a + -fy * l + Math.cos(from.a) * rev;
  out.y = from.y + fy * a + fx * l + Math.sin(from.a) * rev;
  out.a = ang;
  out.blink = u > 0 && u < 1 ? (toKerb > 0 ? 1 : -1) : 0;
}

/**
 * The bay's column: the line through the slot along its heading. The turn (the lane hold) ends on that line at the
 * distance of the lane pose from the slot, so it is done in the lane; then the car runs straight along its own column,
 * which never crosses a neighbour's. Never nearer the slot than RUN, and on the lane's side of it.
 */
export function bayEntry(from: Pose, to: Pose): { readonly x: number; readonly y: number } {
  const fx = Math.cos(to.a), fy = Math.sin(to.a);
  const d = (from.x - to.x) * fx + (from.y - to.y) * fy;
  const run = Math.max(RUN, Math.abs(d)) * (d < 0 ? -1 : 1);
  return { x: to.x + fx * run, y: to.y + fy * run };
}

function bay(from: Pose, to: Pose, u: number, h: number, out: Step): void {
  const e = bayEntry(from, to);
  if (u < h) curve(from, e.x, e.y, to.a, smooth(u / h), out);
  else {
    const s = smooth((u - h) / (1 - h));
    out.x = e.x + (to.x - e.x) * s; out.y = e.y + (to.y - e.y) * s; out.a = to.a;
  }
  out.blink = u > 0 && u < h ? (turnBy(from.a, to.a) >= 0 ? 1 : -1) : 0;
}

/** A quadratic curve that leaves along the lane and meets the bay's line at (ex, ey). */
function curve(from: Pose, ex: number, ey: number, aim: number, t: number, out: Step): void {
  const reach = Math.hypot(ex - from.x, ey - from.y) * CURVE_PULL;
  const cx = from.x + Math.cos(from.a) * reach, cy = from.y + Math.sin(from.a) * reach;
  const m = 1 - t;
  out.x = m * m * from.x + 2 * m * t * cx + t * t * ex;
  out.y = m * m * from.y + 2 * m * t * cy + t * t * ey;
  const tx = 2 * m * (cx - from.x) + 2 * t * (ex - cx), ty = 2 * m * (cy - from.y) + 2 * t * (ey - cy);
  const heading = Math.hypot(tx, ty) < 1e-6 ? from.a : Math.atan2(ty, tx);
  const lead = from.a + turnBy(from.a, heading);
  out.a = lead + turnBy(lead, aim) * smooth((t - TURN_BLEND) / (1 - TURN_BLEND));
}

/**
 * A two-row car park: the turn into the gate (the lane hold), then through the gate to the aisle, along the aisle to
 * the bay's column, and back into the bay along its column. No frame crosses another bay's column.
 */
function aisle(from: Pose, to: Pose, via: readonly Pt[], u: number, h: number, out: Step): void {
  const gate = via[0]!;
  const first = via.find((p) => Math.hypot(p.x - gate.x, p.y - gate.y) > 1e-6) ?? to;
  const inward = Math.atan2(first.y - gate.y, first.x - gate.x);
  if (u < h) {
    curve(from, gate.x, gate.y, inward, smooth(u / h), out);
    out.blink = turnBy(from.a, inward) >= 0 ? 1 : -1;
    return;
  }
  const pts = [...via, { x: to.x, y: to.y }].filter((p, i, all) => i === 0 || Math.hypot(p.x - all[i - 1]!.x, p.y - all[i - 1]!.y) > 1e-6);
  // Heading per leg: forward along the gate lane and the aisle, the bay's own heading (reversing) into the bay.
  const heads = pts.slice(1).map((p, i) => (i === pts.length - 2 ? to.a : Math.atan2(p.y - pts[i]!.y, p.x - pts[i]!.x)));
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = smooth((u - h) / (1 - h)) * total;
  let i = 0;
  while (i < lens.length - 1 && d > lens[i]!) { d -= lens[i]!; i++; }
  const t = lens[i]! > 0 ? Math.min(1, d / lens[i]!) : 1;
  const a = pts[i]!, b = pts[i + 1] ?? a;
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.a = cornerHeading(heads, lens, i, d, inward);
  out.blink = 0;
}

/**
 * The heading `d` px into leg `i`, turned smoothly over CORNER px either side of each corner. The last corner (aisle
 * to bay) is turned wholly in the aisle, so the car enters its column already straight.
 */
function cornerHeading(heads: readonly number[], lens: readonly number[], i: number, d: number, start: number): number {
  const last = heads.length - 1;
  const here = heads[i]!;
  if (i === last && last > 0) return here;
  const before = i > 0 ? heads[i - 1]! : start;
  const after = heads[i + 1];
  const into = Math.min(CORNER, lens[i]! / 2);
  const left = lens[i]! - d;
  if (after !== undefined && i + 1 === last) {
    const span = Math.min(CORNER * 2, lens[i]!);
    if (left < span) return here + turnBy(here, after) * (1 - left / span);
  }
  if (d < into && i > 0 && i !== last) return before + turnBy(before, here) * (0.5 + (0.5 * d) / into);
  if (after !== undefined && left < into) return here + turnBy(here, after) * (0.5 * (1 - left / into));
  return here;
}
