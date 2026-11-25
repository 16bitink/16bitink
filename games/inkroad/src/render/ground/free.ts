import { lotRect } from '../../city/geometry';
import type { Pt } from '../../sim/types';
import { boxesMeet, boxOf, nearestOnLine, type Box } from '../geom';
import { hash2 } from '../noise';
import { planned, type LotScene } from './lotsGround';
import { kerbOf, type RoadScene } from './roadShape';

/** Is a spot clear of roads, junctions, lots and car parks? `pad` px of margin. */
export type Clear = (p: Pt, pad: number) => boolean;
const NEAR = 48;

/** A test for the ground in `box` (null: everywhere). Built once per bake. */
export function clearIn(net: RoadScene, ls: LotScene, box: Box | null): Clear {
  const wide = box ? { x0: box.x0 - NEAR, y0: box.y0 - NEAR, x1: box.x1 + NEAR, y1: box.y1 + NEAR } : null;
  const roads = net.roads
    .map((r) => ({ r, w: r.half + kerbOf(r.road), b: boxOf(r.line, r.half + kerbOf(r.road) + NEAR) }))
    .filter((q) => !wide || boxesMeet(q.b, wide));
  const joins = net.joins.filter((j) => j.kind !== 'ramp' && (!wide || boxesMeet(j.box, wide)));
  const blocks = [...ls.lots.filter((l) => l.level > 0 || planned(l, ls.year)), ...ls.parks].map((l) => lotRect(l));
  return (p, pad) => {
    for (const b of blocks) if (p.x > b.x - pad && p.x < b.x + b.w + pad && p.y > b.y - pad && p.y < b.y + b.h + pad) return false;
    for (const j of joins) if (Math.hypot(j.j.x - p.x, j.j.y - p.y) < j.j.radius + pad + 8) return false;
    for (const { r, w, b } of roads) {
      if (p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) continue;
      if (nearestOnLine(r.line, p).d < w + pad) return false;
    }
    return true;
  };
}

/** Jittered grid cells that touch `box`, anchored to the world so a square's neighbour agrees. */
export function spotsIn(box: Box, step: number, seed: number): { x: number; y: number; a: number; b: number; c: number }[] {
  const out = [];
  for (let j = Math.floor(box.y0 / step); j * step < box.y1; j++) {
    for (let i = Math.floor(box.x0 / step); i * step < box.x1; i++) {
      const h = (k: number): number => hash2(i, j, seed + k);
      out.push({ x: (i + 0.15 + 0.7 * h(1)) * step, y: (j + 0.15 + 0.7 * h(2)) * step, a: h(3), b: h(4), c: h(5) });
    }
  }
  return out;
}
