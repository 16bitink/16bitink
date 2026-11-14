import { describe, expect, it } from 'vitest';
import { CH4_LEVEL_DEFS } from '../content/ch4/levels';
import { INKTANKS_PAID_LEVELS } from '../content/paid';
import { WORLD } from '../src/art/pixel/world/world';
import { chapterMap } from '../src/content/chapterMaps';
import { CH3_ART_NAME, CH3_KINDS } from '../src/content/ch3/kinds';
import { CH4_ART_NAME, CH4_KINDS } from '../src/content/ch4/kinds';
import { installPaidLevels, levelFor } from '../src/content/levels';
import { botsFor, CH3_BOTS, CH4_BOTS } from '../src/logic/bots/difficulty';
import { chapterOf } from '../src/logic/campaign';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { BossDef, EnemyDef, LevelDef, StructPlace } from '../src/logic/level/types';
import { AVALANCHE } from '../src/logic/match/avalanche';
import { HEIGHT } from '../src/logic/match/heights';
import { Match } from '../src/logic/match/match';
import { breakStructure } from '../src/logic/match/movement';
import { railNearest } from '../src/logic/match/rail';
import { IDLE, type MatchEvent } from '../src/logic/match/types';
import { passable } from '../src/logic/nav/grid';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { labLevel } from '../src/sim/levels';
import { runMission } from '../src/sim/runMission';
import { fixture } from './fixtures/levels';

