/**
 * Moving cars and the moves played off their lanes (docs/inkroad-vehicle-model.md "Phase B, round 3"): a car parking,
 * pulling out, waiting at a lane edge, coming out of a building or turning round on the road is a body in the way of
 * the traffic wherever it really is (src/sim/sweeps.ts), not only where the sim holds its point. A driver looks
 * along its way ahead; where its own body would touch such a body, now or where the move will still pass, that is
 * its leader, standing.
 */
import { nextTrack } from './path';
import { IDM } from './tune';
import type { Played } from './vehicle/played';
import type { Sim } from './sim';
import { poseAt, type Pose, type Track } from './track';
import { bodiesOverlap, sizeOf, type Body } from './vehicleSize';
import type { SweepBody } from './sweeps';
import { VEHICLES } from './constants';
import type { VehicleKind } from './types';

/** Px between the poses checked along the way ahead, and px of clearance a passing body keeps. */
const STEP_PX = 3, CLEAR = 0.3;
const P: Pose = { x: 0, y: 0, h: 0, z: 0 };
const WID: readonly number[] = VEHICLES.map((k) => sizeOf(k as VehicleKind).wid);

interface Group { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly list: SweepBody[] }
let tick = -1;
let groups: Group[] = [];

/** The bodies of every move under way this step, by move, each with its box (once per step). */
function bodies(sim: Sim): readonly Group[] {
  if (tick === sim.tick) return groups;
  tick = sim.tick;
  const by = new Map<number, SweepBody[]>();
  for (const b of sim.sweeps.bodiesNow(sim.time)) (by.get(b.id) ?? by.set(b.id, []).get(b.id)!).push(b);
  groups = [...by.values()].map((list) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of list) { const r = (b.len + b.wid) / 2; x0 = Math.min(x0, b.x - r); y0 = Math.min(y0, b.y - r); x1 = Math.max(x1, b.x + r); y1 = Math.max(y1, b.y + r); }
    return { x0, y0, x1, y1, list };
  });
  return groups;
}

/** Px car i's middle may still travel along its way before its body touches a move's body (Infinity: none within `reach`). */
export function sweepGap(sim: Sim, i: number, reach: number): number {
  const all = bodies(sim);
  if (all.length === 0) return Infinity;
  const c = sim.cars;
  const x = c.x[i]!, y = c.y[i]!, self = -c.uid[i]!, r = reach + 12;
  const near: SweepBody[] = [];
  for (const g of all) {
    if (x < g.x0 - r || x > g.x1 + r || y < g.y0 - r || y > g.y1 + r || g.list[0]!.id === self) continue;
    for (const b of g.list) if (Math.abs(b.x - x) < reach + 30 && Math.abs(b.y - y) < reach + 30) near.push(b);
  }
  if (near.length === 0) return Infinity;
  const len = c.body[i]! * 2, wid = WID[c.kind[i]!]!;
  // A car already touching one that only waits there (at a lane edge) beside or behind it drives on out of it: stopping would lock both.
  const h = c.heading[i]!;
  const here: Body = { x, y, a: h, len, wid };
  const behind = (b: Body): boolean => (b.x - x) * Math.cos(h) + (b.y - y) * Math.sin(h) < len / 4;
  // Where a move will still pass a car already stands (it came after the move set out) is no wall for it: it drives on out.
  const ahead = near.filter((b) => !((b.future || (b.held && behind(b))) && bodiesOverlap(here, b)));
  if (ahead.length === 0) return Infinity;
  let t: Track | null = c.track[i]!;
  let s = c.s[i]!, d = 0;
  for (let hop = 0; t && hop < 5 && d <= reach; hop++) {
    for (; s <= t.len && d <= reach; s += STEP_PX, d += STEP_PX) {
      poseAt(t, s, P);
      const me: Body = { x: P.x, y: P.y, a: P.h, len, wid };
      if (ahead.some((b) => bodiesOverlap(me, { ...b, len: b.len + 2 * CLEAR, wid: b.wid + 2 * CLEAR }))) return Math.max(0, d - STEP_PX);
    }
    d -= s - t.len;
    s -= t.len;
    t = nextTrack(sim, i, t);
  }
  return Infinity;
}

/** Frames between two poses of a move checked against the cars coming. */
const COMING_EVERY = 6;

/**
 * Could every car on the road near a move still stop short of it? Each moving car's body is stretched over the road
 * it needs to stop at the planned braking, and the move's poses must clear those (a move never starts in front of a
 * car that could not stop for it, wherever that car comes from: a lane, a junction's turn, a ring).
 */
export function comingClear(sim: Sim, m: Played, len: number, wid: number, self: number): boolean {
  const c = sim.cars;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < m.n; k += COMING_EVERY) { const x = m.frames[k * 3]!, y = m.frames[k * 3 + 1]!; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  for (let q = 0; q < c.count; q++) {
    if (!c.alive[q] || c.state[q] === 4 || c.uid[q] === self || c.z[q] !== 0) continue;
    const v = c.speed[q]!;
    if (v < 1) continue;
    const stop = (v * v) / (2 * IDM.brake) + IDM.standGap;
    const x = c.x[q]!, y = c.y[q]!;
    if (x < x0 - stop - 30 || x > x1 + stop + 30 || y < y0 - stop - 30 || y > y1 + stop + 30) continue;
    const a = c.heading[q]!, b = c.body[q]! * 2;
    const reach: Body = { x: x + (Math.cos(a) * stop) / 2, y: y + (Math.sin(a) * stop) / 2, a, len: b + stop, wid: WID[c.kind[q]!]! };
    for (let k = 0; k < m.n; k += COMING_EVERY) {
      if (bodiesOverlap(reach, { x: m.frames[k * 3]!, y: m.frames[k * 3 + 1]!, a: m.frames[k * 3 + 2]!, len, wid })) return false;
    }
  }
  return true;
}
