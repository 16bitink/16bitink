import { describe, expect, it } from 'vitest';
import { think } from '../src/logic/bots/brain';
import { botInput, LOB_KEEP } from '../src/logic/bots/control';
import { COUNTERS, damageTaken } from '../src/logic/damage';
import { parseTank } from '../src/logic/level/load';
import type { EnemyDef, StructPlace } from '../src/logic/level/types';
import { aimAndFire } from '../src/logic/match/combat';
import { autoRange, lobRange, lobSpot } from '../src/logic/match/lob';
import { Match } from '../src/logic/match/match';
import { IDLE, type MatchEvent, type Tank, type TankInput } from '../src/logic/match/types';
import { ART_FAMILY, FAMILIES, GUN_FAMILIES, GUNS, partLabel } from '../src/logic/parts';
import { parseSave, serializeSave, newSave } from '../src/logic/save';
import { tankStats } from '../src/logic/stats';
import { addIntel, raiseMk, unlock } from '../src/logic/workshop';
import { intelOf } from '../src/logic/intel';
import { fixture, load } from './fixtures/levels';

const MORTAR = 'mortar1/medium1/halftracks1';
const make = (enemies: EnemyDef[], structures: StructPlace[] = [], loadout = parseTank(MORTAR)) =>
  new Match({ level: load(fixture({ kind: 'assault' }, enemies, { structures })), seed: 3, player: { loadout } });
const foes = (m: Match): Tank[] => m.tanks.filter((t) => t.team !== 0);
const put = (t: Tank, x: number, y: number) => Object.assign(t, { x, y });
const FIRE = (angle: number, dist: number): TankInput => ({ ...IDLE, aim: angle, aimDist: dist, fire: true });
const run = (m: Match, s: number, input: TankInput = IDLE): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  for (let i = 0; i < Math.round(s * 60) && !m.over; i++) {
    m.step(1 / 60, input);
    ev.push(...m.drainEvents());
  }
  return ev;
};

describe('the Mortar part', () => {
  it('is a gun family with the design numbers, Mk I–V, art keys and a name', () => {
    expect(GUN_FAMILIES).toContain('mortar');
    expect(FAMILIES).toContain('mortar');
    const g = GUNS.mortar;
    expect([g.damage, g.reload, g.range, g.minRange, g.splash, g.weight]).toEqual([45, 2.8, 520, 200, 40, 5]);
    expect(ART_FAMILY.mortar).toBe('turretMortar');
    expect(partLabel({ family: 'mortar', mk: 3 })).toBe('Mortar Mk III');
    expect(tankStats(parseTank('mortar3/medium1/wheels1')).gun.damage).toBeCloseTo(45 * 1.4);
    expect(COUNTERS.mortar).toEqual({ wheels: 0.9, halftracks: 1.0, tracks: 0.8, hover: 1.2 }); // the design table's Hover column (chapter 3)
  });
  it('is saved, unlocked and raised like any family', () => {
    let p = addIntel(newSave().progress, intelOf(parseTank('mortar2/light1/wheels1')));
    expect(p.intel.mortar).toBe(3);
    const u = unlock(p, 'mortar');
    expect(u.ok).toBe(true);
    if (u.ok) p = u.progress;
    expect(raiseMk(p, 'mortar').ok).toBe(false);
    const save = { ...newSave(), progress: { ...p, loadout: { ...p.loadout, gun: { family: 'mortar' as const, mk: 1 as const } } } };
    const back = parseSave(serializeSave(save));
    expect(back.problem).toBeNull();
    expect(back.save.progress.loadout.gun.family).toBe('mortar');
  });
});

