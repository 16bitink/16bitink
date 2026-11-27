/** Building network values: nodes and roads in, links, arms and radii out. Pure. */
import { MOTION_SWITCHES } from './switches';
import { LANE, ROADS } from './constants';
import { angleDiff, cellPt, dist, lineLength, reverseLine, sameCell, smoothLine, offsetLine } from './geom';
import { backwardLink, forwardLink, halfWidth, laneOffset, lanesPerLink } from './roadGeom';
import type { Cell, Control, Id, Junction, Link, Road, RoadType } from './types';
import type { Network } from './trafficTypes';
import { R_MIN } from './kinematics';

export interface NodeCore {
  readonly id: Id;
  readonly cell: Cell;
  /** Ramp nodes are not on the grid exactly where a vertex is when the road curves. */
  readonly control: Control;
  readonly split: readonly number[];
  readonly gate?: string;
  readonly works: number;
  readonly ramp?: boolean;
}

/** A working copy; each helper returns a new one or fills maps it made itself. */
export interface Draft { nodes: Map<Id, NodeCore>; roads: Map<Id, Road>; nextId: number }

export const KERB_SLOW = 0.82;
export const WORKS_SLOW = 0.6;
/** Outer ring gap and lanes for roundabouts. */
export const RING_EXTRA = 10;
export const RING_EDGE = 3;
const JUNCTION_PAD = 5;
/** Junctions big enough for a R_MIN right turn (with FILLET 15 in src/render/ground/roadShape.ts). */
export const roomyCorners = (): boolean => MOTION_SWITCHES.ROOMY_CORNERS;
const MAX_REACH = 2.1;

export function draftOf(net: Network): Draft {
  const nodes = new Map<Id, NodeCore>();
  for (const j of net.junctions) {
    nodes.set(j.id, {
      id: j.id, cell: j.cell, control: j.control, split: j.split, works: j.works,
      ...(j.gate !== undefined ? { gate: j.gate } : {}), ...(j.ramp ? { ramp: true } : {}),
    });
  }
  return { nodes, roads: new Map(net.roads.map((r) => [r.id, r])), nextId: net.nextId ?? 1 };
}

export interface RoadSeed { readonly cells: readonly Cell[]; readonly type: RoadType; readonly oneWay: boolean; readonly fixed: boolean; readonly bridge: boolean }

export function makeRoad(id: Id, a: Id, b: Id, seed: RoadSeed): Road {
  return {
    id, type: seed.type, a, b, cells: seed.cells, line: smoothLine(seed.cells.map(cellPt)), level: 0,
    links: seed.oneWay ? [forwardLink(id)] : [forwardLink(id), backwardLink(id)], oneWay: seed.oneWay, bridge: seed.bridge,
    busLane: false, kerb: false, toll: false, truckBan: false, works: 0, nightWorks: false, fixed: seed.fixed,
  };
}

export function roadLinks(road: Road): Link[] {
  const out: Link[] = [];
  const works = road.works > 0 && !road.nightWorks;
  const speed = ROADS[road.type].speed * (road.kerb ? KERB_SLOW : 1) * (works ? WORKS_SLOW : 1);
  const lanes = lanesPerLink(road);
  const mid = (laneOffset(road, 0) + laneOffset(road, lanes - 1)) / 2;
  const make = (id: Id, forward: boolean): Link => {
    const base = forward ? road.line : reverseLine(road.line);
    const line = mid === 0 ? [...base] : offsetLine(base, mid);
    return { id, road: road.id, from: forward ? road.a : road.b, to: forward ? road.b : road.a, lanes, line, length: lineLength(base), freeSpeed: speed };
  };
  if (!road.oneWay || road.dir !== -1) out.push(make(forwardLink(road.id), true));
  if (!road.oneWay || road.dir === -1) out.push(make(backwardLink(road.id), false));
  return out;
}

/** Which way a road leaves a node (heading outwards). */
export function armHeading(road: Road, node: Id): number {
  const l = road.line;
  const near = road.a === node ? l[0]! : l[l.length - 1]!;
  let far = near;
  for (let i = 1; i < l.length && dist(near, far) < 4; i++) far = road.a === node ? l[i]! : l[l.length - 1 - i]!;
  return Math.atan2(far.y - near.y, far.x - near.x);
}

/** Clockwise from north: 0..2PI. */
const fromNorth = (h: number): number => (h + Math.PI / 2 + 4 * Math.PI) % (2 * Math.PI);

export function sortArms(node: Id, roads: readonly Road[]): Road[] {
  return [...roads].sort((p, q) => {
    const d = fromNorth(armHeading(p, node) + 1e-6) - fromNorth(armHeading(q, node) + 1e-6);
    return Math.abs(d) > 1e-9 ? d : p.id - q.id;
  });
}

/** Arms that are not a flyover's ramp. */
export const groundArms = (arms: readonly Road[]): Road[] => arms.filter((r) => !r.flyover);

export function ringRadius(arms: readonly Road[]): number {
  return Math.max(0, ...groundArms(arms).map(halfWidth)) + RING_EXTRA;
}
export function ringHasSlip(arms: readonly Road[]): boolean {
  return groundArms(arms).some((r) => lanesPerLink(r) > 1);
}
export function ringOuter(arms: readonly Road[]): number {
  return ringRadius(arms) + LANE / 2 + (ringHasSlip(arms) ? LANE : 0) + RING_EDGE;
}

