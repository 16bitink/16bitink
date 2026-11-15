import { describe, expect, it } from 'vitest';
import { CH3_KINDS } from '../src/content/ch3/kinds';
import { CELL, isDrivable } from '../src/logic/land';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { LevelDef, StructPlace } from '../src/logic/level/types';
import { Match } from '../src/logic/match/match';
import { unwedges } from '../src/logic/match/movement';
import { swapIn } from '../src/logic/match/pickups';
import { IDLE, type TankInput } from '../src/logic/match/types';
import { block, clearLine, passable, SOFT_COST, unblock, type NavGrid } from '../src/logic/nav/grid';
import { buildFlow, flowDir } from '../src/logic/nav/flow';
import { labLevel } from '../src/sim/levels';
import { runMission } from '../src/sim/runMission';
import { TYPICAL_PERKS, TYPICAL_TANK } from '../src/sim/lab';
import { fixture } from './fixtures/levels';

/**
 * Stuck tanks (Nov 15): the stand-in sat out level 22's clock and burned to death wedged in
 * level 42's trees on a fast drive. Causes: a part pile (the bot waited on the wrong part),
 * pushes that put a tank's centre over water (no move was allowed out), a fire across the
 * trail that cut the flow field (the bot drove straight at its goal into the trees), fences
 * the grid didn't know non-crushing drives can't cross, and the field's pick from a closed
 * cell going through the wall.
 */

/** A 2 × 2 marsh with deep water east of x 800, numbered `n` (chapter rules follow the number). */
const shore = (n: number, structures: StructPlace[] = []): Match => {
  const d = fixture({ kind: 'assault' }, [{ role: 'guard', clan: 'weasels', tank: 'machinegun1/light1/wheels1', at: { x: 400, y: 1000 } }], { structures });
  const def: LevelDef = { ...d, number: n, map: { ...d.map, base: 'marsh', terrain: [{ ground: 'swampWater', shape: { kind: 'rect', x: 800, y: 0, w: 1120, h: 1080 } }] } };
  return new Match({ level: loadLevel(def, CH3_KINDS), seed: 1, player: { loadout: parseTank('cannon1/medium1/halftracks1') } });
};
const drive = (m: Match, input: TankInput, s: number): void => {
  for (let i = 0; i < Math.round(s * 60); i++) {
    m.step(1 / 60, input);
    m.drainEvents();
  }
};
const WEST: TankInput = { ...IDLE, move: { kind: 'point', angle: Math.PI, mag: 1 } };

describe('a tank pushed over the water drives out', () => {
  for (const n of [5, 25]) {
    it(`the player, centre 12 px into deep water, drives back ashore (level ${n})`, () => {
      const m = shore(n);
      Object.assign(m.player!, { x: 812, y: 540, heading: Math.PI, speed: 0 });
      drive(m, WEST, 1.5);
      expect(m.player!.x).toBeLessThan(760);
      expect(isDrivable(m.land, m.player!.x, m.player!.y)).toBe(true);
    });
  }
  it('a wedged tank may drive out but never further in, nor ride along in the water', () => {
    expect(unwedges(3, 3, true)).toBe(true);
    expect(unwedges(3, 2, false)).toBe(true);
    expect(unwedges(5, 5, false, true)).toBe(true);
    expect(unwedges(3, 3, false)).toBe(false);
    expect(unwedges(2, 3, false, true)).toBe(false);
    expect(unwedges(0, 0, true)).toBe(false);
  });
});

describe('parts in reach', () => {
  it('the part underneath is the nearest one, or the one a bot drives for', () => {
    const m = shore(25);
    const p = m.player!;
    Object.assign(p, { x: 400, y: 540 });
    const far = m.addPickup({ kind: 'part', part: { family: 'flamer', mk: 2 } }, 425, 540);
    const near = m.addPickup({ kind: 'part', part: { family: 'cannon', mk: 2 } }, 405, 540);
    m.step(1 / 60, IDLE);
    expect(p.onPart).toBe(near.id);
    m.step(1 / 60, { ...IDLE, swapPart: far.id });
    expect(p.onPart).toBe(far.id);
  });
  it('a swapped-out part drops on dry land, not into the swamp behind', () => {
    const m = shore(25);
    const p = m.player!;
    Object.assign(p, { x: 770, y: 540, heading: Math.PI });
    const part = m.addPickup({ kind: 'part', part: { family: 'cannon', mk: 2 } }, 770, 540);
    swapIn(m, p, part.id);
    const dropped = m.pickups[m.pickups.length - 1]!;
    expect(dropped.kind).toBe('part');
    expect(isDrivable(m.land, dropped.x, dropped.y)).toBe(true);
  });
});

