/** Circulating lanes and the connections from approach lanes to exits. */
import { angleDiff, curve, dist } from './geom';
import { armHeading, ringLaneCount, ringRadius } from './netCore';
import { ARC_T, ENTRY_T, EXIT_T, SPAN_T, Track } from './track';
import { capsOf, lowestCap } from './trackCaps';
import { cornerTurn } from './vehicle/turns';
import { ROAD_R } from './vehicle/shift';
import { LANE } from './constants';
import { RING } from './tune';
import { addTrack, type LinkRt, type NodeRt, type World } from './world';
import type { Pt } from './types';

export interface RingArm {
  readonly road: number;
  /** In and out link, if traffic may use them. */
  readonly inL: LinkRt | null;
  readonly outL: LinkRt | null;
  entries: Track[];
  exits: Track[];
  /** Ring under the arm (exit point to entry point) and from its entry to the next arm's exit. */
  spans: Track[];
  arcs: Track[];
}

export interface RingRt {
  readonly arms: RingArm[];
  readonly tracks: readonly Track[];
  /** Most cars allowed on it at once. */
  readonly max: readonly number[];
}

const SPREAD = 0.65; // radians from the arm to its entry and exit points (room for an entry at the road radius)
const SPREAD_SHARE = 0.42;
const STEPS = 10;

function arcLine(c: Pt, r: number, from: number, to: number): Pt[] {
  const n = Math.max(3, Math.ceil((Math.abs(from - to) * r) / 3));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
}

/** Share of a ring join's turn made in its clothoids: longer than a road turn's, so the wheels swing into the ring's S at a car's rate. */
const JOIN_SHARE = 0.65;

/** Px between the points of an entry or exit: its curvature is what the drawn car steers by. */
const JOIN_STEP = 1;

/**
 * Onto or off the ring: clothoid, arc, clothoid as wide as the corner allows (src/sim/vehicle/turns.ts cornerTurn),
 * else the old curve. Its end meets the ring's curvature with a step the drawn car's wheels take at their own rate
 * (a curvature-continuous quintic join was tried: on these small rings it only moves the S to the join's end).
 */
function joinLine(p0: Pt, h0: number, p1: Pt, h1: number): Pt[] {
  const c = cornerTurn({ x: p0.x, y: p0.y, th: h0 }, { x: p1.x, y: p1.y, th: h1 }, ROAD_R, 0, JOIN_SHARE);
  return c ? c.pts.map((q) => ({ x: q.x, y: q.y })) : curve(p0, h0, p1, h1, STEPS, dist(p0, p1) * 0.4);
}

/** Its speed under its own curve and steering caps (src/sim/trackCaps.ts). */
function capTrack(t: Track): void {
  t.caps = capsOf(t, t.vmax);
  t.vmax = lowestCap(t.caps, t.vmax);
}

const joinPaces = new WeakMap<Track, number>();

/** Mean pace along a join for gap prediction. Driving uses each bend's local cap. */
export const ringJoinPace = (t: Track): number => joinPaces.get(t) ?? t.vmax;

function capJoin(t: Track): void {
  t.caps = capsOf(t, t.vmax);
  if (!t.caps) return;
  const travel = t.caps.reduce((sum, cap) => sum + 1 / Math.max(1, cap), 0);
  joinPaces.set(t, t.caps.length / travel);
}

/** Cars go round with the angle falling (anticlockwise on screen); this is the heading at an angle. */
const ringHeading = (a: number): number => a - Math.PI / 2;
const onRing = (c: Pt, r: number, a: number): Pt => ({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });

interface ArmAngles { exit: number; entry: number }

