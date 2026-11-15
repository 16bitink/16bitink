import { describe, expect, it } from 'vitest';
import { CH5_KINDS } from '../src/content/ch5/kinds';
import { RAIL_KEEP } from '../src/logic/bots/control';
import { COUNTERS, armourAgainst } from '../src/logic/damage';
import { affordableUpgrades } from '../src/logic/blueprints';
import { loadLevel, parseTank } from '../src/logic/level/load';
import type { EnemyDef, LevelDef, StructPlace } from '../src/logic/level/types';
import { Match } from '../src/logic/match/match';
import { RAILGUN } from '../src/logic/match/railgun';
import { IDLE, type MatchEvent } from '../src/logic/match/types';
import { artKey, FAMILY_CHAPTER, GUN_FAMILIES, GUNS, partLabel } from '../src/logic/parts';
import { newSave, parseSave, serializeSave } from '../src/logic/save';
import { tankStats } from '../src/logic/stats';
import { addIntel, newProgress, unlock } from '../src/logic/workshop';
import { fixture } from './fixtures/levels';

const range = (tank: string, enemies: EnemyDef[], structures: StructPlace[] = []): Match => {
  const d = fixture({ kind: 'assault' }, enemies, { structures });
  const def: LevelDef = { ...d, number: 41 };
  return new Match({ level: loadLevel(def, CH5_KINDS), seed: 1, player: { loadout: parseTank(tank) } });
};
const dummy = (x: number, y: number, tank = 'cannon1/medium1/halftracks1'): EnemyDef => ({ role: 'turret', clan: 'hive', tank, at: { x, y }, sight: 1 });
/** Pulls the trigger once along `aim`, then waits out the charge. */
const pull = (m: Match, aim = 0, wait = 1): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  m.step(1 / 60, { ...IDLE, fire: true, aim });
  ev.push(...m.drainEvents());
  for (let i = 0; i < Math.round(wait * 60); i++) {
    m.step(1 / 60, IDLE);
    ev.push(...m.drainEvents());
  }
  return ev;
};