function junctionRadius(node: NodeCore, arms: readonly Road[]): number {
  const ground = groundArms(arms);
  const widest = Math.max(LANE, ...ground.map(halfWidth));
  if (node.control === 'roundabout' && ground.length >= 3) return ringOuter(ground);
  if (ground.length < 3 || node.ramp) return widest;
  const hs = ground.map((r) => armHeading(r, node.id));
  let need = widest;
  ground.forEach((r, i) => {
    const k = (i + 1) % ground.length;
    const gap = Math.abs(angleDiff(hs[i]!, hs[k]!));
    if (gap > 2.6) return;
    need = Math.max(need, Math.min((halfWidth(r) + halfWidth(ground[k]!)) / 2 / Math.tan(gap / 2), widest * MAX_REACH));
  });
  // A right turn from the rightmost lane is an arc about the corner: its radius is the lane end's distance from the
  // middle less the lane's offset, and a real car needs R_MIN (docs/inkroad-build.md "Car motion rules").
  // Off for now: the bigger junctions cost the bots (nothing lost in year 3, beginner year 6); see the build doc.
  if (!roomyCorners()) return need + JUNCTION_PAD;
  const right = Math.max(...ground.map((r) => laneOffset(r, lanesPerLink(r) - 1)));
  return Math.max(need + JUNCTION_PAD, R_MIN + right);
}

const PAIR = (135 * Math.PI) / 180;
/** Signal phases: opposite arms share one, the others stand alone. Arms that can't enter have no phase. */
export function phaseArms(node: Id, arms: readonly Road[]): Id[][] {
  const entering = groundArms(arms).filter((r) => roadLinks(r).some((l) => l.to === node));
  const left = [...entering];
  const phases: Id[][] = [];
  while (left.length > 0) {
    const r = left.shift()!;
    const h = armHeading(r, node);
    let best = -1, bestGap = PAIR;
    left.forEach((q, i) => {
      const gap = Math.abs(angleDiff(h, armHeading(q, node)));
      if (gap > bestGap) { best = i; bestGap = gap; }
    });
    phases.push(best >= 0 ? [r.id, left.splice(best, 1)[0]!.id] : [r.id]);
  }
  return phases;
}

const evenSplit = (n: number): number[] => Array.from({ length: n }, () => 1 / n);

export function makeJunction(node: NodeCore, roads: readonly Road[]): Junction {
  const arms = sortArms(node.id, roads);
  const p = cellPt(node.cell);
  const n = phaseArms(node.id, arms).length;
  const split = node.split.length === n && n > 0 ? node.split : evenSplit(n);
  return {
    id: node.id, cell: node.cell, x: p.x, y: p.y, control: node.control, arms: arms.map((r) => r.id),
    radius: junctionRadius(node, arms), split, works: node.works,
    ...(node.gate !== undefined ? { gate: node.gate } : {}), ...(node.ramp ? { ramp: true } : {}),
  };
}

const sameJunction = (p: Junction, q: Junction): boolean =>
  p.control === q.control && p.radius === q.radius && p.works === q.works && p.gate === q.gate && p.ramp === q.ramp
  && p.arms.length === q.arms.length && p.arms.every((a, i) => a === q.arms[i])
  && p.split.length === q.split.length && p.split.every((a, i) => a === q.split[i]);

/** Close a draft into a network value; untouched roads, links and junctions keep their objects. */
export function finish(prev: Network, d: Draft): Network {
  const gates = prev.gates ?? [];
  const byNode = new Map<Id, Road[]>();
  for (const r of d.roads.values()) for (const n of [r.a, r.b]) byNode.set(n, [...(byNode.get(n) ?? []), r]);
  const oldRoads = new Map(prev.roads.map((r) => [r.id, r]));
  const oldLinks = new Map(prev.links.map((l) => [l.id, l]));
  const oldJunctions = new Map(prev.junctions.map((j) => [j.id, j]));
  const roads: Road[] = [];
  const links: Link[] = [];
  for (const r of d.roads.values()) {
    if (oldRoads.get(r.id) === r) {
      roads.push(r);
      for (const id of r.links) links.push(oldLinks.get(id)!);
      continue;
    }
    const ls = roadLinks(r);
    roads.push({ ...r, links: ls.map((l) => l.id) });
    links.push(...ls);
  }
  const junctions: Junction[] = [];
  for (const n of d.nodes.values()) {
    const arms = byNode.get(n.id);
    if (!arms) continue;
    const gate = n.gate ?? gates.find((g) => sameCell({ gx: g.cell[0], gy: g.cell[1] }, n.cell))?.id;
    const j = makeJunction(gate !== undefined ? { ...n, gate } : n, arms);
    const old = oldJunctions.get(n.id);
    junctions.push(old && sameJunction(old, j) ? old : j);
  }
  return { version: prev.version + 1, width: prev.width, height: prev.height, terrain: prev.terrain, roads, links, junctions, gates, nextId: d.nextId };
}
