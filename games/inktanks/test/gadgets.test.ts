import { describe, expect, it } from 'vitest';
import { canSee, hidden } from '../src/logic/bots/perception';
import type { EnemyDef, StructPlace } from '../src/logic/level/types';
import { GADGET_SHARE, rollCrate } from '../src/logic/loot';
import { gadgetCharges, gadgetMax, mineTier, OIL_FIRE, oilTier, SCATTER_DAMAGE, smokeTier } from '../src/logic/gadgetTiers';
import { GADGET } from '../src/logic/match/gadgets';
import { useGadget } from '../src/logic/match/gadgetUse';
import { Match } from '../src/logic/match/match';
import { aimAndFire } from '../src/logic/match/combat';
import { driveTank } from '../src/logic/match/movement';
import { touchPickups } from '../src/logic/match/pickups';
import { IDLE, type GadgetKind, type Tank } from '../src/logic/match/types';
import { STARTER_LOADOUT, type Mk } from '../src/logic/parts';
import { createRng } from '../src/logic/rng';
import { newSave, parseSave, serializeSave } from '../src/logic/save';
import { LOOT_EARLY } from '../src/content/ch1/levels/kit';
import { fixture, load } from './fixtures/levels';

const SCOUT = 'machinegun1/light1/wheels1';
/** A dummy that can't see or shoot: a turret far from everything, set alert so no ambush ×2. */
const dummy = (x: number, y: number): EnemyDef => ({ role: 'turret', clan: 'boars', tank: SCOUT, at: { x, y }, hpMult: 3 });
const make = (gadget: GadgetKind | null, enemies: EnemyDef[] = [dummy(1800, 1000)], structures: StructPlace[] = [], gadgetMk: Partial<Record<GadgetKind, Mk>> = {}) =>
  new Match({ level: load(fixture({ kind: 'assault' }, enemies, { structures })), seed: 7, player: { loadout: STARTER_LOADOUT, gadget, gadgetMk } });
const foes = (m: Match): Tank[] => m.tanks.filter((t) => t.team !== 0);
const put = (t: Tank, x: number, y: number) => Object.assign(t, { x, y, speed: 0 });
const steps = (m: Match, s: number) => {
  for (let i = 0; i < Math.round(s * 60) && !m.over; i++) m.step(1 / 60, IDLE);
};
const alert = (m: Match, t: Tank) => Object.assign(m.brains.get(t.id)!, { aware: 'alert', alertUntil: 1e9 });

describe('the gadget slot', () => {
  it('2 charges a level; one press, one use; none without a slot', () => {
    const m = make('smoke');
    const p = m.player!;
    expect(p.gadgetCharges).toBe(gadgetCharges('smoke', 1));
    expect(useGadget(m, p)).toBe(true);
    expect(useGadget(m, p)).toBe(false);
    m.t += GADGET.cooldown;
    expect(useGadget(m, p)).toBe(true);
    m.t += GADGET.cooldown;
    expect(useGadget(m, p)).toBe(false);
    expect(p.gadgetCharges).toBe(0);
    expect(p.gadgetsUsed).toBe(2);
    const none = make(null);
    expect(useGadget(none, none.player!)).toBe(false);
  });
  it('the briefing can change the gadget before the start', () => {
    const m = make('mines');
    m.setPlayerGadget('oil');
    expect(m.player!.gadget).toBe('oil');
    expect(m.player!.gadgetCharges).toBe(gadgetCharges('oil', 1));
  });
  it('crates roll a gadget charge now and then; the pickup tops you up to the max', () => {
    const rng = createRng(3);
    const rolls = Array.from({ length: 1000 }, () => rollCrate(rng, LOOT_EARLY));
    const share = rolls.filter((r) => r.kind === 'gadget').length / rolls.length;
    expect(share).toBeGreaterThan(GADGET_SHARE * (1 - LOOT_EARLY.kitShare) * 0.6);
    expect(share).toBeLessThan(GADGET_SHARE * 1.4);
    const m = make('mines');
    const p = m.player!;
    for (let i = 0; i < 4; i++) {
      m.addPickup({ kind: 'gadget' }, p.x, p.y);
      touchPickups(m, p, IDLE, 1 / 60, false);
    }
    // Two top it up to the max; the two spares turn into mine blueprints.
    expect(p.gadgetCharges).toBe(gadgetMax('mines', 1));
    expect(m.pickups.filter((x) => x.kind === 'gadget' && !x.taken)).toHaveLength(0);
    expect(m.gadgetIntel.mines).toBe(2);
  });
});

