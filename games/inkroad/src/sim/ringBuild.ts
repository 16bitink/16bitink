/** A roundabout as a real ring: one lane round, entries that give way, exits, and right-turn slips on wide roads. */
import { angleDiff, curve, dist } from './geom';
import { armHeading, ringRadius } from './netCore';
import { ARC_T, ENTRY_T, EXIT_T, SPAN_T, TURN_T, Track, limitSpin } from './track';
import { RING } from './tune';
import { addTrack, type LinkRt, type NodeRt, type World } from './world';
import type { Pt } from './types';

export interface RingArm {
  readonly road: number;
  readonly angle: number;
  /** In and out link, if traffic may use them. */
  readonly inL: LinkRt | null;
  readonly outL: LinkRt | null;
  /** Per approach lane. */
  entries: Track[];
  /** Per out lane. */
  exits: Track[];
  /** Ring under the arm (exit point to entry point) and from its entry to the next arm's exit. */
  span: Track;
  arc: Track;
}

export interface RingRt {
  readonly arms: RingArm[];
  /** Most cars allowed on it at once. */
  readonly max: number;
}

const SPREAD = 0.5; // radians from the arm to its entry and exit points
const SPREAD_SHARE = 0.4;
const STEPS = 10;

function arcLine(c: Pt, r: number, from: number, to: number): Pt[] {
  const n = Math.max(3, Math.ceil((Math.abs(from - to) * r) / 3));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
}

/** Cars go round with the angle falling (anticlockwise on screen); this is the heading at an angle. */
const ringHeading = (a: number): number => a - Math.PI / 2;
const onRing = (c: Pt, r: number, a: number): Pt => ({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });

interface ArmAngles { angle: number; exit: number; entry: number }

/** Arms in driving order, with the angles where cars leave and join. */
function armAngles(headings: readonly number[]): ArmAngles[] {
  const n = headings.length;
  const gapAfter = headings.map((h, i) => {
    const next = headings[(i + 1) % n]!;
    const g = (h - next + 4 * Math.PI) % (2 * Math.PI);
    return n === 1 || g < 0.01 ? 2 * Math.PI : g;
  });
  return headings.map((h, i) => ({
    angle: h,
    entry: h - Math.min(SPREAD, gapAfter[i]! * SPREAD_SHARE),
    exit: h + Math.min(SPREAD, gapAfter[(i + n - 1) % n]! * SPREAD_SHARE),
  }));
}

export function buildRing(w: World, n: NodeRt): void {
  const roads = n.j.arms.map((a) => w.roadById.get(a)!).filter((r) => !r.flyover);
  const c: Pt = { x: n.j.x, y: n.j.y };
  const r = ringRadius(roads);
  const sorted = roads.map((road) => ({ road, h: armHeading(road, n.j.id) })).sort((p, q) => angleDiff(0, q.h) - angleDiff(0, p.h) || p.road.id - q.road.id);
  const angles = armAngles(sorted.map((a) => a.h));
  const vmax = n.j.works > 0 ? RING.speed * 0.5 : RING.speed;
  const piece = (key: string, kind: 3 | 4, from: number, to: number, arm: number): Track => {
    let end = to;
    while (end >= from - 1e-6) end -= 2 * Math.PI;
    while (from - end > 2 * Math.PI) end += 2 * Math.PI;
    const t = new Track(`R${n.j.id}:${key}`, kind, arcLine(c, r, from, end), vmax, { h0: ringHeading(from), h1: ringHeading(end) });
    t.node = n.i;
    t.arm = arm;
    return addTrack(w, t);
  };
  const arms: RingArm[] = sorted.map(({ road }, i) => {
    const a = angles[i]!, next = angles[(i + 1) % angles.length]!;
    return {
      road: road.id, angle: a.angle,
      inL: n.ins.find((l) => l.road.id === road.id) ?? null, outL: n.outs.find((l) => l.road.id === road.id) ?? null,
      entries: [], exits: [],
      span: piece(`S${road.id}`, SPAN_T, a.exit, a.entry, i), arc: piece(`A${road.id}:${sorted[(i + 1) % sorted.length]!.road.id}`, ARC_T, a.entry, next.exit, i),
    };
  });
  arms.forEach((arm, i) => {
    arm.span.to = arm.arc;
    arm.arc.to = arms[(i + 1) % arms.length]!.span;
    entriesAndExits(w, n, arm, angles[i]!, c, r, i);
  });
  n.ring = { arms, max: Math.max(2, Math.floor((2 * Math.PI * r) / RING.perCar)) };
  wireOptions(w, n);
}

