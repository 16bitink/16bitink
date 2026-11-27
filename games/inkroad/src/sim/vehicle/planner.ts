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

/** Reverse costs this many times forward; a gear change costs this many body lengths. */
const REVERSE_PRICE = 1.6, CUSP_PRICE = 1.5;
/** Px between body checks along a candidate. */
const CHECK_STEP = 1.5;

/** The gear of a candidate's last element that moves. */
const lastGear = (p: RsPath): 1 | -1 => (p.lengths.filter((l) => Math.abs(l) > 1e-9).pop() ?? 1) > 0 ? 1 : -1;

const cuspsOf = (p: RsPath): number => p.lengths.filter((l, i) => i > 0 && Math.abs(l) > 1e-9 && Math.sign(l) !== Math.sign(p.lengths[i - 1]!)).length;

function costOf(p: RsPath, r: number, body: number): number {
  const fwd = p.lengths.filter((l) => l > 0).reduce((s, l) => s + l, 0) * r;
  const rev = -p.lengths.filter((l) => l < 0).reduce((s, l) => s + l, 0) * r;
  return fwd + REVERSE_PRICE * rev + CUSP_PRICE * body * cuspsOf(p);
}

/** Body poses along a candidate, every CHECK_STEP px. */
function* bodiesAlong(q0: Pose, p: RsPath, kappa: number, v: VehicleParams): Generator<Body> {
  let q = q0;
  for (let i = 0; i < p.lengths.length; i++) {
    const len = p.lengths[i]! / kappa;
    const k = p.ctypes[i] === 'L' ? kappa : p.ctypes[i] === 'R' ? -kappa : 0;
    const n = Math.max(1, Math.ceil(Math.abs(len) / CHECK_STEP));
    for (let j = 1; j <= n; j++) {
      const at = advance(q.x, q.y, q.th, k, (len * j) / n);
      const m = middleOf(v, at.x, at.y, at.th);
      yield { x: m.x, y: m.y, a: at.th, len: v.len, wid: v.wid };
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
    const off = corners(b).find(([x, y]) => !w.drivable(x, y));
    if (off) return `off the ground at ${off[0].toFixed(0)},${off[1].toFixed(0)}`;
    const hit = w.bodies.find((o) => bodiesOverlap(b, o, 0.3));
    if (hit) return `hits the body at ${hit.x.toFixed(0)},${hit.y.toFixed(0)} from ${b.x.toFixed(0)},${b.y.toFixed(0)}`;
  }
  return null;
}

/** Speed caps per gear while manoeuvring (played px/s). */
const caps = (v: VehicleParams) => ({ fwd: v.manoeuvre, rev: v.reverse });

/** The cheapest fitting manoeuvre over every start and goal offered; if none fits, the cheapest anyway (fits: false). */
export function planManoeuvre(starts: readonly Offer[], goals: readonly Offer[], v: VehicleParams, w: World): Manoeuvre | null {
  for (const r of [v.rPlan, v.rMin * 1.02]) {
    const best = cheapest(starts, goals, v, w, r, true);
    if (best) return best;
  }
  return cheapest(starts, goals, v, w, v.rPlan, false);
}

function cheapest(starts: readonly Offer[], goals: readonly Offer[], v: VehicleParams, w: World, r: number, mustFit: boolean): Manoeuvre | null {
  const kappa = 1 / r;
  const touching = (q: Pose): Body[] => { const m = middleOf(v, q.x, q.y, q.th); return w.bodies.filter((o) => bodiesOverlap({ x: m.x, y: m.y, a: q.th, len: v.len, wid: v.wid }, o, 0.3)); };
  const all: { p: RsPath; i: number; j: number; cost: number }[] = [];
  starts.forEach((a, i) => goals.forEach((b, j) => {
    for (const p of rsCandidates(a.pose, b.pose, kappa)) if (!b.endDir || lastGear(p) === b.endDir) all.push({ p, i, j, cost: costOf(p, r, v.len) + a.cost + b.cost });
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