describe('mines', () => {
  it('arm after 1 s, go off under an enemy within 28 px: 90 damage, 40 px splash, a broken track', () => {
    const m = make('mines', [dummy(1500, 300), dummy(1500, 900)]);
    const p = m.player!;
    put(p, 600, 540);
    p.heading = 0;
    const [a, b] = foes(m);
    alert(m, a!);
    alert(m, b!);
    useGadget(m, p);
    const mine = m.gadgets.mines[0]!;
    put(p, 300, 540);
    put(a!, mine.x + 20, mine.y);
    put(b!, mine.x, mine.y + 40 + b!.stats.radius - 4);
    const [hpA, hpB] = [a!.hp, b!.hp];
    steps(m, 0.5);
    expect(mine.alive).toBe(true);
    expect(a!.hp).toBe(hpA);
    steps(m, 0.6);
    expect(mine.alive).toBe(false);
    expect(hpA - a!.hp).toBeCloseTo(mineTier(1).damage);
    expect(hpB - b!.hp).toBeCloseTo(mineTier(1).damage / 2);
    expect(a!.trackBrokenUntil).toBeGreaterThan(m.t + mineTier(1).slowFor - 0.6);
    // Two enemies hit: 2 mine blueprints.
    expect(m.gadgetIntel.mines).toBe(2);
  });
  it('a broken track halves speed; your own mines never go off under you', () => {
    const m = make('mines', [dummy(1500, 300)]);
    const p = m.player!;
    put(p, 600, 540);
    useGadget(m, p);
    steps(m, 1.2);
    put(p, m.gadgets.mines[0]!.x, m.gadgets.mines[0]!.y);
    steps(m, 0.2);
    expect(m.gadgets.mines[0]!.alive).toBe(true);
    const drive = (broken: boolean): number => {
      const mm = make(null);
      const q = mm.player!;
      put(q, 400, 540);
      q.heading = 0;
      if (broken) q.trackBrokenUntil = 99;
      for (let i = 0; i < 60; i++) mm.step(1 / 60, { ...IDLE, move: { kind: 'point', angle: 0, mag: 1 } });
      return q.x - 400;
    };
    expect(drive(true)).toBeLessThan(drive(false) * 0.6);
  });
  it('only bots that watched it laid know it is there', () => {
    const m = make('mines', [{ role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 } }, { role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 900, y: 200 } }], [{ kind: 'wallStoneV', x: 700, y: 230 }, { kind: 'wallStoneV', x: 700, y: 170 }]);
    const p = m.player!;
    put(p, 600, 540);
    const [watcher, blind] = foes(m);
    watcher!.turret = Math.PI;
    alert(m, watcher!);
    alert(m, blind!);
    put(p, 600, 200);
    useGadget(m, p);
    put(p, 600, 540);
    m.t += GADGET.cooldown;
    useGadget(m, p);
    const [m1, m2] = m.gadgets.mines;
    expect(m1!.known.has(blind!.id)).toBe(false);
    expect(m2!.known.has(watcher!.id)).toBe(true);
  });
});

describe('oil and smoke', () => {
  it('oil: enemies in it crawl at ×0.4 and turn badly; the player is safe in its own slick', () => {
    const GO = { ...IDLE, move: { kind: 'point' as const, angle: 0, mag: 1 } };
    const run = (oil: boolean, who: 'enemy' | 'player'): { moved: number; turned: number } => {
      const m = make('oil', [dummy(1700, 900)]);
      const p = m.player!;
      put(p, 600, 300);
      p.heading = Math.PI;
      if (oil) useGadget(m, p);
      const t = who === 'enemy' ? foes(m)[0]! : p;
      if (who === 'enemy') put(p, 100, 100);
      put(t, 600, 300);
      t.heading = 0;
      // Held in the slick's middle for 1 s: the speed it settles at.
      for (let i = 0; i < 60; i++) {
        driveTank(m, t, GO, 1 / 60);
        Object.assign(t, { x: 600, y: 300 });
      }
      const moved = t.speed;
      t.heading = 0;
      t.speed = 0;
      put(t, 600, 300);
      for (let i = 0; i < 10; i++) driveTank(m, t, { ...IDLE, move: { kind: 'point', angle: Math.PI / 2, mag: 1 } }, 1 / 60);
      return { moved, turned: t.heading };
    };
    const [slick, dry] = [run(true, 'enemy'), run(false, 'enemy')];
    expect(slick.moved).toBeLessThan(dry.moved * 0.6);
    expect(slick.turned).toBeLessThan(dry.turned * 0.5);
    expect(run(true, 'player').moved).toBeCloseTo(run(false, 'player').moved, 3);
  });
  it('smoke: blocks sight both ways, hides a tank inside, and clears after 6 s', () => {
    const m = make('smoke', [{ role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 } }]);
    const p = m.player!;
    put(p, 600, 540);
    const [g] = foes(m);
    expect(canSee(m, g!, p)).toBe(true);
    useGadget(m, p);
    expect(hidden(m, p)).toBe(true);
    expect(canSee(m, g!, p)).toBe(false);
    expect(canSee(m, p, g!)).toBe(false);
    // Out of the cloud, behind it: still hidden from the guard.
    put(p, 500, 540);
    expect(hidden(m, p)).toBe(false);
    expect(canSee(m, g!, p)).toBe(false);
    m.t += smokeTier(1).life + 0.1;
    expect(canSee(m, g!, p)).toBe(true);
  });
});

