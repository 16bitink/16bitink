import { describe, expect, it } from 'vitest';
import { CANOPY, CH5_KINDS } from '../src/content/ch5/kinds';
import { losClear, sightClear } from '../src/logic/bots/perception';
import { GROUNDS, type TerrainPatch } from '../src/logic/land';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { EnemyDef, LevelDef, StructPlace } from '../src/logic/level/types';
import { TREE_FIRE } from '../src/logic/match/forestFire';
import { Match } from '../src/logic/match/match';
import { breakStructure } from '../src/logic/match/movement';
import { IDLE, type MatchEvent } from '../src/logic/match/types';
import { passable } from '../src/logic/nav/grid';
import { fixture } from './fixtures/levels';

const build = (d: LevelDef, tank = 'cannon1/medium1/halftracks1'): Match => new Match({ level: loadLevel({ ...d, number: 41 }, CH5_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
const steps = (m: Match, s: number, input = IDLE): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  for (let i = 0; i < Math.round(s * 60); i++) {
    m.step(1 / 60, input);
    ev.push(...m.drainEvents());
  }
  return ev;
};
const dummy = (x: number, y: number): EnemyDef => ({ role: 'turret', clan: 'hive', tank: 'cannon1/medium1/halftracks1', at: { x, y }, sight: 1 });
const at = (structures: StructPlace[], enemies: EnemyDef[] = [dummy(1800, 1000)], extra: Partial<LevelDef> = {}): Match => build({ ...fixture({ kind: 'assault' }, enemies, { structures }), ...extra });

describe('forest grounds', () => {
  it('are appended to GROUNDS, so the earlier chapters’ indexes stay put', () => {
    expect(GROUNDS.slice(20)).toEqual(['forestFloor', 'forestTrail', 'forestTrailH', 'clearing']);
  });
  it('the forest floor slows Wheels and Half-tracks; trails and clearings are the fast lanes; Tracks don’t mind', () => {
    const speed = (tank: string, ground: TerrainPatch['ground']): number => {
      const m = build({ ...fixture({ kind: 'assault' }, [dummy(1800, 1000)]), map: { ...fixture({ kind: 'assault' }).map, terrain: [{ ground, shape: { kind: 'rect', x: 0, y: 0, w: 1920, h: 1080 } }] } }, tank);
      Object.assign(m.player!, { x: 100, y: 300, heading: 0 });
      steps(m, 3, { ...IDLE, move: { kind: 'tank', throttle: 1, turn: 0 } });
      return Math.abs(m.player!.speed);
    };
    const wheels = 'cannon1/medium1/wheels1';
    expect(speed(wheels, 'forestFloor') / speed(wheels, 'forestTrailH')).toBeCloseTo(0.85, 2);
    expect(speed(wheels, 'clearing')).toBeCloseTo(speed(wheels, 'forestTrail'), 3);
    expect(speed('cannon1/medium1/halftracks1', 'forestFloor') / speed('cannon1/medium1/halftracks1', 'forestTrail')).toBeCloseTo(0.93, 2);
    expect(speed('cannon1/medium1/tracks1', 'forestFloor')).toBeCloseTo(speed('cannon1/medium1/tracks1', 'forestTrail'), 3);
  });
});

describe('old trees', () => {
  it('their canopy blocks sight and shots; the trunk alone blocks driving', () => {
    const m = at([{ kind: 'oldTree', x: 600, y: 540 }]);
    expect(sightClear(m, 400, 540, 800, 540)).toBe(false);
    expect(sightClear(m, 400, 540 + CANOPY.oldTree + 6, 800, 540 + CANOPY.oldTree + 6)).toBe(true);
    expect(losClear(m, 400, 560, 800, 560)).toBe(false);
    // Driving: the cells round the trunk past its canopy are open.
    expect(passable(m.nav, 600, 540 + 60)).toBe(true);
    // A shot into the canopy hits the tree.
    Object.assign(m.player!, { x: 400, y: 545, turret: 0 });
    const tree = m.structs.find((s) => s.def.kind === 'oldTree')!;
    m.step(1 / 60, { ...IDLE, fire: true, aim: 0 });
    steps(m, 0.6);
    expect(tree.hp).toBeLessThan(tree.def.hp);
    expect(m.shots).toHaveLength(0);
  });
  it('a burnt tree (state 0) blocks nothing', () => {
    const m = at([{ kind: 'oldFir', x: 600, y: 540 }]);
    breakStructure(m, m.structs.findIndex((s) => s.def.kind === 'oldFir'));
    expect(sightClear(m, 400, 540, 800, 540)).toBe(true);
  });
});

describe('young trees and logs', () => {
  const thicket: StructPlace[] = [{ kind: 'youngTree', x: 600, y: 540 }];
  it('young trees close the nav grid; Tracks and Heavies flatten them, Wheels are pushed round', () => {
    const m = at(thicket, undefined, {}).nav;
    expect(passable(m, 600, 540)).toBe(false);
    const drive = (tank: string): boolean => {
      const t = build(fixture({ kind: 'assault' }, [dummy(1800, 1000)], { structures: thicket }), tank);
      Object.assign(t.player!, { x: 480, y: 540, heading: 0 });
      steps(t, 2, { ...IDLE, move: { kind: 'tank', throttle: 1, turn: 0 } });
      return t.structs.find((s) => s.def.kind === 'youngTree')!.state === 0;
    };
    expect(drive('cannon1/medium1/tracks1')).toBe(true);
    expect(drive('cannon1/heavy1/halftracks1')).toBe(true);
    expect(drive('cannon1/medium1/wheels1')).toBe(false);
  });
  it('a fallen log is low and solid until sawn through; sawn (state 0) it clears the way', () => {
    const m = at([{ kind: 'fallenLogV', x: 600, y: 540, id: 'log' }]);
    const i = m.structs.findIndex((s) => s.def.id === 'log');
    expect(m.structs[i]!.def.low).toBe(true);
    expect(passable(m.nav, 600, 540)).toBe(false);
    breakStructure(m, i);
    expect(passable(m.nav, 600, 540)).toBe(true);
  });
});

describe('forest fire', () => {
  const row: StructPlace[] = [{ kind: 'oldTree', x: 600, y: 540 }, { kind: 'oldTree', x: 700, y: 540 }, { kind: 'oldTree', x: 1500, y: 540 }];
  it('a level fire lights the tree nearest its start, spreads to trees in reach, hurts tanks under it and burns out', () => {
    const m = at(row, undefined, { fire: { start: [{ x: 580, y: 540 }], every: 2, burn: 6 } });
    const foe = m.tanks.find((t) => t.team !== 0)!;
    Object.assign(foe, { x: 600, y: 540 + 34 });
    const hp = foe.hp;
    const ev = steps(m, 0.1);
    expect(ev.some((e) => e.kind === 'burn' && e.what === 'alight' && e.tree)).toBe(true);
    expect(m.fires.burning.size).toBe(1);
    // It closes the nav grid round itself while it burns.
    expect(passable(m.nav, 600, 540 + 40)).toBe(false);
    steps(m, 2.1);
    expect(m.fires.burning.size).toBe(2);
    expect(foe.hp).toBeLessThan(hp);
    steps(m, 6);
    const [a, b, far] = m.structs;
    expect([a!.state, b!.state, far!.state]).toEqual([0, 0, 2]);
    expect(passable(m.nav, 600, 540 + 40)).toBe(true);
  });
  it('a Flamer lights a tree, and a Flamer’s fire dies out after a few trees', () => {
    const line: StructPlace[] = Array.from({ length: 10 }, (_, i) => ({ kind: 'oldTree', x: 400 + i * 100, y: 300 }));
    const m = at(line, undefined, {});
    Object.assign(m.player!, { x: 300, y: 300, turret: 0 });
    const flamer = parseTank('flamer1/medium1/halftracks1');
    Object.assign(m.player!, { loadout: flamer, stats: { ...m.player!.stats, gun: { ...m.player!.stats.gun, family: 'flamer', damage: 5, reload: 0.1, range: 150, shot: 'flame', cone: 0.7, heat: true, belt: 30, beltReload: 1 } } });
    steps(m, 0.3, { ...IDLE, fire: true, aim: 0 });
    expect(m.fires.burning.size).toBeGreaterThan(0);
    steps(m, 60);
    const burnt = m.structs.filter((s) => s.state === 0).length;
    expect(burnt).toBeGreaterThan(1);
    expect(burnt).toBeLessThanOrEqual(TREE_FIRE.flamerHops + 2);
  });
});
