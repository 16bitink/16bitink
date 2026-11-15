import { describe, expect, it } from 'vitest';
import { CH3_LEVEL_DEFS } from '../content/ch3/levels';
import { INKTANKS_PAID_LEVELS } from '../content/paid';
import { WORLD } from '../src/art/pixel/world/world';
import { CHAPTER_MAPS, chapterMap } from '../src/content/chapterMaps';
import { CH2_ART_NAME, CH2_KINDS } from '../src/content/ch2/kinds';
import { CH3_ART_NAME, CH3_KINDS } from '../src/content/ch3/kinds';
import { hasLevel, installPaidLevels, levelFor } from '../src/content/levels';
import { botsFor, CH2_BOTS, CH3_BOTS } from '../src/logic/bots/difficulty';
import { chapterOf } from '../src/logic/campaign';
import { isDrivable } from '../src/logic/land';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { BossDef, LevelDef } from '../src/logic/level/types';
import { Match } from '../src/logic/match/match';
import { bonusText } from '../src/logic/mission/bonus';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { labLevel } from '../src/sim/levels';
import { runMission } from '../src/sim/runMission';
import { fixture, POINTS } from './fixtures/levels';
import { TYPICAL_TANK } from '../src/sim/lab';

/** A whole-level stand-in run is a heavy sim: 5 s timed out under machine load. */
const SIM_TIMEOUT = 20_000;

/** A river of deep water along y 450–650 across a 2 × 2 marsh. */
const RIVER = { ground: 'swampWater' as const, shape: { kind: 'rect' as const, x: 0, y: 450, w: 1920, h: 200 } };
const onRiver = (d: LevelDef): Match => new Match({ level: loadLevel({ ...d, start: { x: 200, y: 760 }, map: { ...d.map, base: 'marsh', terrain: [RIVER] } }, CH3_KINDS), seed: 1, player: { loadout: STARTER_LOADOUT } });
const RIVER_ROAD = { river: [{ x: 100, y: 550 }, { x: 900, y: 550 }, { x: 1800, y: 550 }] };

describe('chapter 3 content', () => {
  it('paid content lists the built chapter 3 levels, numbered 21–30, and they install from JSON', () => {
    const nums = CH3_LEVEL_DEFS.map((d) => d.number);
    expect(nums).toEqual(expect.arrayContaining([21, 23]));
    expect(nums.every((n) => n >= 21 && n <= 30)).toBe(true);
    const all = INKTANKS_PAID_LEVELS.map((d) => d.number);
    for (const n of nums) expect(all).toContain(n);
    expect(installPaidLevels(JSON.parse(JSON.stringify(INKTANKS_PAID_LEVELS)))).toBe(all.length);
    expect(hasLevel(21)).toBe(true);
    expect(levelFor(21)!.def.weather?.kind).toBe('fog');
    expect(labLevel(23).def.name).toBe('The Barge');
  });
  it('chapter 3 is Mirefen against the Weasels', () => {
    expect(chapterOf(25)).toMatchObject({ name: 'Mirefen', rival: 'the Weasels' });
    for (const d of CH3_LEVEL_DEFS) expect(d.enemies.every((e) => e.clan === 'weasels')).toBe(true);
  });
  it('swamp kinds extend chapter 2 unchanged and use the swamp art', () => {
    for (const k of Object.keys(CH2_KINDS)) expect(CH3_KINDS[k]).toEqual(CH2_KINDS[k]);
    for (const [kind, art] of Object.entries(CH3_ART_NAME)) {
      if (kind in CH2_ART_NAME) continue;
      expect(CH3_KINDS[kind], kind).toBeDefined();
      expect(WORLD.structures[art], `${kind} → ${art}`).toBeDefined();
    }
    expect(CH3_KINDS.boardwalk!.deck).toBe(true);
    expect(CH3_KINDS.stiltHutSmall!.roof).toBe(true);
  });
  it('a chapter 3 map with ten spots, and sharper bots from level 21', () => {
    expect(CHAPTER_MAPS.length).toBeGreaterThanOrEqual(3);
    expect(chapterMap(2).spots).toHaveLength(10);
    expect(chapterMap(2).art).toMatch(/ch3\.png/);
    expect(botsFor(21)).toBe(CH3_BOTS);
    expect(botsFor(20)).toBe(CH2_BOTS);
    expect(CH3_BOTS.aimError).toBeLessThan(CH2_BOTS.aimError);
  });
  it('level 21 makes you take the Hover from the Weasels: you start on your own drive', () => {
    const m = new Match({ level: labLevel(21), seed: 1, player: { loadout: parseTank('cannon2/medium2/halftracks2') } });
    expect(m.level.def.issue).toBeUndefined();
    expect(m.level.def.prize).toBe('hover');
    expect(m.player!.loadout.drive.family).toBe('halftracks');
  });
  it('levels 21 and 23 are winnable by the stand-in', () => {
    // The tank the campaign run brings to each level (lab's TYPICAL_TANK).
    for (const n of [21, 23]) {
      const wins = [1, 2, 3].filter((seed) => runMission({ level: labLevel(n), seed, player: { loadout: parseTank(TYPICAL_TANK[n]!), kits: 2 } }).passed).length;
      expect(wins, `level ${n}`).toBeGreaterThan(0);
    }
  }, SIM_TIMEOUT);
});

