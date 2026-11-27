import { appendFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCity } from '../src/city/city';
import { PAID_CITIES } from '../content/paid';
import type { CityView } from '../src/sim/types';
import { cityAtYear, inner } from './city-helpers';
import { MotionWatch } from './motion-helpers';

/** A city jumped to the first day of a year (Old Harbour is the first paid city). */
function harbourAt(year: number): CityView {
  const v = createCity(PAID_CITIES[0]!, 3);
  const c = inner(v);
  c.money = 9000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}

/**
 * Where each case stands (November 27, step 2 phase A: every moving car is the vehicle model, docs/inkroad-vehicle-model.md):
 * a ratchet until every count is zero. Moving cars are held to the vehicle invariants (test/vehicle/frameRules.ts:
 * slip and curvature at the rear axle, wheel rate, acceleration, braking, jerk, curve speed); manoeuvring cars (and a
 * moving car in a three-point turn) still to the older rules until phase B plans them. MOTION_STRICT=1 asks for zero.
 */
const CEILING: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'Saffron Bay year 3': { 'bodies overlap (moving)': 111, 'brakes too hard (moving)': 3, 'jerks (moving)': 15, 'jumps (moving)': 1, 'pulls away too hard (moving)': 3, 'reverse on the road (moving)': 2, 'reverse too fast (moving)': 12, 'slip (moving)': 71, 'steers too fast (moving)': 3, 'too fast on a curve (moving)': 106, 'too tight (moving)': 5, 'bodies overlap (manoeuvre)': 86, 'cuts across without a gap (manoeuvre)': 46, 'jumps (manoeuvre)': 4005, 'reverse too fast (manoeuvre)': 1291, 'slip (manoeuvre)': 7, 'too fast on a curve (manoeuvre)': 769, 'too tight (manoeuvre)': 37, 'turns in place (manoeuvre)': 1 },
  'Saffron Bay year 6': { 'bodies overlap (moving)': 428, 'reverse too fast (moving)': 5, 'too fast on a curve (moving)': 265, 'bodies overlap (manoeuvre)': 208, 'cuts across without a gap (manoeuvre)': 134, 'jumps (manoeuvre)': 3971, 'reverse too fast (manoeuvre)': 1761, 'slip (manoeuvre)': 14, 'too fast on a curve (manoeuvre)': 1718, 'too tight (manoeuvre)': 50, 'turns in place (manoeuvre)': 5 },
  'Old Harbour year 4': { 'bodies overlap (moving)': 110, 'reverse too fast (moving)': 10, 'too fast on a curve (moving)': 653, 'bodies overlap (manoeuvre)': 187, 'cuts across without a gap (manoeuvre)': 115, 'jumps (manoeuvre)': 2568, 'reverse too fast (manoeuvre)': 1691, 'slip (manoeuvre)': 5, 'too fast on a curve (manoeuvre)': 1050, 'too tight (manoeuvre)': 48, 'turns in place (manoeuvre)': 5 },
};

const CASES: readonly { readonly name: string; readonly make: () => CityView }[] = [
  { name: 'Saffron Bay year 3', make: () => cityAtYear(3) },
  { name: 'Saffron Bay year 6', make: () => cityAtYear(6) },
  { name: 'Old Harbour year 4', make: () => harbourAt(4) },
];

describe('every drawn car moves like a real car (a whole season: workday, night, weekend)', () => {
  for (const k of CASES) {
    it(`${k.name}: no slip, no turning in place, no reversing on the road, no overlaps, no cut-offs`, () => {
      const w = new MotionWatch(k.make());
      w.season();
      const counts = w.counts();
      if (process.env.MOTION_LOG) {
        const pick = process.env.MOTION_RULE;
        const list = w.found.filter((f) => !pick || f.rule.includes(pick)).slice(0, Number(process.env.MOTION_LOG) || 0);
        const log = process.env.MOTION_OUT ? (t: string): void => appendFileSync(process.env.MOTION_OUT!, `${t}\n`) : console.log;
        log(`${k.name} ${w.steps} steps ${w.frames} frames \n${Object.entries(counts).map(([why, n]) => `  ${n}\t${why}`).join('\n')}\n${list.map((f) => `  @${f.clock} #${f.uid} ${f.rule}/${f.who}: ${f.detail}`).join('\n')}`);
      }
      // MOTION_OUT=file: the counts as one JSON line per case (to compare runs).
      if (process.env.MOTION_OUT) appendFileSync(process.env.MOTION_OUT, `${JSON.stringify({ case: k.name, counts })}\n`);
      expect(w.frames).toBeGreaterThan(1000);
      if (process.env.MOTION_STRICT) { expect(counts).toEqual({}); return; }
      const cap = CEILING[k.name] ?? {};
      const over = Object.entries(counts).filter(([rule, n]) => n > (cap[rule] ?? 0));
      expect(over).toEqual([]);
    }, 300_000);
  }
});
