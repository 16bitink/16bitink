import { shotBlocker, shotHits } from '../bots/perception';
import { shapeBounds } from '../geom';
import { spinePoint } from './body';
import { wrapAngle } from '../vec';
import { damageStructure, hitTank } from './combat';
import { igniteOil } from './gadgets';
import type { Match } from './match';
import { breakStructure } from './movement';
import type { Tank } from './types';
import { blockFire, TREE_FIRE, treeFireRule, unblockFire } from './forestFire';

/**
 * The Flamer (chapter 3; design doc "Tank stats": 5 heat a tick, a 150 px
 * cone). It fires no projectile: every pull of the trigger (a tick, 0.1 s) the
 * stream burns every tank in its cone that no wall shields from the nozzle
 * (the shot rule: low cover is licked over in its first 50 px), scorches
 * wood, trees and fuel in it, and sets burnable structures (reeds) alight.
 *
 * A burning structure (`StructureDef.burns`) burns FIRE.burn s: every
 * FIRE.tick it hurts every tank on it (heat, through counters and heat
 * armour; anyone's, the one who lit it too), after FIRE.spread s it lights
 * the burnable structures within FIRE.reach of it, and then it is burnt out
 * (broken: no longer cover). While it burns it hides no one.
 * The same approach as a Mk V oil slick alight (gadgets.ts).
 */
export const FIRE = { burn: 5, tick: 0.5, damage: 10, spread: 1.4, reach: 85 } as const;

export interface Fire {
  /** The structure's index in m.structs. */
  readonly i: number;
  readonly x: number;
  readonly y: number;
  /** Its burning radius: the structure's half-size. */
  readonly r: number;
  /** Who lit the chain (kills and blueprints are theirs), or null. */
  readonly from: number | null;
  readonly at: number;
  readonly until: number;
  tick: number;
  spreadAt: number;
  /** A tree alight (chapter 5, forestFire.ts): a longer, slower blaze; it closes the nav grid round it while it burns. */
  readonly tree: boolean;
  /** Its place in the chain from the first fire, and how far the chain may run (a Flamer's tree fire dies out; reeds never do). */
  readonly gen: number;
  readonly limit: number;
}

export interface Fires {
  list: Fire[];
  /** Structure indices alight now. */
  readonly burning: Set<number>;
}

export const newFires = (): Fires => ({ list: [], burning: new Set() });

/** One tick of a Flamer's stream from its nozzle (sx, sy) along `angle`. */
export function fireFlame(m: Match, t: Tank, sx: number, sy: number, angle: number): void {
  const g = t.stats.gun;
  const half = g.cone / 2;
  let hit = false;
  for (const o of m.tanks) {
    if (!shotHits(t, t.team, o) || (o.role === 'bossTurret' && o.parent === null)) continue;
    const reach = o.role === 'boss' ? o.stats.radius * 0.55 : o.stats.radius;
    // A long body (the train) is reached at the part of it nearest the nozzle's line.
    const k = Math.max(0, (o.x - sx) * Math.cos(angle) + (o.y - sy) * Math.sin(angle));
    const c = spinePoint(o, sx + Math.cos(angle) * k, sy + Math.sin(angle) * k);
    const d = Math.hypot(c.x - sx, c.y - sy);
    if (d - reach > g.range) continue;
    // In the cone, or close enough that its hull pokes into it.
    const off = Math.abs(wrapAngle(Math.atan2(c.y - sy, c.x - sx) - angle));
    if (off > half + Math.atan2(reach, Math.max(1, d))) continue;
    if (shotBlocker(m, t.x, t.y, o.x, o.y) !== null) continue;
    hitTank(m, o, g.damage, g.family, t.id);
    if (o.team === t.team) m.emit({ kind: 'friendly', x: o.x, y: o.y, target: o.id });
    else hit = true;
  }
  if (hit) t.shotsHit++;
  burnStructures(m, t, sx, sy, angle, half, g.range, g.damage);
  if (m.gadgets.oils.length > 0) igniteOil(m, t.team, sx + Math.cos(angle) * g.range * 0.7, sy + Math.sin(angle) * g.range * 0.7);
}

