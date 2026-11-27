/**
 * Manoeuvre planning with Reeds–Shepp (docs/inkroad-vehicle-model.md "Parking, driveways, turning round"): for each
 * pair of start and goal poses offered (e.g. several points along the lane), every RS candidate is checked against
 * the ground (the body must stay on drivable ground) and the bodies around it, and the cheapest that fits wins:
 * length, with reverse dearer than forward and a price per gear change. Planned at rPlan; if nothing fits, again a
 * little tighter (rMin·1.02). Runs only when a manoeuvre starts. Pure.
 */
import { bodiesOverlap, type Body } from '../vehicleSize';
import { middleOf, type VehicleParams } from './params';
import { pathOf, type Pose, type RefPath } from './path';
import { advance, rsCandidates, rsSample, type Run, type RsPath } from './reedsShepp';

/**
 * A pose a manoeuvre may start or end at. `excuse`: a parking slot whose neighbours may touch it (slots drawn too
 * close are the layout's fault, so bodies touching the car there are left out of that move's checks). `endDir`: a
 * goal only for paths whose last element is in this gear (a settling straight follows it into the slot).
 */
export interface Offer { readonly pose: Pose; readonly cost: number; readonly excuse?: Pose; readonly endDir?: 1 | -1 }
export interface World {
  /** Is this point on ground a car may drive on? */
  readonly drivable: (x: number, y: number) => boolean;
  readonly bodies: readonly Body[];
  /**
   * Where a car may be while it backs up (the owner, phase B: nobody reverses across a lane of traffic): off the
   * road and its own lane, never the oncoming lanes. Absent: anywhere drivable (a three-point turn on a clear road).
   */
  readonly reverse?: (x: number, y: number) => boolean;
}

export interface Manoeuvre {
  readonly path: RefPath;
  /** The same samples by gear, to join onto lanes (path.ts pathOf). */
  readonly runs: readonly Run[];
  readonly rs: RsPath;
  readonly from: number;
  readonly to: number;
  readonly cost: number;
  readonly fits: boolean;
  /** Radius planned with, px. */
  readonly radius: number;
  /** Why the drawn candidate fails, when it does. */
  readonly why: string | null;
}

/** Reverse costs this many times forward; a gear change costs this many body lengths; each radian turned this many px (longer and gentle beats short and twisty). */
const REVERSE_PRICE = 1.6, CUSP_PRICE = 1.5, TURN_PRICE = 6;
/**
 * No loops (the owner, phase B): a path whose heading sweeps more than its net change + LOOP_SLACK is a loop, never
 * taken (a full circle to face the other way sweeps 360 for a net 180; an S left then right sweeps only one bend).
 */
export const LOOP_SLACK = (120 * Math.PI) / 180;
/** Goals within this of the start's heading, ahead of it, are reached with a forward S only (no cusp, no reversing). */
const S_ONLY = Math.PI / 4;

export interface PlanOptions {
  /** The move is meant to turn the car round (a three-point turn, a turn on the road): cusps and reversing across the road allowed. */
  readonly turnaround?: boolean;
  /** Forward only (turning across the road into a space: one nose-first turn, never backing across a lane). */
  readonly forwardOnly?: boolean;
}

/**
 * Changes of steering along a candidate in full swings at this radius (L to R is 2, L or R to S is 1): the wheels swing
 * at a finite rate, so the car crawls through each; a wider radius swings less. Priced SWING_PRICE px per full swing
 * at a car's own radius (scaled by wheelbase / r).
 */
const SWING_PRICE = 8;
function swingsOf(p: RsPath): number {
  const k = (c: string): number => (c === 'L' ? 1 : c === 'R' ? -1 : 0);
  let n = 0;
  for (let i = 1; i < p.ctypes.length; i++) if (Math.abs(p.lengths[i]!) > 1e-9) n += Math.abs(k(p.ctypes[i]!) - k(p.ctypes[i - 1]!));
  return n;
}

/**
 * How far a candidate's heading sweeps (the range of its heading along the way, radians): an S (left then right)
 * sweeps one bend, a full circle sweeps all of it, a three-point turn little more than its half circle.
 */