describe('the Rail', () => {
  it('has the design numbers: 90 every 3 s, 640 px, a charge, weight 6, kinetic; chapter 5', () => {
    const g = GUNS.rail;
    expect([g.damage, g.reload, g.range, g.weight, g.shot, g.heat ?? false]).toEqual([90, 3, 640, 6, 'rail', false]);
    expect(g.charge).toBeGreaterThan(0);
    expect(GUN_FAMILIES).toContain('rail');
    expect(FAMILY_CHAPTER.rail).toBe(5);
    expect(Object.keys(COUNTERS.rail).sort()).toEqual(['halftracks', 'hover', 'tracks', 'wheels']);
    expect(COUNTERS.rail.tracks).toBeGreaterThan(COUNTERS.rail.hover);
    expect(partLabel({ family: 'rail', mk: 2 })).toBe('Rail Mk II');
    expect(artKey({ family: 'rail', mk: 4 })).toBe('turretRail-mk4');
    const heavy = tankStats(parseTank('cannon1/heavy1/tracks1'));
    expect(armourAgainst(heavy, 'rail')).toBe(heavy.armour);
  });
  it('charges first: an aim line at the pull, the slug only after the charge', () => {
    const m = range('rail1/medium1/wheels1', [dummy(700, 540)]);
    Object.assign(m.player!, { x: 200, y: 540, turret: 0 });
    m.step(1 / 60, { ...IDLE, fire: true, aim: 0 });
    const first = m.drainEvents();
    expect(first.some((e) => e.kind === 'aim')).toBe(true);
    expect(first.some((e) => e.kind === 'slug')).toBe(false);
    // The aim is held while it charges.
    m.step(1 / 60, { ...IDLE, aim: 1 });
    expect(m.player!.turret).toBeCloseTo(0, 5);
    const ev = pull(m, 0, 0.9);
    expect(ev.some((e) => e.kind === 'slug')).toBe(true);
  });
  it('pierces walls, trees and every tank on its line; rock stops it', () => {
    const m = range('rail1/medium1/wheels1', [dummy(450, 540), dummy(750, 540)], [{ kind: 'wallBrickV', x: 330, y: 540 }, { kind: 'oldTree', x: 600, y: 545 }]);
    Object.assign(m.player!, { x: 200, y: 540, turret: 0 });
    const foes = m.tanks.filter((t) => t.team !== 0);
    const hp0 = foes.map((t) => t.hp);
    const tree = m.structs.find((s) => s.def.kind === 'oldTree')!;
    pull(m);
    foes.forEach((t, i) => expect(t.hp).toBeLessThan(hp0[i]!));
    expect(tree.hp).toBeCloseTo(tree.def.hp - GUNS.rail.damage * RAILGUN.structShare, 5);
    const rock = range('rail1/medium1/wheels1', [dummy(650, 540)], [{ kind: 'rockB', x: 420, y: 540 }]);
    Object.assign(rock.player!, { x: 200, y: 540, turret: 0 });
    const f = rock.tanks.find((t) => t.team !== 0)!;
    const fhp = f.hp;
    const ev = pull(rock);
    expect(f.hp).toBe(fhp);
    const slug = ev.find((e) => e.kind === 'slug');
    expect(slug && slug.kind === 'slug' ? slug.x1 : 9999).toBeLessThan(420);
  });
  it('Rail bots keep far back, charge (the line is the warning) and fire through trees at where they saw you', () => {
    expect(RAIL_KEEP * GUNS.rail.range).toBeGreaterThan(GUNS.cannon.range);
    // A row of old trees between them: the bot glimpses the player through the gap, then the player hides behind the trees.
    const trees: StructPlace[] = [{ kind: 'oldTree', x: 600, y: 470 }, { kind: 'oldTree', x: 600, y: 610 }];
    const m = range('cannon1/medium1/wheels1', [{ role: 'guard', clan: 'hive', tank: 'rail1/medium1/halftracks1', at: { x: 800, y: 540 }, sight: 420 }], trees);
    Object.assign(m.player!, { x: 420, y: 540 });
    const ev: MatchEvent[] = [];
    for (let i = 0; i < 60 * 8; i++) {
      m.step(1 / 60, IDLE);
      ev.push(...m.drainEvents());
    }
    const aim = ev.findIndex((e) => e.kind === 'aim');
    const slug = ev.findIndex((e) => e.kind === 'slug');
    expect(aim).toBeGreaterThanOrEqual(0);
    expect(slug).toBeGreaterThan(aim);
    expect(m.player!.hp).toBeLessThan(m.player!.stats.maxHp);
  });
  it('an alert Rail bot that lost you behind a tree still fires through it, at where it saw you last', () => {
    const m = range('cannon1/medium1/wheels1', [{ role: 'guard', clan: 'hive', tank: 'rail1/medium1/halftracks1', at: { x: 800, y: 540 }, sight: 420 }], [{ kind: 'oldTree', x: 600, y: 540 }]);
    Object.assign(m.player!, { x: 420, y: 540 });
    const foe = m.tanks.find((t) => t.team !== 0)!;
    const b = m.brains.get(foe.id)!;
    Object.assign(b, { aware: 'alert', alertUntil: 99, lastSeen: { x: 420, y: 540, t: 0, id: m.player!.id } });
    foe.turret = Math.PI;
    let slugs = 0;
    for (let i = 0; i < 60 * 3; i++) {
      m.step(1 / 60, IDLE);
      slugs += m.drainEvents().filter((e) => e.kind === 'slug').length;
    }
    expect(b.target).toBeNull();
    expect(slugs).toBeGreaterThan(0);
    expect(m.player!.hp).toBeLessThan(m.player!.stats.maxHp);
  });
  it('saves, unlocks and upgrades in the workshop like any family', () => {
    const p = addIntel(newProgress(), { rail: 10 });
    expect(affordableUpgrades(p).some((u) => u.key === 'unlock:rail')).toBe(true);
    const r = unlock(p, 'rail');
    if (!r.ok) throw new Error(r.reason);
    const progress = { ...r.progress, loadout: { ...r.progress.loadout, gun: { family: 'rail' as const, mk: 1 as const } } };
    const back = parseSave(serializeSave({ ...newSave(), progress }));
    expect(back.problem).toBeNull();
    expect(back.save.progress.loadout.gun.family).toBe('rail');
  });
});