/** Wood, trees and fuel in the cone scorch; burnable ones (reeds) catch. */
function burnStructures(m: Match, t: Tank, sx: number, sy: number, angle: number, half: number, range: number, dmg: number): void {
  const ids = m.grid.query({ x0: sx - range, y0: sy - range, x1: sx + range, y1: sy + range });
  for (const i of [...ids]) {
    const s = m.structs[i]!;
    if (s.state === 0 || s.def.hp <= 0) continue;
    const d = Math.hypot(s.def.x - sx, s.def.y - sy);
    if (d > range) continue;
    if (Math.abs(wrapAngle(Math.atan2(s.def.y - sy, s.def.x - sx) - angle)) > half + Math.atan2(30, Math.max(1, d))) continue;
    if (shotBlocker(m, t.x, t.y, s.def.x, s.def.y, s.def.id) !== null) continue;
    if (s.def.burns) ignite(m, i, t.id);
    else damageStructure(m, i, dmg, false);
  }
}

/**
 * Sets a burnable structure alight (once). `chain`: its generation and the
 * chain's limit (default: a first fire; a tree lit by a Flamer may spread
 * TREE_FIRE.flamerHops trees, reeds without end).
 */
export function ignite(m: Match, i: number, from: number | null, chain?: { readonly gen: number; readonly limit: number }): boolean {
  const s = m.structs[i]!;
  if (!s.def.burns || s.state === 0 || m.fires.burning.has(i)) return false;
  const tree = s.def.canopy !== undefined;
  const b = shapeBounds(s.def.shape, s.def.x, s.def.y);
  const r = tree ? s.def.canopy! + 6 : Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 6;
  const rule = tree ? treeFireRule(m) : FIRE;
  const { gen, limit } = chain ?? { gen: 0, limit: tree ? TREE_FIRE.flamerHops : Infinity };
  m.fires.list.push({ i, x: s.def.x, y: s.def.y, r, from, at: m.t, until: m.t + rule.burn, tick: m.t + FIRE.tick, spreadAt: m.t + rule.spread, tree, gen, limit });
  m.fires.burning.add(i);
  if (tree) blockFire(m, s);
  m.emit({ kind: 'burn', x: s.def.x, y: s.def.y, id: s.def.id, what: 'alight', tree: tree || undefined });
  return true;
}

/** Burning structures hurt tanks on them, spread, and burn out. */
export function stepFires(m: Match): void {
  const f = m.fires;
  if (f.list.length === 0) return;
  for (const fire of [...f.list]) {
    if (m.t >= fire.until) {
      f.burning.delete(fire.i);
      // A tree burns out to its charred snag (state 0): its canopy no longer blocks, the way through reopens.
      if (fire.tree) unblockFire(m, m.structs[fire.i]!);
      breakStructure(m, fire.i);
      m.emit({ kind: 'burn', x: fire.x, y: fire.y, id: m.structs[fire.i]!.def.id, what: 'out', tree: fire.tree || undefined });
      continue;
    }
    if (m.t >= fire.tick) {
      fire.tick += FIRE.tick;
      const from = fire.from !== null && m.tank(fire.from) ? fire.from : null;
      const dmg = fire.tree ? treeFireRule(m).damage : FIRE.damage;
      for (const o of m.tanks) {
        if (!o.alive || o.role === 'boss' || o.role === 'bossTurret') continue;
        const reach = fire.r + o.stats.radius * 0.5;
        if ((o.x - fire.x) ** 2 + (o.y - fire.y) ** 2 <= reach * reach) hitTank(m, o, dmg, 'flamer', from);
      }
    }
    if (m.t >= fire.spreadAt) {
      fire.spreadAt = Infinity;
      if (fire.gen >= fire.limit) continue;
      const reach = fire.tree ? treeFireRule(m).reach : FIRE.reach;
      const chain = { gen: fire.gen + 1, limit: fire.limit };
      const ids = m.grid.query({ x0: fire.x - reach, y0: fire.y - reach, x1: fire.x + reach, y1: fire.y + reach });
      for (const i of [...ids]) {
        const s = m.structs[i]!;
        if (s.def.burns && Math.hypot(s.def.x - fire.x, s.def.y - fire.y) <= reach) ignite(m, i, fire.from, chain);
      }
    }
  }
  f.list = f.list.filter((x) => m.t < x.until);
}
