/** The network as tracks: what the cars actually drive on. Rebuilt on every network change. */
import { angleDiff, lineLength, offsetLine, resample, reverseLine, sliceLine } from './geom';
import { closedForWorks, deckZ, isForward, laneOffset } from './roadGeom';
import { LANE_T, Track } from './track';
import { MIN_LANE, SAMPLE } from './tune';
import { buildNode } from './nodeBuild';
import type { Id, Junction, Link, Pt, Road } from './types';
import type { Network } from './trafficTypes';
import type { RingRt } from './ringBuild';

export type NodeKind = 'free' | 'yield' | 'signal' | 'ring' | 'gate';

/** One way out of a link's end. */
export interface OutOpt {
  readonly key: string;
  readonly from: LinkRt;
  readonly to: LinkRt;
  readonly turn: number; // heading change, + = right
  readonly uTurn: boolean;
  /** Lanes a driver picks for this turn. */
  lo: number;
  hi: number;
  /** Per lane: the first track of the way through, or null. */
  readonly conn: (Track | null)[];
  delay: number;
  /** Ring arm index to leave by, or -1. */
  exitArm: number;
}

export interface LinkRt {
  readonly i: number;
  readonly link: Link;
  readonly road: Road;
  readonly lanes: Track[];
  /** Lanes open to cars (a bus lane takes the last one). */
  readonly carLanes: number;
  readonly node: NodeRt;
  readonly fromNode: NodeRt;
  opts: OutOpt[];
  /** Links that lead here. */
  preds: OutOpt[];
  /** Roads distance cut off at the start, so s on the road can be turned into s on a lane. */
  readonly trim0: number;
  readonly trim1: number;
  freeTime: number;
  /** Smoothed seconds to drive it. */
  time: number;
  readonly headway: number;
  /** Under works by day: routing never sends a car onto it. */
  readonly closed: boolean;
  /** The real junction this link queues for (through ramp nodes). */
  statNode: Id;
}

export interface NodeRt {
  readonly i: number;
  readonly j: Junction;
  readonly kind: NodeKind;
  ins: LinkRt[];
  outs: LinkRt[];
  turns: Track[];
  ring: RingRt | null;
  /** Signals: link ids per phase, and the state of the lights. */
  phases: LinkRt[][];
  phase: number;
  /** 0 green, 1 amber, 2 all red. */
  light: 0 | 1 | 2;
  lightFor: number;
  nextPhase: number;
  /** When somebody last got the right of way. */
  lastWay: number;
}

export interface World {
  readonly net: Network;
  readonly tracks: Track[];
  readonly links: LinkRt[];
  readonly nodes: NodeRt[];
  readonly linkById: Map<Id, LinkRt>;
  readonly nodeById: Map<Id, NodeRt>;
  readonly roadById: Map<Id, Road>;
  readonly byKey: Map<string, Track>;
  readonly optByKey: Map<string, OutOpt>;
}

const RING_TRIM = 8;
const LINE_TRIM = 2;
const RAMP_TRIM = 14;
const BEND_TRIM = 26;
const DEAD_END_TRIM = 14;

function nodeKind(j: Junction, roads: Map<Id, Road>): NodeKind {
  if (j.gate !== undefined && j.arms.length === 1) return 'gate';
  const ground = j.arms.filter((a) => !roads.get(a)!.flyover);
  if (j.ramp || ground.length <= 2) return 'free';
  if (j.control === 'roundabout') return 'ring';
  return j.control === 'yield' ? 'yield' : 'signal';
}

function trimAt(j: Junction, kind: NodeKind, net: Network): number {
  if (kind === 'gate') return 0;
  if (j.arms.length === 1) return Math.max(DEAD_END_TRIM, j.radius);
  if (j.ramp) return RAMP_TRIM;
  if (kind === 'ring') return j.radius + RING_TRIM;
  if (kind === 'free') {
    const [p, q] = j.arms.map((a) => net.roads.find((r) => r.id === a)!);
    if (!p || !q) return DEAD_END_TRIM;
    const out = (r: Road): number => {
      const l = r.line, a = r.a === j.id ? l[0]! : l[l.length - 1]!, b = r.a === j.id ? l[1]! : l[l.length - 2]!;
      return Math.atan2(b.y - a.y, b.x - a.x);
    };
    const bend = Math.PI - Math.abs(angleDiff(out(p), out(q)));
    return bend > 0.2 ? Math.max(BEND_TRIM, j.radius) : 8;
  }
  return j.radius + LINE_TRIM;
}