export function sweepOf(p: RsPath): number {
  let th = 0, lo = 0, hi = 0;
  p.lengths.forEach((l, i) => {
    th += (p.ctypes[i] === 'L' ? 1 : p.ctypes[i] === 'R' ? -1 : 0) * l;
    lo = Math.min(lo, th); hi = Math.max(hi, th);
  });
  return hi - lo;
}

/** Total turning of a candidate, radians (every arc's angle). */
export const turningOf = (p: RsPath): number => p.lengths.reduce((n, l, i) => n + (p.ctypes[i] === 'S' ? 0 : Math.abs(l)), 0);

const wrapA = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** May this candidate run between these poses? No loops; a goal nearly ahead is a forward S. */
function allowed(p: RsPath, a: Pose, b: Pose, o: PlanOptions): boolean {
  if (o.forwardOnly && p.lengths.some((l) => l < -1e-9)) return false;
  const net = Math.abs(wrapA(b.th - a.th));
  // Never a loop, not even turning round: the heading never sweeps much more than the change it is for.
  if (sweepOf(p) > net + LOOP_SLACK) return false;
  if (o.turnaround) return true;
  const ahead = (b.x - a.x) * Math.cos(a.th) + (b.y - a.y) * Math.sin(a.th) > 0;
  return !(net < S_ONLY && ahead) || p.lengths.every((l) => l >= -1e-9);
}
/** Wider radii tried first, as shares of rPlan. */
const WIDE = [2, 1.4] as const;
/** Px between body checks along a candidate. */
const CHECK_STEP = 1.5;

/** The gear of a candidate's last element that moves. */
const lastGear = (p: RsPath): 1 | -1 => (p.lengths.filter((l) => Math.abs(l) > 1e-9).pop() ?? 1) > 0 ? 1 : -1;

const cuspsOf = (p: RsPath): number => p.lengths.filter((l, i) => i > 0 && Math.abs(l) > 1e-9 && Math.sign(l) !== Math.sign(p.lengths[i - 1]!)).length;

function costOf(p: RsPath, r: number, body: number): number {
  const fwd = p.lengths.filter((l) => l > 0).reduce((s, l) => s + l, 0) * r;
  const rev = -p.lengths.filter((l) => l < 0).reduce((s, l) => s + l, 0) * r;
  return fwd + REVERSE_PRICE * rev + CUSP_PRICE * body * cuspsOf(p) + TURN_PRICE * turningOf(p) + SWING_PRICE * swingsOf(p) * (body * 0.6) / r;
}

/** Body poses along a candidate, every CHECK_STEP px, with the gear each is driven in. */
function* bodiesAlong(q0: Pose, p: RsPath, kappa: number, v: VehicleParams): Generator<Body & { readonly dir: 1 | -1 }> {
  let q = q0;
  for (let i = 0; i < p.lengths.length; i++) {
    const len = p.lengths[i]! / kappa;
    const k = p.ctypes[i] === 'L' ? kappa : p.ctypes[i] === 'R' ? -kappa : 0;
    const n = Math.max(1, Math.ceil(Math.abs(len) / CHECK_STEP));
    for (let j = 1; j <= n; j++) {
      const at = advance(q.x, q.y, q.th, k, (len * j) / n);
      const m = middleOf(v, at.x, at.y, at.th);
      yield { x: m.x, y: m.y, a: at.th, len: v.len, wid: v.wid, dir: len < 0 ? -1 : 1 };
    }
    q = advance(q.x, q.y, q.th, k, len);
  }
}

const corners = (b: Body): [number, number][] => {
  const c = Math.cos(b.a), s = Math.sin(b.a), hl = b.len / 2, hw = b.wid / 2;
  return [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl, 0], [-hl, 0]].map(([f, r]) => [b.x + f! * c - r! * s, b.y + f! * s + r! * c]);
};

/** Does the body stay on the ground and clear of every other body all along? */
export function fits(q0: Pose, p: RsPath, kappa: number, v: VehicleParams, w: World): boolean {
  return whyNot(q0, p, kappa, v, w) === null;
}

