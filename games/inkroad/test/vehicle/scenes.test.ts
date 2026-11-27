/**
 * The comparison situations (test/vehicle/scene.ts): every frame the new model draws meets the physics checks
 * (test/vehicle/invariants.ts), and the checks themselves catch the magic of today's motion (a slide, a pivot).
 * docs/inkroad-vehicle-model.md.
 */
import { describe, expect, it } from 'vitest';
import { paramsOf } from '../../src/sim/vehicle/params';
import { rowFor } from '../../dev/vehicleCli';
import { buildScene, SITUATIONS } from './scene';
import { broken, measure, type Drawn } from './invariants';

/** Known and explained (docs/inkroad-vehicle-model.md "What still looks wrong"): B's driveway pose stands in A's lane. */
const KNOWN: Readonly<Record<string, readonly string[]>> = { 'uturn-avenue': ['overlaps'] };

describe('invariants catch magic', () => {
  const car = paramsOf('car');
  const line = (f: (i: number) => Drawn): Drawn[] => Array.from({ length: 30 }, (_, i) => f(i));
  it('a sideways slide is slip', () => {
    expect(measure(line((i) => ({ t: i / 60, x: 0, y: i * 0.5, a: 0 })), car).slip).toBeGreaterThan(1);
  });
  it('turning on the spot about the rear axle is a pivot; about the middle, a slide', () => {
    const about = (i: number): Drawn => ({ t: i / 60, x: car.toMiddle * Math.cos(i * 0.05), y: car.toMiddle * Math.sin(i * 0.05), a: i * 0.05 });
    expect(measure(line(about), car).pivots).toBeGreaterThan(20);
    expect(measure(line((i) => ({ t: i / 60, x: 0, y: 0, a: i * 0.05 })), car).slip).toBeGreaterThan(1);
  });
  it('a straight drive at a steady speed is clean', () => {
    expect(broken(measure(line((i) => ({ t: i / 60, x: i * 0.5, y: 0, a: 0 })), car))).toEqual([]);
  });
});

describe('the new model in every situation', () => {
  for (const sit of SITUATIONS) {
    it(`${sit.id}: no physics check broken`, () => {
      const row = rowFor(buildScene(sit));
      const allowed = KNOWN[sit.id] ?? [];
      expect(row.nowBroken.filter((b) => !allowed.some((k) => b.startsWith(k)))).toEqual([]);
      expect(row.oldBroken.length).toBeGreaterThan(0);
    });
  }
});
