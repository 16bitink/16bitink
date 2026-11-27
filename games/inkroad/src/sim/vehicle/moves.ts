/**
 * Parking and turning-round moves planned on the ground and played (docs/inkroad-vehicle-model.md "Phase B"):
 * Reeds–Shepp from where the car stands to where it is going (src/sim/vehicle/planner.ts), every candidate checked
 * against the drivable ground and the parked bodies, then driven once by the tracker (src/sim/vehicle/played.ts).
 * A move into a space ends with a short straight in its last gear, so the car stands square. A move out of one is
 * played in two parts: off the road to the edge of the lane (it stops there to look for a gap), and from the edge
 * into the lane. Poses are of the body's middle, as drawn. Pure.
 */
import type { CarState } from './bicycle';
import { rearOf, type VehicleParams } from './params';
import { samplePolyline, unwrapTo, type Pose, type Pt5 } from './path';
import { planManoeuvre, type Manoeuvre, type Offer, type PlanOptions, type World } from './planner';
import type { Run } from './reedsShepp';
import { inBand, joinPlayed, playRuns, PLAY_DT, PLAY_STRIDE, standingAt, type Band, type Played } from './played';

export interface MiddlePose { readonly x: number; readonly y: number; readonly a: number }

/** Px of straight a car ends a move into a space with (wheels straight, so it stands square). */
const SETTLE = 5;
/** Px short of the lane band an 'out' move stops to look for its gap. */
const EDGE_BACK = 1;
/** Px between goal offers along a lane, and their price per px away from the preferred one. */
export const OFFER_STEP = 4;
const OFFER_PRICE = 0.25;

const rearPose = (p: VehicleParams, m: MiddlePose): Pose => ({ ...rearOf(p, m.x, m.y, m.a), th: m.a });
const standing = (q: Pose): CarState => ({ x: q.x, y: q.y, th: q.th, u: 0, dir: 1, delta: 0, a: 0 });
/** The RS word as driven (lower case: in reverse), and why it does not fit when it does not. */
const wordOf = (m: Manoeuvre): string => m.rs.ctypes.map((c, i) => (m.rs.lengths[i]! < 0 ? c.toLowerCase() : c)).join('') + (m.why ? ` (${m.why})` : '');

/** Px/s over which a car starting a move is still rolling, and px it stops short of its braking distance's end. */
const ROLLING = 0.5, STOP_MARGIN = 1;
/** It brakes gentler than the planned most (jerk takes some of the distance). */
const STOP_SHARE = 0.7;

/** Px sideways and along, and rad, within which a standing car is already where it is going. */
const NEAR_LAT = 3, NEAR_ALONG = 6, NEAR_TURN = 0.15;
function nearEnough(from: MiddlePose, to: MiddlePose): boolean {
  const dx = to.x - from.x, dy = to.y - from.y;
  const along = dx * Math.cos(from.a) + dy * Math.sin(from.a), lat = -dx * Math.sin(from.a) + dy * Math.cos(from.a);
  return Math.abs(lat) < NEAR_LAT && Math.abs(along) < NEAR_ALONG && Math.abs(Math.sin(to.a - from.a)) < NEAR_TURN && Math.cos(to.a - from.a) > 0;
}

/**
 * Px a nose-first ending costs where spaces are backed into (car-park bays and home driveways face their way out, so
 * the car leaves forward into the aisle or the road); still taken when nothing else fits.
 */
const NOSE_IN_PRICE = 240;

/** Goals for a move into a space: SETTLE px short of it, coming forward or in reverse, then straight in; or the space itself. */
function settleGoals(slot: Pose, backIn: boolean): Offer[] {
  const c = Math.cos(slot.th), s = Math.sin(slot.th);
  const at = (d: number): Pose => ({ x: slot.x + d * c, y: slot.y + d * s, th: slot.th });
  return [
    { pose: at(-SETTLE), cost: backIn ? NOSE_IN_PRICE : 0, excuse: slot, endDir: 1 },
    { pose: at(SETTLE), cost: 0, excuse: slot, endDir: -1 },
    { pose: slot, cost: 3 * SETTLE, excuse: slot },
  ];
}

/** The settling straight from the pre-goal into the space at the gear's manoeuvre pace. */
function settleRun(from: Pose, to: Pose, dir: 1 | -1, p: VehicleParams): Run {
  const pts: Pt5[] = samplePolyline([from, to], dir > 0 ? p.creep : p.reverse, dir).map((q) => ({ ...q, th: from.th }));
  return { dir, pts };
}

/** Px a car may first roll straight on in its lane before its move (every OFFER_STEP), and the price per px. */
const ROLL = 24, ROLL_PRICE = 0.25, ROLL_BACK = 44, BACK_PRICE = 1.6;

