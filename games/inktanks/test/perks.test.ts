import { describe, expect, it } from 'vitest';
import { cuesFor } from '../src/audio/sfx';
import { parseTank } from '../src/logic/level/load';
import type { EnemyDef } from '../src/logic/level/types';
import { CALL_IN, callInPoint, supplyContents } from '../src/logic/match/callIns';
import { acePrototype } from '../src/logic/match/combat';
import { Match, type PlayerSetup } from '../src/logic/match/match';
import { matchReport } from '../src/logic/match/report';
import { IDLE, type Tank, type TankInput } from '../src/logic/match/types';
import { WINGMAN_KITS, WINGMAN_NAMES, wingmanLoadout, wingmenAllowed, wingmenOf } from '../src/logic/match/wingmen';
import { applyOutcome } from '../src/logic/mission/outcome';
import { STARTER_LOADOUT, withPart, type Part } from '../src/logic/parts';
import { perksOf, RANKS } from '../src/logic/rank';
import { newSave, parseSave, serializeSave } from '../src/logic/save';
import { canFit, fit, keepProtos, newProgress } from '../src/logic/workshop';
import { CAPTURE, fixture, load, RECON } from './fixtures/levels';

const SCOUT = 'machinegun1/light1/wheels1';
const xpOf = (id: string): number => RANKS.find((r) => r.id === id)!.xp;
const TANK = parseTank('cannon3/medium2/halftracks1');
const make = (enemies: EnemyDef[], player: Partial<PlayerSetup> = {}, structures: { kind: string; x: number; y: number }[] = []) =>
  new Match({ level: load(fixture({ kind: 'assault' }, enemies, { structures })), seed: 7, player: { loadout: TANK, ...player } });
const steps = (m: Match, s: number, input: TankInput = IDLE) => {
  for (let i = 0; i < Math.round(s * 60) && !m.over; i++) m.step(1 / 60, input);
};
const put = (t: Tank, x: number, y: number) => Object.assign(t, { x, y, speed: 0 });
/** A far, harmless enemy so an assault doesn't end at once. */
const FAR: EnemyDef = { role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 1850, y: 1050 }, hpMult: 50 };

describe('rank perks', () => {
  it('come at the doc ranks, with no kit slot', () => {
    expect(perksOf(xpOf('lieutenant'))).toEqual({ repairKits: 2, maxMk: 3, supplyDrop: true, wingmen: 0, strike: false, protoParts: false });
    expect(perksOf(xpOf('staffSergeant') - 1).supplyDrop).toBe(false);
    expect(perksOf(xpOf('captain')).wingmen).toBe(1);
    expect(perksOf(xpOf('major'))).toMatchObject({ wingmen: 1, strike: true, maxMk: 4 });
    expect(perksOf(xpOf('colonel')).wingmen).toBe(2);
    expect(perksOf(xpOf('brigadier')).protoParts).toBe(true);
    expect('kitSlot' in perksOf(1e9)).toBe(false);
  });
});

