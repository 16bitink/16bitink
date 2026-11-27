import { csc, LOOP, pathOf, reversed, segAt, straight, turning, angleTo, arc, type DrivePath, type Pose, type Seg } from './drivePath';
import { R_MIN } from './kinematics';
import { MOTION_SWITCHES } from './switches';
import type { Pt } from './types';

/**
 * The parking moves as drivable paths (src/sim/drivePath.ts): every path is in travel order, with `split` the px
 * where the lane part and the off-road part meet. Turning in: lane part first (from the lane pose), then off the
 * road to the slot. Pulling out: off-road part first (from the slot to the edge), then the lane part (to the lane pose).
 * Pure; built once per move.
 */
export interface Planned { readonly path: DrivePath; readonly split: number }

/** Room left between the end of a parallel S and the lane pose (px). */
const MARGIN = 2;
/** A slot this close to square with its lane line has no column to turn into. */
const SQUARE_MIN = 0.2;
/** A parallel S may turn this much more than its two bends (rad); else it starts further ahead, LONGER px a try. */
const SKEW_SLACK = 0.15;
const LONGER = 3;
const LONGER_TRIES = 8;
/** Sideways px below which two poses share a line. */
const SAME_LINE = 0.5;

const unit = (a: number): Pt => ({ x: Math.cos(a), y: Math.sin(a) });
const lenOf = (segs: readonly Seg[]): number => segs.reduce((n, s) => n + s.len, 0);
const endOf = (segs: readonly Seg[], fallback: Pose): Pose => {
  const s = segs[segs.length - 1];
  if (!s) return fallback;
  const e = segAt(s, s.len);
  return { x: e.x, y: e.y, a: s.dir > 0 ? e.h : e.h + Math.PI };
};

/** Lane line through `line` with heading `a`: px sideways of point p from it. */
const sideOf = (line: Pt, a: number, p: Pt): number => (p.x - line.x) * -Math.sin(a) + (p.y - line.y) * Math.cos(a);

/**
 * Into a bay along its column, from a lane line (through `line`, heading `a`): one arc of R_MIN from the lane line
 * into the column, then straight along the column to the slot. Nose first (`noseIn`) or backing in. Returns the
 * point Q on the lane line where the arc starts, and the segments from Q (the arc's px is `arcLen`).
 */
export function bayCore(line: Pt, a: number, slot: Pose, noseIn: boolean): { q: Pose; segs: Seg[]; arcLen: number } {
  const dir: 1 | -1 = noseIn ? 1 : -1;
  const w = noseIn ? slot.a : slot.a + Math.PI;
  const h0 = noseIn ? a : a + Math.PI;
  const th = angleTo(h0, w);
  const bend = arc(0, 0, h0, th, R_MIN, dir);
  const e = segAt(bend, bend.len);
  const wu = unit(w);
  const latW = sideOf({ x: 0, y: 0 }, a, wu);
  const t = Math.abs(latW) < SQUARE_MIN ? 0 : Math.max(0, (sideOf(line, a, slot) - sideOf({ x: 0, y: 0 }, a, e)) / latW);
  const c = { x: slot.x - wu.x * t, y: slot.y - wu.y * t };
  const q = { x: c.x - e.x, y: c.y - e.y, a };
  const segs: Seg[] = [arc(q.x, q.y, h0, th, R_MIN, dir), { x: c.x, y: c.y, h: w, k: 0, len: t, dir }];
  return { q, segs, arcLen: bend.len };
}

/** From a pose to another: a straight when they share a line, else the gentler of the forward and reverse CSC words. */
function onto(from: Pose, to: Pose): Seg[] {
  if (Math.abs(sideOf(from, from.a, to)) < SAME_LINE && Math.abs(angleTo(from.a, to.a)) < 1e-3) return [straight(from.x, from.y, from.a, to)];
  const ahead = (to.x - from.x) * Math.cos(from.a) + (to.y - from.y) * Math.sin(from.a) >= 0;
  const first = csc(from, to, R_MIN, ahead ? 1 : -1);
  if (turning(first) <= LOOP) return first;
  const other = csc(from, to, R_MIN, ahead ? -1 : 1);
  return turning(other) < turning(first) ? other : first;
}