/** Start offers: where the car stands, and straight on along its heading while the body stays on the ground. */
function rollOffers(p: VehicleParams, from: Pose, w: World): Offer[] {
  const out: Offer[] = [{ pose: from, cost: 0 }];
  const c = Math.cos(from.th), s = Math.sin(from.th);
  // Straight on, or straight back a little in its own lane (backing up in its lane is allowed; a gear change is priced).
  for (const way of [1, -1] as const) {
    for (let d = OFFER_STEP; d <= (way > 0 ? ROLL : ROLL_BACK); d += OFFER_STEP) {
      const q = { x: from.x + way * c * d, y: from.y + way * s * d, th: from.th };
      const end = way > 0 ? p.toMiddle + p.len / 2 : p.toMiddle - p.len / 2, side = p.wid / 2;
      const ok = [[end, side], [end, -side]].every(([f, r]) => w.drivable(q.x + f! * c - r! * s, q.y + f! * s + r! * c)) && !w.bodies.some((b) => Math.hypot(b.x - (q.x + c * end), b.y - (q.y + s * end)) < b.len / 2 + 2);
      if (!ok) break;
      out.push({ pose: q, cost: way > 0 ? d * ROLL_PRICE : d * BACK_PRICE + p.len });
    }
  }
  return out;
}

/** The straight roll from where the car stands to a start offer, forward at the manoeuvre pace. */
function straightRun(from: Pose, to: Pose, p: VehicleParams): Run {
  const dir: 1 | -1 = (to.x - from.x) * Math.cos(from.th) + (to.y - from.y) * Math.sin(from.th) >= 0 ? 1 : -1;
  return { dir, pts: samplePolyline([from, to], dir > 0 ? p.manoeuvre : p.reverse * 0.94, dir).map((q) => ({ ...q, th: from.th })) };
}

/** RS runs into a space from a standing car, with the settling straight. Null: no RS path at all. */
function intoRuns(p: VehicleParams, from: Pose, slot: Pose, w: World, settle: boolean, o: PlanOptions & { readonly backIn?: boolean }): { runs: Run[]; m: Manoeuvre } | null {
  const goal = { ...slot, th: unwrapTo(from.th, slot.th) };
  const goals = settle ? settleGoals(goal, o.backIn === true) : [{ pose: goal, cost: 0, excuse: goal }];
  const starts = rollOffers(p, from, w);
  const m = planManoeuvre(starts, goals, p, w, o);
  if (!m) return null;
  const g = goals[m.to]!;
  const roll = m.from > 0 ? [straightRun(from, starts[m.from]!.pose, p)] : [];
  return { runs: [...roll, ...m.runs, ...(g.endDir ? [settleRun(g.pose, g.excuse!, g.endDir, p)] : [])], m };
}

/** A move from a standing car into a space (or onto a stop on the road): planned and played. */
export function playInto(p: VehicleParams, from: MiddlePose, to: MiddlePose, w: World, settle = true, o: PlanOptions & { readonly backIn?: boolean; readonly pause?: number } = {}, u0 = 0, a0 = 0): Played {
  const a = rearPose(p, from), b = rearPose(p, to);
  // A few px off is no manoeuvre (the owner: a car a little off its line just stands there, or steers back driving).
  if (nearEnough(from, to) && u0 < ROLLING) return standingAt(p, from);
  // Still rolling when the move starts (the drawn car lags the sim's stop): it brakes straight on first, then plans from where it stands.
  const stop = u0 >= ROLLING ? (u0 * u0) / (2 * p.planBrake * STOP_SHARE) + STOP_MARGIN : 0;
  const q = { x: a.x + Math.cos(a.th) * stop, y: a.y + Math.sin(a.th) * stop, th: a.th };
  const brake: Run[] = stop > 0 ? [{ dir: 1, pts: samplePolyline([a, q], Math.max(u0, p.manoeuvre), 1).map((t) => ({ ...t, th: a.th })) }] : [];
  // Its stop on the road is just ahead on its line: it simply comes to rest (it stands where it stops).
  if (stop > 0 && nearEnough({ x: q.x + p.toMiddle * Math.cos(q.th), y: q.y + p.toMiddle * Math.sin(q.th), a: q.th }, to)) return playRuns({ ...standing(a), u: u0, a: a0 }, brake, p, true, '');
  const r = intoRuns(p, q, b, w, settle, o);
  if (!r) return standingAt(p, to);
  // It must stand first (waiting for a gap across the road): brake to a stop, stand, then go.
  if (o.pause && o.pause > 0) {
    const halt = brake.length ? playRuns({ ...standing(a), u: u0, a: a0 }, brake, p, true, '') : standingAt(p, from);
    const go = playRuns(halt.end, r.runs, p, r.m.fits, wordOf(r.m));
    return joinPlayed(joinPlayed(halt, standFor(halt, o.pause)), go);
  }
  return playRuns({ ...standing(a), u: u0, a: u0 >= ROLLING ? a0 : 0 }, [...brake, ...r.runs], p, r.m.fits, wordOf(r.m));
}

