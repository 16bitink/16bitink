import { describe, expect, it } from 'vitest';
import { CH4_KINDS } from '../src/content/ch4/kinds';
import { LASER_KEEP } from '../src/logic/bots/control';
import { armourAgainst, COUNTERS, damageTaken } from '../src/logic/damage';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { EnemyDef, LevelDef, StructPlace } from '../src/logic/level/types';
import { Match } from '../src/logic/match/match';
import { IDLE, type MatchEvent } from '../src/logic/match/types';
import { affordableUpgrades } from '../src/logic/blueprints';
import { artKey, FAMILY_CHAPTER, GUN_FAMILIES, GUNS, MK_COLOUR, partLabel } from '../src/logic/parts';
import { newSave, parseSave, serializeSave } from '../src/logic/save';
import { tankStats } from '../src/logic/stats';
import { addIntel, newProgress, unlock } from '../src/logic/workshop';
import { fixture } from './fixtures/levels';

const range = (tank: string, enemies: EnemyDef[], structures: StructPlace[] = []): Match => {
  const d = fixture({ kind: 'assault' }, enemies, { structures });
  const def: LevelDef = { ...d, number: 31, mixedClans: true };
  return new Match({ level: loadLevel(def, CH4_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
};
const dummy = (x: number, y: number, tank = 'cannon1/medium1/halftracks1'): EnemyDef => ({ role: 'turret', clan: 'crows', tank, at: { x, y }, sight: 1 });
const fire = (m: Match, aim = 0): MatchEvent[] => {
  m.step(1 / 60, { ...IDLE, fire: true, aim });
  return m.drainEvents();
};

describe('the Laser', () => {
  it('has the design numbers: 35 heat every 0.9 s, 480 px, an instant beam, weight 3; chapter 4', () => {
    const g = GUNS.laser;
    expect([g.damage, g.reload, g.range, g.weight, g.shot, g.heat]).toEqual([35, 0.9, 480, 3, 'beam', true]);
    expect(GUN_FAMILIES).toContain('laser');
    expect(FAMILY_CHAPTER.laser).toBe(4);
    expect(Object.keys(COUNTERS.laser).sort()).toEqual(['halftracks', 'hover', 'tracks', 'wheels']);
    expect(COUNTERS.laser.hover).toBeGreaterThan(COUNTERS.laser.tracks);
    expect(partLabel({ family: 'laser', mk: 4 })).toBe('Laser Mk IV');
    expect(artKey({ family: 'laser', mk: 5 })).toBe('turretLaser-mk3');
    expect(MK_COLOUR[5]).toBeDefined();
    expect(tankStats(parseTank('laser3/medium1/wheels1')).gun.damage).toBeCloseTo(35 * 1.4, 5);
  });
  it('meets heat armour, not kinetic', () => {
    const heavy = tankStats(parseTank('cannon1/heavy1/tracks1'));
    expect(armourAgainst(heavy, 'laser')).toBe(heavy.heatArmour);
    expect(damageTaken(35, 'laser', 'tracks', heavy.heatArmour)).toBeGreaterThan(damageTaken(35, 'cannon', 'tracks', heavy.armour));
  });
  it('hits at once, out to 480 px: no projectile, a beam event from the muzzle to the target', () => {
    const m = range('laser1/medium1/wheels1', [dummy(650, 540)]);
    Object.assign(m.player!, { x: 200, y: 540, turret: 0 });
    const foe = m.tanks.find((t) => t.team !== 0)!;
    const hp = foe.hp;
    const ev = fire(m);
    expect(m.shots).toHaveLength(0);
    const beam = ev.find((e) => e.kind === 'beam');
    expect(beam && beam.kind === 'beam' && beam.hit).toBe(true);
    expect(foe.hp).toBeLessThan(hp);
    expect(ev.some((e) => e.kind === 'hit' && e.shot === 'beam' && e.target === foe.id)).toBe(true);
  });
  it('falls short past its range, stops on a wall, passes low cover close up', () => {
    const far = range('laser1/medium1/wheels1', [dummy(750, 540)]);
    Object.assign(far.player!, { x: 200, y: 540, turret: 0 });
    const f = far.tanks.find((t) => t.team !== 0)!;
    const fhp = f.hp;
    fire(far);
    expect(f.hp).toBe(fhp);
    const walled = range('laser1/medium1/wheels1', [dummy(650, 540)], [{ kind: 'iceRockB', x: 420, y: 540 }]);
    Object.assign(walled.player!, { x: 200, y: 540, turret: 0 });
    const w = walled.tanks.find((t) => t.team !== 0)!;
    const whp = w.hp;
    const ev = fire(walled);
    expect(w.hp).toBe(whp);
    const beam = ev.find((e) => e.kind === 'beam');
    expect(beam && beam.kind === 'beam' ? beam.x1 : 0).toBeLessThan(420);
    const low = range('laser1/medium1/wheels1', [dummy(650, 540)], [{ kind: 'snowdriftV', x: 250, y: 540 }]);
    Object.assign(low.player!, { x: 200, y: 540, turret: 0 });
    const l = low.tanks.find((t) => t.team !== 0)!;
    const lhp = l.hp;
    fire(low);
    expect(l.hp).toBeLessThan(lhp);
  });
  it('the first tank on the line takes it', () => {
    const m = range('laser1/medium1/wheels1', [dummy(450, 540), dummy(650, 540)]);
    Object.assign(m.player!, { x: 200, y: 540, turret: 0 });
    const [near, far] = m.tanks.filter((t) => t.team !== 0);
    const [n0, f0] = [near!.hp, far!.hp];
    fire(m);
    expect(near!.hp).toBeLessThan(n0);
    expect(far!.hp).toBe(f0);
  });
  it('Laser bots keep their distance and telegraph their beam', () => {
    expect(LASER_KEEP * GUNS.laser.range).toBeGreaterThan(GUNS.cannon.range);
    const m = range('cannon1/medium1/wheels1', [{ role: 'guard', clan: 'crows', tank: 'laser1/medium1/halftracks1', at: { x: 700, y: 540 }, sight: 600 }]);
    Object.assign(m.player!, { x: 350, y: 540 });
    const ev: MatchEvent[] = [];
    for (let i = 0; i < 60 * 6; i++) {
      m.step(1 / 60, IDLE);
      ev.push(...m.drainEvents());
    }
    const aim = ev.findIndex((e) => e.kind === 'aim');
    const beam = ev.findIndex((e) => e.kind === 'beam');
    expect(aim).toBeGreaterThanOrEqual(0);
    expect(beam).toBeGreaterThan(aim);
    expect(m.player!.hp).toBeLessThan(m.player!.stats.maxHp);
  });
  it('saves, unlocks and upgrades in the workshop like any family', () => {
    const p = addIntel(newProgress(), { laser: 10 });
    expect(affordableUpgrades(p).some((u) => u.key === 'unlock:laser')).toBe(true);
    const r = unlock(p, 'laser');
    if (!r.ok) throw new Error(r.reason);
    const progress = { ...r.progress, loadout: { ...r.progress.loadout, gun: { family: 'laser' as const, mk: 1 as const } } };
    const back = parseSave(serializeSave({ ...newSave(), progress }));
    expect(back.problem).toBeNull();
    expect(back.save.progress.unlocked).toContain('laser');
    expect(back.save.progress.loadout.gun.family).toBe('laser');
  });
});
