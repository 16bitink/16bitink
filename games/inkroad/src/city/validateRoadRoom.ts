import { CELL } from '../sim/constants';
import { halfWidth } from '../sim/roadGeom';
import type { CityDef } from '../sim/types';

/**
 * Real lanes (the owner, November 28: 3.1 m lanes) make roads wide: an eight-lane highway is 92 px, more than two
 * cells. No lot may stand on a Council road's paved width; this is the width check the vertex rule (a road a cell off
 * every lot) cannot make. Pure.
 */
interface Box { readonly name: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Clear px a lot keeps from a road's paved edge (its kerb stone). */
export const KERB_ROOM = 1;

/** True when a point lies on the paved band of segment a-b: beside its run (not past its ends) and within reach. */
function onBand(px: number, py: number, ax: number, ay: number, bx: number, by: number, reach: number): boolean {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  const t = ((px - ax) * dx + (py - ay) * dy) / len;
  return t > 0 && t < len && Math.abs((px - ax) * dy - (py - ay) * dx) / len < reach;
}

/**
 * Does the band reach onto the box? Its rim is walked every px. The band stops at the segment's ends: where a wide
 * road meets a narrow one the junction tapers between them (src/render/ground/roadShape.ts), so it is not a round cap.
 */
function bandMeetsBox(b: Box, ax: number, ay: number, bx: number, by: number, reach: number): boolean {
  const rim = (k: number): readonly [number, number] => {
    const w = b.w, h = b.h;
    if (k < w) return [b.x + k, b.y];
    if (k < w + h) return [b.x + w, b.y + k - w];
    if (k < 2 * w + h) return [b.x + 2 * w + h - k, b.y + h];
    return [b.x, b.y + 2 * (w + h) - k];
  };
  for (let k = 0; k < 2 * (b.w + b.h); k++) { const [x, y] = rim(k); if (onBand(x, y, ax, ay, bx, by, reach)) return true; }
  return false;
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
