import { createBrain } from '../bots/brain';
import { CH1_BOTS, type Difficulty } from '../bots/difficulty';
import type { LevelDef, ObjectiveDef } from '../level/types';
import { nearestPassable } from '../nav/grid';
import type { Loadout, Mk, Part } from '../parts';
import type { Match } from './match';
import { addTank } from './spawn';
import type { Tank } from './types';

/**
 * Wingmen (design doc "Rank perks"): a Captain brings one allied tank, a
 * Colonel two. Each is a badger crew of the Ink Brigade with a fixed name,
 * on your own starting tank one Mk lower per part (Mk I at least), spawned
 * beside your start. It follows you and fights what it sees, but it follows
 * your lead: it holds fire on an enemy that hasn't spotted anyone until you
 * fire or it's shot at, so sneaking past still works. Its kills are its own
 * (not yours), it takes no kits, parts, gadgets or prizes, and if it dies the
 * level goes on.
 */
export const WINGMAN_NAMES: readonly string[] = ['Thistle', 'Rowan'];
/** Most wingmen a rank brings. */
export const MAX_WINGMEN = WINGMAN_NAMES.length;
/** How wingmen aim and react. */
export const WINGMAN_BOT: Difficulty = CH1_BOTS;
/** Spawn spots beside the start, along the start heading: (back, side) px. */
const SLOTS: readonly { readonly back: number; readonly side: number }[] = [{ back: 60, side: -60 }, { back: 60, side: 60 }];

/**
 * Objectives a wingman would break: Recon is scouting unseen (a second tank
 * only doubles the chance of being seen, and its reinforcements would bury the level).
 */
const NO_WINGMEN: ReadonlySet<ObjectiveDef['kind']> = new Set(['recon']);

/** Whether a level takes wingmen. */
export const wingmenAllowed = (def: Pick<LevelDef, 'objective'>): boolean => !NO_WINGMEN.has(def.objective.kind);

const lower = (p: Part): Part => ({ family: p.family, mk: Math.max(1, p.mk - 1) as Mk });

/** A wingman's tank: yours one Mk lower per part, never a prototype. */
export const wingmanLoadout = (l: Loadout): Loadout => ({ gun: lower(l.gun), hull: lower(l.hull), drive: lower(l.drive) });

/** Puts up to `n` wingmen beside the player's start (none on a level that doesn't take them). */
export function spawnWingmen(m: Match, n: number, loadout: Loadout): Tank[] {
  const p = m.player;
  if (!p || n <= 0 || !wingmenAllowed(m.level.def)) return [];
  const h = m.level.def.startHeading ?? 0;
  const out: Tank[] = [];
  for (let i = 0; i < Math.min(n, MAX_WINGMEN); i++) {
    const s = SLOTS[i]!;
    const x = p.x - Math.cos(h) * s.back - Math.sin(h) * s.side;
    const y = p.y - Math.sin(h) * s.back + Math.cos(h) * s.side;
    const at = m.navPassable(x, y) ? { x, y } : (nearestPassable(m.nav, x, y, 8) ?? { x: p.x, y: p.y });
    const name = WINGMAN_NAMES[i]!;
    m.usedNames.add(name);
    // No kits (a wingman never takes yours off the ground).
    const t = addTank(m, { name, clan: 'ink', team: 0, loadout: wingmanLoadout(loadout), at, heading: h, kits: 0, maxKits: 0 });
    // A young crew: steady, but chapter 1's aim and trigger finger whatever the chapter (they shouldn't win your fights for you).
    const b = createBrain(t, null, WINGMAN_BOT, m.rng.fork(t.id));
    m.brains.set(t.id, Object.assign(b, { role: 'ally' as const, aware: 'alert' as const, lead: true }));
    m.emit({ kind: 'spawn', tank: t.id });
    out.push(t);
  }
  return out;
}

/** The match's wingmen (ours, following the player's lead). */
export const wingmenOf = (m: Match): Tank[] => m.tanks.filter((t) => t.team === 0 && !t.isPlayer && m.brains.get(t.id)?.lead === true);
