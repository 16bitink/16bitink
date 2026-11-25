/** A flyover or underpass for one movement of one junction: ramp off, deck, ramp on. */
import { CELL, LANE, ROADS } from './constants';
import { angleDiff, cellPt, curve, dist, lineLength, pointAt, resample, reverseLine, smoothLine, smoothstep, vertexHeadings } from './geom';
import { draftOf, finish, makeRoad, armHeading } from './netCore';
import { splitAt } from './netEdit';
import { cellsLength } from './netPlan';
import { halfWidth, laneOffset, lanesPerLink } from './roadGeom';
import type { Cell, Id, Level, Pt, Road } from './types';
import type { Network, RoadPlan } from './trafficTypes';

export interface FlyoverPlan extends RoadPlan {
  readonly node: Id;
  readonly fromRoad: Id;
  readonly toRoad: Id;
  /** Where the ramps leave and join. */
  readonly ramps: { readonly from: Cell; readonly to: Cell } | null;
}

const RAMP_CELLS = 2.8;
const MIN_RAMP_CELLS = 1.9;
const SPARE_CELLS = 0.9;
const STEP_PX = 5;
const PEEL = 45; // px over which the ramp leaves the kerb lane
const CLEAR = LANE * 0.65;
const LEFT_CUT = 62, STRAIGHT_CUT = 44, RIGHT_CUT = 42;

/** Cells of an arm counted from the junction outwards. */
const outward = (r: Road, node: Id): Cell[] => (r.a === node ? [...r.cells] : [...r.cells].reverse());

/** How many cells out the ramp goes: about three, and something must be left over beyond it. */
function rampIndex(cells: readonly Cell[]): number | null {
  const total = cellsLength(cells);
  let best: number | null = null;
  for (let i = 1; i < cells.length; i++) {
    const d = cellsLength(cells.slice(0, i + 1));
    if (total - d < SPARE_CELLS || d < MIN_RAMP_CELLS) continue;
    best = i;
    if (d >= RAMP_CELLS) break;
  }
  return best;
}

/** Points right of the line; the offset eases from the kerb lane to clear of the road over the first PEEL px. */
function rampSide(line: readonly Pt[], from: number, to: number, length: number): Pt[] {
  const pts = resample(line, STEP_PX);
  const hs = vertexHeadings(pts);
  let s = 0;
  const out: Pt[] = [];
  pts.forEach((p, i) => {
    if (i > 0) s += dist(pts[i - 1]!, p);
    if (s > length + 0.01) return;
    const off = from + (to - from) * smoothstep(s / PEEL);
    out.push({ x: p.x - Math.sin(hs[i]!) * off, y: p.y + Math.cos(hs[i]!) * off });
  });
  return out;
}

function rampLine(inCells: readonly Cell[], outCells: readonly Cell[], from: Road, to: Road, turn: number): Pt[] {
  const inLine = smoothLine(inCells.map(cellPt)); // towards the junction
  const outLine = smoothLine(outCells.map(cellPt)); // away from it
  const a0 = laneOffset(from, lanesPerLink(from) - 1), a1 = halfWidth(from) + CLEAR;
  const b0 = laneOffset(to, lanesPerLink(to) - 1), b1 = halfWidth(to) + CLEAR;
  const right = turn > 0.3;
  const cutOf = (off: number, len: number): number =>
    Math.min(len * 0.5, right ? off + RIGHT_CUT * Math.min(1.4, turn) : turn < -0.3 ? LEFT_CUT : STRAIGHT_CUT);
  const inLen = lineLength(inLine), outLen = lineLength(outLine);
  const head = rampSide(inLine, a0, a1, inLen - cutOf(b1, inLen));
  // Build the exit side backwards from the far end: mirrored offsets on the reversed line.
  const tail = reverseLine(rampSide(reverseLine(outLine), -b0, -b1, outLen - cutOf(a1, outLen)));
  const p0 = head[head.length - 1]!, p1 = tail[0]!;
  const h0 = Math.atan2(p0.y - head[head.length - 2]!.y, p0.x - head[head.length - 2]!.x);
  const h1 = Math.atan2(tail[1]!.y - p1.y, tail[1]!.x - p1.x);
  const n = Math.max(6, Math.ceil(dist(p0, p1) / STEP_PX));
  return [...head.slice(0, -1), ...curve(p0, h0, p1, h1, n), ...tail.slice(1)];
}

const canEnter = (r: Road, node: Id): boolean => !r.oneWay || (r.dir === -1 ? r.a : r.b) === node;
const canLeave = (r: Road, node: Id): boolean => !r.oneWay || (r.dir === -1 ? r.b : r.a) === node;

