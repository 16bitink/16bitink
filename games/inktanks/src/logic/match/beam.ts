import { LOW_PASS, shotBlocker, shotHits } from '../bots/perception';
import { segmentHits } from '../geom';
import type { StructureDef } from '../land';
import { spinePoint } from './body';
import { heightMult } from './heights';
import { damageStructure, hitTank } from './combat';
import { igniteOil } from './gadgets';
import type { Match } from './match';
import type { Tank } from './types';

/**
 * The Laser (chapter 4; design doc "Tank stats": 35 heat every 0.9 s, 480 px,
 * instant beam). No projectile: the pull of the trigger traces the beam from
 * the muzzle along the turret at once, and it stops on the first thing in its
 * way: a tank (any side's, as shots do: an enemy's beam can burn its own) or
 * a wall. Low cover is passed in the beam's first LOW_PASS px, as a shot
 * flies over it; cover, crests, decks and our gun towers never stop it. A
 * stopped beam scorches the structure (wood, trees, fuel and snowdrifts burn;
 * brick and stone don't). A 'beam' event carries the line for the view.
 */
export const BEAM_STEP = 6;

/** Fires one beam from the muzzle (sx, sy) along `angle`. */
export function fireBeam(m: Match, t: Tank, sx: number, sy: number, angle: number): void {
  const g = t.stats.gun;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // High ground (heights.ts) carries the beam further.
  const range = g.range * heightMult(m, t);
  const ex = sx + ux * range;
  const ey = sy + uy * range;
  // The wall it meets first (the shot rule, from the tank's centre), and how far along the beam that is.
  const wall = shotBlocker(m, t.x, t.y, ex, ey);
  let len = range;
  if (wall) len = wallDistance(wall.def, sx, sy, ux, uy, range);
  // The nearest tank the beam's line touches before the wall.
  let hit: Tank | null = null;
  const reachOf = (o: Tank): number => (o.role === 'boss' ? o.stats.radius * 0.55 : o.stats.radius + (o.role === 'bossTurret' ? 8 : 3));
  for (const o of m.tanks) {
    if (!shotHits(t, t.team, o) || (o.role === 'bossTurret' && o.parent === null)) continue;
    const k = along(o, sx, sy, ux, uy, reachOf(o));
    if (k === null || k >= len) continue;
    len = k;
    hit = o;
  }
  // Over a boss's deck, a turret it carries on the beam's line is hit before the hull under it.
  if (hit?.role === 'boss') {
    const body = hit;
    const turret = m.tanks.find((u) => u.alive && u.parent === body.id && along(u, sx, sy, ux, uy, reachOf(u)) !== null);
    if (turret) hit = turret;
  }
  const x1 = sx + ux * len;
  const y1 = sy + uy * len;
  m.emit({ kind: 'beam', tank: t.id, x0: sx, y0: sy, x1, y1, hit: hit !== null || wall !== null });
  if (hit) {
    hitTank(m, hit, g.damage, g.family, t.id);
    if (hit.team === t.team) m.emit({ kind: 'friendly', x: hit.x, y: hit.y, target: hit.id });
    else t.shotsHit++;
    m.emit({ kind: 'hit', x: x1, y: y1, target: hit.id, dmg: g.damage, shot: 'beam' });
  } else if (wall) {
    damageStructure(m, m.structs.indexOf(wall), g.damage, g.breaksBrick);
    m.emit({ kind: 'hit', x: x1, y: y1, target: null, dmg: g.damage, shot: 'beam' });
  }
  if (m.gadgets.oils.length > 0) igniteOil(m, t.team, x1, y1);
}

/** How far along the beam (from the muzzle) its line enters a body of `reach` round the tank's spine, or null if it misses. */
export function along(o: Tank, sx: number, sy: number, ux: number, uy: number, reach: number): number | null {
  // Project the body's spine point nearest the beam's line.
  const k0 = (o.x - sx) * ux + (o.y - sy) * uy;
  const p = spinePoint(o, sx + ux * k0, sy + uy * k0);
  const k = (p.x - sx) * ux + (p.y - sy) * uy;
  const off = Math.abs((p.x - sx) * uy - (p.y - sy) * ux);
  if (off > reach || k < -reach) return null;
  return Math.max(0, k - Math.sqrt(reach * reach - off * off));
}

/** Where along the beam it meets this structure, stepping BEAM_STEP px (low cover counts only past LOW_PASS). */
function wallDistance(s: StructureDef, sx: number, sy: number, ux: number, uy: number, range: number): number {
  const from = s.low ? LOW_PASS : 0;
  // A tree's canopy (chapter 5): where the beam enters its circle.
  if (s.canopy) return canopyEntry(s, sx, sy, ux, uy, range);
  for (let d = from; d < range; d += BEAM_STEP) {
    const a = d;
    const b = Math.min(range, d + BEAM_STEP);
    if (segmentHits(s.shape, s.x, s.y, sx + ux * a, sy + uy * a, sx + ux * b, sy + uy * b)) return a;
  }
  return range;
}

/** How far along a line from (sx, sy) along (ux, uy) it enters a canopy's circle (0 if it starts inside), capped at `range`. */
export function canopyEntry(s: StructureDef, sx: number, sy: number, ux: number, uy: number, range: number): number {
  const r = s.canopy ?? 0;
  const k = (s.x - sx) * ux + (s.y - sy) * uy;
  const off2 = (s.x - sx - ux * k) ** 2 + (s.y - sy - uy * k) ** 2;
  if (off2 > r * r) return range;
  return Math.max(0, Math.min(range, k - Math.sqrt(r * r - off2)));
}
