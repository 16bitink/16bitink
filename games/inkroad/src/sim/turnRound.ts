import { angleTo, arc, csc, LOOP, segAt, straight, turning, type Pose, type Seg } from './drivePath';
import { R_MIN } from './kinematics';
import type { Pt } from './types';

/**
 * The track a car turning round at a dead end takes in the sim (src/sim/nodeBuild.ts): a forward U where the two
 * lanes lie 2 R_MIN apart, else a three-point turn. It gives the turn its place and length for the sim's one car at
 * a time; the drawn car plays a Reeds–Shepp turn planned on the road's ground (src/sim/turning.ts). Pure.
 */

/** A parallel S may turn this much more than its two bends (rad). */
const SKEW_SLACK = 0.15;
/** Sideways px below which two poses share a line. */
const SAME_LINE = 0.5;
/** Bisection steps for the three-point turn's first leg. */
const K_STEPS = 40;

const endOf = (segs: readonly Seg[], fallback: Pose): Pose => {
  const s = segs[segs.length - 1];
  if (!s) return fallback;
  const e = segAt(s, s.len);
  return { x: e.x, y: e.y, a: s.dir > 0 ? e.h : e.h + Math.PI };
};

/** Lane line through `line` with heading `a`: px sideways of point p from it. */
const sideOf = (line: Pt, a: number, p: Pt): number => (p.x - line.x) * -Math.sin(a) + (p.y - line.y) * Math.cos(a);

/** From a pose to another: a straight when they share a line, else the gentler of the forward and reverse CSC words. */
function onto(from: Pose, to: Pose): Seg[] {
  if (Math.abs(sideOf(from, from.a, to)) < SAME_LINE && Math.abs(angleTo(from.a, to.a)) < 1e-3) return [straight(from.x, from.y, from.a, to)];
  const ahead = (to.x - from.x) * Math.cos(from.a) + (to.y - from.y) * Math.sin(from.a) >= 0;
  const first = csc(from, to, R_MIN, ahead ? 1 : -1);
  if (turning(first) <= LOOP) return first;
  const other = csc(from, to, R_MIN, ahead ? -1 : 1);
  return turning(other) < turning(first) ? other : first;
}

/** Forward, back and forward again on R_MIN arcs ending facing the other way `d` px to its side. */
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
  let lo = 0.05, hi = Math.PI / 2 - 0.01;
  for (let i = 0; i < K_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (way * sideOf(from, from.a, endOf(legs(mid), from)) < Math.abs(d)) lo = mid; else hi = mid;
  }
  return legs((lo + hi) / 2);
}

/** Turning round where a road ends, from the end of one lane to the start of the lane back. `three` says which. */
export function turnRound(from: Pose, to: Pose): { segs: Seg[]; three: boolean } {
  const d = sideOf(from, from.a, to);
  if (Math.abs(d) >= 2 * R_MIN) {
    const u = csc(from, to, R_MIN, 1);
    if (turning(u) <= Math.PI + SKEW_SLACK) return { segs: u, three: false };
  }
  const k = kTurnTo(from, d);
  return { segs: [...k, ...onto(endOf(k, from), to)], three: true };
}
