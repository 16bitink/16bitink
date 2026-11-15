import { describe, expect, it } from 'vitest';
import { botSees } from '../src/logic/bots/awareness';
import { CH1_BOTS, CH2_BOTS, botsFor } from '../src/logic/bots/difficulty';
import { VISION } from '../src/logic/bots/perception';
import { parseTank } from '../src/logic/level/load';
import type { EnemyDef, LevelDef } from '../src/logic/level/types';
import { Match } from '../src/logic/match/match';
import { IDLE, type MatchEvent, type Tank, type TankInput } from '../src/logic/match/types';
import { sightCap, STORM, stormAt, stormEvents, stormRule } from '../src/logic/match/weather';
import { tankStats } from '../src/logic/stats';
import { fixture, load } from './fixtures/levels';

const on = (ground: 'sand' | 'grass', tank: string, extra: Partial<LevelDef> = {}, enemies: EnemyDef[] = [{ role: 'guard', clan: 'crows', tank: 'machinegun1/light1/wheels1', at: { x: 1800, y: 1000 } }]) => {
  const d = fixture({ kind: 'assault' }, enemies);
  return new Match({ level: load({ ...d, ...extra, map: { ...d.map, base: ground } }), seed: 1, player: { loadout: parseTank(tank) } });
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
/** Drive east at speed, then turn hard south: how far east it carries on after the turn. */
function overshoot(ground: 'sand' | 'grass', tank: string): number {
  const m = on(ground, tank);
  const p: Tank = m.player!;
  Object.assign(p, { x: 300, y: 300 });
  drive(m, EAST, 2);
  const x0 = p.x;
  drive(m, SOUTH, 1.2);
  return p.x - x0;
}

describe('sand', () => {
  it('slows Wheels to ×0.7 and not Half-tracks or Tracks', () => {
    expect(tankStats(parseTank('cannon1/medium1/wheels1')).sand).toBeCloseTo(0.7);
    expect(tankStats(parseTank('cannon1/medium1/halftracks1')).sand).toBe(1);
    const speed = (g: 'sand' | 'grass') => {
      const m = on(g, 'cannon1/medium1/wheels1');
      Object.assign(m.player!, { x: 300, y: 300 });
      drive(m, EAST, 3);
      return m.player!.speed;
    };
    expect(speed('sand') / speed('grass')).toBeCloseTo(0.7, 1);
  });
  it('makes Wheels slide wide on a hard turn; Tracks turn clean', () => {
    const grass = overshoot('grass', 'cannon1/medium1/wheels1');
    const sand = overshoot('sand', 'cannon1/medium1/wheels1');
    expect(sand).toBeGreaterThan(grass * 1.15);
    expect(overshoot('sand', 'cannon1/medium1/tracks1')).toBeCloseTo(overshoot('grass', 'cannon1/medium1/tracks1'), 0);
  });
  it('grip research takes some of the slide away', () => {
    expect(tankStats(parseTank('cannon1/medium1/wheels1'), { wheels: { grip: 3 } }).sandGrip).toBeGreaterThan(tankStats(parseTank('cannon1/medium1/wheels1')).sandGrip);
  });
});

describe('sandstorms', () => {
  const rule = stormRule({ kind: 'sandstorm' });
  it('default every 40 s for 12 s, sight 180, ramping in and out', () => {
    expect([rule.every, rule.last, rule.sight, rule.first]).toEqual([STORM.every, STORM.last, STORM.sight, STORM.every]);
    expect(stormAt(rule, 10).level).toBe(0);
    expect(stormAt(rule, 10).next).toBeCloseTo(30);
    expect(stormAt(rule, 46).level).toBe(1);
    expect(stormAt(rule, 52.5).level).toBe(0);
    expect(stormAt(rule, 80.5).level).toBeGreaterThan(0);
    expect(sightCap(rule, 46)).toBe(180);
    expect(sightCap(rule, 10)).toBe(Infinity);
    expect(sightCap(null, 46)).toBe(Infinity);
  });
  it('warns STORM.warn s ahead, then says when it starts and ends', () => {
    const at = (a: number, b: number) => stormEvents(rule, a, b).map((e) => e.what);
    expect(at(34.9, 35.1)).toEqual(['coming']);
    expect(at(40, 40.05)).toEqual(['start']);
    expect(at(51.99, 52.01)).toEqual(['end']);
    expect(at(20, 20.1)).toEqual([]);
  });
  it("caps bots' eyes in a storm: a guard 300 px off loses you", () => {
    const m = on('sand', 'cannon1/medium1/halftracks1', { weather: { kind: 'sandstorm', first: 5, every: 40, last: 12 } }, [{ role: 'guard', clan: 'crows', tank: 'cannon1/medium1/halftracks1', at: { x: 600, y: 300 } }]);
    const p = m.player!;
    const g = m.tanks.find((t) => t.team !== 0)!;
    const b = m.brains.get(g.id)!;
    Object.assign(p, { x: 300, y: 300 });
    b.aware = 'alert';
    expect(botSees(m, b, g, p)).toBe(true);
    const ev = drive(m, IDLE, 7);
    expect(ev.some((e) => e.kind === 'weather' && e.what === 'coming')).toBe(true);
    expect(ev.some((e) => e.kind === 'weather' && e.what === 'start')).toBe(true);
    expect(m.sight).toBe(180);
    Object.assign(p, { x: 300, y: 300 });
    Object.assign(g, { x: 600, y: 300 });
    expect(botSees(m, b, g, p)).toBe(false);
    Object.assign(g, { x: 450, y: 300 });
    expect(botSees(m, b, g, p)).toBe(true);
    expect(VISION).toBeGreaterThan(180);
  });
  it('clear weather leaves sight alone (chapter 1)', () => {
    const m = on('grass', 'cannon1/medium1/halftracks1');
    drive(m, IDLE, 1);
    expect(m.sight).toBe(Infinity);
    expect(m.stormNow()).toBeNull();
  });
});

describe('chapter bots', () => {
  it('chapter 2 bots aim a little better; chapter 1 and test levels keep chapter 1 bots', () => {
    expect(botsFor(5)).toBe(CH1_BOTS);
    expect(botsFor(99)).toBe(CH1_BOTS);
    expect(botsFor(14)).toBe(CH2_BOTS);
    expect(CH2_BOTS.aimError).toBeLessThan(CH1_BOTS.aimError);
  });
});