describe('wingmen', () => {
  it('a Captain brings one, a Colonel two: Ink Brigade badgers on your tank a Mk lower, beside your start', () => {
    expect(wingmenOf(make([FAR]))).toHaveLength(0);
    const one = make([FAR], { wingmen: 1 });
    expect(wingmenOf(one).map((t) => t.name)).toEqual([WINGMAN_NAMES[0]]);
    const m = make([FAR], { wingmen: 2 });
    const w = wingmenOf(m);
    expect(w.map((t) => t.name)).toEqual(['Thistle', 'Rowan']);
    for (const t of w) {
      expect(t).toMatchObject({ clan: 'ink', team: 0, crew: 'Badger', isPlayer: false, kits: WINGMAN_KITS, maxKits: WINGMAN_KITS });
      expect(t.loadout).toEqual(parseTank('cannon2/medium1/halftracks1'));
      expect(Math.hypot(t.x - m.player!.x, t.y - m.player!.y)).toBeLessThan(120);
    }
    expect(WINGMAN_NAMES.every((n) => /^[A-Za-z]+$/.test(n))).toBe(true);
  });
  it('never carry a prototype and stay at Mk I at least', () => {
    expect(wingmanLoadout(withPart(STARTER_LOADOUT, { family: 'cannon', mk: 5, proto: true }))).toEqual(withPart(STARTER_LOADOUT, { family: 'cannon', mk: 4 }));
  });
  it('sit out Recon (scouting unseen), not the other objectives', () => {
    expect(wingmenAllowed(RECON)).toBe(false);
    expect(wingmenAllowed(CAPTURE)).toBe(true);
    const m = new Match({ level: load(RECON), seed: 1, player: { loadout: TANK, wingmen: 2 } });
    expect(wingmenOf(m)).toHaveLength(0);
  });
  it('their kills are theirs, not yours, but pay you rank XP; losing one fails nothing', () => {
    const m = make([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 1000, y: 540 } }, FAR], { wingmen: 1 });
    const [w] = wingmenOf(m);
    const foe = m.tanks.find((t) => t.team !== 0 && t.hpMult === 1)!;
    put(foe, w!.x + 150, w!.y);
    for (let i = 0; i < 20 * 60 && foe.alive; i++) {
      m.player!.firedAt = m.t;
      m.step(1 / 60, IDLE);
    }
    expect(foe.alive).toBe(false);
    expect(w!.kills).toBe(1);
    const r = matchReport(m);
    expect(r.kills).toBe(0);
    expect(r.squadKills).toBe(1);
    const before = applyOutcome(newProgress(), m.level.def, { ...r, squadKills: 0 }).outcome.xp;
    expect(applyOutcome(newProgress(), m.level.def, r).outcome.xp - before).toBe(10);
    w!.hp = 0;
    w!.alive = false;
    steps(m, 0.5);
    expect(m.over).toBeNull();
  });
  it('follow your lead: hold fire on an enemy that hasn\'t spotted anyone until you fire', () => {
    const m = make([{ role: 'guard', clan: 'boars', tank: SCOUT, at: { x: 1000, y: 540 }, hpMult: 50 }, FAR], { wingmen: 1 });
    const [w] = wingmenOf(m);
    const foe = m.tanks.find((t) => t.team !== 0 && t.hpMult === 50 && t.x < 1500)!;
    // The guard looks away; the wingman sits close behind it, the player far off.
    put(w!, 760, 540);
    Object.assign(foe, { heading: 0, turret: 0 });
    put(m.player!, 200, 1000);
    m.brains.get(w!.id)!.hint = null;
    for (let i = 0; i < 60; i++) {
      put(w!, 760, 540);
      m.step(1 / 60, IDLE);
    }
    expect(w!.shotsFired).toBe(0);
    m.player!.firedAt = m.t;
    for (let i = 0; i < 120; i++) {
      put(w!, 760, 540);
      m.step(1 / 60, IDLE);
    }
    expect(w!.shotsFired).toBeGreaterThan(0);
  });
  it('take no kits off the ground and can\'t open your supply drop', () => {
    const m = make([FAR], { wingmen: 1, supplyDrop: true });
    const [w] = wingmenOf(m);
    put(m.player!, 200, 1000);
    w!.kits = 0; // room in its bag: it still leaves yours on the ground
    const kit = m.addPickup({ kind: 'kit' }, w!.x, w!.y);
    const drop = m.addPickup({ kind: 'supply', contents: [{ kind: 'kit' }] }, w!.x, w!.y);
    steps(m, 0.2);
    expect(kit.taken).toBe(false);
    expect(drop.taken).toBe(false);
  });
});

describe('wingman repairs', () => {
  it('a badly hurt wingman uses its own kit and heals', () => {
    const m = make([FAR], { wingmen: 1 });
    const [w] = wingmenOf(m);
    w!.hp = w!.stats.maxHp * 0.2;
    const before = w!.hp;
    steps(m, 3);
    expect(w!.kits).toBe(WINGMAN_KITS - 1);
    expect(w!.hp).toBeGreaterThan(before + w!.stats.maxHp * 0.3);
  });
});

