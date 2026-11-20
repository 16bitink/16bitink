import { describe, expect, it } from 'vitest';
import { Match } from '../src/logic/match/match';
import { driveTank } from '../src/logic/match/movement';
import { IDLE, type Tank, type TankInput } from '../src/logic/match/types';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { wrapAngle } from '../src/logic/vec';
import { fixture, load } from './fixtures/levels';

/**
 * The owner's playtest (2026-11-20): pushing the stick (or the keys) the
 * opposite way should back the tank up, not turn it all the way round.
 */

const make = (): Match =>
  new Match({ level: load(fixture({ kind: 'assault' }, [{ role: 'guard', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: { x: 1800, y: 1000 } }])), seed: 3, player: { loadout: STARTER_LOADOUT } });

const point = (angle: number): TankInput => ({ ...IDLE, move: { kind: 'point', angle, mag: 1 } });

/** Drives `t` for `s` seconds with `input`, in the open middle of the fixture's map. */
const drive = (m: Match, t: Tank, input: TankInput, s: number): void => {
  for (let i = 0; i < Math.round(s * 60); i++) driveTank(m, t, input, 1 / 60);
};

const setUp = (): { m: Match; p: Tank } => {
  const m = make();
  const p = m.player!;
  Object.assign(p, { x: 900, y: 500, heading: 0, speed: 0 });
  return { m, p };
};

describe('driving the opposite way backs up', () => {
  it('the player backs straight up, keeping the heading', () => {
    const { m, p } = setUp();
    drive(m, p, point(Math.PI), 1);
    expect(Math.abs(wrapAngle(p.heading))).toBeLessThan(0.05);
    expect(p.speed).toBeLessThan(0);
    expect(p.x).toBeLessThan(900 - 20);
  });

  it('a stick a little off straight back steers the tail that way, still in reverse', () => {
    const { m, p } = setUp();
    // 150° off the nose: the tail swings 30° to line up, and the tank keeps backing.
    drive(m, p, point((150 * Math.PI) / 180), 1.5);
    expect(p.speed).toBeLessThan(0);
    expect(Math.abs(wrapAngle(p.heading - (-30 * Math.PI) / 180))).toBeLessThan(0.1);
  });

  it('once backing, it keeps backing while the stick points anywhere behind (no flip-flop)', () => {
    const { m, p } = setUp();
    drive(m, p, point(Math.PI), 0.5);
    // 100° off the nose: behind the tank's side, past the first-press threshold.
    drive(m, p, point((100 * Math.PI) / 180), 0.2);
    expect(p.speed).toBeLessThan(0);
  });

  it('a sideways stick still turns forwards', () => {
    const { m, p } = setUp();
    drive(m, p, point(Math.PI / 2), 1.5);
    expect(p.speed).toBeGreaterThan(0);
    expect(Math.abs(wrapAngle(p.heading - Math.PI / 2))).toBeLessThan(0.1);
  });
});
