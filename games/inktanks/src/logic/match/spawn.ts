import { gadgetCharges } from '../gadgetTiers';
import { DRIVES, type DriveFamily, type Mk } from '../parts';
import { MK1_GADGETS } from './gadgets';
import { createBrain } from '../bots/brain';
import { ACE_BOT } from '../bots/difficulty';
import { isDrivable } from '../land';
import type { ResolvedEnemy, ResolvedFriend } from '../level/load';
import type { Loadout } from '../parts';
import type { Rng } from '../rng';
import { tankStats, type Research } from '../stats';
import { nearestPassable, passable } from '../nav/grid';
import { angleTo, type Pt } from '../vec';
import type { Match } from './match';
import { CLAN_CREW, crewName } from './names';
import type { Clan, GadgetKind, Tank, TankRole } from './types';

export interface TankSpec {
  readonly name: string;
  /** The crew's animal (default: the clan's). */
  readonly crew?: string;
  readonly clan: Clan;
  readonly team: number;
  readonly role?: TankRole;
  readonly isPlayer?: boolean;
  readonly ace?: boolean;
  readonly loadout: Loadout;
  readonly research?: Research;
  readonly kits?: number;
  readonly maxKits?: number;
  readonly hpMult?: number;
  readonly speedMult?: number;
  readonly at: Pt;
  readonly heading?: number;
  readonly gadget?: GadgetKind | null;
  /** Default: the gadget's charges at its Mk. */
  readonly gadgetCharges?: number;
  readonly gadgetMk?: Readonly<Record<GadgetKind, Mk>>;
}

/** Where a lobbed gun aims before it's told (a mid-range lob). */
const LOB_START = 360;

/** Enemy clans share one team: they fight you, not each other (but see CLAN_TEAM). */
export const ENEMY_TEAM = 1;
/** A clan war (chapter 5, LevelDef.clanWar: "the clans fight each other too"): each clan its own side. */
export const CLAN_TEAM: Readonly<Record<Clan, number>> = { hive: 1, boars: 2, weasels: 3, crows: 4, ink: 0 };
/** A truck's body, in place of tank stats. */
export const TRUCK = { radius: 24, armour: 10 } as const;

export function addTank(m: Match, spec: TankSpec): Tank {
  const stats = tankStats(spec.loadout, spec.research);
  const maxHp = stats.maxHp * (spec.hpMult ?? 1);
  const heading = spec.heading ?? 0;
  const t: Tank = {
    id: m.nextId++, name: spec.name, crew: spec.crew ?? CLAN_CREW[spec.clan], clan: spec.clan, team: spec.team, role: spec.role ?? 'tank',
    isPlayer: spec.isPlayer ?? false, ace: spec.ace ?? false, loadout: spec.loadout, research: spec.research ?? {},
    stats: { ...stats, maxHp, speed: stats.speed * (spec.speedMult ?? 1) }, hpMult: spec.hpMult ?? 1, x: spec.at.x, y: spec.at.y, heading, turret: heading, aimDist: LOB_START, slide: null, body: null, keel: false, rail: null, length: 0, iceT: 0, speed: 0,
    hp: maxHp, alive: true, escaped: false, reload: 0, ammo: stats.gun.belt, beltT: 0, idleT: 0, burst: 0, burstT: 0, charge: 0, chargeAngle: 0,
    kits: spec.kits ?? 1, maxKits: spec.maxKits ?? 1, repairT: 0, firedAt: -99, kills: 0,
    lastHitBy: null, lastHitAt: -99, lastHitDrive: null, usedKit: false,
    hullsUsed: [spec.loadout.hull.family as Tank['hullsUsed'][number]], picks: [], swapT: 0, onPart: null, onFullKit: false, carrying: false,
    rolled: 0, parent: null, mount: null, victims: [], deadAt: -1,
    gadget: spec.gadget ?? null, gadgetCharges: spec.gadget ? (spec.gadgetCharges ?? gadgetCharges(spec.gadget, spec.gadgetMk?.[spec.gadget] ?? 1)) : 0, gadgetT: 0,
    found: null, gadgetMk: spec.gadgetMk ?? MK1_GADGETS, trackBrokenUntil: -1, stunnedUntil: -1,
    ambushHits: 0, gadgetsUsed: 0, shotsFired: 0, shotsHit: 0, dealt: 0,
  };
  m.tanks.push(t);
  return t;
}

/** A random drivable point near `around` (within `spread`), snapped to the nav grid. */
export function drivableNear(m: Match, around: Pt, spread: number, rng: Rng): Pt {
  for (let i = 0; i < 30; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * spread;
    const x = around.x + Math.cos(a) * d;
    const y = around.y + Math.sin(a) * d;
    if (isDrivable(m.land, x, y) && m.navPassable(x, y)) return { x, y };
  }
  return nearestPassable(m.nav, around.x, around.y, 30) ?? around;
}

/** Puts a level's enemy on the map with its role's brain. */
export function spawnEnemy(m: Match, e: ResolvedEnemy): Tank {
  // A Hover tank may start on the water: snap it on its own grid.
  const nav = m.navs.for(DRIVES[e.loadout.drive.family as DriveFamily].floats === true, e.loadout.hull.family === 'heavy').nav;
  const at = e.vessel === 'barge' || passable(nav, e.at.x, e.at.y) ? e.at : (nearestPassable(nav, e.at.x, e.at.y, 8) ?? e.at);
  const route = e.route ? m.land.def.roads[e.route]! : null;
  const t = addTank(m, {
    name: e.name ?? crewName(m.rng, e.clan, m.usedNames), clan: e.clan, team: m.level.def.clanWar ? CLAN_TEAM[e.clan] : ENEMY_TEAM, role: e.truck ? 'truck' : 'tank',
    ace: e.ace, loadout: e.loadout, at, kits: e.kits ?? (e.ace ? 1 : 0), maxKits: e.kits ?? 1, hpMult: e.hpMult ?? (e.ace ? 1.5 : 1), speedMult: e.speedMult,
    heading: route ? angleTo(route[0]!, route[1]!) : angleTo(at, m.start),
  });
  if (e.truck) t.stats = { ...t.stats, radius: TRUCK.radius, armour: TRUCK.armour };
  if (e.vessel === 'barge') {
    t.keel = true;
    t.body = 'barge';
  }
  m.brains.set(t.id, createBrain(t, e, e.ace ? ACE_BOT : m.difficulty, m.rng.fork(t.id), route));
  m.emit({ kind: 'spawn', tank: t.id });
  return t;
}

/**
 * A tank on your side (chapter 5, LevelDef.friends: a freed clan crew): team 0,
 * its clan's names but our Brigade blue (render/tankView.ts sideColour), a brain that follows you and fights what it sees.
 */
export function spawnFriend(m: Match, f: ResolvedFriend): Tank {
  const clan = f.clan ?? 'ink';
  const at = m.navPassable(f.at.x, f.at.y) ? f.at : (nearestPassable(m.nav, f.at.x, f.at.y, 8) ?? f.at);
  const t = addTank(m, { name: f.name ?? crewName(m.rng, clan, m.usedNames), clan, team: 0, loadout: f.loadout, at, heading: m.player ? angleTo(at, m.player) : 0, kits: 0 });
  const b = createBrain(t, null, m.difficulty, m.rng.fork(t.id));
  m.brains.set(t.id, Object.assign(b, { role: 'ally' as const, aware: 'alert' as const }));
  m.emit({ kind: 'spawn', tank: t.id });
  return t;
}
