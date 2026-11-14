import { describe, expect, it } from 'vitest';
import type { EnemyDef, LevelDef } from '../src/logic/level/types';
import { Match, TOWER } from '../src/logic/match/match';
import { IDLE, type Tank } from '../src/logic/match/types';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { fixture, load } from './fixtures/levels';

const SCOUT = 'machinegun1/light1/wheels1';
const withTower = (enemies: EnemyDef[], wake = 500): LevelDef => ({ ...fixture({ kind: 'assault' }, enemies), allies: [{ kind: 'tower', at: { x: 900, y: 540 }, gun: 'cannon', wake }] });
const make = (def: LevelDef) => new Match({ level: load(def), seed: 3, player: { loadout: STARTER_LOADOUT } });
const tower = (m: Match): Tank => m.tanks.find((t) => t.team === 0 && t.role === 'bossTurret')!;
const put = (t: Tank, x: number, y: number) => Object.assign(t, { x, y, speed: 0 });
const steps = (m: Match, s: number) => {
  for (let i = 0; i < Math.round(s * 60) && !m.over; i++) m.step(1 / 60, IDLE);
};

describe('allied gun towers', () => {
  it('stand on an indestructible tower base that blocks driving but not shots or sight', () => {
    const m = make(withTower([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 1700, y: 540 } }]));
    const base = m.structs.find((s) => s.def.perch);
    expect(base?.def.kind).toBe('cementTower');
    expect(base?.def.hp).toBe(0);
    expect(m.navPassable(900, 540)).toBe(false);
    expect(m.lineBlocker(700, 540, 1100, 540, null)).toBeNull();
  });
  it('hold fire until you come near, then shoot enemies in sight', () => {
    const m = make(withTower([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 1250, y: 540 }, hpMult: 2 }]));
    const p = m.player!;
    const [foe] = m.tanks.filter((t) => t.team !== 0);
    put(p, 200, 1000);
    const hp = foe!.hp;
    steps(m, 3);
    expect(foe!.hp).toBe(hp);
    expect(tower(m).shotsFired).toBe(0);
    put(p, 700, 900);
    steps(m, 4);
    expect(tower(m).shotsFired).toBeGreaterThan(0);
    expect(foe!.hp).toBeLessThan(hp);
  });
  it('enemies never target them and shots fly past them', () => {
    const m = make(withTower([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 1800, y: 1000 } }], 0));
    const t = tower(m);
    m.shots.push({ id: 999, owner: 0, team: 1, x: t.x - 40, y: t.y, vx: 600, vy: 0, travelled: 0, range: 200, damage: 50, gun: 'cannon', splash: 0, breaksBrick: false, kind: 'shell', alive: true });
    steps(m, 0.2);
    expect(t.hp).toBe(TOWER.hp);
  });
});
