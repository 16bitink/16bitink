import type { Rect } from './geometry';
import { CELL } from '../sim/constants';
import { halfWidth, sidewalkWidth } from '../sim/roadGeom';
import type { CityDef, Pt, Road } from '../sim/types';

/**
 * Real lanes (the owner, November 28: 3.1 m lanes) make roads wide: an eight-lane highway is 92 px, more than two
 * cells. No lot may stand on a Council road's paved width; this is the width check the vertex rule (a road a cell off
 * every lot) cannot make. Pure.
 */
interface Box { readonly name: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Clear px a lot keeps from a road's paved edge (its kerb stone). */
export const KERB_ROOM = 1;

/** The rectangle of a straight road segment (no cap) against an axis-aligned parcel, using separating axes. */
export function bandMeetsBox(b: Rect, ax: number, ay: number, bx: number, by: number, reach: number): boolean {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  if (len === 0) return false;
  const x = b.x + b.w / 2 - (ax + bx) / 2, y = b.y + b.h / 2 - (ay + by) / 2;
  const u = dx / len, v = dy / len;
  const wx = b.w / 2, wy = b.h / 2;
  return Math.abs(x) < wx + Math.abs(dx) / 2 + Math.abs(v) * reach
    && Math.abs(y) < wy + Math.abs(dy) / 2 + Math.abs(u) * reach
    && Math.abs(x * u + y * v) < len / 2 + Math.abs(u) * wx + Math.abs(v) * wy
    && Math.abs(y * u - x * v) < reach + Math.abs(v) * wx + Math.abs(u) * wy;
}

export function roadMeetsBox(b: Rect, line: readonly Pt[], road: Pick<Road, 'type' | 'oneWay' | 'flyover'>): boolean {
  const reach = halfWidth(road) + sidewalkWidth(road);
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, z = line[i]!;
    if (bandMeetsBox(b, a.x, a.y, z.x, z.y, reach)) return true;
  }
  return false;
}

export function junctionMeetsBox(b: Rect, x: number, y: number, radius: number): boolean {
  return Math.hypot(Math.max(b.x - x, 0, x - b.x - b.w), Math.max(b.y - y, 0, y - b.y - b.h)) < radius;
}

const boxesOf = (def: CityDef): readonly Box[] => [
  ...def.lots.map((l) => ({ name: l.name, x: l.gx * CELL, y: l.gy * CELL, w: l.w * CELL, h: l.h * CELL })),
  ...(def.beaches ?? []).flatMap((b) => (b.plots ?? []).map((p) => ({ name: p.name, x: p.gx * CELL, y: p.gy * CELL, w: p.w * CELL, h: p.h * CELL }))),
];

/** Every lot or beach plot a Council road's paved width (and its kerb) reaches onto. */
export function roadRoomProblems(def: CityDef): readonly string[] {
  const boxes = boxesOf(def);
  const out: string[] = [];
  for (const r of def.roads) {
    const reach = halfWidth({ type: r.type, oneWay: false }) + KERB_ROOM;
    for (let i = 1; i < r.cells.length; i++) {
      const [ax, ay] = r.cells[i - 1]!, [bx, by] = r.cells[i]!;
      for (const b of boxes) {
        if (bandMeetsBox(b, ax * CELL, ay * CELL, bx * CELL, by * CELL, reach)) out.push(`the ${r.type} ${ax},${ay} to ${bx},${by} (${(reach * 2).toFixed(0)} px wide) reaches onto ${b.name}`);
      }
    }
  }
  return out;
}
