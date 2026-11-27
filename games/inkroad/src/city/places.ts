import { CELL } from '../sim/constants';
import type { Access } from '../sim/trafficTypes';
import type { Id, Lot, Pt } from '../sim/types';
import { blockAccess } from './net';
import { areaOf, centreOf, lotRect, pointAlong } from './geometry';
import type { Place } from './day';
import { reachOf } from './rules/beach';
import type { City } from './state';
import { junctionById, lotById, roadById } from './state';

/** Where a place's cars enter and leave the road, or null when it is cut off. */
export function accessOf(c: City, p: Place): Access | null {
  if ('gate' in p) return { gate: p.gate };
  return lotById(c, p.lot)?.access ?? null;
}

export function pointOf(c: City, p: Place): Pt {
  if ('gate' in p) {
    const j = junctionById(c, p.gate);
    return j ? { x: j.x, y: j.y } : { x: 0, y: 0 };
  }
  const l = lotById(c, p.lot);
  return l ? centreOf(l) : { x: 0, y: 0 };
}

export function accessPoint(c: City, a: Access): Pt {
  if ('gate' in a) return pointOf(c, a);
  const r = roadById(c, a.road);
  return r ? pointAlong(r.line, a.s) : { x: 0, y: 0 };
}

export function nameOf(c: City, p: Place): string {
  if ('lot' in p) return lotById(c, p.lot)?.name ?? 'somewhere';
  const gate = junctionById(c, p.gate)?.gate;
  return c.def.gates.find((g) => g.id === gate)?.name ?? 'the highway';
}

/** The closest named block to a point, for "the junction by Palm Row". */
export function nearName(c: City, at: Pt): string {
  let best: Lot | null = null;
  let d = Infinity;
  for (const l of c.lots) {
    if (l.level === 0) continue;
    const m = centreOf(l);
    const e = Math.hypot(m.x - at.x, m.y - at.y);
    if (e < d) { d = e; best = l; }
  }
  return best?.name ?? c.def.name;
}

/** A lot's driveway. In a city of front streets a lot is served only by the road along its south edge (beach plots by any). */
export function lotAccess(c: City, l: Lot): Lot['access'] {
  const reach = reachOf(l);
  return blockAccess(c.net, l, reach, c.def.frontStreets === true && reach === undefined);
}

/** Give every open block and car park its driveway again (after a network change). */
export function refreshAccess(c: City): void {
  c.lots = c.lots.map((l) => (l.level === 0 ? l : { ...l, access: lotAccess(c, l) }));
  c.parks = c.parks.map((p) => ({ ...p, access: blockAccess(c.net, p) }));
}

export const gateNodes = (c: City): ReadonlyMap<string, Id> =>
  new Map(c.net.junctions.flatMap((j) => (j.gate ? [[j.gate, j.id] as const] : [])));

export const cellsBetween = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y) / CELL;
export { areaOf, lotRect };
