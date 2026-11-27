/** Putting cars on the road: driveways, gates, breakdowns. */
import { hash01 } from './rng';
import { plan } from './motion';
import { DRIVEWAY, IDM } from './tune';

/** A pull-out from the kerb is a forward S this many driveway lengths long: its bend stays near R_MIN, never a sideways hop. */
const PULL_OUT_STRETCH = 2;
import { pose } from './motion';
import { LANE_T, POSE_ZERO, poseAt, type Track } from './track';
import { laneS, type LinkRt } from './world';
import { runsWith, startLinks } from './routes';
import type { Sim } from './sim';
import type { Access } from './trafficTypes';

const ENTRY_SPEED = 14;
const DRIVER_SPEED = 0.08;
const DRIVER_GAP = 0.18;
const MERGE_TIME = 0.75;

/** Is there space at s for a car of half-length h moving at v? */
export function spaceAt(sim: Sim, t: Track, s: number, h: number, v: number): boolean {
  const c = sim.cars;
  for (let q = t.head; q >= 0; q = c.behind[q]!) {
    const d = c.s[q]! - s;
    const gap = Math.abs(d) - c.half[q]! - h;
    if (d >= 0 ? gap < IDM.standGap : gap < IDM.standGap + Math.max(0, c.v[q]! - v) * MERGE_TIME) return false;
  }
  return true;
}

export function setDest(sim: Sim, i: number, to: Access): void {
  const c = sim.cars;
  if ('gate' in to) { c.destNode[i] = to.gate; c.destRoad[i] = -1; c.destS[i] = 0; c.destDir[i] = 0; }
  else { c.destRoad[i] = to.road; c.destNode[i] = -1; c.destS[i] = to.s; c.destDir[i] = to.dir ?? 0; }
}

/** Does the destination still exist? */
export function exists(sim: Sim, a: Access): boolean {
  return 'gate' in a ? sim.world.nodeById.has(a.gate) : sim.world.roadById.has(a.road);
}

/** Best link to set off on, or null when there is no way there. */
export function firstLink(sim: Sim, from: Access, to: Access, value: number, kind: number): LinkRt | null {
  const destRoad = 'road' in to ? to.road : -1, destNode = 'gate' in to ? to.gate : -1;
  const key = sim.routes.keyFor(destRoad, destNode, value, kind, 'road' in to ? to.dir : 0);
  let best: LinkRt | null = null, bestCost = 1e6;
  for (const { l, part } of startLinks(sim.world, from)) {
    let cost = 1e6;
    if ('road' in to && 'road' in from && l.road.id === to.road && runsWith(l, to.dir) && laneS(l, to.s) >= laneS(l, from.s) + 2) cost = 0;
    else for (const o of l.opts) cost = Math.min(cost, l.time * (1 - part) + o.delay + sim.routes.costFrom(key, value, o.to));
    if (cost < bestCost) { best = l; bestCost = cost; }
  }
  return best;
}

/** Without its way (`dir`) when that way cannot be reached from `from` (no way round): the road either way, as before. */
export function reachableTo(sim: Sim, from: Access, to: Access, value: number, kind: number): { from: Access; to: Access } {
  const directed = ('road' in from && !!from.dir) || ('road' in to && !!to.dir);
  if (!directed || firstLink(sim, from, to, value, kind)) return { from, to };
  const loose = (a: Access): Access => ('road' in a && a.dir ? { road: a.road, s: a.s } : a);
  return { from: loose(from), to: loose(to) };
}

/** Can a car on link `l` still get to `to` the way it asks? */
export function reachableFrom(sim: Sim, l: LinkRt | undefined, to: Access, value: number, kind: number): boolean {
  if (!l || !('road' in to) || !to.dir) return true;
  if (l.road.id === to.road && runsWith(l, to.dir)) return true;
  const key = sim.routes.keyFor(to.road, -1, value, kind, to.dir);
  return l.opts.some((o) => sim.routes.costFrom(key, value, o.to) < 1e5);
}

/** Candidate lanes for an entry: kerb lane at driveways; any lane at gates, emptiest first. */
function entryLanes(sim: Sim, l: LinkRt, gate: boolean, bus: boolean): Track[] {
  if (!gate) return [l.lanes[bus ? l.lanes.length - 1 : l.carLanes - 1]!];
  const c = sim.cars;
  const open = l.lanes.slice(0, bus ? l.lanes.length : l.carLanes);
  const room = (t: Track): number => (t.tail < 0 ? t.len + 100 : c.s[t.tail]! - c.half[t.tail]!);
  return open.map((t) => ({ t, r: room(t) })).sort((p, q) => q.r - p.r || p.t.lane - q.t.lane).map((e) => e.t);
}