function entriesAndExits(w: World, n: NodeRt, arm: RingArm, a: ArmAngles, c: Pt, r: number, i: number): void {
  const join = onRing(c, r, a.entry), leave = onRing(c, r, a.exit);
  for (const lane of arm.inL?.lanes ?? []) {
    const p = lane.end();
    const t = new Track(`E${arm.inL!.link.id}:${lane.lane}`, ENTRY_T, curve(p, lane.h1, join, ringHeading(a.entry), STEPS, dist(p, join) * 0.4), RING.speed, { h0: lane.h1, h1: ringHeading(a.entry) });
    Object.assign(t, { node: n.i, arm: i, from: lane, to: arm.arc });
    limitSpin(t);
    arm.entries.push(addTrack(w, t));
  }
  for (const lane of arm.outL?.lanes ?? []) {
    const p = lane.start();
    const t = new Track(`X${arm.outL!.link.id}:${lane.lane}`, EXIT_T, curve(leave, ringHeading(a.exit), p, lane.h0, STEPS, dist(p, leave) * 0.4), RING.speed, { h0: ringHeading(a.exit), h1: lane.h0 });
    Object.assign(t, { node: n.i, arm: i, to: lane });
    limitSpin(t);
    arm.exits.push(addTrack(w, t));
  }
  arm.span.merge = arm.entries;
  for (const e of arm.entries) e.merge = [arm.span, ...arm.entries.filter((q) => q !== e)];
}

/** Right-hand neighbours on wide roads get a slip lane outside the ring. */
function slip(w: World, n: NodeRt, from: LinkRt, to: LinkRt): Track | null {
  if (from.carLanes < 2 || to.carLanes < 2) return null;
  const a = from.lanes[from.carLanes - 1]!, b = to.lanes[to.carLanes - 1]!;
  const turn = angleDiff(a.h1, b.h0);
  if (turn < 0.5 || turn > 2.2) return null;
  const t = new Track(`C${from.link.id}>${to.link.id}:slip`, TURN_T, curve(a.end(), a.h1, b.start(), b.h0, STEPS), RING.speed * 1.1, { h0: a.h1, h1: b.h0 });
  Object.assign(t, { node: n.i, from: a, to: b, free: true });
  limitSpin(t);
  n.turns.push(t);
  return addTrack(w, t);
}

function wireOptions(w: World, n: NodeRt): void {
  const arms = n.ring!.arms;
  arms.forEach((arm, i) => {
    if (!arm.inL) return;
    for (const o of arm.inL.opts) {
      o.exitArm = arms.findIndex((q) => q.road === o.to.road.id);
      arm.entries.forEach((e, lane) => { o.conn[lane] = e; });
      const hops = (o.exitArm - i + arms.length) % arms.length || arms.length;
      o.delay = 0.6 + hops * 0.7;
      if (hops !== 1) continue;
      const s = slip(w, n, arm.inL, o.to);
      if (s) o.conn[arm.inL.carLanes - 1] = s;
    }
  });
}

/** The lane a car leaves the ring in: never the slip's lane on wide roads. */
export function ringExitLane(arm: RingArm): Track {
  const open = arm.outL!.carLanes;
  const n = open > 2 ? open - 1 : 1;
  let best = arm.exits[0]!;
  for (let k = 1; k < n; k++) {
    const t = arm.exits[k]!;
    if (t.to!.count + t.count < best.to!.count + best.count) best = t;
  }
  return best;
}