export function planFlyover(net: Network, node: Id, fromRoad: Id, toRoad: Id, level: 1 | -1): FlyoverPlan {
  const from = net.roads.find((r) => r.id === fromRoad), to = net.roads.find((r) => r.id === toRoad);
  const j = net.junctions.find((n) => n.id === node);
  const base = {
    cells: [] as Cell[], line: [] as Pt[], type: 'street' as const, oneWay: true, level: level as Level,
    cellsOnWater: 0, length: 0, splits: [] as Id[], node, fromRoad, toRoad, ramps: null,
  };
  const no = (why: string): FlyoverPlan => ({ ...base, ok: false, why });
  if (!from || !to || !j || !j.arms.includes(fromRoad) || !j.arms.includes(toRoad)) return no('Pick a turn at a junction');
  if (from.flyover || to.flyover || j.ramp) return no('Pick a turn at a junction');
  if (fromRoad === toRoad) return no('Pick two different roads');
  if (!canEnter(from, node) || !canLeave(to, node)) return no('That road is one-way, against the turn');
  if (net.roads.some((r) => r.flyover?.node === node && r.flyover.fromRoad === fromRoad && r.flyover.toRoad === toRoad)) return no('This turn already has its own road');
  const others = net.roads.flatMap((r) => (r.flyover?.node === node ? [r.flyover] : []));
  if (others.some((f) => f.fromRoad === fromRoad)) return no('The road in already has a ramp on this side');
  if (others.some((f) => f.toRoad === toRoad)) return no('The road out already has a ramp on this side');
  const inCells = outward(from, node), outCells = outward(to, node);
  const i = rampIndex(inCells), k = rampIndex(outCells);
  if (i === null) return no('The road in is too short for a ramp: 3 cells needed');
  if (k === null) return no('The road out is too short for a ramp: 3 cells needed');
  const turn = angleDiff(armHeading(from, node) + Math.PI, armHeading(to, node));
  const line = rampLine(inCells.slice(0, i + 1).reverse(), outCells.slice(0, k + 1), from, to, turn);
  const type = ROADS[from.type].speed < ROADS[to.type].speed ? from.type : to.type;
  return {
    ...base, ok: true, type, line, cells: [inCells[i]!, j.cell, outCells[k]!], length: lineLength(line) / CELL,
    splits: [fromRoad, toRoad], ramps: { from: inCells[i]!, to: outCells[k]! },
  };
}

export function addFlyover(net: Network, plan: FlyoverPlan): Network {
  if (!plan.ok || !plan.ramps) throw new Error(`addFlyover: ${plan.why ?? 'bad plan'}`);
  const d = draftOf(net);
  const a = splitAt(d, plan.ramps.from, true), b = splitAt(d, plan.ramps.to, true);
  const between = (p: Id, q: Id): Id => [...d.roads.values()].find((r) => !r.flyover && ((r.a === p && r.b === q) || (r.a === q && r.b === p)))?.id ?? -1;
  const fromRoad = between(a, plan.node), toRoad = between(plan.node, b);
  const id = d.nextId++;
  const road = makeRoad(id, a, b, { cells: plan.cells, type: plan.type, oneWay: true, fixed: false, bridge: false });
  const tier = plan.level === 1 ? tierOver(net, plan.line) : 1;
  d.roads.set(id, { ...road, line: plan.line, level: plan.level, flyover: { node: plan.node, fromRoad, toRoad }, ...(tier > 1 ? { tier } : {}) });
  return finish(net, d);
}

/** One above the highest deck this line crosses. */
function tierOver(net: Network, line: readonly Pt[]): number {
  const under = net.roads.filter((r) => r.flyover && r.level === 1 && linesCross(r.line, line));
  return Math.max(0, ...under.map((r) => r.tier ?? 1)) + 1;
}

const side = (a: Pt, b: Pt, p: Pt): number => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

function linesCross(p: readonly Pt[], q: readonly Pt[]): boolean {
  for (let i = 1; i < p.length; i++) {
    for (let k = 1; k < q.length; k++) {
      const a = p[i - 1]!, b = p[i]!, c = q[k - 1]!, e = q[k]!;
      if (side(a, b, c) * side(a, b, e) < 0 && side(c, e, a) * side(c, e, b) < 0) return true;
    }
  }
  return false;
}

/** Point half way along the deck, for labels. */
export const deckMiddle = (r: Road): Pt => pointAt(r.line, lineLength(r.line) / 2);