export function bayIn(lane: Pose, slot: Pose, noseIn: boolean): Planned {
  const b = bayCore(lane, lane.a, slot, noseIn);
  const head = onto(lane, b.q);
  return { path: pathOf([...head, ...b.segs]), split: lenOf(head) + b.arcLen };
}

/** Out of a bay: backing out (nose-in bays) or driving out (nose-out), onto the lane line, then along it to the lane pose. */
export function bayOut(slot: Pose, lane: Pose, noseIn: boolean): Planned {
  const b = bayCore(lane, lane.a, slot, noseIn);
  const out = reversed(pathOf(b.segs));
  const tail = onto(endOf(out.segs, b.q), lane);
  return { path: pathOf([...out.segs, ...tail]), split: out.len - b.arcLen };
}

/** A parallel space: the S backing in from a point on the lane line ahead of the slot (no straightening left). */
function parCore(line: Pt, a: number, slot: Pose): { p: Pose; segs: Seg[] } {
  const d = Math.abs(sideOf(line, a, slot));
  const phi = d >= 2 * R_MIN ? Math.PI / 2 : Math.acos(1 - d / (2 * R_MIN));
  const u = unit(a);
  const base = (slot.x - line.x) * u.x + (slot.y - line.y) * u.y;
  // A skewed slot needs a little more run: lengthen until the word is a plain S (two bends, no loop).
  const most = 2 * phi + Math.abs(angleTo(a, slot.a)) + SKEW_SLACK;
  let best: { p: Pose; segs: Seg[] } | null = null;
  for (let k = 0; k <= LONGER_TRIES; k++) {
    const x = base + 2 * R_MIN * Math.sin(phi) + MARGIN + k * LONGER;
    const p = { x: line.x + u.x * x, y: line.y + u.y * x, a };
    const segs = csc(p, slot, R_MIN, -1);
    if (turning(segs) <= most) return { p, segs };
    if (!best || turning(segs) < turning(best.segs)) best = { p, segs };
  }
  return best!;
}

/** A slot facing against the lane: no S fits, so the car swings round into it forward (a U across the road). */
const against = (lane: Pose, slot: Pose): boolean => Math.cos(angleTo(lane.a, slot.a)) < 0;

/**
 * A three-point turn where the car stands (forward left, back right, forward left: the car turns the same way in
 * every leg), ending facing the other way. Used when a space faces against the lane and no U fits.
 */
export function kTurn(at: Pose): Seg[] {
  const out: Seg[] = [];
  let p = { x: at.x, y: at.y, a: at.a };
  for (let i = 0; i < 3; i++) {
    const dir: 1 | -1 = i === 1 ? -1 : 1;
    const h = dir > 0 ? p.a : p.a + Math.PI;
    const s = arc(p.x, p.y, h, -Math.PI / 3, R_MIN, dir);
    out.push(s);
    p = endOf([s], p);
  }
  return out;
}

/** Bisection steps for the three-point turn's first leg. */
const K_STEPS = 40;

/**
 * A three-point turn from `from` that ends facing the other way `d` px to its side (sideOf's sign): forward, back and
 * forward again on R_MIN arcs, the first and last legs alike, so it ends level with where it began.
 */
function kTurnTo(from: Pose, d: number): Seg[] {
  const way = d < 0 ? -1 : 1;
  const legs = (t: number): Seg[] => {
    const out: Seg[] = [];
    let p: Pose = from;
    for (const [turn, dir] of [[t, 1], [Math.PI - 2 * t, -1], [t, 1]] as const) {
      const s = arc(p.x, p.y, dir > 0 ? p.a : p.a + Math.PI, way * turn, R_MIN, dir);
      out.push(s);
      p = endOf([s], p);
    }
    return out;
  };
  // The end's sideways offset falls steadily as the first leg grows (a long middle leg carries the car back across).
  let lo = 0.05, hi = Math.PI / 2 - 0.01;
  for (let i = 0; i < K_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (way * sideOf(from, from.a, endOf(legs(mid), from)) < Math.abs(d)) lo = mid; else hi = mid;
  }
  return legs((lo + hi) / 2);
}

