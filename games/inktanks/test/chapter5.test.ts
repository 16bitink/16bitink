import { describe, expect, it } from 'vitest';
import { CH5_LEVEL_DEFS } from '../content/ch5/levels';
import { INKTANKS_PAID_LEVELS } from '../content/paid';
import { WORLD } from '../src/art/pixel/world/world';
import { chapterMap } from '../src/content/chapterMaps';
import { CH4_ART_NAME, CH4_KINDS } from '../src/content/ch4/kinds';
import { CH5_ART_NAME, CH5_KINDS } from '../src/content/ch5/kinds';
import { installPaidLevels, levelFor } from '../src/content/levels';
import { botsFor, CH4_BOTS, CH5_BOTS } from '../src/logic/bots/difficulty';
import { chapterOf } from '../src/logic/campaign';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { EnemyDef, LevelDef, StructPlace } from '../src/logic/level/types';
import { Match } from '../src/logic/match/match';
import { breakStructure } from '../src/logic/match/movement';
import { CLAN_COLOUR, CLAN_INFO } from '../src/logic/match/names';
import { SPAN } from '../src/logic/match/spans';
import { IDLE, type MatchEvent } from '../src/logic/match/types';
import { passable } from '../src/logic/nav/grid';
import { labLevel } from '../src/sim/levels';
import { runMission } from '../src/sim/runMission';
import { fixture } from './fixtures/levels';
import { TYPICAL_TANK } from '../src/sim/lab';

/** A whole-level stand-in run is a heavy sim: 5 s timed out under machine load. */
const SIM_TIMEOUT = 20_000;

