/** Questions about the network: what is here, and where a block's driveway goes. */
import { CELL } from './constants';
import { dist, lineLength, project, resample, sameCell } from './geom';
import { armHeading, groundArms, ringOuter } from './netCore';
import { closedForWorks, halfWidth } from './roadGeom';
import type { Cell, CellRect, Id, Junction, Pt, Road, RoadType } from './types';
import type { Network } from './trafficTypes';

export type { CellRect };

/** How far a driveway goes, cells. */
const REACH = 2.5;
const SAMPLE = 8;
/** Keep driveways out of junctions. */
const JUNCTION_CLEAR = 30;
const TYPE_COST: Readonly<Record<RoadType, number>> = { street: 0, avenue: 6, boulevard: 14, highway: Infinity };
const CENTRE_PULL = 0.2;
const TAP_SLOP = 12;

function rectDistance(r: CellRect, p: Pt): number {
  const dx = Math.max(r.gx * CELL - p.x, 0, p.x - (r.gx + r.w) * CELL);
  const dy = Math.max(r.gy * CELL - p.y, 0, p.y - (r.gy + r.h) * CELL);
  return Math.hypot(dx, dy);
}

/** In front of a block: south of its south edge, within its frontage (every gate is in the south wall). */
const inFront = (r: CellRect, p: Pt): boolean => p.y > (r.gy + r.h) * CELL && p.x >= r.gx * CELL && p.x <= (r.gx + r.w) * CELL;

/** A block's driveway: the best road point within `reach`; with `front`, only on the road along its south edge; with `open`, not on a road under works. */
export function nearestAccess(net: Network, rect: CellRect, reach = REACH, front = false, open = false): { road: Id; s: number } | null {
  const centre = { x: (rect.gx + rect.w / 2) * CELL, y: (rect.gy + rect.h / 2) * CELL };
  let best: { road: Id; s: number } | null = null;
  let bestScore = Infinity;
  for (const r of net.roads) {
    if (r.flyover || r.bridge || r.type === 'highway' || r.level !== 0 || (open && closedForWorks(r))) continue;
    const len = lineLength(r.line);
    const clear = Math.min(len * 0.45, JUNCTION_CLEAR);
    const pts = resample(r.line, SAMPLE);
    pts.forEach((p, i) => {
      const s = (len * i) / (pts.length - 1);
      const d = rectDistance(rect, p);
      if (d > reach * CELL || s < clear || s > len - clear || (front && !inFront(rect, p))) return;
      const score = d + TYPE_COST[r.type] + dist(p, centre) * CENTRE_PULL;
      if (score < bestScore) { bestScore = score; best = { road: r.id, s }; }
    });
  }
  return best;
}

/** The player's junction at a vertex (never a ramp). */
export function junctionAt(net: Network, cell: Cell): Junction | undefined {
  return net.junctions.find((j) => !j.ramp && sameCell(j.cell, cell));
}

/** The road at a place; fractions of a cell are fine. Ground roads first, then decks. */
export function roadAt(net: Network, cell: Cell): Road | undefined {
  const p = { x: cell.gx * CELL, y: cell.gy * CELL };
  let best: Road | undefined;
  let bestD = Infinity;
  for (const r of net.roads) {
    const d = project(r.line, p).d;
    if (d > halfWidth(r) + TAP_SLOP) continue;
    const score = d + (r.flyover ? CELL : 0);
    if (score < bestD) { bestD = score; best = r; }
  }
  return best;
}

/** Is there space for a ring here? A player-readable reason if not. */
export function roundaboutFits(net: Network, node: Id): { readonly ok: boolean; readonly why?: string } {
  const j = net.junctions.find((n) => n.id === node);
  if (!j || j.ramp) return { ok: false, why: 'No junction here' };
  const arms = groundArms(j.arms.map((id) => net.roads.find((r) => r.id === id)!));
  if (arms.length < 3) return { ok: false, why: 'A roundabout needs three roads' };
  const outer = ringOuter(arms);
  if (arms.some((r) => lineLength(r.line) < outer + CELL * 0.75)) return { ok: false, why: 'Too little space: the next junction is too near' };
  return { ok: true };
}

/** Direction an arm leaves the junction, radians. */
export function armDirection(net: Network, node: Id, road: Id): number {
  const r = net.roads.find((q) => q.id === road);
  return r ? armHeading(r, node) : 0;
}