/** Standing still where a played move ended, for `seconds`. */
function standFor(m: Played, seconds: number): Played {
  const n = Math.max(1, Math.round(seconds / PLAY_DT) + 1), o = (m.n - 1) * PLAY_STRIDE;
  const frames = new Float64Array(n * PLAY_STRIDE);
  for (let i = 0; i < n; i++) frames.set(m.frames.subarray(o, o + PLAY_STRIDE), i * PLAY_STRIDE);
  return { frames, n, seconds: (n - 1) * PLAY_DT, end: m.end, fits: true, word: '' };
}

/** Lane goal offers: the pose at `s0` and every OFFER_STEP px ahead of it up to `ahead`, priced by distance (middle poses). */
export function laneOffers(at: (s: number) => MiddlePose | null, s0: number, ahead: number, back = 0): { s: number; pose: MiddlePose; cost: number }[] {
  const out: { s: number; pose: MiddlePose; cost: number }[] = [];
  for (let d = -back; d <= ahead + 1e-6; d += OFFER_STEP) {
    const pose = at(s0 + d);
    if (pose) out.push({ s: s0 + d, pose, cost: Math.abs(d) * OFFER_PRICE });
  }
  return out;
}

export interface OutMove {
  /** Off the road to the lane edge (standing there while it waits for its gap), and from the edge into the lane. */
  readonly toEdge: Played;
  readonly join: Played;
  /** Which lane goal it joins at. */
  readonly goal: number;
  readonly fits: boolean;
  readonly word: string;
}

/** Index of the first sample of the runs where the body reaches into the band (-1: never). */
function firstInBand(runs: readonly Run[], p: VehicleParams, b: Band): { run: number; pt: number } | null {
  for (let r = 0; r < runs.length; r++) {
    const pts = runs[r]!.pts;
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i]!;
      const mx = q.x + p.toMiddle * Math.cos(q.th), my = q.y + p.toMiddle * Math.sin(q.th);
      if (inBand(b, mx, my, q.th, p.len, p.wid)) return { run: r, pt: i };
    }
  }
  return null;
}

/** The runs cut where the body would first reach the band, EDGE_BACK px short of it: off-road part, then the rest. */
function cutAtBand(runs: readonly Run[], p: VehicleParams, b: Band): [Run[], Run[]] {
  const hit = firstInBand(runs, p, b);
  if (!hit) return [[...runs], []];
  const back = Math.ceil(EDGE_BACK / 0.5);
  let { run, pt } = hit;
  pt -= back;
  while (pt < 1 && run > 0) { run--; pt += runs[run]!.pts.length - 1; }
  if (pt < 1) return [[], [...runs]];
  const cut = runs[run]!;
  const before = [...runs.slice(0, run), { dir: cut.dir, pts: cut.pts.slice(0, pt + 1) }];
  const after = [{ dir: cut.dir, pts: cut.pts.slice(pt) }, ...runs.slice(run + 1)];
  return [before, after];
}

/**
 * A move out of a space to one of the lane goals (middle poses on the lane, priced): planned on the ground, cut at
 * the lane band `b` so the car stops at the edge, and played in its two parts.
 */
export function playOutOf(p: VehicleParams, slot: MiddlePose, goals: readonly { readonly pose: MiddlePose; readonly cost: number }[], w: World, b: Band, o: PlanOptions = {}): OutMove | null {
  const a = rearPose(p, slot);
  const offers: Offer[] = goals.map((g) => ({ pose: { ...rearPose(p, g.pose), th: unwrapTo(a.th, g.pose.a) }, cost: g.cost }));
  const m = planManoeuvre([{ pose: a, cost: 0, excuse: a }], offers, p, w, o);
  if (!m) return null;
  const [off, on] = cutAtBand(m.runs, p, b);
  const toEdge = playRuns(standing(a), off, p, m.fits, wordOf(m));
  const join = on.length ? playRuns(toEdge.end, on, p, m.fits, wordOf(m)) : standingAt(p, goals[m.to]!.pose);
  return { toEdge, join, goal: m.to, fits: m.fits, word: wordOf(m) };
}

/** A car turning round on the road: from where it stands to one of the goals on the other lane. */
export function playTurn(p: VehicleParams, from: MiddlePose, goals: readonly { readonly pose: MiddlePose; readonly cost: number }[], w: World): { played: Played; goal: number } | null {
  const a = rearPose(p, from);
  const offers: Offer[] = goals.map((g) => ({ pose: { ...rearPose(p, g.pose), th: unwrapTo(a.th, g.pose.a) }, cost: g.cost }));
  const m = planManoeuvre([{ pose: a, cost: 0 }], offers, p, w, { turnaround: true });
  if (!m) return null;
  return { played: playRuns(standing(a), [...m.runs], p, m.fits, wordOf(m)), goal: m.to };
}