const build = (d: LevelDef, tank = 'cannon1/medium1/halftracks1'): Match => new Match({ level: loadLevel({ ...d, number: d.number === 99 ? 41 : d.number }, CH5_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
const steps = (m: Match, s: number): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  for (let i = 0; i < Math.round(s * 60); i++) {
    m.step(1 / 60, IDLE);
    ev.push(...m.drainEvents());
  }
  return ev;
};
const guard = (clan: EnemyDef['clan'], x = 1800, y = 1000, extra: Partial<EnemyDef> = {}): EnemyDef => ({ role: 'guard', clan, tank: 'machinegun1/light1/wheels1', at: { x, y }, ...extra });

describe('chapter 5 content', () => {
  it('paid content lists the built chapter 5 levels, numbered 41–50, and they install from JSON', () => {
    const nums = CH5_LEVEL_DEFS.map((d) => d.number);
    expect(nums).toEqual(expect.arrayContaining([41, 45]));
    expect(nums.every((n) => n >= 41 && n <= 50)).toBe(true);
    const all = INKTANKS_PAID_LEVELS.map((d) => d.number);
    for (const n of nums) expect(all).toContain(n);
    expect(installPaidLevels(JSON.parse(JSON.stringify(INKTANKS_PAID_LEVELS)))).toBe(all.length);
    expect(levelFor(45)!.def.objective).toMatchObject({ kind: 'escort', trucks: 2, clear: 'felled' });
    expect(labLevel(41).def.name).toBe('Into the Pines');
  });
  it('chapter 5 is Deepwood against the Iron Hive: its own colour and flag, the sharpest bots', () => {
    expect(chapterOf(45)).toMatchObject({ name: 'Deepwood', rival: 'the Iron Hive' });
    expect(CLAN_COLOUR.hive).toBe(0xe0661f);
    expect(CLAN_INFO.hive.name).toBe('Iron Hive');
    expect(WORLD.structures.flagHive).toBeDefined();
    expect(botsFor(41)).toBe(CH5_BOTS);
    expect(botsFor(40)).toBe(CH4_BOTS);
    expect(CH5_BOTS.aimError).toBeLessThan(CH4_BOTS.aimError);
    expect(CH5_BOTS.reaction).toBeLessThan(CH4_BOTS.reaction);
    expect(labLevel(41).def.enemies.every((e) => e.clan === 'hive')).toBe(true);
  });
  it('forest kinds extend chapter 4 unchanged and use the forest art', () => {
    for (const k of Object.keys(CH4_KINDS)) expect(CH5_KINDS[k]).toEqual(CH4_KINDS[k]);
    for (const [kind, art] of Object.entries(CH5_ART_NAME)) {
      if (kind in CH4_ART_NAME) continue;
      expect(CH5_KINDS[kind], kind).toBeDefined();
      expect(WORLD.structures[art], `${kind} → ${art}`).toBeDefined();
    }
    expect(CH5_KINDS.oldTree!.canopy).toBeGreaterThan(20);
    expect(CH5_KINDS.youngTree).toMatchObject({ flattenable: true, thicket: true });
    expect(CH5_KINDS.undergrowth!.cover).toBe(true);
    expect(CH5_KINDS.logBridge).toMatchObject({ span: true, low: true });
  });
  it('a chapter 5 map with ten spots', () => {
    expect(chapterMap(4).spots).toHaveLength(10);
    expect(chapterMap(4).art).toMatch(/ch5\.png/);
  });
  it('levels 41 and 45 are winnable by the stand-in', () => {
    // The tank the campaign run brings to each level (lab's TYPICAL_TANK).
    for (const n of [41, 45]) {
      const wins = [1, 2, 3].filter((seed) => runMission({ level: labLevel(n), seed, player: { loadout: parseTank(TYPICAL_TANK[n]!), kits: 2 } }).passed).length;
      expect(wins, `level ${n}`).toBeGreaterThan(0);
    }
  }, SIM_TIMEOUT);
});

describe('the clans fight each other too (clanWar)', () => {
  const mixed = fixture({ kind: 'assault' }, [guard('boars', 900, 540, { sight: 500 }), guard('crows', 1200, 540, { sight: 500 })]);
  it('is chapter 5 only, with mixedClans', () => {
    expect(() => loadLevel({ ...mixed, number: 41, mixedClans: true, clanWar: true }, CH5_KINDS)).not.toThrow();
    expect(() => loadLevel({ ...mixed, number: 41, clanWar: true }, CH5_KINDS)).toThrow();
    expect(() => loadLevel({ ...mixed, number: 35, mixedClans: true, clanWar: true }, CH5_KINDS)).toThrow(/clanWar/);
  });
  it('puts each clan on its own side, so they shoot each other', () => {
    const m = build({ ...mixed, number: 46, mixedClans: true, clanWar: true });
    Object.assign(m.player!, { x: 100, y: 100 });
    const [boar, crow] = m.tanks.filter((t) => t.team !== 0);
    expect(boar!.team).not.toBe(crow!.team);
    steps(m, 12);
    expect(boar!.hp < boar!.stats.maxHp || crow!.hp < crow!.stats.maxHp).toBe(true);
    const calm = build({ ...mixed, number: 46, mixedClans: true });
    expect(new Set(calm.tanks.filter((t) => t.team !== 0).map((t) => t.team)).size).toBe(1);
  });
});

describe('several aces at once', () => {
  it('the ace objective needs every ace down', () => {
    const d = fixture({ kind: 'ace' }, [guard('weasels', 1500, 300, { ace: true, name: 'Sly' }), guard('crows', 1500, 800, { ace: true, name: 'Rook' }), guard('weasels', 400, 800, { ace: true, name: 'Grim' })]);
    const m = build({ ...d, number: 47, mixedClans: true });
    expect(m.objective.title).toBe('Destroy Sly, Rook and Grim together');
    const aces = m.tanks.filter((t) => t.ace);
    breakFor(m, aces[0]!);
    expect(m.objective.status()).toMatchObject({ done: false, text: 'Aces destroyed 1/3' });
    breakFor(m, aces[1]!);
    breakFor(m, aces[2]!);
    expect(m.objective.status().done).toBe(true);
  });
});

/** Takes an ace out of the fight (as a kill would). */
function breakFor(_m: Match, t: Match['tanks'][number]): void {
  t.alive = false;
}

describe('the clans join you (friends)', () => {
  it('a friend held behind a cage drives out when it breaks, follows you and fights', () => {
    const d = { ...fixture({ kind: 'assault' }, [guard('hive', 1800, 1000)], { structures: [{ kind: 'cage', x: 600, y: 540, id: 'pen' }] }), friends: [{ at: { x: 650, y: 540 }, tank: 'cannon1/medium1/halftracks1', clan: 'boars' as const, join: 'pen', name: 'Tusk' }] };
    const m = build(d);
    expect(m.tanks.some((t) => t.name === 'Tusk')).toBe(false);
    breakStructure(m, m.structs.findIndex((s) => s.def.id === 'pen'));
    const ev = m.drainEvents();
    const tusk = m.tanks.find((t) => t.name === 'Tusk')!;
    expect(tusk).toMatchObject({ team: 0, clan: 'boars', role: 'tank' });
    expect(ev.some((e) => e.kind === 'objective' && e.text === 'Tusk joins you!')).toBe(true);
    expect(m.brains.get(tusk.id)!.role).toBe('ally');
    const d0 = Math.hypot(tusk.x - m.player!.x, tusk.y - m.player!.y);
    steps(m, 4);
    expect(Math.hypot(tusk.x - m.player!.x, tusk.y - m.player!.y)).toBeLessThan(d0);
  });
  it('a friend needs a real structure to join from', () => {
    const d = { ...fixture({ kind: 'assault' }, [guard('hive')]), friends: [{ at: { x: 650, y: 540 }, tank: 'cannon1/medium1/halftracks1', join: 'nope' }] };
    expect(() => build(d)).toThrow(/join from/);
  });
});

describe('log bridges and the column', () => {
  const RIVER: StructPlace[] = [{ kind: 'logBridge', x: 960, y: 540, id: 'br', tag: 'target' }];
  const river = (extra: Partial<LevelDef> = {}): LevelDef => {
    const base = fixture({ kind: 'raid', tag: 'target', label: 'Bridges', column: true }, [{ role: 'convoy', clan: 'hive', tank: 'cannon1/medium1/halftracks1', at: { x: 700, y: 540 }, route: 'over', truck: true }], { structures: RIVER, roads: { over: [{ x: 700, y: 540 }, { x: 1300, y: 540 }] } });
    return { ...base, map: { ...base.map, terrain: [{ ground: 'water', shape: { kind: 'rect', x: 900, y: 0, w: 120, h: 1080 } }, { ground: 'bridge', shape: { kind: 'rect', x: 875, y: 512, w: 170, h: 56 } }] }, ...extra };
  };
  it('a log bridge is driven over; blown, its crossing turns to water', () => {
    const m = build(river());
    expect(passable(m.nav, 960, 540)).toBe(true);
    breakStructure(m, m.structs.findIndex((s) => s.def.id === 'br'));
    const ev = m.drainEvents();
    expect(passable(m.nav, 960, 540)).toBe(false);
    expect(ev.some((e) => e.kind === 'objective' && e.text === SPAN.text)).toBe(true);
    expect(ev.some((e) => e.kind === 'flood')).toBe(true);
  });
  it('a raid with a column fails if the column crosses before the bridges are down', () => {
    const m = build(river());
    Object.assign(m.player!, { x: 200, y: 1000 });
    steps(m, 30);
    expect(m.over?.reason).toBe('the column crossed');
    const blown = build(river());
    Object.assign(blown.player!, { x: 200, y: 1000 });
    breakStructure(blown, blown.structs.findIndex((s) => s.def.id === 'br'));
    steps(blown, 1);
    expect(blown.over?.passed).toBe(true);
  });
});

describe('the convoy and the felled trees', () => {
  const ROAD = { road: [{ x: 300, y: 540 }, { x: 1500, y: 540 }] };
  const convoy = (): Match => build(fixture({ kind: 'escort', road: 'road', truckHp: 900, speed: 60, trucks: 2, clear: 'felled' }, [guard('hive', 1800, 1000)], { roads: ROAD, structures: [{ kind: 'fallenLogV', x: 800, y: 540, tag: 'felled', id: 'log' }] }));
  it('two trucks follow the road, the second behind the first', () => {
    const m = convoy();
    const trucks = m.tanks.filter((t) => t.role === 'truck');
    expect(trucks).toHaveLength(2);
    expect(m.objective.title).toBe('Bring the supply convoy in');
    expect(trucks[1]!.x).toBeLessThan(trucks[0]!.x);
  });
  it('they stop at a felled tree until it is sawn through, and the stand-in is told to shoot it', () => {
    const m = convoy();
    const [lead] = m.tanks.filter((t) => t.role === 'truck');
    m.player!.x = lead!.x + 100;
    m.player!.y = lead!.y - 80;
    steps(m, 12);
    expect(lead!.x).toBeLessThan(800);
    expect(m.objective.playerHint(m.player!)?.shootAt?.id).toBe('log');
    breakStructure(m, m.structs.findIndex((s) => s.def.id === 'log'));
    steps(m, 6);
    expect(lead!.x).toBeGreaterThan(820);
  });
  it('losing either truck fails it', () => {
    const m = convoy();
    m.tanks.filter((t) => t.role === 'truck')[1]!.alive = false;
    expect(m.objective.status().failed).toBe('a truck was destroyed');
  });
});

describe('the Harvester', () => {
  it('is a 320-frame boss with the art’s mounts; a Rail turret wears the fortress rail', () => {
    const h = (WORLD.vehicles as unknown as Record<string, { size: number; mounts: Record<string, { at: readonly [number, number] }> }>).harvester!;
    expect(h.size).toBe(320);
    // Turret offsets in the body frame at draw scale 0.7: dx = −y × 0.7, dy = x × 0.7.
    expect(Math.round(-h.mounts.rail!.at[1] * 0.7)).toBe(-28);
    expect(Math.round(-h.mounts.mg!.at[1] * 0.7)).toBe(59);
    const boss = { name: 'Harvester', hp: 3000, speed: 40, road: 'line', body: 'harvester', clan: 'hive' as const, radius: 80, turrets: [{ gun: 'rail' as const, dx: -28, dy: 0, hp: 300 }, { gun: 'cannon' as const, dx: 30, dy: -34, hp: 300 }] };
    const m = build(fixture({ kind: 'fortress', boss }));
    const body = m.tanks.find((t) => t.role === 'boss')!;
    expect(body).toMatchObject({ body: 'harvester', clan: 'hive' });
    expect(m.tanks.filter((t) => t.parent === body.id).map((t) => t.loadout.gun.family)).toEqual(['rail', 'cannon']);
  });
});