describe('the save', () => {
  it('keeps the gadget; a missing or bad one gives the default', () => {
    const s = { ...newSave(), gadget: 'smoke' as const };
    expect(parseSave(serializeSave(s)).save.gadget).toBe('smoke');
    const old = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    delete old.gadget;
    expect(parseSave(JSON.stringify(old)).save.gadget).toBe('mines');
    expect(parseSave(JSON.stringify({ ...old, gadget: 'nuke' })).save.gadget).toBe('mines');
    expect(parseSave(JSON.stringify({ ...old, gadget: 'nuke' })).problem).toBeNull();
  });
});

describe('gadget tiers', () => {
  it('numbers rise with the Mk; Mk III and V add something', () => {
    expect([1, 2, 3, 4, 5].map((k) => gadgetCharges('mines', k as Mk))).toEqual([2, 3, 3, 4, 4]);
    expect(gadgetCharges('oil', 5)).toBe(2);
    expect(mineTier(5).damage).toBeGreaterThan(mineTier(1).damage);
    expect(mineTier(3).trigger).toBeGreaterThan(mineTier(2).trigger);
    expect(mineTier(5).scatter).toBe(3);
    expect(oilTier(2).spread).toBe(0);
    expect(oilTier(3).spread).toBeGreaterThan(0);
    expect(oilTier(5).ignites).toBe(true);
    expect(smokeTier(3).repair).toBeGreaterThan(0);
    expect(smokeTier(5).blinds).toBe(true);
    expect(smokeTier(5).r).toBeGreaterThan(smokeTier(1).r);
  });
  it('the match takes the workshop Mk: Mk II mines start with 3 charges', () => {
    const m = make('mines', undefined, undefined, { mines: 2 });
    expect(m.player!.gadgetCharges).toBe(3);
    m.setPlayerGadget('oil');
    expect(m.player!.gadgetCharges).toBe(2);
  });
  it('Mk V mines scatter 3 smaller ones', () => {
    const m = make('mines', undefined, undefined, { mines: 5 });
    const p = m.player!;
    put(p, 600, 540);
    useGadget(m, p);
    expect(m.gadgets.mines).toHaveLength(3);
    expect(m.gadgets.mines.every((x) => x.small && x.damage === mineTier(5).damage * SCATTER_DAMAGE)).toBe(true);
    const xs = m.gadgets.mines.map((x) => x.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(40);
  });
  it('Mk III oil: enemies inside shoot wide', () => {
    const fire = (mk: Mk): number[] => {
      const m = make('oil', [dummy(1500, 540)], [], { oil: mk });
      const p = m.player!;
      const [e] = foes(m);
      put(p, 1200, 540);
      p.heading = 0;
      useGadget(m, p);
      put(e!, m.gadgets.oils[0]!.x, m.gadgets.oils[0]!.y);
      const out: number[] = [];
      for (let i = 0; i < 40; i++) {
        m.shots = [];
        e!.reload = 0;
        e!.turret = 0;
        m.events = [];
        aimAndFire(m, e!, { ...IDLE, aim: 0, fire: true }, 1 / 60);
        const f = m.events.find((x) => x.kind === 'fire');
        if (f && f.kind === 'fire') out.push(Math.abs(f.angle));
      }
      return out;
    };
    expect(Math.max(...fire(3))).toBeGreaterThan(Math.max(...fire(1)) + 0.1);
  });
  it('Mk V oil: your shot sets it alight and it burns enemies in it', () => {
    const m = make('oil', [dummy(1500, 540)], [], { oil: 5 });
    const p = m.player!;
    const [e] = foes(m);
    alert(m, e!);
    put(p, 600, 540);
    p.heading = 0;
    useGadget(m, p);
    const slick = m.gadgets.oils[0]!;
    put(e!, slick.x, slick.y);
    const hp = e!.hp;
    m.shots.push({ id: 999, owner: p.id, team: 0, x: slick.x - 5, y: slick.y, vx: 0, vy: 0, travelled: 0, range: 1, damage: 0, gun: 'machinegun', splash: 0, breaksBrick: false, kind: 'bullet', alive: true });
    steps(m, 1);
    expect(slick.burnUntil).toBeGreaterThan(0);
    expect(e!.hp).toBeLessThan(hp - OIL_FIRE.damage);
    steps(m, OIL_FIRE.burn);
    expect(m.gadgets.oils).toHaveLength(0);
    expect(m.gadgetIntel.oil).toBeGreaterThan(1);
  });
  it('Mk I oil never lights', () => {
    const m = make('oil', undefined, undefined, { oil: 1 });
    const p = m.player!;
    put(p, 600, 540);
    useGadget(m, p);
    const slick = m.gadgets.oils[0]!;
    m.shots.push({ id: 999, owner: p.id, team: 0, x: slick.x, y: slick.y, vx: 0, vy: 0, travelled: 0, range: 1, damage: 0, gun: 'machinegun', splash: 0, breaksBrick: false, kind: 'bullet', alive: true });
    steps(m, 0.2);
    expect(slick.burnUntil).toBe(-1);
  });
  it('Mk III smoke repairs you inside; Mk V makes the hunters lose you', () => {
    const m = make('smoke', [{ role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 } }], [], { smoke: 5 });
    const p = m.player!;
    put(p, 600, 540);
    const [g] = foes(m);
    alert(m, g!);
    m.brains.get(g!.id)!.lastSeen = { x: p.x, y: p.y, t: m.t, id: p.id };
    p.hp = p.stats.maxHp * 0.5;
    useGadget(m, p);
    expect(m.brains.get(g!.id)!.lastSeen).toBeNull();
    expect(m.brains.get(g!.id)!.aware).toBe('suspicious');
    expect(m.gadgetIntel.smoke).toBe(1);
    const before = p.hp;
    for (let i = 0; i < 60; i++) m.step(1 / 60, IDLE);
    expect(p.hp).toBeGreaterThan(before + p.stats.maxHp * 0.02);
  });
});

