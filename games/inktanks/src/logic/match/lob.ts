import { spinePoint } from './body';
import { igniteOil } from './gadgets';
import type { GunStats } from '../stats';
import { clamp, wrapAngle } from '../vec';
import { damageStructure, hitTank } from './combat';
import type { Match } from './match';
import { shotHits } from '../bots/perception';
import type { Shot, Tank } from './types';

/**
 * Lobbed shells, the Mortar (chapter 2; design doc "Tank stats"). A lob is
 * fired at a spot on the ground between the gun's minimum and maximum range,
 * flies over walls, low cover and tanks on the way, and bursts where it
 * lands: everything inside the blast (splash + the target's radius) takes the
 * whole hit, structures included. The landing spot is announced (a 'lob'
 * event, and the shot carries it) so the view can ring it while it falls.
 */

/** A lob's spread along its range, as a share (on top of the gun's angle spread). */
export const LOB_RANGE_SPREAD = 0.05;
/** Arc height at the top of the flight, as a share of the lob's length (the view's shell and shadow). */
export const LOB_ARC = 0.32;
/** The auto-range assist (touch aiming, no distance): enemies within this angle of the aim count. */
const AUTO_CONE = 0.3;

/** The distance a lob of `want` px really flies: within the gun's min and max range. */
export function lobRange(g: Pick<GunStats, 'minRange' | 'range'>, want: number): number {
  return clamp(want, g.minRange, g.range);
}

export const isLobbed = (g: Pick<GunStats, 'shot'>): boolean => g.shot === 'lob';

/** Fires a lob along `angle` to the tank's aim distance (from its muzzle point `sx, sy`). */
export function fireLob(m: Match, t: Tank, sx: number, sy: number, angle: number): Shot {
  const g = t.stats.gun;
  const dist = lobRange(g, t.aimDist) * (1 + m.rng.range(-LOB_RANGE_SPREAD, LOB_RANGE_SPREAD));
  const fromCentre = Math.hypot(sx - t.x, sy - t.y);
  const len = Math.max(20, dist - fromCentre);
  const tx = sx + Math.cos(angle) * len;
  const ty = sy + Math.sin(angle) * len;
  const shot: Shot = {
    id: m.nextId++, owner: t.id, team: t.team, x: sx, y: sy,
    vx: Math.cos(angle) * g.shotSpeed, vy: Math.sin(angle) * g.shotSpeed,
    travelled: 0, range: len, damage: g.damage, gun: g.family, splash: g.splash, breaksBrick: g.breaksBrick, kind: 'lob', alive: true,
    lob: { sx, sy, tx, ty },
  };
  m.emit({ kind: 'lob', tank: t.id, x: tx, y: ty, r: g.splash, at: m.t + len / g.shotSpeed });
  return shot;
}

/** Moves a lob on; nothing stops it in the air. At the end of its flight it lands. */
export function stepLob(m: Match, s: Shot, dt: number): void {
  const speed = Math.hypot(s.vx, s.vy);
  s.travelled += speed * dt;
  if (s.travelled < s.range) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    return;
  }
  s.x = s.lob!.tx;
  s.y = s.lob!.ty;
  s.alive = false;
  land(m, s);
}

/** The burst: the whole hit to every tank in the blast, and to the structures in it. */
function land(m: Match, s: Shot): void {
  m.emit({ kind: 'explode', x: s.x, y: s.y, r: s.splash });
  const shooter = m.tank(s.owner) ?? null;
  let hit = false;
  for (const t of m.tanks) {
    if (!shotHits(shooter, s.team, t) || (t.role === 'bossTurret' && t.parent === null)) continue;
    const reach = s.splash + (t.role === 'boss' ? t.stats.radius * 0.55 : t.stats.radius);
    const sp = spinePoint(t, s.x, s.y);
    if ((sp.x - s.x) ** 2 + (sp.y - s.y) ** 2 > reach * reach) continue;
    hitTank(m, t, s.damage, s.gun, s.owner);
    if (t.team === s.team) m.emit({ kind: 'friendly', x: t.x, y: t.y, target: t.id });
    else hit = true;
    m.emit({ kind: 'hit', x: t.x, y: t.y, target: t.id, dmg: s.damage, shot: 'lob' });
  }
  if (hit && shooter) shooter.shotsHit++;
  const ids = m.grid.query({ x0: s.x - s.splash, y0: s.y - s.splash, x1: s.x + s.splash, y1: s.y + s.splash });
  for (const i of [...ids]) damageStructure(m, i, s.damage, s.breaksBrick);
  if (m.gadgets.oils.length > 0) igniteOil(m, s.team, s.x, s.y);
}

/**
 * Aiming a lob with no distance given (a thumbstick): the nearest enemy
 * within AUTO_CONE of the aim, else the last distance. Mouse aim gives the
 * distance itself (the cursor).
 */
export function autoRange(m: Match, t: Tank, aim: number): number {
  let best: number | null = null;
  for (const o of m.tanks) {
    if (!o.alive || o.team === t.team || o.role === 'crew') continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d > t.stats.gun.range + 60) continue;
    if (Math.abs(wrapAngle(Math.atan2(o.y - t.y, o.x - t.x) - aim)) > AUTO_CONE) continue;
    if (best === null || d < best) best = d;
  }
  return best ?? t.aimDist;
}

/** Where a tank's next lob would land now (the player's reticle). */
export function lobSpot(t: Tank): { x: number; y: number } {
  const d = lobRange(t.stats.gun, t.aimDist);
  return { x: t.x + Math.cos(t.turret) * d, y: t.y + Math.sin(t.turret) * d };
}
