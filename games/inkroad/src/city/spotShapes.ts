import { CELL } from '../sim/constants';
import { pointAt } from '../sim/geom';
import { layoutOf as shapeLayout, nearestGround, type SlotLayout } from '../sim/slotGeometry';
import type { Access } from '../sim/trafficTypes';
import type { BeachDef, CarPark, Lot, Pt, Road } from '../sim/types';

/**
 * The drawn slots of each off-road place, from the same geometry the renderer reads (lots, car parks, beaches and
 * roads of the view), through the shared layout (src/sim/slotGeometry.ts). Pure.
 */

/** Where a driveway meets its road (the point the slots face). */
export function accessPt(roads: readonly Road[], a: Access | null | undefined): Pt | null {
  if (!a || !('road' in a)) return null;
  const road = roads.find((r) => r.id === a.road);
  if (!road || road.line.length < 2) return null;
  const p = pointAt(road.line, a.s);
  return { x: p.x, y: p.y };
}

export const lotLayout = (roads: readonly Road[], l: Lot): SlotLayout =>
  shapeLayout({ kind: l.kind === 'home' ? 'home' : 'private', lot: l, from: accessPt(roads, l.access) });

export const parkLayout = (roads: readonly Road[], p: CarPark): SlotLayout =>
  shapeLayout({ kind: 'park', park: p, from: accessPt(roads, p.access) });

export function sandLayout(roads: readonly Road[], b: Pick<BeachDef, 'gx' | 'gy' | 'w' | 'h'>): SlotLayout {
  const mid = { x: (b.gx + b.w / 2) * CELL, y: (b.gy + b.h / 2) * CELL };
  return shapeLayout({ kind: 'sand', rect: b, road: nearestGround(roads, mid) });
}