/** Arms in driving order, with the angles where cars leave and join. */
function armAngles(headings: readonly number[]): ArmAngles[] {
  const n = headings.length;
  const gapAfter = headings.map((h, i) => {
    const next = headings[(i + 1) % n]!;
    const g = (h - next + 4 * Math.PI) % (2 * Math.PI);
    return n === 1 || g < 0.01 ? 2 * Math.PI : g;
  });
  return headings.map((h, i) => ({
    entry: h - Math.min(SPREAD, gapAfter[i]! * SPREAD_SHARE),
    exit: h + Math.min(SPREAD, gapAfter[(i + n - 1) % n]! * SPREAD_SHARE),
  }));
}

export function buildRing(w: World, n: NodeRt): void {
  const roads = n.j.arms.map((a) => w.roadById.get(a)!).filter((r) => !r.flyover);
  const c: Pt = { x: n.j.x, y: n.j.y };
  const r = ringRadius(roads);
  const radii = Array.from({ length: ringLaneCount(roads) }, (_, lane) => r + lane * LANE);
  const sorted = roads.map((road) => ({ road, h: armHeading(road, n.j.id) })).sort((p, q) => angleDiff(0, q.h) - angleDiff(0, p.h) || p.road.id - q.road.id);
  const angles = armAngles(sorted.map((a) => a.h));
  const vmax = n.j.works > 0 ? RING.speed * 0.5 : RING.speed;
  const piece = (key: string, kind: 3 | 4, from: number, to: number, arm: number, lane: number): Track => {
    let end = to;
    while (end >= from - 1e-6) end -= 2 * Math.PI;
    while (from - end > 2 * Math.PI) end += 2 * Math.PI;
    const t = new Track(`R${n.j.id}:${key}:${lane}`, kind, arcLine(c, radii[lane]!, from, end), vmax, { h0: ringHeading(from), h1: ringHeading(end) });
    t.node = n.i;
    t.arm = arm;
    t.lane = lane;
    capTrack(t);
    return addTrack(w, t);
  };
  const arms: RingArm[] = sorted.map(({ road }, i) => {
    const a = angles[i]!, next = angles[(i + 1) % angles.length]!;
    return {
      road: road.id,
      inL: n.ins.find((l) => l.road.id === road.id) ?? null, outL: n.outs.find((l) => l.road.id === road.id) ?? null,
      entries: [], exits: [],
      spans: radii.map((_, lane) => piece(`S${road.id}`, SPAN_T, a.exit, a.entry, i, lane)),
      arcs: radii.map((_, lane) => piece(`A${road.id}:${sorted[(i + 1) % sorted.length]!.road.id}`, ARC_T, a.entry, next.exit, i, lane)),
    };
  });
  arms.forEach((arm, i) => {
    radii.forEach((radius, lane) => {
      arm.spans[lane]!.to = arm.arcs[lane]!;
      arm.arcs[lane]!.to = arms[(i + 1) % arms.length]!.spans[lane]!;
      entriesAndExits(w, n, arm, angles[i]!, c, radius, i, lane, vmax);
    });
  });
  n.ring = { arms, tracks: arms.flatMap((arm) => [...arm.spans, ...arm.arcs, ...arm.entries, ...arm.exits]), max: radii.map((radius) => Math.max(2, Math.floor((2 * Math.PI * radius) / RING.perCar))) };
  wireOptions(n);
}