const build = (d: LevelDef, tank = 'cannon1/medium1/halftracks1'): Match => new Match({ level: loadLevel({ ...d, number: d.number === 99 ? 31 : d.number }, CH4_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
const steps = (m: Match, s: number): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  for (let i = 0; i < Math.round(s * 60); i++) {
    m.step(1 / 60, IDLE);
    ev.push(...m.drainEvents());
  }
  return ev;
};
const guard = (clan: EnemyDef['clan'], x = 1800, y = 1000): EnemyDef => ({ role: 'guard', clan, tank: 'machinegun1/light1/wheels1', at: { x, y } });

describe('chapter 4 content', () => {
  it('paid content lists the built chapter 4 levels, numbered 31–40, and they install from JSON', () => {
    const nums = CH4_LEVEL_DEFS.map((d) => d.number);
    expect(nums).toEqual(expect.arrayContaining([31, 34]));
    expect(nums.every((n) => n >= 31 && n <= 40)).toBe(true);
    const all = INKTANKS_PAID_LEVELS.map((d) => d.number);
    for (const n of nums) expect(all).toContain(n);
    expect(installPaidLevels(JSON.parse(JSON.stringify(INKTANKS_PAID_LEVELS)))).toBe(all.length);
    expect(levelFor(34)!.def.weather?.kind).toBe('blizzard');
    expect(labLevel(31).def.name).toBe('Thin Ice');
  });
  it('chapter 4 is Frostridge against all three clans: its levels may mix them, no other level may', () => {
    expect(chapterOf(35)).toMatchObject({ name: 'Frostridge', rival: 'all three clans' });
    expect(new Set(labLevel(31).def.enemies.map((e) => e.clan)).size).toBe(3);
    const mixed = fixture({ kind: 'assault' }, [guard('boars'), guard('crows', 1600, 900)]);
    expect(() => loadLevel({ ...mixed, number: 31 }, CH4_KINDS)).toThrow(/mix factions/);
    expect(() => loadLevel({ ...mixed, number: 31, mixedClans: true }, CH4_KINDS)).not.toThrow();
    expect(() => loadLevel({ ...mixed, number: 25, mixedClans: true }, CH4_KINDS)).toThrow(/chapters 4–5 only/);
  });
  it('snow kinds extend chapter 3 unchanged and use the snow art (the cornice wears a drift for now)', () => {
    for (const k of Object.keys(CH3_KINDS)) expect(CH4_KINDS[k]).toEqual(CH3_KINDS[k]);
    for (const [kind, art] of Object.entries(CH4_ART_NAME)) {
      if (kind in CH3_ART_NAME) continue;
      expect(CH4_KINDS[kind], kind).toBeDefined();
      expect(WORLD.structures[art], `${kind} → ${art}`).toBeDefined();
    }
    expect(CH4_KINDS.snowdriftH!.low).toBe(true);
    expect(CH4_KINDS.firSmall!.cover).toBe(true);
    expect(CH4_KINDS.railSnowH!.deck).toBe(true);
    expect(CH3_KINDS.lockGate).toMatchObject({ hp: 0, material: 'stone' });
  });
  it('a chapter 4 map with ten spots, and sharper bots from level 31', () => {
    expect(chapterMap(3).spots).toHaveLength(10);
    expect(chapterMap(3).land().def.base).toBe('snow');
    expect(botsFor(31)).toBe(CH4_BOTS);
    expect(botsFor(30)).toBe(CH3_BOTS);
    expect(CH4_BOTS.aimError).toBeLessThan(CH3_BOTS.aimError);
  });
  it('levels 31 and 34 are winnable by the stand-in', () => {
    const tank = parseTank('cannon3/medium2/halftracks2');
    for (const n of [31, 34]) {
      const wins = [1, 2, 3].filter((seed) => runMission({ level: labLevel(n), seed, player: { loadout: tank, kits: 2 } }).passed).length;
      expect(wins, `level ${n}`).toBeGreaterThan(0);
    }
  });
  it('level 29’s lock has its gates: indestructible and solid across the channel', () => {
    const m = new Match({ level: labLevel(29), seed: 1, player: { loadout: STARTER_LOADOUT } });
    const gate = m.structs.find((s) => s.def.kind === 'lockGate')!;
    expect(gate.def.hp).toBe(0);
    expect(passable(m.nav, gate.def.x, gate.def.y)).toBe(false);
    expect(WORLD.vehicles as unknown as Record<string, unknown>).toHaveProperty('barge');
  });
});

describe('snowdrift rescues', () => {
  it('crews buried in tagged drifts are dug out like cages', () => {
    const drifts: StructPlace[] = [{ kind: 'snowdriftH', x: 600, y: 300, tag: 'drift' }, { kind: 'snowdriftH', x: 1300, y: 300, tag: 'drift' }];
    const m = build(fixture({ kind: 'rescue', tag: 'drift', home: 'd' }, [guard('boars')], { structures: drifts }));
    expect(m.objective.title).toBe('Dig out 2 crews and bring them home');
    const i = m.structs.findIndex((s) => s.def.tag === 'drift');
    breakStructure(m, i);
    steps(m, 0.1);
    expect(m.tanks.filter((t) => t.role === 'crew')).toHaveLength(1);
    expect(m.objective.status().text).toMatch(/Crews dug out 1\/2/);
  });
});

describe('avalanches', () => {
  const pass = (): Match => build({
    ...fixture({ kind: 'assault' }, [guard('boars', 1000, 540)], { structures: [{ kind: 'cornice', x: 1000, y: 200, id: 'lip' }] }),
    avalanches: [{ by: 'lip', drifts: [{ kind: 'snowdriftV', x: 1000, y: 500 }, { kind: 'snowdriftV', x: 1000, y: 592 }] }],
  });
  it('lie dormant: not solid, not in the nav grid', () => {
    const m = pass();
    const snow = m.structs.filter((s) => s.def.dormant === 'lip');
    expect(snow).toHaveLength(2);
    expect(snow.every((s) => s.dormant && s.state === 0)).toBe(true);
    expect(passable(m.nav, 1000, 700)).toBe(true);
  });
  it('fall when the cornice breaks: they block the route and bury the tank under them', () => {
    const m = pass();
    const foe = m.tanks.find((t) => t.team !== 0)!;
    Object.assign(foe, { x: 1000, y: 520 });
    const hp = foe.hp;
    const lip = m.structs.findIndex((s) => s.def.id === 'lip');
    breakStructure(m, lip);
    const ev = m.drainEvents();
    expect(ev.some((e) => e.kind === 'objective' && e.text === AVALANCHE.text)).toBe(true);
    const snow = m.structs.filter((s) => s.def.dormant === 'lip');
    expect(snow.every((s) => !s.dormant && s.state === 2)).toBe(true);
    expect(passable(m.nav, 1000, 540)).toBe(false);
    expect(hp - foe.hp).toBeCloseTo(AVALANCHE.damage, 0);
    expect(Math.abs(foe.x - 1000)).toBeGreaterThan(10);
  });
  it('an avalanche needs a real structure to bring it down', () => {
    expect(() => build({ ...fixture({ kind: 'assault' }, [guard('boars')]), avalanches: [{ by: 'nope', drifts: [{ kind: 'snowdriftH', x: 500, y: 500 }] }] })).toThrow(/bring it down/);
  });
});

describe('high ground', () => {
  it('a tank on a height shoots HEIGHT.range × as far', () => {
    const d = { ...fixture({ kind: 'assault' }, [guard('boars')]), heights: [{ x: 300, y: 300, r: 120 }] };
    const m = build(d);
    Object.assign(m.player!, { x: 300, y: 300, turret: 0 });
    m.step(1 / 60, { ...IDLE, fire: true, aim: 0 });
    expect(m.shots[0]!.range).toBeCloseTo(m.player!.stats.gun.range * HEIGHT.range, 5);
    const n = build(d);
    Object.assign(n.player!, { x: 900, y: 700, turret: 0 });
    n.step(1 / 60, { ...IDLE, fire: true, aim: 0 });
    expect(n.shots[0]!.range).toBeCloseTo(n.player!.stats.gun.range, 5);
  });
});

describe('the Rail-Gun Train', () => {
  const RAIL = { rail: [{ x: 200, y: 300 }, { x: 1700, y: 300 }] };
  const train = (b: Partial<BossDef> = {}): Match =>
    build(fixture({ kind: 'fortress', boss: { name: 'Rail-Gun Train', hp: 2000, speed: 60, road: 'rail', body: 'railTrain', rail: true, length: 125, radius: 30, turrets: [{ gun: 'cannon', dx: 75, dy: 0, hp: 100, art: 'fortressRail' }], ...b } }, [], { roads: RAIL }));
  it('moves only along its rails, facing along them, and stops at the buffers', () => {
    const m = train();
    const body = m.tanks.find((t) => t.role === 'boss')!;
    expect(body.rail).not.toBeNull();
    expect(body.body).toBe('railTrain');
    expect(m.tanks.find((t) => t.parent === body.id)!.body).toBe('fortressRail');
    steps(m, 6);
    expect(body.y).toBeCloseTo(300, 5);
    expect(body.x).toBeGreaterThan(400);
    expect(Math.abs(Math.cos(body.heading))).toBeCloseTo(1, 5);
    body.rail!.s = body.rail!.total - 5;
    body.speed = 60;
    m.step(1 / 60, IDLE);
    expect(body.x).toBeLessThanOrEqual(1700);
    expect(railNearest(body.rail!, body)).toBeLessThanOrEqual(body.rail!.total);
  });
  it('is a long body: a shot at its tail hits it', () => {
    const m = train({ turrets: [] });
    const body = m.tanks.find((t) => t.role === 'boss')!;
    Object.assign(m.player!, { x: body.x - 110, y: 500, turret: -Math.PI / 2 });
    const hp = body.hp;
    m.step(1 / 60, { ...IDLE, fire: true, aim: -Math.PI / 2 });
    steps(m, 0.6);
    expect(body.hp).toBeLessThan(hp);
  });
  it('its turrets ride on it', () => {
    const m = train();
    const body = m.tanks.find((t) => t.role === 'boss')!;
    const tu = m.tanks.find((t) => t.parent === body.id)!;
    steps(m, 2);
    expect(tu.x - body.x).toBeCloseTo(75 * Math.cos(body.heading), 3);
  });
});
