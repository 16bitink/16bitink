/** Carrying every car over to a new network: same place if it still exists, else the nearest lane, else home. */
import { angleDiff, pointAt, project } from './geom';
import { giveUp, plan, pose } from './motion';
import { ENTRY_T, LANE_T, TURN_T, nearest, type Track } from './track';
import type { Sim } from './sim';
import { closedForWorks } from './roadGeom';
import type { World } from './world';
import type { Access, Network } from './trafficTypes';
import type { Road } from './types';

const SAME = 1.5; // px
const FAR = 70;
const TURNED = 1.3; // radians
const LEVEL = 14; // px of height
const DEST_FAR = 70;
const SLIDE = 36;

interface Was { readonly i: number; readonly t: Track; readonly s: number; readonly granted: boolean; readonly optKey: string | null; readonly outKey: string | null; readonly exitKey: string | null }

/** Where a place on the old network is on the new one. */
export function remapAccess(old: Network, w: World, a: Access): Access | null {
  if ('gate' in a) return w.nodeById.has(a.gate) ? a : null;
  const before = old.roads.find((r) => r.id === a.road);
  const now = w.roadById.get(a.road);
  if (before && now && before.line === now.line) return a;
  if (!before) return now ? a : null;
  return nearestRoadPoint(w, pointAt(before.line, a.s), () => true);
}

/** The nearest place on a ground road that `ok` allows, within DEST_FAR. */
function nearestRoadPoint(w: World, p: { x: number; y: number }, ok: (r: Road) => boolean): Access | null {
  let best: Access | null = null, bestD = DEST_FAR;
  for (const r of w.net.roads) {
    if (r.flyover || !ok(r)) continue;
    const at = project(r.line, p);
    if (at.d < bestD) { best = { road: r.id, s: at.s }; bestD = at.d; }
  }
  return best;
}

/** A trip's end on a road under works moves to the nearest open road, as if the road were gone. */
function openEnd(w: World, a: Access): Access | null {
  if ('gate' in a) return a;
  const r = w.roadById.get(a.road);
  if (!r || !closedForWorks(r)) return a;
  return nearestRoadPoint(w, pointAt(r.line, a.s), (q) => !closedForWorks(q));
}

const sameTrack = (p: Track, q: Track): boolean =>
  Math.abs(p.len - q.len) < SAME && Math.abs(p.xs[0]! - q.xs[0]!) < SAME && Math.abs(p.ys[0]! - q.ys[0]!) < SAME
  && Math.abs(p.xs[p.n]! - q.xs[q.n]!) < SAME && Math.abs(p.ys[p.n]! - q.ys[q.n]!) < SAME;

/** Shifts tried when somebody already stands there: back along the queue first. */
const SHIFTS = [0, -4, -8, 4, -12, -18, 8, -24, -32, 14, -40, 20, -50, -60];
const END = 0.5;

function nearestLane(w: World, x: number, y: number, h: number, z: number, taken: (t: Track, s: number) => boolean): { t: Track; s: number } | null {
  let best: { t: Track; s: number } | null = null, bestD = FAR;
  // Closed lanes count too: a car on a road that has just closed stays on it, and drives off it.
  for (const l of w.links) {
    for (const t of l.lanes) {
      const n = nearest(t, x, y);
      const turned = Math.abs(angleDiff(n.h, h));
      if (n.d > bestD || turned > TURNED || Math.abs(n.z - z) > LEVEL) continue;
      for (const shift of SHIFTS) {
        const s = Math.min(n.s, t.len - END) + shift, d = n.d + turned * 12 + Math.abs(shift);
        if (d >= bestD || s < 0 || s > t.len - END || taken(t, s)) continue;
        best = { t, s };
        bestD = d;
        break;
      }
    }
  }
  return best;
}

function overlaps(sim: Sim, i: number, t: Track, s: number): boolean {
  const c = sim.cars;
  for (let q = t.head; q >= 0; q = c.behind[q]!) if (Math.abs(c.s[q]! - s) < c.half[q]! + c.half[i]! + 0.6) return true;
  return false;
}

