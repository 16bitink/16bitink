/**
 * Junction turns and lane changes as continuous-curvature references for the rear axle (docs/inkroad-vehicle-model.md
 * "Reference paths"): a turn is clothoid in, arc, clothoid out (curvature ramps linearly, never jumps), with an arc
 * radius no tighter than the kind's planned radius; where the corner is too small for it, the turn starts earlier on
 * the lane in and ends later on the lane out. A lane change is a quintic sideways blend. Pure.
 */
import { advance } from './reedsShepp';
import { STEP, type Pose, type Pt5 } from './path';

/** Share of a turn's heading change made in its two clothoids (the rest is the arc). */
export const CLOTHOID_SHARE = 0.6;
/** Widest arc a junction turn takes, in planned radii (wider turns cut the inside of the corner). */
export const WIDEST_TURN = 2.5;

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Curvature at length s along a clothoid-arc-clothoid of total turn `turn` (signed) and arc radius r. */
function curvatureAt(s: number, turn: number, r: number, share: number): { k: number; len: number } {
  const kc = Math.sign(turn) / r;
  const lc = share * Math.abs(turn) * r;
  const la = (1 - share) * Math.abs(turn) * r;
  const len = 2 * lc + la;
  if (lc < 1e-9) return { k: kc, len };
  if (s < lc) return { k: (kc * s) / lc, len };
  if (s < lc + la) return { k: kc, len };
  return { k: (kc * (len - s)) / lc, len };
}

/** Samples of the curve from a pose (exact per step on the local curvature: midpoint rule). */
export function smoothTurn(from: Pose, turn: number, r: number, vcap: number, share = CLOTHOID_SHARE): Pt5[] {
  const { len } = curvatureAt(0, turn, r, share);
  const n = Math.max(2, Math.ceil(len / STEP));
  const pts: Pt5[] = [{ ...from, k: 0, vcap }];
  let q = { x: from.x, y: from.y, th: from.th };
  for (let i = 1; i <= n; i++) {
    const s0 = (len * (i - 1)) / n, s1 = (len * i) / n;
    const k = curvatureAt((s0 + s1) / 2, turn, r, share).k;
    q = advance(q.x, q.y, q.th, k, s1 - s0);
    pts.push({ ...q, k: curvatureAt(s1, turn, r, share).k, vcap });
  }
  return pts;
}

/** Tangent length of a unit-radius turn: from its start to where its two tangent lines meet. */
export function unitTangent(turn: number, share = CLOTHOID_SHARE): number {
  const pts = smoothTurn({ x: 0, y: 0, th: 0 }, Math.abs(turn), 1, 0, share);
  const e = pts[pts.length - 1]!;
  return e.x - e.y / Math.tan(Math.abs(turn));
}

export interface TurnPlan {
  /** Px to cut off the end of the lane in and the start of the lane out (the turn starts earlier, ends later). */
  readonly trimIn: number;
  readonly trimOut: number;
  /** The curve, starting on the line of the lane in and ending on the line of the lane out. */
  readonly pts: readonly Pt5[];
  readonly radius: number;
}

/** A corner turn that may not fit: the curve, and whether it had to be tighter than asked (the corner is too small). */
export interface CornerTurn { readonly pts: readonly Pt5[]; readonly radius: number; readonly tight: boolean; readonly trimIn: number; readonly trimOut: number }

/**
 * A road turn from the end of one lane (p0) to the start of the next (p1), both kept: as wide as the corner allows up
 * to WIDEST_TURN·r, at radius r where it fits; where the corner is too small for r, the widest that fits (tight)
 * and the px each lane would have to give up for r (trimIn, trimOut). Null if the lane lines don't meet ahead.
 */
