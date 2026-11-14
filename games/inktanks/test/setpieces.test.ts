import { describe, expect, it } from 'vitest';
import { LevelError } from '../src/logic/level/load';
import { Match } from '../src/logic/match/match';
import { IDLE, type MatchEvent, type Tank } from '../src/logic/match/types';
import { GATE_OPEN } from '../src/logic/objectives/convoy';
import type { CameraProp, FlagProp } from '../src/logic/objectives/types';
import { STARTER_LOADOUT } from '../src/logic/parts';
import type { Pt } from '../src/logic/vec';
import { CAPTURE, CHASE, load, POINTS, RECON } from './fixtures/levels';

const make = (d: Parameters<typeof load>[0]) => new Match({ level: load(d), seed: 1, player: { loadout: STARTER_LOADOUT } });
const put = (t: Tank, p: Pt) => Object.assign(t, { x: p.x, y: p.y, speed: 0 });
const steps = (m: Match, s: number): MatchEvent[] => {
  const ev: MatchEvent[] = [];
  for (let i = 0; i < s * 30 && !m.over; i++) {
    m.step(1 / 30, IDLE);
    ev.push(...m.drainEvents());
  }
  return ev;
};

describe('capture: flagpoles', () => {
  it('our flag runs up the pole as we take it, theirs when they retake it', () => {
    const m = make(CAPTURE);
    m.brains.clear();
    const enemy = m.tanks.find((t) => t.team !== 0)!;
    put(enemy, { x: 1900, y: 1050 });
    const flagAt = (p: Pt) => m.objective.props().find((x): x is FlagProp => x.kind === 'flag' && x.x === p.x && x.y === p.y)!;
    expect(m.objective.props()).toHaveLength(3);
    expect(flagAt(POINTS.a!).hold).toBe(-1);
    put(m.player!, POINTS.a!);
    const ev = steps(m, 2.2);
    expect(flagAt(POINTS.a!).hold).toBe(1);
    expect(ev.some((e) => e.kind === 'setpiece' && e.what === 'flagOurs')).toBe(true);
    put(m.player!, POINTS.d!);
    put(enemy, POINTS.a!);
    const back = steps(m, 2.2);
    expect(back.some((e) => e.kind === 'setpiece' && e.what === 'flagLost')).toBe(true);
  });
});

describe('recon: a camp you photograph', () => {
  it('a viewfinder while you dwell, then a flash and "Photographed"', () => {
    const m = make(RECON);
    put(m.player!, POINTS.a!);
    steps(m, 0.4);
    const cam = m.objective.props().find((x): x is CameraProp => x.kind === 'camera')!;
    expect(cam.done).toBe(false);
    expect(cam.progress).toBeGreaterThan(0);
    const ev = steps(m, 1);
    expect(ev.some((e) => e.kind === 'setpiece' && e.what === 'photo')).toBe(true);
    expect(m.objective.props().find((x): x is CameraProp => x.kind === 'camera')!.done).toBe(true);
  });
});

describe('chase: the courier base gate', () => {
  const GATED = { ...CHASE, map: { ...CHASE.map, structures: [{ kind: 'fortGate', x: 1500, y: 700, id: 'gate' }] }, objective: { kind: 'chase' as const, base: 'c', gate: 'gate' } };
  it('opens as the courier comes, and it drives in', () => {
    const m = make(GATED);
    put(m.player!, { x: 100, y: 1000 });
    const gate = m.structs.find((s) => s.def.id === 'gate')!;
    expect(gate.state).toBe(2);
    const ev = steps(m, 60);
    expect(ev.some((e) => e.kind === 'setpiece' && e.what === 'gate')).toBe(true);
    expect(gate.state).toBe(0);
    expect(m.over).toMatchObject({ passed: false, reason: 'the courier got away' });
    expect(GATE_OPEN).toBeGreaterThan(100);
  });
  it('a gate id that is not on the map is a level error', () => {
    expect(() => load({ ...CHASE, objective: { kind: 'chase', base: 'c', gate: 'nope' } })).toThrow(LevelError);
  });
});