/**
 * Put car i (already taken) on link l. False = no space now. `still`: it pulls out of a space and stands
 * in the lane first, so it needs a gap a standing car can take (no upstream car close at its speed).
 */
export function place(sim: Sim, i: number, l: LinkRt, from: Access, still = false): boolean {
  const c = sim.cars;
  const gate = 'gate' in from;
  for (const t of entryLanes(sim, l, gate, c.bus[i] === 1)) {
    const s = gate ? c.half[i]! : laneS(l, from.s);
    const v = gate ? t.vmax * 0.8 * sim.speed : still ? 0 : ENTRY_SPEED;
    const q = t.tail;
    const startV = gate && q >= 0 ? Math.min(v, c.v[q]! + Math.max(0, c.s[q]! - s) * 0.4) : v;
    if (!gate && t.incoming > 0 && s - c.half[i]! < t.incoming && (q < 0 || c.s[q]! > s)) continue;
    if (gate ? q >= 0 && c.s[q]! - c.half[q]! - c.len[i]! < IDM.standGap + startV * 0.25 : !spaceAt(sim, t, s, c.half[i]!, v)) continue;
    c.insert(i, t, s);
    c.v[i] = still ? 0 : startV;
    if (!gate && !still) fromKerb(sim, i, t, s);
    drivers(sim, i);
    plan(sim, i, l);
    pose(sim, i);
    return true;
  }
  return false;
}

/** Where a car leaving a space at `from` would stand in its kerb lane on link l (heading along the lane). */
export function entryPose(l: LinkRt, from: Access, bus: boolean): { x: number; y: number; a: number } {
  const t = l.lanes[bus ? l.lanes.length - 1 : l.carLanes - 1]!;
  poseAt(t, 'road' in from ? laneS(l, from.s) : t.len / 2, POSE_ZERO);
  return { x: POSE_ZERO.x, y: POSE_ZERO.y, a: POSE_ZERO.h };
}

/** The car comes out of the driveway: drawn beside the lane and sliding in. */
function fromKerb(sim: Sim, i: number, t: Track, s: number): void {
  const c = sim.cars;
  poseAt(t, s, POSE_ZERO);
  c.slideFrom(i, POSE_ZERO.x - Math.sin(POSE_ZERO.h) * DRIVEWAY.slide, POSE_ZERO.y + Math.cos(POSE_ZERO.h) * DRIVEWAY.slide, POSE_ZERO.h, DRIVEWAY.length * PULL_OUT_STRETCH);
}

/** No two drivers are the same. */
function drivers(sim: Sim, i: number): void {
  const c = sim.cars;
  const uid = c.uid[i]!;
  c.vf[i]! *= 1 + DRIVER_SPEED * (hash01(uid, 1) - 0.5) * 2;
  c.hw[i] = 1 + DRIVER_GAP * (hash01(uid, 2) - 0.5) * 2;
}

/** Swing round to the other side of the same road. False = no other side, or no space there. */
export function turnBack(sim: Sim, i: number): boolean {
  const c = sim.cars;
  const t = c.track[i]!;
  const l = sim.world.links[t.link]!;
  const other = sim.world.links.find((q) => q.road.id === l.road.id && q.i !== l.i);
  if (!other) return false;
  const to = other.lanes[c.bus[i] ? other.lanes.length - 1 : other.carLanes - 1]!;
  const s = to.len * (1 - c.s[i]! / t.len);
  if (!spaceAt(sim, to, s, c.half[i]!, 0)) return false;
  const x = c.x[i]!, y = c.y[i]!, h = c.heading[i]!;
  c.unlink(i);
  c.insert(i, to, s);
  c.v[i] = 0;
  c.slideFrom(i, x, y, h, DRIVEWAY.length * 1.2);
  plan(sim, i, other);
  return true;
}

/** Stand a broken-down or double-parked car near `at`; shifts a little to find space. */
export function standAt(sim: Sim, i: number, at: Access): boolean {
  const c = sim.cars;
  const links = startLinks(sim.world, at);
  for (const shift of [0, 12, -12, 24, -24, 36, -36, 54, -54]) {
    for (const { l } of links) {
      const t = l.lanes[l.carLanes - 1]!;
      const base = 'gate' in at ? t.len * 0.5 : laneS(l, at.s);
      const s = base + shift;
      if (s < c.half[i]! || s > t.len - c.half[i]! || !spaceAt(sim, t, s, c.half[i]!, 0)) continue;
      c.insert(i, t, s);
      c.link[i] = l.i;
      pose(sim, i);
      return true;
    }
  }
  return false;
}

export const onLane = (t: Track | null): t is Track => t !== null && t.kind === LANE_T;
