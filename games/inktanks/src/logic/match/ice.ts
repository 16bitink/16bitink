import { CELL, GROUNDS } from '../land';
import { nearestPassable } from '../nav/grid';
import { hitTank } from './combat';
import { washAshore } from './flood';
import type { Match } from './match';
import type { Tank } from './types';

/**
 * Thin ice (chapter 4, level 31 "Thin Ice"; design doc "Chapter 4"). A Heavy
 * hull on it cracks it at once (a 'crack' event: the HUD's warning and the
 * crack decal); after `give` s on thin ice it gives way: the thin ice within
 * `hole` px turns to open water for good (both nav grids follow, the ground
 * repaints), and the tank drops through. The rule (decided Nov 14): it isn't
 * lost, it takes `damage` of its full HP and is hauled back to the nearest
 * firm ground, so a Heavy player can blunder once and live, and the hole
 * stays as a new obstacle. A Heavy dropped this way by an enemy's recent hit
 * credits the kill to them. Lighter hulls cross thin ice like ice.
 * Leaving thin ice lets the cracks settle again at `settle` × the rate.
 */
export const THIN_ICE = { give: 1.4, hole: 70, damage: 0.45, settle: 2, credit: 6 } as const;

const THIN = GROUNDS.indexOf('thinIce');
const WATER = GROUNDS.indexOf('water');

/** Whether this tank is heavy enough to break thin ice: Heavy hulls on the ground (not Hover, not the boss). */
const breaks = (t: Tank): boolean => t.alive && t.stats.hull === 'heavy' && !t.stats.floats && !t.keel && t.role !== 'boss' && t.role !== 'bossTurret' && t.parent === null;

function onThin(m: Match, t: Tank): boolean {
  const gx = Math.floor(t.x / CELL);
  const gy = Math.floor(t.y / CELL);
  if (gx < 0 || gy < 0 || gx >= m.land.gridCols || gy >= m.land.gridRows) return false;
  return m.land.ground[gy * m.land.gridCols + gx] === THIN;
}

/** Each step: Heavy hulls on thin ice crack it, and after THIN_ICE.give s they go through. */
export function stepIce(m: Match, dt: number): void {
  if (!m.hasThinIce) return;
  for (const t of m.tanks) {
    if (!breaks(t)) continue;
    if (!onThin(m, t)) {
      t.iceT = Math.max(0, t.iceT - dt * THIN_ICE.settle);
      continue;
    }
    if (t.iceT === 0) m.emit({ kind: 'ice', what: 'crack', x: t.x, y: t.y, tank: t.id, r: t.stats.radius });
    t.iceT += dt;
    if (t.iceT >= THIN_ICE.give) giveWay(m, t);
  }
}

/** The thin ice under `t` gives way: a hole of open water, and the tank is hauled out hurt. */
export function giveWay(m: Match, t: Tank): void {
  const l = m.land;
  const cells: number[] = [];
  const r = THIN_ICE.hole;
  for (let gy = Math.max(0, Math.floor((t.y - r) / CELL)); gy <= Math.min(l.gridRows - 1, Math.floor((t.y + r) / CELL)); gy++) {
    for (let gx = Math.max(0, Math.floor((t.x - r) / CELL)); gx <= Math.min(l.gridCols - 1, Math.floor((t.x + r) / CELL)); gx++) {
      const i = gy * l.gridCols + gx;
      if (l.ground[i] !== THIN || ((gx + 0.5) * CELL - t.x) ** 2 + ((gy + 0.5) * CELL - t.y) ** 2 > r * r) continue;
      l.ground[i] = WATER;
      cells.push(i);
    }
  }
  // The cell under it is thin ice even if its centre lies outside the circle.
  const under = Math.floor(t.y / CELL) * l.gridCols + Math.floor(t.x / CELL);
  if (l.ground[under] === THIN) {
    l.ground[under] = WATER;
    cells.push(under);
  }
  m.navs.regrade(cells);
  t.iceT = 0;
  const at = { x: t.x, y: t.y };
  m.emit({ kind: 'ice', what: 'break', x: at.x, y: at.y, tank: t.id, r });
  m.emit({ kind: 'flood', by: 'ice', x: at.x, y: at.y, cells: cells.length });
  // Hauled back to firm ground (a Heavy's grid has thin ice closed), stopped dead.
  const to = nearestPassable(m.navFor(t).nav, t.x, t.y, 20);
  if (to) {
    t.x = to.x;
    t.y = to.y;
  }
  t.speed = 0;
  t.slide = null;
  // Anyone else on the ice that went is washed out too.
  washAshore(m);
  const by = t.lastHitBy !== null && m.t - t.lastHitAt < THIN_ICE.credit ? t.lastHitBy : null;
  hitTank(m, t, t.stats.maxHp * THIN_ICE.damage, 'cannon', by, true);
}