/** Keep a car exactly where it is, with its right of way, if the new network has the same track there. */
function keep(sim: Sim, was: Was): boolean {
  const { cars: c, world: w } = sim;
  const t = w.byKey.get(was.t.key);
  if (!t || !sameTrack(t, was.t) || overlaps(sim, was.i, t, was.s)) return false;
  if (t.kind === LANE_T && !was.granted) { c.insert(was.i, t, was.s); return true; }
  const opt = was.optKey ? w.optByKey.get(was.optKey) : undefined;
  if (!opt) return false;
  // Its way on runs into a road that has just closed: at the line it asks again (inside the junction it goes on, then off).
  if (t.kind === LANE_T && opt.to.closed && !opt.from.closed) { c.insert(was.i, t, was.s); return true; }
  const exit = was.exitKey ? w.byKey.get(was.exitKey) : null, out = was.outKey ? w.byKey.get(was.outKey) : null;
  const ring = t.kind !== LANE_T && t.kind !== TURN_T;
  if ((ring && !exit) || (was.outKey && !out)) return false;
  const way = t.kind === LANE_T ? opt.conn[t.lane] : null;
  // The junction ahead is another kind now: ask again.
  if (t.kind === LANE_T && (!way || (way.kind === ENTRY_T && !exit))) { c.insert(was.i, t, was.s); return true; }
  c.insert(was.i, t, was.s);
  c.opt[was.i] = opt;
  c.link[was.i] = opt.from.i;
  c.exitBy[was.i] = exit ?? null;
  c.outTo[was.i] = out ?? null;
  c.granted[was.i] = was.granted ? 1 : 0;
  if (out) out.incoming += c.need(was.i);
  const occ = t.kind === LANE_T ? opt.conn[t.lane]!.occ : t.occ;
  occ.push(was.i);
  return true;
}

function snapshot(sim: Sim): Was[] {
  const c = sim.cars;
  const all: Was[] = [];
  for (const t of sim.world.tracks) {
    for (let i = t.head; i >= 0; i = c.behind[i]!) {
      all.push({ i, t, s: c.s[i]!, granted: c.granted[i] === 1, optKey: c.opt[i]?.key ?? null, outKey: c.outTo[i]?.key ?? null, exitKey: c.exitBy[i]?.key ?? null });
    }
  }
  return all;
}

/** Cars that fit nowhere go home. */
export function relocate(sim: Sim, next: World): void {
  const c = sim.cars;
  const old = sim.world.net;
  const all = snapshot(sim);
  carryLights(sim.world, next);
  sim.world = next;
  sim.routes.reset();
  for (const { i } of all) {
    c.track[i] = null;
    c.ahead[i] = c.behind[i] = -1;
    c.granted[i] = 0;
    c.opt[i] = c.outTo[i] = c.exitBy[i] = null;
  }
  sim.services.remap((a) => remapAccess(old, next, a));
  const moved: number[] = [];
  for (const was of all) {
    if (!keep(sim, was)) moved.push(was.i);
  }
  for (const i of moved) {
    const at = nearestLane(next, c.x[i]!, c.y[i]!, c.heading[i]!, c.z[i]!, (t, s) => overlaps(sim, i, t, s));
    if (!at) { giveUp(sim, i); continue; }
    c.insert(i, at.t, at.s);
    c.forget(i);
    c.slideFrom(i, c.rx[i]!, c.ry[i]!, SLIDE);
  }
  for (const { i } of all) if (c.alive[i]) replan(sim, i, old);
}

function replan(sim: Sim, i: number, old: Network): void {
  const { cars: c, world: w } = sim;
  if (c.state[i]! >= 2) { c.link[i] = c.track[i]!.link; return; }
  const to: Access = c.destNode[i]! >= 0 ? { gate: c.destNode[i]! } : { road: c.destRoad[i]!, s: c.destS[i]! };
  const moved = remapAccess(old, w, to);
  const now = moved && openEnd(w, moved);
  if (!now) { giveUp(sim, i); return; }
  if ('road' in now) { c.destRoad[i] = now.road; c.destS[i] = now.s; }
  const t = c.track[i]!;
  if (t.kind !== LANE_T || c.granted[i]) return;
  plan(sim, i, w.links[t.link]!);
  c.ticket[i] = 0;
  pose(sim, i);
}

function carryLights(old: World, next: World): void {
  for (const n of next.nodes) {
    const o = old.nodeById.get(n.j.id);
    if (!o || o.kind !== 'signal' || n.kind !== 'signal' || o.phases.length !== n.phases.length) continue;
    n.phase = o.phase;
    n.light = o.light;
    n.lightFor = o.lightFor;
    n.nextPhase = o.nextPhase;
  }
  for (const l of next.links) {
    const o = old.linkById.get(l.link.id);
    if (o) l.time = Math.max(l.freeTime, o.time);
  }
}
