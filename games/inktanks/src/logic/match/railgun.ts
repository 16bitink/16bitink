import { shotHits } from '../bots/perception';
import { segmentHits } from '../geom';
import { canopyEntry, along } from './beam';
import { damageStructure, hitTank } from './combat';
import { igniteOil } from './gadgets';
import { heightMult } from './heights';
import type { Match } from './match';
import type { StructRt, Tank } from './types';

/**
 * The Rail (chapter 5; design doc "Tank stats": 90 every 3 s, 640 px, pierces
 * walls, trees and tanks, a charge-up that shows an aim line). The pull starts
 * a charge (GunSpec.charge, 0.8 s: combat.ts holds the aim and shows the line);
 * then the slug flies at once along it: every tank whose body the line crosses
 * takes the full hit (either side's, as shots do; a boss and each turret on the
 * line separately), every breakable wall, tree and log it passes takes
 * RAILGUN.structShare of it, and only unbreakable rock (cliffs, boulders,
 * ridges) stops it. Our gun towers stand above the fight: it passes them.
 * A 'slug' event carries the line for the view.
 */
export const RAILGUN = { structShare: 0.5, step: 8 } as const;

/** What stops a slug: standing natural rock (cliffs, boulders, ice rocks, ridges, mesas). */
export const stopsRail = (s: StructRt): boolean => s.state !== 0 && s.def.material === 'rock' && s.def.hp <= 0 && !s.def.low && !s.def.deck && !s.def.perch && !s.def.crest;

/** How far a slug from (sx, sy) along (ux, uy) flies before rock stops it (at most `range`). */
export function railReach(m: Match, sx: number, sy: number, ux: number, uy: number, range: number): number {
  const ex = sx + ux * range;
  const ey = sy + uy * range;
  let len = range;
  const ids = m.grid.query({ x0: Math.min(sx, ex), y0: Math.min(sy, ey), x1: Math.max(sx, ex), y1: Math.max(sy, ey) });
  for (const i of ids) {
    const s = m.structs[i]!;
    if (!stopsRail(s) || !segmentHits(s.def.shape, s.def.x, s.def.y, sx, sy, ex, ey)) continue;
    for (let d = 0; d < len; d += RAILGUN.step) {
      const b = Math.min(len, d + RAILGUN.step);
      if (segmentHits(s.def.shape, s.def.x, s.def.y, sx + ux * d, sy + uy * d, sx + ux * b, sy + uy * b)) {
        len = d;
        break;
      }
    }
  }
  return len;
}

/** A slug's line from a to b is clear of rock (what a Rail bot checks before it fires through cover). */
export function railClear(m: Match, ax: number, ay: number, bx: number, by: number): boolean {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return true;
  return railReach(m, ax, ay, (bx - ax) / len, (by - ay) / len, len) >= len - 1;
}

/** Fires one slug from the muzzle (sx, sy) along `angle`. */
export function fireRail(m: Match, t: Tank, sx: number, sy: number, angle: number): void {
  const g = t.stats.gun;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const len = railReach(m, sx, sy, ux, uy, g.range * heightMult(m, t));
  const x1 = sx + ux * len;
  const y1 = sy + uy * len;
  let hits = 0;
  const reachOf = (o: Tank): number => (o.role === 'boss' ? o.stats.radius * 0.55 : o.stats.radius + (o.role === 'bossTurret' ? 8 : 3));
  // Collect first, then hit: a kill mid-loop mustn't change who else is on the line.
  const struck = m.tanks.filter((o) => shotHits(t, t.team, o) && !(o.role === 'bossTurret' && o.parent === null) && (along(o, sx, sy, ux, uy, reachOf(o)) ?? Infinity) < len);
  for (const o of struck) {
    hitTank(m, o, g.damage, g.family, t.id);
    hits++;
    if (o.team === t.team) m.emit({ kind: 'friendly', x: o.x, y: o.y, target: o.id });
    else t.shotsHit++;
    m.emit({ kind: 'hit', x: o.x, y: o.y, target: o.id, dmg: g.damage, shot: 'rail' });
  }
  splinter(m, sx, sy, ux, uy, len, g.damage * RAILGUN.structShare, g.breaksBrick);
  m.emit({ kind: 'slug', tank: t.id, x0: sx, y0: sy, x1, y1, hits });
  if (m.gadgets.oils.length > 0) igniteOil(m, t.team, x1, y1);
}

/** Walls, trees and logs the slug passes take `dmg` (cover, decks and our towers don't). */
function splinter(m: Match, sx: number, sy: number, ux: number, uy: number, len: number, dmg: number, breaksBrick: boolean): void {
  const ex = sx + ux * len;
  const ey = sy + uy * len;
  const ids = [...m.grid.query({ x0: Math.min(sx, ex), y0: Math.min(sy, ey), x1: Math.max(sx, ex), y1: Math.max(sy, ey) })];
  for (const i of ids) {
    const s = m.structs[i]!;
    if (s.state === 0 || s.def.hp <= 0 || s.def.cover || s.def.deck || s.def.perch) continue;
    const crossed = s.def.canopy ? canopyEntry(s.def, sx, sy, ux, uy, len) < len : segmentHits(s.def.shape, s.def.x, s.def.y, sx, sy, ex, ey);
    if (crossed) damageStructure(m, i, dmg, breaksBrick);
  }
}