/**
 * Turning round where a road ends (a dead end), from the end of one lane to the start of the lane back: a forward U
 * where the two lie at least 2 R_MIN apart, else a three-point turn. `three` says which.
 */
export function turnRound(from: Pose, to: Pose): { segs: Seg[]; three: boolean } {
  const d = sideOf(from, from.a, to);
  if (Math.abs(d) >= 2 * R_MIN) {
    const u = csc(from, to, R_MIN, 1);
    if (turning(u) <= Math.PI + SKEW_SLACK) return { segs: u, three: false };
  }
  const k = kTurnTo(from, d);
  const end = endOf(k, from);
  return { segs: [...k, ...onto(end, to)], three: true };
}

/** A U fits when the swing round turns little more than half a circle. */
const U_MOST = Math.PI + 0.4;

/** From a pose to another, turning round first (three-point) when the way there would loop. */
function reach(from: Pose, to: Pose): Seg[] {
  const w = onto(from, to);
  if (turning(w) <= U_MOST) return w;
  const k = kTurn(from);
  return [...k, ...onto(endOf(k, from), to)];
}

/** Px out along its column where a car lines up to back into (or has driven out of) a bay that lies along its road. */
const COLUMN_RUN = R_MIN + 2;

/** A bay whose column runs along the road (at a road's end, down a lot's side): line up on the column, then straight in. */
export function columnIn(lane: Pose, slot: Pose, noseIn: boolean): Planned {
  const w = noseIn ? slot.a : slot.a + Math.PI;
  const t = { x: slot.x - Math.cos(w) * COLUMN_RUN, y: slot.y - Math.sin(w) * COLUMN_RUN, a: slot.a };
  const head = reach(lane, t);
  return { path: pathOf([...head, straight(t.x, t.y, t.a, slot)]), split: lenOf(head) };
}

export function columnOut(slot: Pose, lane: Pose, noseIn: boolean): Planned {
  const w = noseIn ? slot.a : slot.a + Math.PI;
  const t = { x: slot.x - Math.cos(w) * COLUMN_RUN, y: slot.y - Math.sin(w) * COLUMN_RUN, a: slot.a };
  const first = straight(slot.x, slot.y, slot.a, t);
  return { path: pathOf([first, ...reach(t, lane)]), split: first.len };
}

export function parallelIn(lane: Pose, slot: Pose): Planned {
  if (against(lane, slot)) {
    const u = onto(lane, slot);
    if (turning(u) <= U_MOST) { const path = pathOf(u); return { path, split: path.len }; }
    const k = kTurn(lane);
    const rest = parallelIn(endOf(k, lane), slot);
    return { path: pathOf([...k, ...rest.path.segs]), split: lenOf(k) + rest.split };
  }
  const c = parCore(lane, lane.a, slot);
  const head = onto(lane, c.p);
  const path = pathOf([...head, ...c.segs]);
  return { path, split: path.len };
}

export function parallelOut(slot: Pose, lane: Pose): Planned {
  if (against(lane, slot)) {
    const u = onto(slot, lane);
    if (turning(u) <= U_MOST) return { path: pathOf(u), split: 0 };
    const flip = { x: lane.x, y: lane.y, a: lane.a + Math.PI };
    const first = parallelOut(slot, flip);
    const k = kTurn(endOf(first.path.segs, flip));
    return { path: pathOf([...first.path.segs, ...k, ...onto(endOf(k, flip), lane)]), split: first.split };
  }
  // Straight out to the lane pose with a forward S when it lies far enough ahead (never overshoot it and back up).
  const direct = MOTION_SWITCHES.ROAD_STOPS ? plainS(slot, lane) : null;
  if (direct) return { path: pathOf(direct), split: 0 };
  const c = parCore(lane, lane.a, slot);
  const out = reversed(pathOf(c.segs));
  return { path: pathOf([...out.segs, ...onto(endOf(out.segs, c.p), lane)]), split: 0 };
}

/**
 * Pulling over to a bare kerb: a forward S from the lane when the space lies far enough ahead for one (two bends, no
 * loop); else the parallel S backing in, as into a bay.
 */
