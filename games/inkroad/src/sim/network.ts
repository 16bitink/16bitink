/** The road graph as immutable values. Every change returns a new Network (version + 1). */
import { finish, draftOf, makeRoad, phaseArms, type Draft, type NodeCore } from './netCore';
import { dropRoad, healNode, nodeAtCell, splitAt } from './netEdit';
import { expandCells, groundRoads, hasEdge, edgeSet, key, terrainAt } from './netPlan';
import type { Cell, Control, Id, Junction, Road, RoadDef, RoadType, Terrain } from './types';
import type { Network, RoadPlan } from './trafficTypes';

export { planRoad } from './netPlan';
export type { PlanOptions } from './netPlan';
export { planFlyover, addFlyover, type FlyoverPlan } from './flyover';
export { nearestAccess, junctionAt, roadAt, roundaboutFits, type CellRect } from './netQuery';

type Gates = readonly { id: string; cell: readonly [number, number] }[];

export function createNetwork(map: readonly string[], roads: readonly RoadDef[], gates: Gates): Network {
  const terrain = map.map((row) => [...row] as Terrain[]);
  let net: Network = { version: 0, width: Math.max(0, ...map.map((r) => r.length)), height: map.length, terrain, roads: [], links: [], junctions: [], gates, nextId: 1 };
  for (const def of roads) net = addCells(net, expandCells(def.cells.map(([gx, gy]) => ({ gx, gy }))), def.type, false, def.fixed ?? false);
  const d = draftOf(net);
  for (const g of gates) {
    const cell = { gx: g.cell[0], gy: g.cell[1] };
    if (groundRoads(net).some((r) => r.cells.some((c) => key(c) === key(cell)))) splitAt(d, cell);
  }
  return { ...finish(net, d), version: 1 };
}

/** Build along cells, joining whatever is there; edges that already exist are skipped. */
function addCells(net: Network, cells: readonly Cell[], type: RoadType, oneWay: boolean, fixed: boolean): Network {
  const d = draftOf(net);
  const edges = edgeSet(net);
  const used = new Set<string>();
  for (const r of groundRoads(net)) for (const c of r.cells) used.add(key(c));
  let run: Cell[] = [];
  const flush = (): void => {
    if (run.length > 1) buildRun(net, d, run, type, oneWay, fixed);
    run = [];
  };
  cells.forEach((c, i) => {
    if (i > 0 && hasEdge(edges, cells[i - 1]!, c)) { flush(); run = [c]; return; }
    run.push(c);
    if (i > 0 && used.has(key(c))) { flush(); run = [c]; }
  });
  flush();
  return finish(net, d);
}

function buildRun(net: Network, d: Draft, cells: readonly Cell[], type: RoadType, oneWay: boolean, fixed: boolean): void {
  const a = splitAt(d, cells[0]!), b = splitAt(d, cells[cells.length - 1]!);
  const bridge = cells.some((c) => terrainAt(net, c) === '~');
  const id = d.nextId++;
  d.roads.set(id, makeRoad(id, a, b, { cells, type, oneWay, fixed, bridge }));
}

export function addRoad(net: Network, plan: RoadPlan, opts: { readonly fixed?: boolean } = {}): Network {
  if (!plan.ok) throw new Error(`addRoad: ${plan.why ?? 'bad plan'}`);
  return addCells(net, plan.cells, plan.type, plan.oneWay, opts.fixed ?? false);
}

/** Take a road out, with any flyover that depended on it. A two-arm junction left over becomes a bend. */
export function removeRoad(net: Network, id: Id): Network {
  const d = draftOf(net);
  if (!d.roads.has(id)) return net;
  const touched = dropRoad(d, id);
  for (const n of touched) healNode(d, n);
  return finish(net, d);
}

type RoadPatch = Partial<Pick<Road, 'type' | 'busLane' | 'kerb' | 'toll' | 'truckBan' | 'works' | 'worksEnd' | 'nightWorks' | 'oneWay' | 'dir' | 'condition'>>;

export function setRoad(net: Network, id: Id, patch: RoadPatch): Network {
  const d = draftOf(net);
  const road = d.roads.get(id);
  if (!road) return net;
  d.roads.set(id, { ...road, ...patch });
  return finish(net, d);
}

function setNode(net: Network, id: Id, patch: Partial<NodeCore>): Network {
  const d = draftOf(net);
  const node = d.nodes.get(id);
  if (!node) return net;
  d.nodes.set(id, { ...node, ...patch });
  return finish(net, d);
}

export function setControl(net: Network, node: Id, control: Control): Network {
  const j = junctionOf(net, node);
  return !j || j.ramp ? net : setNode(net, node, { control });
}

/** Green shares per phase, in the order of `signalPhases`. */
export function setSplit(net: Network, node: Id, split: readonly number[]): Network {
  const clean = split.map((s) => (Number.isFinite(s) ? Math.max(0.05, s) : 0.05));
  const sum = clean.reduce((p, q) => p + q, 0);
  return sum > 0 ? setNode(net, node, { split: clean.map((s) => s / sum) }) : net;
}

export const setJunctionWorks = (net: Network, node: Id, works: number): Network => setNode(net, node, { works });

/** Which arms (road ids) get green together, in the order of `Junction.split`. */
export function signalPhases(net: Network, node: Id): readonly (readonly Id[])[] {
  const j = junctionOf(net, node);
  return j ? phaseArms(node, j.arms.map((a) => roadOf(net, a)!)) : [];
}

export const junctionOf = (net: Network, id: Id): Junction | undefined => net.junctions.find((j) => j.id === id);
export const roadOf = (net: Network, id: Id): Road | undefined => net.roads.find((r) => r.id === id);
export const nodeAt = (net: Network, cell: Cell): Id | undefined => nodeAtCell(draftOf(net), cell);
