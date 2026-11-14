import { describe, expect, it } from 'vitest';
import { CH4_KINDS } from '../src/content/ch4/kinds';
import { CELL, GROUNDS, groundAt, type TerrainPatch } from '../src/logic/land';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { EnemyDef, LevelDef, WeatherDef } from '../src/logic/level/types';
import { THIN_ICE } from '../src/logic/match/ice';
import { Match } from '../src/logic/match/match';
import { IDLE, type MatchEvent, type TankInput } from '../src/logic/match/types';
import { BLIZZARD, sightCap, stormRule } from '../src/logic/match/weather';
import { passable } from '../src/logic/nav/grid';
import { DRIVES } from '../src/logic/parts';
import { tankStats } from '../src/logic/stats';
import { fixture } from './fixtures/levels';

const rect = (ground: TerrainPatch['ground'], x: number, y: number, w: number, h: number): TerrainPatch => ({ ground, shape: { kind: 'rect', x, y, w, h } });
/** A 2 × 2 snow map (number 31: chapter 4) with the given patches. */
const snow = (tank: string, terrain: TerrainPatch[] = [], extra: Partial<LevelDef> = {}, enemies: EnemyDef[] = []): Match => {
  const d = fixture({ kind: 'assault' }, enemies.length ? enemies : [{ role: 'guard', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: { x: 1800, y: 1000 } }]);
  const def: LevelDef = { ...d, number: 31, ...extra, map: { ...d.map, base: 'snow', terrain } };
  return new Match({ level: loadLevel(def, CH4_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
};
const drive = (m: Match, input: TankInput, s: number): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  for (let i = 0; i < Math.round(s * 60); i++) {
    m.step(1 / 60, input);
    ev.push(...m.drainEvents());
  }
  return ev;
};
const EAST: TankInput = { ...IDLE, move: { kind: 'point', angle: 0, mag: 1 } };
const SOUTH: TankInput = { ...IDLE, move: { kind: 'point', angle: Math.PI / 2, mag: 1 } };
const ALL_ICE = [rect('ice', 0, 0, 1920, 1080)];

describe('chapter 4 grounds', () => {
  it('are appended to GROUNDS, so the earlier chapters’ indexes stay put', () => {
    expect(GROUNDS.slice(0, 14)).toEqual(['grass', 'grassDry', 'dirt', 'sand', 'mud', 'water', 'bridge', 'canyonRock', 'packedSand', 'sandTrack', 'sandTrackH', 'swampWater', 'shallows', 'marsh']);
    expect(GROUNDS.slice(14, 20)).toEqual(['snow', 'snowTrack', 'snowTrackH', 'frozenDirt', 'ice', 'thinIce']);
  });
  it('deep snow slows Wheels ×0.75 and Half-tracks a little; Tracks and the packed tracks not at all', () => {
    const speedOn = (tank: string, ground: TerrainPatch['ground']): number => {
      const m = snow(tank, [rect(ground, 0, 0, 1920, 1080)]);
      Object.assign(m.player!, { x: 100, y: 300, heading: 0 });
      drive(m, EAST, 3);
      return m.player!.speed / m.player!.stats.speed;
    };
    expect(speedOn('cannon1/medium1/wheels1', 'snow')).toBeCloseTo(0.75, 2);
    expect(speedOn('cannon1/medium1/halftracks1', 'snow')).toBeCloseTo(0.9, 2);
    expect(speedOn('cannon1/medium1/tracks1', 'snow')).toBeCloseTo(1, 2);
    for (const g of ['snowTrack', 'snowTrackH', 'frozenDirt'] as const) expect(speedOn('cannon1/medium1/wheels1', g), g).toBeCloseTo(1, 2);
    expect(DRIVES.wheels.snow).toBe(0.75);
  });
  it('ice: every drive slides (Tracks least), and turning and braking are weak', () => {
    const carry = (tank: string, terrain: TerrainPatch[]): number => {
      const m = snow(tank, terrain);
      Object.assign(m.player!, { x: 100, y: 200, heading: 0 });
      drive(m, EAST, 3);
      const x0 = m.player!.x;
      drive(m, SOUTH, 1.2);
      return m.player!.x - x0;
    };
    const firm = [rect('frozenDirt', 0, 0, 1920, 1080)];
    for (const d of ['wheels', 'halftracks', 'tracks'] as const) {
      const tank = `cannon1/medium1/${d}1`;
      expect(carry(tank, ALL_ICE), d).toBeGreaterThan(carry(tank, firm) + 25);
    }
    expect(carry('cannon1/medium1/wheels1', ALL_ICE)).toBeGreaterThan(carry('cannon1/medium1/tracks1', ALL_ICE));
    // Braking: from full speed with the stick let go, a tank on ice runs on much further.
    const stop = (terrain: TerrainPatch[]): number => {
      const m = snow('cannon1/medium1/halftracks1', terrain);
      Object.assign(m.player!, { x: 100, y: 300, heading: 0 });
      drive(m, EAST, 3);
      const x0 = m.player!.x;
      drive(m, IDLE, 2);
      return m.player!.x - x0;
    };
    expect(stop(ALL_ICE)).toBeGreaterThan(stop(firm) * 1.8);
    expect(tankStats(parseTank('cannon1/medium1/wheels1'), { wheels: { grip: 3 } }).iceGrip).toBeGreaterThan(tankStats(parseTank('cannon1/medium1/wheels1')).iceGrip);
  });
});

describe('thin ice', () => {
  const LAKE = [rect('thinIce', 600, 0, 600, 1080)];
  it('a Heavy cracks it, then goes through after THIN_ICE.give s: a hole of water, hurt and hauled back to firm ground', () => {
    const m = snow('cannon1/heavy1/tracks1', LAKE);
    Object.assign(m.player!, { x: 760, y: 540, heading: 0 });
    const hp = m.player!.hp;
    const ev = drive(m, IDLE, 0.5);
    expect(ev.some((e) => e.kind === 'ice' && e.what === 'crack')).toBe(true);
    expect(groundAt(m.land, 760, 540)).toBe('thinIce');
    const ev2 = drive(m, IDLE, THIN_ICE.give);
    expect(ev2.some((e) => e.kind === 'ice' && e.what === 'break')).toBe(true);
    expect(ev2.some((e) => e.kind === 'flood')).toBe(true);
    expect(groundAt(m.land, 760, 540)).toBe('water');
    expect(m.player!.alive).toBe(true);
    expect(hp - m.player!.hp).toBeCloseTo(m.player!.stats.maxHp * THIN_ICE.damage, 0);
    expect(groundAt(m.land, m.player!.x, m.player!.y)).not.toBe('water');
    // The hole is water for good: nobody's grid crosses it.
    expect(passable(m.nav, 760, 540)).toBe(false);
  });
  it('lighter hulls cross it; a Heavy hull’s grid closes it (bots route round), the ground grid doesn’t', () => {
    const m = snow('cannon1/medium1/tracks1', LAKE);
    Object.assign(m.player!, { x: 400, y: 540, heading: 0 });
    const ev = drive(m, EAST, 12);
    expect(ev.some((e) => e.kind === 'ice')).toBe(false);
    expect(m.player!.x).toBeGreaterThan(1300);
    const heavy = m.navs.for(false, true).nav;
    expect(passable(m.nav, 900, 540)).toBe(true);
    expect(passable(heavy, 900, 540)).toBe(false);
    expect(passable(heavy, 300, 540)).toBe(true);
  });
  it('a Heavy that keeps moving across a narrow strip makes it over before it gives way', () => {
    const m = snow('cannon1/heavy1/wheels1', [rect('thinIce', 600, 0, 80, 1080)]);
    Object.assign(m.player!, { x: 200, y: 540, heading: 0 });
    const ev = drive(m, EAST, 6);
    expect(ev.some((e) => e.kind === 'ice' && e.what === 'crack')).toBe(true);
    expect(ev.some((e) => e.kind === 'ice' && e.what === 'break')).toBe(false);
    expect(m.player!.x).toBeGreaterThan(700);
  });
  it('a level without thin ice builds no Heavy grid', () => {
    const m = snow('cannon1/heavy1/tracks1');
    expect(m.hasThinIce).toBe(false);
    expect(m.navs.for(false, true)).toBe(m.navs.ground);
  });
  it('cells of the hole are thin ice only (solid ice and snow stay)', () => {
    const m = snow('cannon1/heavy1/tracks1', [rect('ice', 600, 0, 600, 1080), rect('thinIce', 720, 480, 80, 120)]);
    Object.assign(m.player!, { x: 760, y: 540, heading: 0 });
    drive(m, IDLE, THIN_ICE.give + 0.3);
    const water = Array.from(m.land.ground).filter((g) => GROUNDS[g] === 'water').length;
    expect(water).toBeGreaterThan(0);
    expect(water).toBeLessThanOrEqual((80 / CELL) * (120 / CELL));
  });
});

describe('blizzards', () => {
  const W: WeatherDef = { kind: 'blizzard', first: 1, every: 30, last: 10, sight: 200, wind: 40, windAngle: Math.PI / 2 };
  it('cap sight like a sandstorm, with their own defaults', () => {
    const r = stormRule({ kind: 'blizzard' });
    expect([r.kind, r.every, r.last, r.sight]).toEqual(['blizzard', BLIZZARD.every, BLIZZARD.last, BLIZZARD.sight]);
    expect(Math.hypot(r.wind.x, r.wind.y)).toBeCloseTo(BLIZZARD.wind, 5);
    expect(sightCap(stormRule(W as never), 5)).toBe(200);
    expect(stormRule({ kind: 'sandstorm' }).wind).toEqual({ x: 0, y: 0 });
  });
  it('warn with blizzard events, and the wind pushes a moving tank sideways (a parked one holds)', () => {
    const run = (input: TankInput): { dy: number; ev: MatchEvent[] } => {
      const m = snow('cannon1/medium1/tracks1', [rect('snowTrackH', 0, 0, 1920, 1080)], { weather: W });
      Object.assign(m.player!, { x: 200, y: 400, heading: 0 });
      const ev = drive(m, input, 6);
      return { dy: m.player!.y - 400, ev };
    };
    const moving = run(EAST);
    expect(moving.dy).toBeGreaterThan(60);
    expect(moving.ev.some((e) => e.kind === 'weather' && e.what === 'start' && e.storm === 'blizzard')).toBe(true);
    expect(Math.abs(run(IDLE).dy)).toBeLessThan(1);
  });
  it('carries shells off line', () => {
    const shotY = (weather?: WeatherDef): number => {
      const m = snow('cannon1/medium1/tracks1', [], weather ? { weather } : {});
      Object.assign(m.player!, { x: 200, y: 400, heading: 0, turret: 0 });
      drive(m, IDLE, 3);
      m.step(1 / 60, { ...IDLE, fire: true, aim: 0 });
      for (let i = 0; i < 20; i++) m.step(1 / 60, IDLE);
      return m.shots[0]?.y ?? NaN;
    };
    expect(shotY(W) - shotY()).toBeGreaterThan(5);
  });
});
