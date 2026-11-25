import { vertexInBlock } from '../city/geometry';
import { CELL, ROADS } from '../sim/constants';
import type { Cell, CityView, Id, Road } from '../sim/types';
import type { RoadPlanHint } from './types';

/**
 * Finds one short new street between two old roads that lets cars skip a
 * junction. Works on the cells of the roads: straight rays out of corners and
 * dead ends, judged by the seconds they save for what they cost.
 */
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
const MIN_LEN = 3;
const MAX_LEN = 9;
const MIN_SAVED_S = 5;
const QUOTES = 14;

const key = (c: Cell): string => `${c.gx},${c.gy}`;

interface Edge { readonly to: string; readonly s: number }
export type CellGraph = ReadonlyMap<string, readonly Edge[]>;

/** Every road cell, joined to the next along its road, in seconds of driving. */
export function cellGraph(roads: readonly Road[]): CellGraph {
  const g = new Map<string, Edge[]>();
  const add = (a: Cell, b: Cell, s: number): void => {
    const list = g.get(key(a)) ?? [];
    list.push({ to: key(b), s });
    g.set(key(a), list);
  };
  for (const r of roads) {
    if (r.level !== 0 || r.flyover) continue;
    const speed = ROADS[r.type].speed;
    for (let i = 1; i < r.cells.length; i++) {
      const a = r.cells[i - 1]!;
      const b = r.cells[i]!;
      const s = (Math.hypot(a.gx - b.gx, a.gy - b.gy) * CELL) / speed;
      if (!r.oneWay || r.dir !== -1) add(a, b, s);
      if (!r.oneWay || r.dir === -1) add(b, a, s);
    }
  }
  return g;
}

/** Seconds from one cell to every other, the cell before it, and whether the quickest way crosses `through`. */
export function drive(g: CellGraph, from: Cell, through: Cell): ReadonlyMap<string, { readonly s: number; readonly via: boolean; readonly prev: string }> {
  const out = new Map<string, { s: number; via: boolean; prev: string }>([[key(from), { s: 0, via: key(from) === key(through), prev: '' }]]);
  const open = new Map<string, number>([[key(from), 0]]);
  const done = new Set<string>();
  while (open.size > 0) {
    let k = '';
    let best = Infinity;
    for (const [q, s] of open) if (s < best) { best = s; k = q; }
    open.delete(k);
    done.add(k);
    const here = out.get(k)!;
    for (const e of g.get(k) ?? []) {
      if (done.has(e.to)) continue;
      const s = here.s + e.s;
      if (s >= (out.get(e.to)?.s ?? Infinity)) continue;
      out.set(e.to, { s, via: here.via || e.to === key(through), prev: k });
      open.set(e.to, s);
    }
  }
  return out;
}

/** The cells of the quickest way that `drive` found to a cell. */
function wayBack(times: ReadonlyMap<string, { readonly prev: string }>, end: string): readonly Cell[] {
  const out: Cell[] = [];
  for (let k = end; k !== ''; k = times.get(k)?.prev ?? '') {
    const [gx = 0, gy = 0] = k.split(',').map(Number);
    out.push({ gx, gy });
  }
  return out.reverse();
}

const stepLen = (d: readonly [number, number]): number => Math.hypot(d[0], d[1]);

interface Ray { readonly cells: readonly Cell[]; readonly newS: number }

/** Straight lines from a corner over open ground to the next road, with at most one bend. */
function rays(from: Cell, g: CellGraph, ground: (c: Cell) => boolean): readonly Ray[] {
  const out: Ray[] = [];
  const isNext = (c: Cell): boolean => (g.get(key(from)) ?? []).some((e) => e.to === key(c));
  const walk = (cells: readonly Cell[], d: readonly [number, number], len: number, bent: boolean): void => {
    const last = cells[cells.length - 1]!;
    const c = { gx: last.gx + d[0], gy: last.gy + d[1] };
    const total = len + stepLen(d);
    if (cells.length > MAX_LEN || (cells.length === 1 && isNext(c))) return;
    const line = [...cells, c];
    if (g.has(key(c))) {
      if (cells.length >= MIN_LEN) out.push({ cells: line, newS: (total * CELL) / ROADS.street.speed });
      return;
    }
    if (!ground(c)) return;
    walk(line, d, total, bent);
    if (!bent && cells.length >= 2) for (const e of DIRS) if (gentle(d, e)) walk(line, e, total, true);
  };
  for (const d of DIRS) walk([from], d, 0, false);
  return out;
}

/** A bend of 45 degrees. */
const gentle = (a: readonly [number, number], b: readonly [number, number]): boolean => {
  const dot = (a[0] * b[0] + a[1] * b[1]) / (stepLen(a) * stepLen(b));
  return dot > 0.5 && dot < 0.99;
};

/** The best short street past a junction, or null. `budget` = what may be spent. */
export function findDetour(city: CityView, node: Id, budget = Infinity): RoadPlanHint | null {
  const j = city.junctions.find((x) => x.id === node);
  if (!j || !city.tools.includes('street')) return null;
  const g = cellGraph(city.roads);
  const onRoad = (c: Cell): boolean => g.has(key(c));
  const blocks = [...city.lots, ...city.carParks];
  const ground = (c: Cell): boolean => '.h'.includes(city.def.map[c.gy]?.[c.gx] ?? '~') && !blocks.some((b) => vertexInBlock(b, c));
  const found: RoadPlanHint[] = [];
  for (const n of city.junctions) {
    if (n.id === node || n.ramp || n.gate || n.arms.length === 0 || !onRoad(n.cell)) continue;
    const list = rays(n.cell, g, ground);
    if (list.length === 0) continue;
    const times = drive(g, n.cell, j.cell);
    for (const r of list) {
      const end = r.cells[r.cells.length - 1]!;
      const now = times.get(key(end));
      if (!now?.via || now.s - r.newS < MIN_SAVED_S) continue;
      found.push({ cells: r.cells, from: n.cell, to: end, cost: 0, nowS: now.s, newS: r.newS, oldWay: wayBack(times, key(end)) });
    }
  }
  return cheapest(city, found, budget);
}

/** Ask the city for a price, the most promising first; the best saving for its coins wins. */
function cheapest(city: CityView, found: readonly RoadPlanHint[], budget: number): RoadPlanHint | null {
  const worth = (h: RoadPlanHint, cost: number): number => (h.nowS - h.newS) / Math.max(1, cost);
  const ranked = [...found].sort((a, b) => worth(b, b.cells.length) - worth(a, a.cells.length) || a.from.gx - b.from.gx || a.from.gy - b.from.gy).slice(0, QUOTES);
  let best: RoadPlanHint | null = null;
  for (const h of ranked) {
    const q = city.quote({ t: 'road', cells: h.cells, type: 'street' });
    if (!q.ok || q.cost > budget) continue;
    const priced = { ...h, cost: q.cost };
    if (!best || worth(priced, q.cost) > worth(best, best.cost)) best = priced;
  }
  return best;
}