describe('call-ins', () => {
  const callFor = (m: Match, kind: 'supply' | 'strike', aim = 0, aimDist: number | null = 200): TankInput => ({ ...IDLE, callIn: kind, aim, aimDist });

  it('need the rank: without the perk a press does nothing', () => {
    const m = make([FAR]);
    m.step(1 / 60, callFor(m, 'supply'));
    m.step(1 / 60, callFor(m, 'strike'));
    expect(m.callIns.supply.used || m.callIns.strike.used).toBe(false);
  });
  it('land along the aim at the cursor\'s distance, held to the range and the map', () => {
    const m = make([FAR], { strike: true });
    const p = put(m.player!, 400, 540);
    expect(callInPoint(m, p, 'strike', 0, 200)).toEqual({ x: 600, y: 540 });
    expect(callInPoint(m, p, 'strike', 0, 5000).x).toBeCloseTo(400 + CALL_IN.range);
    put(p, 100, 540);
    expect(callInPoint(m, p, 'strike', Math.PI, 300).x).toBe(CALL_IN.edge);
    // A thumbstick (no distance): the nearest enemy along the aim.
    const foe = m.tanks.find((t) => t.team !== 0)!;
    put(foe, 450, 540);
    put(p, 100, 540);
    expect(callInPoint(m, p, 'strike', 0, null).x).toBeCloseTo(450);
  });
  it('supply drop: once a level, a crate after 2 s with a kit and your gun a Mk up; you open it', () => {
    const m = make([FAR], { supplyDrop: true, kits: 2 });
    const p = put(m.player!, 400, 540);
    p.kits = 0;
    m.step(1 / 60, callFor(m, 'supply', 0, 150));
    expect(m.callIns.supply.used).toBe(true);
    expect(m.marks().some((k) => k.kind === 'drop')).toBe(true);
    m.step(1 / 60, callFor(m, 'supply', 0, 150));
    steps(m, CALL_IN.supply.warn - 0.1);
    expect(m.pickups.some((x) => x.kind === 'supply')).toBe(false);
    steps(m, 0.2);
    const drop = m.pickups.find((x) => x.kind === 'supply')!;
    expect(drop).toBeDefined();
    expect(m.pickups.filter((x) => x.kind === 'supply')).toHaveLength(1);
    put(p, drop.x, drop.y);
    steps(m, 0.1);
    expect(drop.taken).toBe(true);
    const part = m.pickups.find((x) => x.kind === 'part');
    expect(part?.kind === 'part' && part.part).toEqual({ family: 'cannon', mk: 4 });
    expect(p.kits).toBe(1);
  });
  it('supply drop on a Mk V gun holds two kits', () => {
    const m = make([FAR], { loadout: parseTank('rail5/heavy1/tracks1') });
    expect(supplyContents(m.player!)).toEqual([{ kind: 'kit' }, { kind: 'kit' }]);
    expect(supplyContents(make([FAR]).player!)).toEqual([{ kind: 'kit' }, { kind: 'part', part: { family: 'cannon', mk: 4 } }]);
  });
  it('artillery strike: a 2.5 s ring, then a blast that hurts everyone in it (you too) and breaks walls; the kill is yours', () => {
    const m = make([{ role: 'turret', clan: 'boars', tank: SCOUT, at: { x: 900, y: 540 } }, FAR], { strike: true }, [{ kind: 'wallBrickV', x: 950, y: 540 }]);
    const p = put(m.player!, 600, 540);
    const foe = m.tanks.find((t) => t.team !== 0 && t.x < 1500)!;
    foe.hp = foe.stats.maxHp * 0.4;
    const wall = m.structs.find((s) => s.def.kind === 'wallBrickV')!;
    m.step(1 / 60, callFor(m, 'strike', 0, 300));
    expect(m.marks().find((k) => k.kind === 'artillery')).toMatchObject({ x: 900, y: 540, r: CALL_IN.strike.radius });
    // Drive into the ring: it hurts you as well.
    put(p, 860, 600);
    const hp = p.hp;
    steps(m, CALL_IN.strike.warn - 0.1, { ...IDLE });
    put(p, 860, 600);
    expect(foe.alive).toBe(true);
    steps(m, 0.2);
    expect(foe.alive).toBe(false);
    expect(p.kills).toBe(1);
    expect(p.victims).toHaveLength(0);
    expect(p.hp).toBeLessThan(hp);
    expect(wall.hp).toBeLessThan(wall.def.hp);
    m.step(1 / 60, callFor(m, 'strike', 0, 300));
    expect(m.callIns.strike.landing).toBeNull();
  });
  it('have sounds: the radio when called, a thump or a deep boom when they land', () => {
    const e = (what: 'supply' | 'strike', phase: 'called' | 'landed') => cuesFor({ kind: 'callIn', what, phase, x: 1, y: 2, at: 3 }, () => undefined, 1);
    expect(e('supply', 'called')[0]?.id).toBe('radio');
    expect(e('supply', 'landed').map((c) => c.id)).toContain('thud');
    expect(e('strike', 'landed').map((c) => c.id)).toContain('boom');
  });
});

