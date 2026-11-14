import { describe, expect, it } from 'vitest';
import { CH3_KINDS } from '../src/content/ch3/kinds';
import { canSee } from '../src/logic/bots/perception';
import { COUNTERS } from '../src/logic/damage';
import { groundAt, isDrivable } from '../src/logic/land';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { EnemyDef, LevelDef, StructPlace } from '../src/logic/level/types';
import { bankAt, fogBlocks, inFog } from '../src/logic/match/fog';
import { breakStructure } from '../src/logic/match/movement';
import { Match } from '../src/logic/match/match';
import { IDLE, type MatchEvent, type TankInput } from '../src/logic/match/types';
import { passable } from '../src/logic/nav/grid';
import { DRIVE_FAMILIES, DRIVES, FAMILY_CHAPTER } from '../src/logic/parts';
import { tankStats } from '../src/logic/stats';
import { fixture } from './fixtures/levels';

/** A 2 × 2 marsh with a lake of deep water down the middle (x 800–1100). */
const LAKE = { ground: 'swampWater' as const, shape: { kind: 'rect' as const, x: 800, y: 0, w: 300, h: 1080 } };
const swamp = (tank: string, enemies: EnemyDef[] = [], extra: Partial<LevelDef> = {}, structures: StructPlace[] = []): Match => {
  const d = fixture({ kind: 'assault' }, enemies.length ? enemies : [{ role: 'guard', clan: 'weasels', tank: 'machinegun1/light1/wheels1', at: { x: 1800, y: 1000 } }], { structures });
  const def: LevelDef = { ...d, ...extra, map: { ...d.map, base: 'marsh', terrain: [LAKE, ...(extra.map?.terrain ?? [])] } };
  return new Match({ level: loadLevel(def, CH3_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
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

describe('the Hover drive', () => {
  it('has the design numbers: speed 220, HP ×0.9, weight 3; floats; chapter 3', () => {
    const h = DRIVES.hover;
    expect([h.speed, h.hpFactor, h.weight, h.floats]).toEqual([220, 0.9, 3, true]);
    expect(DRIVE_FAMILIES).toContain('hover');
    expect(FAMILY_CHAPTER.hover).toBe(3);
    expect(COUNTERS.machinegun.hover).toBe(1.3);
    expect(COUNTERS.rockets.hover).toBe(0.6);
    for (const d of ['wheels', 'halftracks', 'tracks'] as const) expect(DRIVES[d].floats).toBeUndefined();
  });
  it('crosses deep water; ground drives stop at the bank', () => {
    for (const [tank, crosses] of [['cannon1/medium1/hover1', true], ['cannon1/medium1/wheels1', false], ['cannon1/medium1/tracks1', false]] as const) {
      const m = swamp(tank);
      Object.assign(m.player!, { x: 600, y: 540, heading: 0 });
      drive(m, EAST, 4);
      expect(m.player!.x > 1100, tank).toBe(crosses);
    }
  });
  it('ignores mud and shallows; Half-tracks slow there', () => {
    const speedOn = (tank: string): number => {
      const m = swamp(tank, [], { map: { terrain: [{ ground: 'shallows', shape: { kind: 'rect', x: 0, y: 0, w: 800, h: 1080 } }] } as LevelDef['map'] });
      Object.assign(m.player!, { x: 100, y: 300, heading: 0 });
      drive(m, EAST, 2.5);
      return m.player!.speed / m.player!.stats.speed;
    };
    expect(speedOn('cannon1/medium1/hover1')).toBeCloseTo(1, 1);
    expect(speedOn('cannon1/medium1/halftracks1')).toBeCloseTo(0.8, 1);
  });
  it('drifts on every ground: a hard turn carries it wide where Wheels bite', () => {
    const overshoot = (tank: string): number => {
      const m = swamp(tank);
      Object.assign(m.player!, { x: 100, y: 200, heading: 0 });
      drive(m, EAST, 2);
      const x0 = m.player!.x;
      drive(m, SOUTH, 1.2);
      return m.player!.x - x0;
    };
    expect(overshoot('cannon1/medium1/hover1')).toBeGreaterThan(overshoot('cannon1/medium1/wheels1') * 1.3);
    expect(tankStats(parseTank('cannon1/medium1/hover1')).grip).toBeLessThan(1);
    expect(tankStats(parseTank('cannon1/medium1/wheels1')).grip).toBe(1);
  });
});

describe('drive-aware navigation', () => {
  it('ground tanks keep the ground grid; a Hover grid opens deep water, built only when asked', () => {
    const m = swamp('cannon1/medium1/wheels1');
    expect(passable(m.nav, 950, 540)).toBe(false);
    const hover = m.navs.for(true);
    expect(passable(hover.nav, 950, 540)).toBe(true);
    expect(m.navFor(m.player!).nav).toBe(m.nav);
  });
  it('a Hover hunter comes straight across the lake; a Wheels one goes round it', () => {
    const across = (tank: string): number => {
      const m = swamp('cannon1/medium1/wheels1', [{ role: 'hunter', clan: 'weasels', tank, at: { x: 1500, y: 540 } }]);
      Object.assign(m.player!, { x: 300, y: 540 });
      const h = m.tanks.find((t) => t.team !== 0)!;
      let wet = 0;
      for (let i = 0; i < 60 * 5; i++) {
        m.step(1 / 60, IDLE);
        if (!isDrivable(m.land, h.x, h.y)) wet++;
      }
      return wet;
    };
    expect(across('machinegun1/light1/hover1')).toBeGreaterThan(30);
    expect(across('machinegun1/light1/wheels1')).toBe(0);
  });
  it('a Hover enemy may start out on the water; a ground one may not', () => {
    expect(() => swamp('cannon1/medium1/wheels1', [{ role: 'guard', clan: 'weasels', tank: 'machinegun1/light1/hover1', at: { x: 950, y: 540 } }])).not.toThrow();
    expect(() => swamp('cannon1/medium1/wheels1', [{ role: 'guard', clan: 'weasels', tank: 'machinegun1/light1/wheels1', at: { x: 950, y: 540 } }])).toThrow(/in water/);
  });
});

describe('fog banks', () => {
  const fog = { kind: 'fog' as const, banks: [{ x: 500, y: 540, r: 150 }, { x: 1500, y: 300, r: 100, dx: 200, period: 20 }] };
  it('static or drifting to and fro', () => {
    expect(bankAt(fog.banks[0]!, 33)).toEqual(fog.banks[0]);
    expect(bankAt(fog.banks[1]!, 5).x).toBeCloseTo(1700);
    expect(bankAt(fog.banks[1]!, 15).x).toBeCloseTo(1300);
  });
  it('hide a tank inside and cut sight through them', () => {
    const banks = [{ x: 500, y: 540, r: 150 }];
    expect(inFog(banks, 520, 560)).toBe(true);
    expect(fogBlocks(banks, 200, 540, 800, 540)).toBe(true);
    expect(fogBlocks(banks, 200, 200, 800, 200)).toBe(false);
    const m = swamp('cannon1/medium1/wheels1', [{ role: 'guard', clan: 'weasels', tank: 'cannon1/medium1/halftracks1', at: { x: 760, y: 540 } }], { weather: fog });
    const p = m.player!;
    const g = m.tanks.find((t) => t.team !== 0)!;
    g.turret = Math.PI;
    Object.assign(p, { x: 500, y: 540 });
    expect(canSee(m, g, p, 440, null)).toBe(false);
    Object.assign(p, { x: 600, y: 200 });
    expect(canSee(m, g, p, 440, null)).toBe(true);
  });
});

describe('dams and tides', () => {
  const channel = { ground: 'marsh' as const, shape: { kind: 'rect' as const, x: 800, y: 600, w: 300, h: 480 } };
  const flood = { by: 'dam', terrain: [{ ground: 'swampWater' as const, shape: { kind: 'rect' as const, x: 300, y: 700, w: 500, h: 200 } }] };
  const dammed = (extra: Partial<LevelDef> = {}) =>
    swamp('cannon1/medium1/wheels1', [], { map: { terrain: [channel] } as LevelDef['map'], floods: [flood], ...extra }, [{ kind: 'sluiceDam', x: 950, y: 620, id: 'dam' }]);
  it('a broken dam floods its patches: the ground, the nav grids and the view follow', () => {
    const m = dammed();
    m.navs.for(true);
    expect(groundAt(m.land, 500, 800)).toBe('marsh');
    const p = m.player!;
    Object.assign(p, { x: 500, y: 800 });
    breakStructure(m, m.structs.findIndex((s) => s.def.id === 'dam'));
    const ev = m.drainEvents();
    expect(groundAt(m.land, 500, 800)).toBe('swampWater');
    expect(passable(m.nav, 500, 800)).toBe(false);
    expect(passable(m.navs.for(true).nav, 500, 800)).toBe(true);
    expect(ev.some((e) => e.kind === 'flood' && e.cells > 0)).toBe(true);
    expect(isDrivable(m.land, p.x, p.y)).toBe(true);
  });
  it('a tide floods at its time, with a warning first', () => {
    const m = dammed({ floods: [{ at: 12, terrain: flood.terrain }] });
    const ev = drive(m, IDLE, 13);
    const texts = ev.filter((e) => e.kind === 'objective').map((e) => (e as { text: string }).text);
    expect(texts.some((t) => /10 s/.test(t))).toBe(true);
    expect(groundAt(m.land, 500, 800)).toBe('swampWater');
  });
  it('a flood needs a real structure (or a time) to hang on', () => {
    expect(() => dammed({ floods: [{ by: 'nope', terrain: [] }] })).toThrow(/no structure with id "nope"/);
    expect(() => dammed({ floods: [{ terrain: [] }] })).toThrow(/either "by"/);
  });
});