describe('lobbed shells', () => {
  it('fly over a wall and land at the aimed spot, clamped to 200–520 px', () => {
    expect(lobRange(GUNS.mortar as never, 50)).toBe(200);
    expect(lobRange(GUNS.mortar as never, 900)).toBe(520);
    const m = make([{ role: 'guard', clan: 'crows', tank: 'cannon1/medium1/halftracks1', at: { x: 600, y: 540 } }], [{ kind: 'wallStoneV', x: 400, y: 540 }]);
    const p = m.player!;
    const [g] = foes(m);
    put(p, 200, 540);
    const ev = run(m, 0.1, FIRE(0, 400));
    const lob = ev.find((e) => e.kind === 'lob');
    expect(lob && lob.kind === 'lob' ? Math.abs(lob.x - 600) : 999).toBeLessThan(30);
    const hp = g!.hp;
    run(m, 2.5);
    expect(g!.hp).toBeLessThan(hp);
  });
  it('the whole blast hurts: a tank 30 px from the landing takes the full hit', () => {
    const m = make([{ role: 'turret', clan: 'crows', tank: 'cannon1/medium1/halftracks1', at: { x: 630, y: 540 }, sight: 10 }]);
    put(m.player!, 200, 540);
    const [g] = foes(m);
    g!.aimDist = 0;
    const hp = g!.hp;
    run(m, 0.05, FIRE(0, 400));
    run(m, 2.5);
    const want = damageTaken(45, 'mortar', 'halftracks', g!.stats.armour) * 2; // ×2 ambush: it hadn't seen us
    expect(hp - g!.hp).toBeCloseTo(want, 0);
  });
  it('break low cover where they land', () => {
    const m = make([{ role: 'guard', clan: 'crows', tank: MORTAR, at: { x: 1700, y: 1000 } }], [{ kind: 'sandbags', x: 600, y: 540 }]);
    put(m.player!, 200, 540);
    const bags = m.structs.find((s) => s.def.kind === 'sandbags')!;
    run(m, 0.05, FIRE(0, 400));
    run(m, 2.5);
    expect(bags.hp).toBeLessThan(bags.def.hp);
  });
  it('a thumbstick lob ranges itself on the enemy it points at', () => {
    const m = make([{ role: 'guard', clan: 'crows', tank: 'cannon1/medium1/halftracks1', at: { x: 640, y: 560 } }]);
    const p = m.player!;
    put(p, 200, 540);
    expect(autoRange(m, p, 0)).toBeCloseTo(Math.hypot(440, 20), 0);
    p.aimDist = 300;
    expect(autoRange(m, p, Math.PI)).toBe(300);
    p.turret = 0;
    expect(lobSpot(p).x).toBeCloseTo(500);
  });
});

describe('mortar bots', () => {
  const mortarBot = (x: number, extra: Partial<EnemyDef> = {}) => make([{ role: 'guard', clan: 'crows', tank: MORTAR, at: { x, y: 540 }, ...extra }], [], parseTank('cannon1/medium1/halftracks1'));
  it('lob at a target in its band, over a wall, and hold fire under the minimum range', () => {
    const m = mortarBot(700);
    const [g] = foes(m);
    const b = m.brains.get(g!.id)!;
    put(m.player!, 350, 540);
    b.aware = 'alert';
    think(m, b, g!);
    g!.turret = Math.PI;
    const far = botInput(m, b, g!, 1 / 60);
    expect(far.aimDist).toBeGreaterThan(250);
    put(m.player!, 600, 540);
    think(m, b, g!);
    b.holdFire = false;
    const near = botInput(m, b, g!, 1 / 60);
    expect(near.fire).toBe(false);
  });
  it('back away from a close target to keep distance', () => {
    const m = mortarBot(700);
    const [g] = foes(m);
    const b = m.brains.get(g!.id)!;
    put(m.player!, 560, 540);
    b.aware = 'alert';
    think(m, b, g!);
    const inp = botInput(m, b, g!, 1 / 60);
    // Moving away from the player (east).
    expect(inp.move && inp.move.kind === 'point' ? Math.cos(inp.move.angle) : -1).toBeGreaterThan(0);
    expect(LOB_KEEP * GUNS.mortar.range).toBeGreaterThan(GUNS.mortar.minRange! + 100);
  });
  it('shell where a friend sees you, though it cannot', () => {
    const m = make([
      { role: 'guard', clan: 'crows', tank: MORTAR, at: { x: 1000, y: 540 } },
      { role: 'guard', clan: 'crows', tank: 'cannon1/medium1/halftracks1', at: { x: 700, y: 540 } },
    ], [{ kind: 'wallStoneV', x: 900, y: 540 }, { kind: 'wallStoneV', x: 900, y: 600 }, { kind: 'wallStoneV', x: 900, y: 480 }], parseTank('cannon1/medium1/halftracks1'));
    const [mortar, spotter] = foes(m);
    put(m.player!, 560, 540);
    const sb = m.brains.get(spotter!.id)!;
    const mb = m.brains.get(mortar!.id)!;
    sb.aware = 'alert';
    mb.aware = 'alert';
    spotter!.turret = Math.PI;
    think(m, sb, spotter!);
    expect(sb.target).toBe(m.player!.id);
    think(m, mb, mortar!);
    expect(mb.target).toBeNull();
    expect(mb.lobAt).not.toBeNull();
    aimAndFire(m, mortar!, IDLE, 1 / 60);
  });
});
