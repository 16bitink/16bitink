import { CELL } from '../sim/constants';
import type { Cell, Pt, Road } from '../sim/types';

/** Lots and car parks are corner based: cells gx..gx+w, so a world rectangle of w by h cells. */
export interface Block { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }
export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export const lotRect = (b: Block): Rect => ({ x: b.gx * CELL, y: b.gy * CELL, w: b.w * CELL, h: b.h * CELL });
export const centreOf = (b: Block): Pt => ({ x: (b.gx + b.w / 2) * CELL, y: (b.gy + b.h / 2) * CELL });
export const cellPt = (c: Cell): Pt => ({ x: c.gx * CELL, y: c.gy * CELL });
export const distPt = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const areaOf = (b: Block): number => b.w * b.h;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** True when a grid vertex stands on a block or its edge: no road there. */
export const vertexInBlock = (b: Block, c: Cell): boolean =>
  c.gx >= b.gx && c.gx <= b.gx + b.w && c.gy >= b.gy && c.gy <= b.gy + b.h;

/** Two blocks share ground (touching edges is fine). */
export const blocksMeet = (a: Block, b: Block): boolean =>
  a.gx < b.gx + b.w && b.gx < a.gx + a.w && a.gy < b.gy + b.h && b.gy < a.gy + a.h;

/** Straight line distance from a point to a block, in cells (0 inside). */
export function cellsToBlock(b: Block, p: Pt): number {
  const dx = Math.max(b.gx * CELL - p.x, 0, p.x - (b.gx + b.w) * CELL);
  const dy = Math.max(b.gy * CELL - p.y, 0, p.y - (b.gy + b.h) * CELL);
  return Math.hypot(dx, dy) / CELL;
}

export function polyLength(line: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < line.length; i++) n += distPt(line[i - 1]!, line[i]!);
  return n;
}

export function pointAlong(line: readonly Pt[], s: number): Pt {
  let left = Math.max(0, s);
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const d = distPt(a, b);
    if (d > 0 && left <= d) return { x: a.x + ((b.x - a.x) * left) / d, y: a.y + ((b.y - a.y) * left) / d };
    left -= d;
  }
  return line[line.length - 1] ?? { x: 0, y: 0 };
}

export const midOf = (road: Road): Pt => pointAlong(road.line, polyLength(road.line) / 2);

/** Distance from a point to a polyline, world units. */
export function distToLine(line: readonly Pt[], p: Pt): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const t = len2 === 0 ? 0 : clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2, 0, 1);
    best = Math.min(best, Math.hypot(p.x - a.x - t * (b.x - a.x), p.y - a.y - t * (b.y - a.y)));
  }
  return best;
}

/** Distance along a polyline to its nearest point. */
export function nearestS(line: readonly Pt[], p: Pt): { readonly s: number; readonly d: number } {
  let best = { s: 0, d: Infinity };
  let run = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const len = distPt(a, b);
    const t = len === 0 ? 0 : clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len), 0, 1);
    const d = Math.hypot(p.x - a.x - t * (b.x - a.x), p.y - a.y - t * (b.y - a.y));
    if (d < best.d) best = { s: run + len * t, d };
    run += len;
  }
  return best;
}
