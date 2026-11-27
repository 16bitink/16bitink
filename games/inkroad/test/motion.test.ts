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
 * Where each case stands (November 28, step 2 phase B: every drawn car, moving or manoeuvring, is the vehicle model,
 * docs/inkroad-vehicle-model.md): a ratchet until every count is zero. Every car is held to the vehicle invariants
 * (test/vehicle/frameRules.ts) and the owner's phase B rules: reverse at walking pace, never across a lane of
 * traffic, parking speeds, no loops (test/motion-helpers.ts). Overlaps count every frame two bodies overlap. MOTION_STRICT=1 asks for zero.
 * Round 3 (one collision rule): overlaps 14780/37672/30434 -> 4585/25221/9881, 40-80% of the rest wide vehicles (`node dev/overlaps.mjs`).
 */
const CEILING: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'Saffron Bay year 3': { 'bodies overlap (manoeuvre)': 1923, 'bodies overlap (moving)': 2662, 'cuts across without a gap (manoeuvre)': 10, 'jerks (manoeuvre)': 43, 'pulls away too hard (manoeuvre)': 6, 'reverses across a lane (manoeuvre)': 20, 'steers too fast (manoeuvre)': 1 },
  'Saffron Bay year 6': { 'bodies overlap (manoeuvre)': 5840, 'bodies overlap (moving)': 19381, 'cuts across without a gap (manoeuvre)': 26, 'jerks (manoeuvre)': 55, 'pulls away too hard (manoeuvre)': 6, 'reverses across a lane (manoeuvre)': 32, 'too fast on a curve (moving)': 39 },
  'Old Harbour year 4': { 'bodies overlap (manoeuvre)': 5090, 'bodies overlap (moving)': 4791, 'brakes too hard (moving)': 1, 'cuts across without a gap (manoeuvre)': 13, 'jerks (manoeuvre)': 44, 'jerks (moving)': 5, 'pulls away too hard (manoeuvre)': 3, 'pulls away too hard (moving)': 1, 'reverses across a lane (manoeuvre)': 14, 'slip (moving)': 6, 'steers too fast (manoeuvre)': 2, 'steers too fast (moving)': 2, 'too fast on a curve (moving)': 334 },
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