export function cornerTurn(p0: Pose, p1: Pose, r: number, vcap: number, share: number): CornerTurn | null {
  const turn = wrap(p1.th - p0.th);
  const c0 = Math.cos(p0.th), s0 = Math.sin(p0.th), c1 = Math.cos(p1.th), s1 = Math.sin(p1.th);
  const den = c0 * s1 - s0 * c1;
  if (Math.abs(den) < 1e-6) return null;
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d0 = (dx * s1 - dy * c1) / den, d1 = (c0 * dy - s0 * dx) / den;
  if (d0 < 0.5 || d1 < 0.5) return null;
  const tu = unitTangent(turn, share);
  const fit = Math.min(d0, d1) / tu;
  const radius = Math.min(fit, WIDEST_TURN * r);
  const t = radius * tu;
  const start = { x: p0.x + (d0 - t) * c0, y: p0.y + (d0 - t) * s0, th: p0.th };
  const lead: Pt5[] = d0 > t + 1e-6 ? straight(p0, d0 - t, vcap) : [];
  const curve = smoothTurn(start, turn, radius, vcap, share);
  const end = curve[curve.length - 1]!;
  const tail: Pt5[] = d1 > t + 1e-6 ? straight(end, d1 - t, vcap).slice(1) : [];
  const need = r * tu;
  return { pts: [...lead, ...curve.slice(lead.length > 0 ? 1 : 0), ...tail], radius, tight: fit < r, trimIn: Math.max(0, need - d0), trimOut: Math.max(0, need - d1) };
}

/**
 * A junction turn from the end of one lane (p0) to the start of the next (p1), for a heading change between ~5° and
 * ~150°: as wide as the corner allows (up to WIDEST_TURN planned radii), never under rPlan. Null if the lane lines
 * don't meet ahead of both (not a corner).
 */
export function junctionTurn(p0: Pose, p1: Pose, rPlan: number, vcap: number): TurnPlan | null {
  const turn = wrap(p1.th - p0.th);
  const c0 = Math.cos(p0.th), s0 = Math.sin(p0.th), c1 = Math.cos(p1.th), s1 = Math.sin(p1.th);
  const den = c0 * s1 - s0 * c1;
  if (Math.abs(den) < 1e-6) return null;
  // Corner C = p0 + d0·u0 = p1 - d1·u1.
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d0 = (dx * s1 - dy * c1) / den;
  const d1 = (c0 * dy - s0 * dx) / den;
  if (d0 < -1 || d1 < -1) return null;
  const tu = unitTangent(turn);
  const radius = Math.max(rPlan, Math.min(WIDEST_TURN * rPlan, Math.min(Math.max(d0, 0), Math.max(d1, 0)) / tu));
  const t = radius * tu;
  const start = { x: p0.x + (d0 - t) * c0, y: p0.y + (d0 - t) * s0, th: p0.th };
  const lead: Pt5[] = d0 > t ? straight(p0, d0 - t, vcap) : [];
  const curve = smoothTurn(start, turn, radius, vcap);
  const end = curve[curve.length - 1]!;
  const tail: Pt5[] = d1 > t ? straight(end, d1 - t, vcap).slice(1) : [];
  return { trimIn: Math.max(0, t - d0), trimOut: Math.max(0, t - d1), pts: [...lead, ...curve.slice(lead.length > 0 ? 1 : 0), ...tail], radius };
}

/** A straight run of samples from a pose. */
export function straight(from: Pose, len: number, vcap: number): Pt5[] {
  const n = Math.max(1, Math.ceil(len / STEP));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: from.x + (len * i * Math.cos(from.th)) / n, y: from.y + (len * i * Math.sin(from.th)) / n, th: from.th, k: 0, vcap }));
}

/** Quintic smoothstep 10t³ − 15t⁴ + 6t⁵ (zero slope and curvature at both ends) and its derivatives. */
const q5 = (t: number): [number, number, number] => [t * t * t * (10 - 15 * t + 6 * t * t), 30 * t * t * (1 - t) * (1 - t), 60 * t * (1 - t) * (1 - 2 * t)];

/** Length a sideways move of `d` px takes so its sharpest bend (5.77·d/L²) is no tighter than `r`. */
export const shiftLength = (d: number, r: number): number => Math.sqrt((10 / Math.sqrt(3)) * Math.abs(d) * r);

/**
 * A sideways shift along a straight line (a lane change, a straight-on junction with a jog): from `from`, `len` px
 * along its heading, ending `side` px to the right (screen: +y of the heading's normal).
 */
export function laneShift(from: Pose, len: number, side: number, vcap: number): Pt5[] {
  const n = Math.max(2, Math.ceil(len / STEP));
  const c = Math.cos(from.th), s = Math.sin(from.th);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const [e, e1, e2] = q5(t);
    const along = t * len;
    const slope = (side * e1) / len, bend = (side * e2) / (len * len);
    return {
      x: from.x + along * c - side * e * s, y: from.y + along * s + side * e * c,
      th: from.th + Math.atan(slope), k: bend / Math.pow(1 + slope * slope, 1.5), vcap,
    };
  });
}

