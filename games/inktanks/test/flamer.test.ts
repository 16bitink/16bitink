import { describe, expect, it } from 'vitest';
import { CH3_KINDS } from '../src/content/ch3/kinds';
import { hidden } from '../src/logic/bots/perception';
import { FLAME_KEEP } from '../src/logic/bots/control';
import { armourAgainst, COUNTERS, damageTaken, isHeat } from '../src/logic/damage';
import { intelOf } from '../src/logic/intel';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { EnemyDef, StructPlace } from '../src/logic/level/types';
import { hitTank } from '../src/logic/match/combat';
import { FIRE } from '../src/logic/match/flame';
import { Match } from '../src/logic/match/match';
import { IDLE, type Tank, type TankInput } from '../src/logic/match/types';
import { ART_FAMILY, FAMILIES, FAMILY_CHAPTER, GUN_FAMILIES, GUNS, HULLS, partLabel } from '../src/logic/parts';
import { newSave, parseSave, serializeSave } from '../src/logic/save';
import { tankStats } from '../src/logic/stats';
import { addIntel, unlock } from '../src/logic/workshop';
import { fixture } from './fixtures/levels';

const FLAMER = 'flamer1/medium1/halftracks1';
const make = (enemies: EnemyDef[], structures: StructPlace[] = [], tank = FLAMER) =>
  new Match({ level: loadLevel(fixture({ kind: 'assault' }, enemies, { structures }), CH3_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
const guard = (x: number, y: number, tank = 'cannon1/medium1/halftracks1'): EnemyDef => ({ role: 'guard', clan: 'weasels', tank, at: { x, y } });
const foes = (m: Match): Tank[] => m.tanks.filter((t) => t.team !== 0);
/** Hold the trigger towards angle `aim` for `s` seconds, standing still. */
const flame = (m: Match, aim: number, s: number): void => {
  const input: TankInput = { ...IDLE, aim, fire: true };
  for (let i = 0; i < Math.round(s * 60); i++) m.step(1 / 60, input);
};
/** Calm guards would take ambush ×2 and fight back: make them alert and frozen for clean numbers. */
const freeze = (m: Match): void => {
  for (const b of m.brains.values()) if (b.role !== 'player') Object.assign(b, { aware: 'alert', diff: { ...b.diff, hesitate: 1 }, thinkT: 999, state: 'idle' });
};

describe('heat and kinetic armour (chapter 3)', () => {
  it('every hull has heat armour below its kinetic armour; the kinetic numbers are unchanged', () => {
    expect([HULLS.light.armour, HULLS.medium.armour, HULLS.heavy.armour]).toEqual([3, 7, 12]);
    for (const h of Object.values(HULLS)) expect(h.heatArmour).toBeLessThan(h.armour);
    const s = tankStats(parseTank('cannon1/heavy1/tracks1'), { heavy: { armour: 3 } });
    expect(s.armour).toBeCloseTo(12 * 1.24);
    expect(s.heatArmour).toBeCloseTo(HULLS.heavy.heatArmour * 1.24);
  });
  it('heat guns meet heat armour, the rest kinetic', () => {
    const s = tankStats(parseTank('cannon1/medium1/halftracks1'));
    expect(isHeat('flamer')).toBe(true);
    for (const g of ['machinegun', 'cannon', 'rockets', 'mortar'] as const) {
      expect(isHeat(g)).toBe(false);
      expect(armourAgainst(s, g)).toBe(s.armour);
    }
    expect(armourAgainst(s, 'flamer')).toBe(s.heatArmour);
  });
  it('a hit lands through the right armour', () => {
    const m = make([guard(1500, 900, 'flamer1/light1/wheels1')], [], 'cannon1/medium1/halftracks1');
    const p = m.player!;
    const f = foes(m)[0]!;
    const hp = p.hp;
    hitTank(m, p, 5, 'flamer', f.id);
    expect(hp - p.hp).toBeCloseTo(damageTaken(5, 'flamer', 'halftracks', HULLS.medium.heatArmour));
    const hp2 = p.hp;
    hitTank(m, p, 40, 'cannon', f.id);
    expect(hp2 - p.hp).toBeCloseTo(damageTaken(40, 'cannon', 'halftracks', 7));
  });
});

describe('the Flamer part', () => {
  it('is a chapter 3 gun family with the design numbers', () => {
    expect(GUN_FAMILIES).toContain('flamer');
    expect(FAMILIES).toContain('flamer');
    expect(FAMILY_CHAPTER.flamer).toBe(3);
    const g = GUNS.flamer;
    expect([g.damage, g.range, g.weight, g.heat, g.shot]).toEqual([5, 150, 2, true, 'flame']);
    expect(g.cone).toBeGreaterThan(0);
    expect(COUNTERS.flamer).toEqual({ wheels: 1.1, halftracks: 1.0, tracks: 0.9, hover: 1.3 });
    expect(ART_FAMILY.flamer).toBe('turretFlamer');
    expect(partLabel({ family: 'flamer', mk: 2 })).toBe('Flamer Mk II');
    expect(tankStats(parseTank('flamer3/medium1/wheels1')).gun.damage).toBeCloseTo(5 * 1.4);
  });
  it('is saved and unlocked like any family', () => {
    const p = addIntel(newSave().progress, intelOf(parseTank('flamer2/light1/wheels1')));
    expect(p.intel.flamer).toBe(3);
    const u = unlock(p, 'flamer');
    expect(u.ok).toBe(true);
    const save = { ...newSave(), progress: { ...u.progress, loadout: { ...u.progress.loadout, gun: { family: 'flamer' as const, mk: 1 as const } } } };
    expect(parseSave(serializeSave(save)).save.progress.loadout.gun.family).toBe('flamer');
  });
});

describe('the stream', () => {
  it('burns every tank in its cone each tick, within 150 px', () => {
    const m = make([guard(320, 520), guard(320, 580), guard(520, 540)]);
    freeze(m);
    const [a, b, far] = foes(m);
    const hp = [a!.hp, b!.hp, far!.hp];
    flame(m, 0, 1);
    expect(a!.hp).toBeLessThan(hp[0]!);
    expect(b!.hp).toBeLessThan(hp[1]!);
    expect(far!.hp).toBe(hp[2]);
  });
  it('misses tanks outside the cone and is stopped by walls', () => {
    const m = make([guard(200, 420), guard(330, 540)], [{ kind: 'wallStoneV', x: 280, y: 540 }]);
    freeze(m);
    const [side, behind] = foes(m);
    const hp = [side!.hp, behind!.hp];
    flame(m, 0, 1);
    expect(side!.hp).toBe(hp[0]);
    expect(behind!.hp).toBe(hp[1]);
  });
  it('a tick does heat damage: 5 a tick, ten ticks a second, then refills', () => {
    const m = make([guard(320, 540, 'cannon1/medium1/halftracks1')]);
    freeze(m);
    const f = foes(m)[0]!;
    const hp = f.hp;
    flame(m, 0, 1);
    const perTick = damageTaken(5, 'flamer', 'halftracks', HULLS.medium.heatArmour);
    expect((hp - f.hp) / perTick).toBeGreaterThan(8);
    expect((hp - f.hp) / perTick).toBeLessThan(12);
  });
});

describe('burning reeds', () => {
  const reeds: StructPlace[] = [{ kind: 'reeds', x: 330, y: 540 }, { kind: 'reeds', x: 390, y: 540 }, { kind: 'reeds', x: 700, y: 540 }];
  it('reeds are cover, flattenable and catch fire', () => {
    const k = CH3_KINDS.reeds!;
    expect([k.cover, k.flattenable, k.burns]).toEqual([true, true, true]);
  });
  it('a Flamer lights them, the fire jumps to near clumps, then they burn out', () => {
    const m = make([guard(1500, 900)], reeds);
    freeze(m);
    flame(m, 0, 0.3);
    expect(m.fires.burning.size).toBe(1);
    flame(m, Math.PI, FIRE.spread + 0.2);
    const ids = [...m.fires.burning].map((i) => m.structs[i]!.def.x).sort();
    expect(ids).toEqual([330, 390]);
    flame(m, Math.PI, FIRE.burn + 1);
    const standing = (x: number) => m.structs.find((s) => s.def.x === x)!.state > 0;
    expect([standing(330), standing(390), standing(700)]).toEqual([false, false, true]);
  });
  it('hurts a tank inside them and hides nobody while it burns', () => {
    const m = make([guard(390, 540, 'cannon1/medium1/halftracks1')], reeds);
    freeze(m);
    const g = foes(m)[0]!;
    g.firedAt = -99;
    expect(hidden(m, g)).toBe(true);
    flame(m, 0, 0.2);
    const hp = g.hp;
    flame(m, Math.PI, 2.5);
    expect(g.hp).toBeLessThan(hp);
    g.firedAt = -99;
    expect(hidden(m, g)).toBe(false);
  });
});

describe('flamer bots', () => {
  it('close right in to fight', () => {
    const m = make([{ role: 'hunter', clan: 'weasels', tank: 'flamer1/medium1/wheels1', at: { x: 900, y: 540 } }], [], 'cannon1/medium1/halftracks1');
    const p = m.player!;
    const hp = p.hp;
    for (let i = 0; i < 60 * 8; i++) m.step(1 / 60, IDLE);
    const f = foes(m)[0]!;
    expect(Math.hypot(f.x - p.x, f.y - p.y)).toBeLessThan(GUNS.flamer.range);
    expect(p.hp).toBeLessThan(hp);
    expect(FLAME_KEEP * GUNS.flamer.range).toBeLessThan(GUNS.flamer.range);
  });
});