export function pullIn(lane: Pose, slot: Pose): Planned {
  const direct = against(lane, slot) ? null : plainS(lane, slot);
  if (direct) { const path = pathOf(direct); return { path, split: path.len }; }
  return parallelIn(lane, slot);
}

/** The most a forward S between two near-parallel poses may turn: two bends of PLAIN_BEND each, plus their skew. */
const PLAIN_BEND = Math.PI / 3;

/** A forward S from one pose to another a little to the side and ahead of it, or null when none fits (it would loop). */
function plainS(from: Pose, to: Pose): Seg[] | null {
  if ((to.x - from.x) * Math.cos(from.a) + (to.y - from.y) * Math.sin(from.a) <= 0) return null;
  const segs = csc(from, to, R_MIN, 1);
  return turning(segs) <= 2 * PLAIN_BEND + Math.abs(angleTo(from.a, to.a)) ? segs : null;
}

/** Double parking (or a pump queue): it stands in the lane, then eases onto its place forward. */
export function shoulderIn(lane: Pose, slot: Pose): Planned {
  return { path: pathOf(reach(lane, slot)), split: 0 };
}

export function shoulderOut(slot: Pose, lane: Pose): Planned {
  const path = pathOf(reach(slot, lane));
  return { path, split: path.len };
}

/** A car park's mouth (multi-storey, underground) or a building's door: in forward and gone. */
export function mouthIn(lane: Pose, slot: Pose): Planned {
  const path = pathOf(reach(lane, slot));
  return { path, split: path.len / 2 };
}

export function mouthOut(slot: Pose, lane: Pose): Planned {
  const path = pathOf(reach({ x: slot.x, y: slot.y, a: slot.a + Math.PI }, lane));
  return { path, split: path.len / 2 };
}

/**
 * A two-row car park: through the gate, along the aisle past the bay's column, back into the bay; out the same way
 * forward. `via`: gate, the join of the gate lane and the aisle, the aisle at the bay's column.
 */
export function aisleIn(lane: Pose, slot: Pose, via: readonly Pt[]): Planned {
  const { gate, aisle } = aisleFrame(via, slot);
  const toGate = onto(lane, gate);
  const toAisle = csc(gate, aisle.q, R_MIN, 1);
  const into = bayCore(aisle.q, aisle.q.a, slot, false);
  const run = onto(endOf(toAisle, gate), into.q);
  return { path: pathOf([...toGate, ...(turning(toAisle) <= LOOP ? toAisle : []), ...run, ...into.segs]), split: lenOf(toGate) };
}

export function aisleOut(slot: Pose, lane: Pose, via: readonly Pt[]): Planned {
  const { gate } = aisleFrame(via, slot);
  const join = via[1] ?? gate;
  const back = gate.a + Math.PI;
  const towards = Math.atan2(join.y - (via[2]?.y ?? join.y), join.x - (via[2]?.x ?? join.x));
  const exit = bayCore(join, Number.isFinite(towards) ? towards : back, slot, false);
  const out = reversed(pathOf(exit.segs));
  const at = endOf(out.segs, exit.q);
  const outGate = { x: gate.x, y: gate.y, a: back };
  const toGate = csc(at, outGate, R_MIN, 1);
  const head = [...out.segs, ...(turning(toGate) <= LOOP ? toGate : [])];
  return { path: pathOf([...head, ...onto(outGate, lane)]), split: lenOf(head) };
}

/** The gate pose (heading in) and the aisle pose past the join (heading toward the bay's column). */
function aisleFrame(via: readonly Pt[], slot: Pose): { gate: Pose; aisle: { q: Pose } } {
  const g = via[0]!, join = via[1] ?? g, col = via[2] ?? slot;
  const inward = Math.hypot(join.x - g.x, join.y - g.y) > SAME_LINE ? Math.atan2(join.y - g.y, join.x - g.x) : Math.atan2(col.y - g.y, col.x - g.x);
  const along = slot.x >= join.x ? 0 : Math.PI;
  const u = unit(along);
  return { gate: { x: g.x, y: g.y, a: Number.isFinite(inward) ? inward : 0 }, aisle: { q: { x: join.x + u.x * R_MIN, y: join.y + u.y * R_MIN, a: along } } };
}