describe('the nav grid', () => {
  const grid = (cols: number, rows: number, cost: number[]): NavGrid => ({ cols, rows, cost: Uint8Array.from(cost), blocks: new Map(), soft: new Map(), floats: false, heavy: false, version: 0 });
  it('steers round a closed corner, not diagonally past it', () => {
    // (0,0) closed; the goal at (1,0); a tank at (0,1) goes via (1,1).
    const nav = grid(2, 2, [0, 2, 2, 2]);
    const f = buildFlow(nav, 1);
    expect(flowDir(nav, f, CELL * 0.5, CELL * 1.5)).toBeCloseTo(0, 5);
  });
  it('a blaze makes its cells dear, not closed: the field still crosses it, a straight line does not', () => {
    const m = shore(45);
    const nav = m.nav;
    const at = { x: 400, y: 540 };
    block(nav, { kind: 'blaze', id: 'b#fire', x: at.x, y: at.y, shape: { kind: 'circle', r: 30 } }, true);
    const i = Math.floor(at.y / CELL) * nav.cols + Math.floor(at.x / CELL);
    expect(nav.cost[i]).toBe(SOFT_COST);
    expect(passable(nav, at.x, at.y)).toBe(true);
    expect(clearLine(nav, 300, 540, 500, 540)).toBe(false);
    expect(Number.isFinite(buildFlow(nav, i - 3).dist[i + 3]!)).toBe(true);
    unblock(nav, m.land, 'b#fire');
    expect(nav.cost[i]).toBeLessThan(SOFT_COST);
    expect(clearLine(nav, 300, 540, 500, 540)).toBe(true);
  });
  it('fences are dear on the grid of drives that cannot crush them, open for Tracks', () => {
    const m = shore(25, [{ kind: 'fence', x: 400, y: 540 }]);
    const i = Math.floor(540 / CELL) * m.nav.cols + Math.floor(400 / CELL);
    expect(m.navFor(m.player!).nav.cost[i]).toBe(SOFT_COST);
    const tracks = { ...m.player!, stats: { ...m.player!.stats, drive: 'tracks' as const } };
    expect(m.navFor(tracks).nav.cost[i]).toBeLessThan(SOFT_COST);
  });
});

describe('the stand-in no longer gets stuck (lab seeds that stalled before the fix)', () => {
  const run = (n: number, seed: number, tank = TYPICAL_TANK[n]!) => runMission({ level: labLevel(n), seed, player: { loadout: parseTank(tank), kits: 2, ...TYPICAL_PERKS(n) } });
  it('level 22 Stilt Village: seeds 1 and 3 (sat on a part pile until 10:00)', () => {
    for (const seed of [1, 3]) expect(run(22, seed).reason, `seed ${seed}`).not.toBe('time');
  });
  it('level 42 Wildfire on a fast drive: through the fire, not wedged in the trees', () => {
    for (const seed of [1, 2, 3]) expect(run(42, seed, 'cannon4/medium4/halftracks4').passed, `seed ${seed}`).toBe(true);
  });
  it('level 19 Crow Prison seed 1 (pressed into a wall from a closed cell)', () => {
    expect(run(19, 1).reason).not.toBe('time');
  });
  it('level 4 Hold the Bridge: round the fence line by the start', () => {
    for (const seed of [3, 5, 7]) expect(run(4, seed).passed, `seed ${seed}`).toBe(true);
  });
  it('level 45 The Last Convoy seed 7: a truck a felled tree held up behind the lead is not left behind', () => {
    expect(run(45, 7).reason).not.toBe('time');
  });
});
