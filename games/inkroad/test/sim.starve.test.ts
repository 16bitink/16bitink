/** A starved entry creeps; it never stands still. And the numbers say so. */
import { describe, expect, it } from 'vitest';
import { STEP } from '../src/sim/constants';
import type { CarStore } from '../src/sim/store';
import type { Control, RoadType } from '../src/sim/types';
import { armTo, centre, createTraffic, cross, drive, gateFlows } from './sim.helpers';

type Row = readonly [string, string, number];
const HEAVY: Row[] = [['W', 'E', 40], ['W', 'N', 40]];

/** Longest time nobody left the south lane `lane` while somebody stood at its line, after 20 s. */
function longestStand(type: RoadType, control: Control, heavy: readonly Row[], south: readonly Row[], type2: RoadType = type): { stand: number; passed: number } {
  const net = cross(10, type, control, type2);
  const t = createTraffic(net, 1);
  const c = t.cars as CarStore;
  const flows = gateFlows(net, [...heavy, ...south]);
  const since = new Map<number, number>();
  let stand = 0, tick = 0;
  drive(t, flows, 110, 3, () => {
    tick++;
    const now = new Map<number, number>();
    for (let i = 0; i < c.count; i++) {
      const k = c.track[i];
      if (!c.alive[i] || k?.kind !== 0 || c.ahead[i]! >= 0 || k.len - c.s[i]! > 14 || !c.opt[i]) continue;
      if (c.opt[i]!.from.road.id !== armTo(net, 'S')) continue;
      const from = since.get(c.uid[i]!) ?? tick;
      now.set(c.uid[i]!, from);
      stand = Math.max(stand, (tick - from) * STEP);
    }
    since.clear();
    for (const [u, v] of now) since.set(u, v);
  });
  const passed = t.movements(centre(net, 10)).filter((m) => m.fromRoad === armTo(net, 'S')).reduce((s, m) => s + m.cars, 0);
  return { stand, passed };
}

describe('a starved entry', () => {
  it.each([['street', 'roundabout'], ['avenue', 'roundabout'], ['boulevard', 'roundabout']] as const)('%s %s lets somebody go every dozen seconds', (type, control) => {
    const busy: Row[] = type === 'street' ? HEAVY : [...HEAVY, ['W', 'E', 50], ['E', 'W', 30]];
    const r = longestStand(type, control, busy, [['S', 'N', 10], ['S', 'E', 6], ['S', 'W', 6]]);
    expect(r.stand).toBeLessThan(18);
    expect(r.passed).toBeGreaterThan(6);
  });

  it.each(['street', 'avenue'] as const)('so does a %s giving way to a bigger road', (minor) => {
    const r = longestStand(minor, 'yield', [['W', 'E', 60], ['E', 'W', 60]], [['S', 'N', 10], ['S', 'W', 6]], minor === 'street' ? 'avenue' : 'boulevard');
    expect(r.stand).toBeLessThan(18);
    expect(r.passed).toBeGreaterThan(5);
  });

  it('cars that never got through count: live, when they give up, and at night', () => {
    const net = cross(10, 'street', 'yield');
    const t = createTraffic(net, 1);
    const j = centre(net, 10);
    t.startDay();
    // The way out to the east is blocked: those cars cannot pass at all.
    expect(t.block({ road: armTo(net, 'E'), s: 40 }, 500, 3)).toBeGreaterThan(0);
    drive(t, gateFlows(net, [['W', 'E', 30], ['N', 'S', 6]]), 50);
    const of = () => t.movements(j).find((m) => m.fromRoad === armTo(net, 'W') && m.toRoad === armTo(net, 'E'))!;
    const live = of();
    expect(live.wait).toBeGreaterThan(12);
    expect(live.share).toBeGreaterThan(0.6);
    expect(t.junctionStats(j).wait).toBeGreaterThan(10);
    const r = drive(t, gateFlows(net, [['W', 'E', 30]]), 60);
    expect(r.gaveUp).toBeGreaterThan(0);
    expect(of().wait).toBeGreaterThan(live.wait);
    t.endDay();
    expect(of().wait).toBeGreaterThan(20);
    expect(t.junctionStats(j).wait).toBeGreaterThan(15);
    expect(t.junctionStats(j).grade).not.toBe('A');
  });
});