function laneTracks(l: Link, road: Road, t0: number, t1: number): Track[] {
  const base = isForward(l) ? road.line : reverseLine(road.line);
  const cut = resample(sliceLine(base, t0, lineLength(base) - t1), SAMPLE);
  const total = lineLength(base);
  const z = road.level !== 0 ? (t: number): number => deckZ(road, isForward(l) ? t0 + t * (total - t0 - t1) : total - t0 - t * (total - t0 - t1), total) : undefined;
  return Array.from({ length: l.lanes }, (_, i) => {
    const off = laneOffset(road, i);
    const pts: Pt[] = off === 0 ? cut : offsetLine(cut, off);
    const t = new Track(`L${l.id}:${i}`, LANE_T, pts, l.freeSpeed, z ? { z } : {});
    t.lane = i;
    return t;
  });
}

function buildLinks(net: Network, w: World): void {
  for (const link of net.links) {
    const road = w.roadById.get(link.road)!;
    const node = w.nodeById.get(link.to)!, fromNode = w.nodeById.get(link.from)!;
    const len = lineLength(road.line);
    let t0 = trimAt(fromNode.j, fromNode.kind, net), t1 = trimAt(node.j, node.kind, net);
    const room = Math.max(len * 0.3, len - MIN_LANE);
    if (t0 + t1 > room) { const k = room / (t0 + t1); t0 *= k; t1 *= k; }
    const lanes = laneTracks(link, road, t0, t1);
    const i = w.links.length;
    for (const t of lanes) { t.link = i; addTrack(w, t); }
    const carLanes = road.busLane && link.lanes > 1 ? link.lanes - 1 : link.lanes;
    const rt: LinkRt = {
      i, link, road, lanes, carLanes, node, fromNode, opts: [], preds: [], trim0: t0, trim1: t1, freeTime: 0, time: 0,
      headway: road.kerb ? 1.12 : 1, closed: closedForWorks(road), statNode: link.to,
    };
    w.links.push(rt);
    w.linkById.set(link.id, rt);
    node.ins.push(rt);
    fromNode.outs.push(rt);
  }
}

export function addTrack(w: World, t: Track): Track {
  t.id = w.tracks.length;
  w.tracks.push(t);
  w.byKey.set(t.key, t);
  return t;
}

const CONTROL_DELAY: Readonly<Record<NodeKind, number>> = { free: 0, gate: 0, yield: 1, ring: 1.2, signal: 3 };

/** Follow ramp nodes to the junction a queue is really for. */
function findStatNode(l: LinkRt): Id {
  let at = l;
  for (let hop = 0; hop < 4; hop++) {
    if (!at.node.j.ramp) return at.node.j.id;
    const on = at.opts.find((o) => !o.to.road.flyover && Math.abs(o.turn) < 1);
    if (at.road.flyover) return at.road.flyover.node;
    if (!on) return at.node.j.id;
    at = on.to;
  }
  return l.node.j.id;
}

export function buildWorld(net: Network): World {
  const w: World = {
    net, tracks: [], links: [], nodes: [], linkById: new Map(), nodeById: new Map(), roadById: new Map(net.roads.map((r) => [r.id, r])),
    byKey: new Map(), optByKey: new Map(),
  };
  for (const j of net.junctions) {
    const n: NodeRt = {
      i: w.nodes.length, j, kind: nodeKind(j, w.roadById), ins: [], outs: [], turns: [], ring: null,
      phases: [], phase: 0, light: 0, lightFor: 0, nextPhase: 0, lastWay: -10,
    };
    w.nodes.push(n);
    w.nodeById.set(j.id, n);
  }
  buildLinks(net, w);
  for (const n of w.nodes) buildNode(w, n);
  for (const l of w.links) {
    l.statNode = findStatNode(l);
    l.freeTime = l.lanes[0]!.len / l.link.freeSpeed + CONTROL_DELAY[l.node.kind];
    l.time = l.freeTime;
    for (const o of l.opts) w.optByKey.set(o.key, o);
    // No turn into a road under works: only cars already on it drive on, and off it.
    if (!l.closed) l.opts = l.opts.filter((o) => !o.to.closed);
    for (const o of l.opts) o.to.preds.push(o);
  }
  return w;
}

/** Road distance (from a) to distance along a link's lanes. */
export function laneS(l: LinkRt, roadS: number): number {
  const total = l.link.length;
  const along = isForward(l.link) ? roadS : total - roadS;
  const open = Math.max(1, total - l.trim0 - l.trim1);
  const len = l.lanes[0]!.len;
  return Math.max(Math.min(6, len * 0.4), Math.min(len - Math.min(9, len * 0.4), ((along - l.trim0) / open) * len));
}
