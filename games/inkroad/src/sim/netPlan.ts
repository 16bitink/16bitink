/** Planning a road the player drags: which cells, what it crosses, and why not. */
import { ROADS } from './constants';
import { cellPt, sameCell, smoothLine } from './geom';
import { checkGround, checkWater, refuse, terrainAt, type Blocked, type Refusal } from './netGround';
import type { Cell, Id, Road, RoadType } from './types';
import type { Network, RoadPlan } from './trafficTypes';

export { terrainAt };
export interface PlanOptions { readonly oneWay?: boolean; readonly blocked?: Blocked }

export const MAX_ARMS = 6;
const DIAGONAL = Math.SQRT2;
/** Shortest piece a new junction may leave on an existing road, cells. */
const MIN_PIECE = 2;

export const key = (c: Cell): string => `${c.gx},${c.gy}`;
const edgeKey = (a: Cell, b: Cell): string => (a.gx < b.gx || (a.gx === b.gx && a.gy < b.gy) ? `${key(a)}|${key(b)}` : `${key(b)}|${key(a)}`);

/** Fill in the vertices between corners: diagonal first, then straight. */
export function expandCells(corners: readonly Cell[]): Cell[] {
  const out: Cell[] = [];
  const push = (c: Cell): void => { if (out.length === 0 || !sameCell(out[out.length - 1]!, c)) out.push(c); };
  corners.forEach((c, i) => {
    if (i === 0) { push({ gx: c.gx, gy: c.gy }); return; }
    let { gx, gy } = corners[i - 1]!;
    while (gx !== c.gx || gy !== c.gy) {
      gx += Math.sign(c.gx - gx);
      gy += Math.sign(c.gy - gy);
      push({ gx, gy });
    }
  });
  return out;
}

export function cellsLength(cells: readonly Cell[]): number {
  let n = 0;
  for (let i = 1; i < cells.length; i++) n += cells[i]!.gx !== cells[i - 1]!.gx && cells[i]!.gy !== cells[i - 1]!.gy ? DIAGONAL : 1;
  return n;
}

/** Ground roads only: ramps and decks are not on the grid. */
export const groundRoads = (net: Network): Road[] => net.roads.filter((r) => !r.flyover);

export function edgeSet(net: Network): Set<string> {
  const s = new Set<string>();
  for (const r of groundRoads(net)) for (let i = 1; i < r.cells.length; i++) s.add(edgeKey(r.cells[i - 1]!, r.cells[i]!));
  return s;
}
export const hasEdge = (s: Set<string>, a: Cell, b: Cell): boolean => s.has(edgeKey(a, b));

/** Drop edges already built at either end of the drag. */
function trimBuilt(cells: Cell[], edges: Set<string>): Cell[] {
  let a = 0, b = cells.length - 1;
  while (a < b && hasEdge(edges, cells[a]!, cells[a + 1]!)) a++;
  while (b > a && hasEdge(edges, cells[b - 1]!, cells[b]!)) b--;
  return cells.slice(a, b + 1);
}

function checkShape(cells: readonly Cell[], edges: Set<string>): Refusal | null {
  const seen = new Set<string>();
  for (const c of cells) {
    if (seen.has(key(c))) return refuse('The road crosses itself', c);
    seen.add(key(c));
  }
  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1]!, b = cells[i]!;
    if (hasEdge(edges, a, b)) return refuse('A road is already there', b);
    if (a.gx !== b.gx && a.gy !== b.gy && hasEdge(edges, { gx: a.gx, gy: b.gy }, { gx: b.gx, gy: a.gy })) return refuse('Cross other roads at a grid point', b);
    if (i + 1 < cells.length) {
      const c = cells[i + 1]!;
      if ((b.gx - a.gx) * (c.gx - b.gx) + (b.gy - a.gy) * (c.gy - b.gy) < 0) return refuse('Too sharp a turn', b);
    }
  }
  return null;
}

interface Touch { readonly splits: Id[]; readonly no: Refusal | null; readonly nodes: number[] }

/** Junctions the new road makes or joins. */
function touching(net: Network, cells: readonly Cell[]): Touch {
  const splits: Id[] = [];
  const nodes: number[] = [];
  const at = new Map(net.junctions.map((j) => [key(j.cell), j]));
  const inside = new Map<string, { road: Road; i: number }>();
  for (const r of groundRoads(net)) r.cells.forEach((c, i) => { if (i > 0 && i < r.cells.length - 1) inside.set(key(c), { road: r, i }); });
  let no: Refusal | null = null;
  cells.forEach((c, i) => {
    const j = at.get(key(c));
    const end = i === 0 || i === cells.length - 1;
    if (j) {
      nodes.push(i);
      if (j.ramp) no ??= refuse('A flyover ramp is here', c);
      else if (j.arms.length + (end ? 1 : 2) > MAX_ARMS) no ??= refuse('This junction is full: six roads meet here', c);
      return;
    }
    const hit = inside.get(key(c));
    if (!hit) return;
    nodes.push(i);
    splits.push(hit.road.id);
    if (hit.road.bridge && terrainAt(net, c) === '~') no ??= refuse('No junction on a bridge', c);
    const a = cellsLength(hit.road.cells.slice(0, hit.i + 1)), b = cellsLength(hit.road.cells.slice(hit.i));
    if (Math.min(a, b) < Math.min(MIN_PIECE, 1.4)) no ??= refuse(TOO_CLOSE, hit.road.cells[a < b ? 0 : hit.road.cells.length - 1]!);
  });
  return { splits: [...new Set(splits)], no, nodes };
}

const TOO_CLOSE = 'Too close to the junction here';
function tooClose(cells: readonly Cell[], nodes: readonly number[]): Refusal | null {
  for (let k = 1; k < nodes.length; k++) if (cellsLength(cells.slice(nodes[k - 1]!, nodes[k]! + 1)) < MIN_PIECE - 0.6) return refuse(TOO_CLOSE, cells[nodes[k]!]!);
  return null;
}

export function planRoad(net: Network, corners: readonly Cell[], type: RoadType, opts: PlanOptions = {}): RoadPlan {
  const edges = edgeSet(net);
  const cells = trimBuilt(expandCells(corners), edges);
  const water = cells.filter((c) => terrainAt(net, c) === '~').length;
  const base = {
    cells, line: cells.length > 1 ? smoothLine(cells.map(cellPt)) : cells.map(cellPt), type, oneWay: opts.oneWay ?? false,
    level: 0 as const, cellsOnWater: water, length: cellsLength(cells), splits: [] as Id[],
  };
  const no = (why: string): RoadPlan => ({ ...base, ok: false, why });
  if (!ROADS[type]) return no('Unknown road');
  if (cells.length < 2) return no(corners.length > 1 && edges.size > 0 ? 'A road is already there' : 'Drag to draw a road');
  const bad = checkGround(net, cells, type, opts.blocked ?? (() => null)) ?? checkWater(net, cells) ?? checkShape(cells, edges);
  if (bad) return { ...no(bad.why), at: bad.at };
  const touch = touching(net, cells);
  const close = touch.no ?? tooClose(cells, touch.nodes);
  if (close) return { ...no(close.why), at: close.at, splits: touch.splits };
  return { ...base, ok: true, splits: touch.splits };
}
