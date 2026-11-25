import { CELL } from '../../sim/constants';
import type { Cell, Pt, Road, RoadType } from '../../sim/types';
import { ROADS } from '../../sim/constants';

/** Dragging on the 8-direction grid. Pure. */
const ROAD_PULL = 0.62; // cells: an existing road's vertex wins from this far

export const sameCell = (a: Cell, b: Cell): boolean => a.gx === b.gx && a.gy === b.gy;
export const cellPt = (c: Cell): Pt => ({ x: c.gx * CELL, y: c.gy * CELL });
export const cellKey = (c: Cell): string => `${c.gx},${c.gy}`;

export interface Bounds { readonly cols: number; readonly rows: number }

/** The vertex nearest a plan point, kept on the map; a road's vertex pulls a little. */
export function snapCell(p: Pt, b: Bounds, onRoad?: ReadonlySet<string>): Cell {
  const fx = p.x / CELL;
  const fy = p.y / CELL;
  const plain = clampCell({ gx: Math.round(fx), gy: Math.round(fy) }, b);
  if (!onRoad || onRoad.has(cellKey(plain))) return plain;
  let best = plain;
  let d = ROAD_PULL;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const c = { gx: plain.gx + i, gy: plain.gy + j };
      const k = Math.hypot(c.gx - fx, c.gy - fy);
      if (k < d && onRoad.has(cellKey(c))) { d = k; best = c; }
    }
  }
  return best;
}

const clampCell = (c: Cell, b: Bounds): Cell => ({ gx: Math.min(b.cols - 1, Math.max(0, c.gx)), gy: Math.min(b.rows - 1, Math.max(0, c.gy)) });

/** Which way the finger first went: -1, 0 or 1 on each axis. */
export interface Dir { readonly dx: number; readonly dy: number }

export function dirOf(from: Pt, to: Pt, atLeast: number): Dir | null {
  const x = to.x - from.x;
  const y = to.y - from.y;
  if (Math.hypot(x, y) < atLeast) return null;
  const a = Math.round(Math.atan2(y, x) / (Math.PI / 4)) * (Math.PI / 4);
  return { dx: Math.round(Math.cos(a)), dy: Math.round(Math.sin(a)) };
}

/**
 * Every vertex from one cell to another with at most one bend: a straight run
 * and a diagonal run, in the order the drag began (`first`), else the longer
 * run first.
 */
export function elbow(from: Cell, to: Cell, first: Dir | null): Cell[] {
  const dx = to.gx - from.gx;
  const dy = to.gy - from.gy;
  const diag = Math.min(Math.abs(dx), Math.abs(dy));
  const run = Math.max(Math.abs(dx), Math.abs(dy)) - diag;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const straight: Dir = Math.abs(dx) > Math.abs(dy) ? { dx: sx, dy: 0 } : { dx: 0, dy: sy };
  const slant: Dir = { dx: sx, dy: sy };
  const startsDiagonal = first ? first.dx !== 0 && first.dy !== 0 : diag > run;
  const legs: readonly (readonly [Dir, number])[] = startsDiagonal ? [[slant, diag], [straight, run]] : [[straight, run], [slant, diag]];
  const out: Cell[] = [{ gx: from.gx, gy: from.gy }];
  for (const [d, n] of legs) {
    for (let i = 0; i < n; i++) {
      const last = out[out.length - 1]!;
      out.push({ gx: last.gx + d.dx, gy: last.gy + d.dy });
    }
  }
  return out;
}

/** Add a leg to a path that was already drawn; going back over it shortens it. */
export function extend(path: readonly Cell[], leg: readonly Cell[]): Cell[] {
  const out = [...path];
  for (const c of leg) {
    const at = out.findIndex((q) => sameCell(q, c));
    if (at >= 0) out.splice(at + 1);
    else out.push(c);
  }
  return out;
}

/** The grid vertices of every ground road. */
export function roadCells(roads: readonly Road[]): Set<string> {
  const s = new Set<string>();
  for (const r of roads) if (!r.flyover) for (const c of r.cells) s.add(cellKey(c));
  return s;
}

export const roadRank = (t: RoadType): number => ROADS[t].lanes;