function entriesAndExits(w: World, n: NodeRt, arm: RingArm, a: ArmAngles, c: Pt, r: number, i: number, ringLane: number, vmax: number): void {
  const join = onRing(c, r, a.entry), leave = onRing(c, r, a.exit);
  const span = arm.spans[ringLane]!, arc = arm.arcs[ringLane]!;
  const entries: Track[] = [];
  for (const lane of arm.inL?.lanes ?? []) {
    const p = lane.end();
    const t = new Track(`E${arm.inL!.link.id}:${lane.lane}:${ringLane}`, ENTRY_T, joinLine(p, lane.h1, join, ringHeading(a.entry)), vmax, { h0: lane.h1, h1: ringHeading(a.entry), step: JOIN_STEP });
    Object.assign(t, { node: n.i, arm: i, lane: ringLane, from: lane, to: arc });
    capJoin(t);
    entries.push(addTrack(w, t));
  }
  arm.entries.push(...entries);
  span.merge = entries;
  for (const e of entries) e.merge = [span, ...entries.filter((q) => q !== e)];

  const out = arm.outL;
  if (!out) return;
  const lane = out.lanes[ringLane === 0 ? 0 : out.carLanes - 1]!;
  const p = lane.start();
  const t = new Track(`X${out.link.id}:${ringLane}`, EXIT_T, joinLine(leave, ringHeading(a.exit), p, lane.h0), vmax, { h0: ringHeading(a.exit), h1: lane.h0, step: JOIN_STEP });
  Object.assign(t, { node: n.i, arm: i, lane: ringLane, to: lane });
  capJoin(t);
  arm.exits.push(addTrack(w, t));
}

function wireOptions(n: NodeRt): void {
  const arms = n.ring!.arms;
  arms.forEach((arm, i) => {
    if (!arm.inL) return;
    const outer = arm.arcs.length - 1;
    for (const o of arm.inL.opts) {
      o.exitArm = arms.findIndex((q) => q.road === o.to.road.id);
      if (o.exitArm < 0) continue;
      const hops = (o.exitArm - i + arms.length) % arms.length || arms.length;
      // A single approach lane can split into both circulating lanes, just as a wide approach can.
      const late = outer > 0 && hops > 1 && (hops > 2 || o.uTurn || o.turn < -0.5);
      const through = outer > 0 && arm.inL.carLanes >= 2 && hops > 1 && o.to.carLanes >= 2 && Math.abs(o.turn) <= 0.5;
      o.lo = outer > 0 && hops === 1 ? arm.inL.carLanes - 1 : 0;
      o.hi = late ? 0 : arm.inL.carLanes - 1;
      for (const lane of arm.inL.lanes) {
        // Drivers still aim for the inner approach lane. A missed lane change can use the protected inner entry.
        const ringLane = late || (through && lane.lane === 0) ? 0 : outer;
        o.conn[lane.lane] = arm.entries.find((e) => e.lane === ringLane && e.from === lane) ?? null;
      }
      o.delay = 0.6 + hops * 0.7;
    }
  });
}

export const ringExit = (arm: RingArm, lane: number): Track => arm.exits.find((t) => t.lane === lane)!;

/** The reserved portion of a movement, including its exit across the outer lane. */
const ways = new WeakMap<Track, Map<Track, readonly Track[]>>();
export function ringWay(from: Track, exit: Track): readonly Track[] {
  let byExit = ways.get(from);
  if (!byExit) { byExit = new Map(); ways.set(from, byExit); }
  const known = byExit.get(exit);
  if (known) return known;
  const path = [from];
  let at = from;
  while (at !== exit) {
    at = at.kind === ARC_T && at.to!.arm === exit.arm ? exit : at.to!;
    path.push(at);
  }
  byExit.set(exit, path);
  return path;
}

/** Where the last possible body conflict with the other track ends on this track. */
const conflicts = new WeakMap<Track, Map<Track, number>>();
export function ringConflictEnd(a: Track, b: Track): number {
  let row = conflicts.get(a);
  if (!row) { row = new Map(); conflicts.set(a, row); }
  const known = row.get(b);
  if (known !== undefined) return known;
  // Near parallel tracks are a full lane apart. Reserve intersecting paths with room for a car's width and overhang.
  const clearance = (LANE * 0.9) ** 2;
  let end = -Infinity;
  for (let i = a.n; i >= 0; i--) {
    if (b.xs.some((x, j) => (a.xs[i]! - x) ** 2 + (a.ys[i]! - b.ys[j]!) ** 2 < clearance)) {
      end = i / a.inv;
      break;
    }
  }
  row.set(b, end);
  return end;
}