describe('the barge', () => {
  const barge = (road = 'river') => fixture({ kind: 'escort', road, truckHp: 900, speed: 40, vessel: 'barge' }, [], { roads: RIVER_ROAD });
  it('floats up its river road while you keep close, and never leaves the water', () => {
    const m = onRiver(barge());
    const p = m.player!;
    const b = m.tanks.find((t) => t.role === 'truck')!;
    expect([b.keel, b.body, b.name]).toEqual([true, 'barge', 'Supply barge']);
    Object.assign(p, { x: 300, y: 720 });
    for (let i = 0; i < 60 * 4; i++) {
      Object.assign(p, { x: b.x, y: 720 });
      m.step(1 / 60);
    }
    expect(b.x).toBeGreaterThan(200);
    expect(isDrivable(m.land, b.x, b.y)).toBe(false);
    expect(m.objective.title).toMatch(/barge/);
  });
  it('a barge road over dry land is a level error', () => {
    expect(() => onRiver({ ...barge('line') })).toThrow(/not on deep water/);
  });
  it('the truck bonus can call it the barge', () => {
    expect(bonusText({ kind: 'truckHp', min: 0.2, vessel: 'barge' })).toBe('Keep the barge above 20% HP');
    expect(bonusText({ kind: 'truckHp', min: 0.5 })).toBe('Keep the truck above 50% HP');
  });
});

describe('the Ironclad', () => {
  const ironclad = (b: Partial<BossDef> = {}): Match =>
    onRiver(fixture({ kind: 'fortress', boss: { name: 'Ironclad', hp: 1200, speed: 30, road: 'river', body: 'ironclad', clan: 'weasels', afloat: true, turrets: [{ gun: 'cannon', dx: 0, dy: 20, hp: 120 }], ...b } }, [], { roads: RIVER_ROAD }));
  it('an afloat boss moves on deep water only: the bank stops it', () => {
    const m = ironclad();
    const body = m.tanks.find((t) => t.role === 'boss')!;
    expect([body.keel, body.body]).toEqual([true, 'ironclad']);
    Object.assign(body, { x: 900, y: 600, heading: Math.PI / 2 });
    for (let i = 0; i < 60 * 3; i++) m.step(1 / 60);
    expect(isDrivable(m.land, body.x, body.y)).toBe(false);
    expect(WORLD.vehicles as unknown as Record<string, unknown>).toHaveProperty('ironclad');
  });
  it('its ring road must run over water', () => {
    expect(() => onRiver(fixture({ kind: 'fortress', boss: { name: 'Ironclad', hp: 1200, speed: 30, road: 'line', afloat: true, turrets: [] } }, [], { roads: RIVER_ROAD }))).toThrow(/not on deep water/);
    expect(POINTS.a).toBeDefined();
  });
});

describe('enemy barges', () => {
  it('a convoy barge floats down its river route and leaves by it', () => {
    const d = fixture({ kind: 'ambush' }, [{ role: 'convoy', clan: 'weasels', tank: 'machinegun1/medium1/wheels1', truck: true, vessel: 'barge', at: { x: 100, y: 550 }, route: 'river', speedMult: 2 }], { roads: RIVER_ROAD });
    const m = onRiver(d);
    const b = m.tanks.find((t) => t.team !== 0)!;
    expect([b.keel, b.body, b.role]).toEqual([true, 'barge', 'truck']);
    for (let i = 0; i < 60 * 6; i++) m.step(1 / 60);
    expect(b.x).toBeGreaterThan(500);
    expect(isDrivable(m.land, b.x, b.y)).toBe(false);
  });
  it('its route must run over water', () => {
    const d = fixture({ kind: 'ambush' }, [{ role: 'convoy', clan: 'weasels', tank: 'machinegun1/medium1/wheels1', truck: true, vessel: 'barge', at: { x: 100, y: 550 }, route: 'line' }], { roads: RIVER_ROAD });
    expect(() => onRiver(d)).toThrow(/not on deep water/);
  });
});