describe('found gadgets', () => {
  it('a crate of another kind is a one-use the button fires first; only one at a time', () => {
    const m = make('mines');
    const p = m.player!;
    put(p, 600, 540);
    m.addPickup({ kind: 'gadget', gadget: 'smoke' }, p.x, p.y);
    m.addPickup({ kind: 'gadget', gadget: 'oil' }, p.x, p.y);
    touchPickups(m, p, IDLE, 1 / 60, false);
    expect(p.found).toBe('smoke');
    expect(m.pickups.filter((x) => x.kind === 'gadget' && !x.taken)).toHaveLength(1);
    const charges = p.gadgetCharges;
    expect(useGadget(m, p)).toBe(true);
    expect(m.gadgets.smokes).toHaveLength(1);
    expect(p.gadgetCharges).toBe(charges);
    expect(p.found).toBeNull();
    // The oil one is still lying there: now it can be taken.
    touchPickups(m, p, IDLE, 1 / 60, false);
    expect(p.found).toBe('oil');
  });
  it('a crate of your own kind is a charge; rolled crates sometimes hold another kind', () => {
    const m = make('mines');
    const p = m.player!;
    m.addPickup({ kind: 'gadget', gadget: 'mines' }, p.x, p.y);
    touchPickups(m, p, IDLE, 1 / 60, false);
    expect(p.gadgetCharges).toBe(gadgetCharges('mines', 1) + 1);
    expect(p.found).toBeNull();
    const rng = createRng(5);
    const kinds = Array.from({ length: 4000 }, () => rollCrate(rng, LOOT_EARLY)).flatMap((r) => (r.kind === 'gadget' ? [r.gadget ?? 'yours'] : []));
    expect(new Set(kinds)).toEqual(new Set(['yours', 'mines', 'oil', 'smoke']));
  });
  it('a level can fix a crate to a gadget', () => {
    const lv = load(fixture({ kind: 'assault' }, [dummy(1800, 1000)]));
    const m = new Match({ level: { ...lv, crates: [{ at: { x: 700, y: 540 }, content: { gadget: 'smoke' } }] }, seed: 1, player: { loadout: STARTER_LOADOUT, gadget: 'mines' } });
    const c = m.pickups.find((x) => x.kind === 'crate');
    expect(c?.kind === 'crate' && c.content).toEqual({ kind: 'gadget', gadget: 'smoke' });
  });
});