describe('ace prototypes (Brigadier)', () => {
  const proto: Part = { family: 'laser', mk: 4, proto: true };
  it('an ace drops its best part as a prototype, Mk III at least', () => {
    expect(acePrototype(parseTank(SCOUT))).toEqual({ family: 'machinegun', mk: 3, proto: true });
    expect(acePrototype(parseTank('laser5/medium4/tracks4'))).toEqual({ family: 'laser', mk: 5, proto: true });
  });
  it('one you fitted is kept, the best per family', () => {
    const p = keepProtos(newProgress(), [{ family: 'cannon', mk: 2 }, proto, { family: 'laser', mk: 3, proto: true }]);
    expect(p.protos).toEqual([proto]);
    expect(keepProtos(p, [{ family: 'laser', mk: 5, proto: true }]).protos).toEqual([{ family: 'laser', mk: 5, proto: true }]);
  });
  it('fits only once you are a Brigadier, and even in a family you never unlocked', () => {
    const kept = keepProtos(newProgress(), [proto]);
    const l = withPart(kept.loadout, proto);
    expect(canFit(kept, proto)).toBe(false);
    expect(fit(kept, l)).toEqual({ ok: false, reason: 'needs Brigadier' });
    const brig = { ...kept, xp: xpOf('brigadier') };
    expect(canFit(brig, proto)).toBe(true);
    expect(fit(brig, l).ok).toBe(true);
    expect(canFit(brig, { ...proto, mk: 5 })).toBe(false);
  });
  it('a played mission keeps one fitted in the field, win or lose', () => {
    const m = make([FAR]);
    const r = { ...matchReport(m), passedMain: false, picks: [proto] };
    expect(applyOutcome(newProgress(), m.level.def, r).progress.protos).toEqual([proto]);
  });
  it('save round-trip keeps them and a fitted one; older saves load with none', () => {
    const p = { ...keepProtos(newProgress(), [proto]), xp: xpOf('brigadier') };
    const fitted = (fit(p, withPart(p.loadout, proto)) as { ok: true; progress: typeof p }).progress;
    const back = parseSave(serializeSave({ ...newSave(), progress: fitted }));
    expect(back.problem).toBeNull();
    expect(back.save.progress.protos).toEqual([proto]);
    expect(back.save.progress.loadout.gun).toEqual(proto);
    const old = JSON.parse(serializeSave(newSave()));
    delete old.progress.protos;
    const loaded = parseSave(JSON.stringify(old));
    expect(loaded.problem).toBeNull();
    expect(loaded.save.progress.protos).toEqual([]);
  });
});

describe('promotion text', () => {
  it('says what each rank really brings, nothing "coming soon"', async () => {
    const { RANK_UNLOCKS } = await import('../src/ui/results');
    for (const r of RANKS) {
      expect(RANK_UNLOCKS[r.id]).toBeTruthy();
      expect(RANK_UNLOCKS[r.id]).not.toMatch(/coming soon|kit slot/i);
    }
    // The results screen pulls in the UI art: slow to import when the whole suite runs at once.
  }, 30000);
});
