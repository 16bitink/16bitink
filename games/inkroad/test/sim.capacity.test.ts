/** The junction table the game is balanced on: cars a second through one crossroads. */
import { describe, expect, it } from 'vitest';
import { measure, type CapOptions } from '../dev/captable';
import type { Control, RoadType } from '../src/sim/types';

const FULL = 2.6, UNEVEN = 1.4, CALM = 0.7;
const near = (got: number, want: number, by: number): void => {
  expect(got).toBeGreaterThan(want - by);
  expect(got).toBeLessThan(want + by);
};

describe('capacity of a four-arm crossroads', () => {
  const EVEN: [RoadType, Control, number][] = [
    ['street', 'yield', 0.62], ['street', 'roundabout', 1.05], ['street', 'signal', 1], ['street', 'smart', 1.12],
    ['avenue', 'yield', 0.65], ['avenue', 'roundabout', 1.22], ['avenue', 'signal', 1.75], ['avenue', 'smart', 1.9],
  ];
  it.each(EVEN)('%s %s: %d cars/s even', (type, control, want) => {
    near(measure(type, control, type === 'street' ? FULL : FULL * 1.7).out, want, 0.12);
  });

  const HEAVY: [Control, number, CapOptions][] = [
    ['yield', 0.62, {}], ['roundabout', 0.9, {}], ['signal', 0.9, { split: 0.6 }], ['smart', 0.98, {}],
  ];
  it.each(HEAVY)('street %s: %d cars/s when one left turn dominates', (control, want, o) => {
    near(measure('street', control, UNEVEN, { uneven: true, ...o }).out, want, 0.1);
  });

  it('waits at 0.7 cars/s: yield is bad, a roundabout hardly waits, lights wait a little, smart less', () => {
    expect(measure('street', 'yield', CALM).wait).toBeGreaterThan(9);
    expect(measure('street', 'roundabout', CALM).wait).toBeLessThan(2);
    near(measure('street', 'signal', CALM).wait, 5.8, 1.6);
    expect(measure('street', 'smart', CALM).wait).toBeLessThan(4.5);
  });

  it('the split matters when demand is uneven', () => {
    const wait = (split: number): number => measure('street', 'signal', CALM, { uneven: true, split }).wait;
    expect(wait(0.68)).toBeLessThan(wait(0.4) * 0.6);
  });

  it('a flyover for the dominant turn beats every control', () => {
    for (const c of ['roundabout', 'signal', 'smart'] as const) {
      const at = measure('street', c, UNEVEN, { uneven: true }), fly = measure('street', c, UNEVEN, { uneven: true, flyover: true });
      expect(fly.out).toBeGreaterThan(at.out * 1.15);
      expect(fly.out).toBeGreaterThan(1.1);
      expect(fly.wait).toBeLessThan(at.wait * 0.5);
    }
  });
});