/** Where and why a candidate fails (null if it fits): for the lab's notes. */
export function whyNot(q0: Pose, p: RsPath, kappa: number, v: VehicleParams, w: World): string | null {
  for (const b of bodiesAlong(q0, p, kappa, v)) {
    const cs = corners(b);
    const off = cs.find(([x, y]) => !w.drivable(x, y));
    if (off) return `off the ground at ${off[0].toFixed(0)},${off[1].toFixed(0)}`;
    const back = b.dir < 0 && w.reverse ? cs.find(([x, y]) => !w.reverse!(x, y)) : undefined;
    if (back) return `reverses across a lane at ${back[0].toFixed(0)},${back[1].toFixed(0)}`;
    const hit = w.bodies.find((o) => bodiesOverlap(b, o, 0.3));
    if (hit) return `hits the body at ${hit.x.toFixed(0)},${hit.y.toFixed(0)} from ${b.x.toFixed(0)},${b.y.toFixed(0)}`;
  }
  return null;
}

/** Speed caps per gear while manoeuvring (played px/s). */
const caps = (v: VehicleParams) => ({ fwd: v.manoeuvre, rev: v.reverse * REVERSE_SHARE });
/** Reverse is planned this far under walking pace: the body's middle swings a little faster than the rear axle on a bend. */
const REVERSE_SHARE = 0.94;

/** The cheapest fitting manoeuvre over every start and goal offered; if none fits, the cheapest anyway (fits: false). */
export function planManoeuvre(starts: readonly Offer[], goals: readonly Offer[], v: VehicleParams, w: World, o: PlanOptions = {}): Manoeuvre | null {
  // Gentle first (the owner: longer and gentle beats short and twisty; wide arcs swing the wheels less, so they are driven faster).
  let best: Manoeuvre | null = null;
  for (const r of [v.rPlan * WIDE[0], v.rPlan * WIDE[1], v.rPlan, v.rMin * 1.02]) {
    const m = cheapest(starts, goals, v, w, r, true, o);
    if (m && (!best || m.cost < best.cost)) best = m;
  }
  if (best) return best;
  return cheapest(starts, goals, v, w, v.rPlan, false, o) ?? cheapest(starts, goals, v, w, v.rPlan, false, { turnaround: true, forwardOnly: o.forwardOnly });
}

function cheapest(starts: readonly Offer[], goals: readonly Offer[], v: VehicleParams, w: World, r: number, mustFit: boolean, o: PlanOptions): Manoeuvre | null {
  const kappa = 1 / r;
  const touching = (q: Pose): Body[] => { const m = middleOf(v, q.x, q.y, q.th); return w.bodies.filter((o) => bodiesOverlap({ x: m.x, y: m.y, a: q.th, len: v.len, wid: v.wid }, o, 0.3)); };
  const all: { p: RsPath; i: number; j: number; cost: number }[] = [];
  starts.forEach((a, i) => goals.forEach((b, j) => {
    for (const p of rsCandidates(a.pose, b.pose, kappa)) if ((!b.endDir || lastGear(p) === b.endDir) && allowed(p, a.pose, b.pose, o)) all.push({ p, i, j, cost: costOf(p, r, v.len) + a.cost + b.cost });
  }));
  all.sort((x, y) => x.cost - y.cost);
  for (const c of all) {
    const a = starts[c.i]!, b = goals[c.j]!;
    const skip = new Set([...(a.excuse ? touching(a.excuse) : []), ...(b.excuse ? touching(b.excuse) : [])]);
    const why = whyNot(starts[c.i]!.pose, c.p, kappa, v, skip.size ? { ...w, bodies: w.bodies.filter((o) => !skip.has(o)) } : w);
    const ok = why === null;
    if (!ok && mustFit) continue;
    const runs = rsSample(starts[c.i]!.pose, c.p, kappa, caps(v));
    return { path: pathOf(runs), runs, rs: c.p, from: c.i, to: c.j, cost: c.cost, fits: ok, radius: r, why };
  }
  return null;
}
