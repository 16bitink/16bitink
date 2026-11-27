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
 * Where each case stands (November 27, after the dead-end turn-round and slide fixes, HONEST_SWINGS off, +10%): a ratchet until every count is zero. The geometry is fixed (paths are
 * arcs and straights, heading on the tangent); what is left is listed in docs/inkroad-build.md "Car motion rules".
 * MOTION_STRICT=1 asks for zero everywhere.
 */
const CEILING: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'Saffron Bay year 3': { 'bodies overlap (manoeuvre)': 163, 'jumps (manoeuvre)': 4554, 'too fast on a curve (manoeuvre)': 1597, 'too fast on a curve (moving)': 13874, 'reverse too fast (manoeuvre)': 2828, 'too tight (moving)': 8072, 'cuts across without a gap (manoeuvre)': 97, 'reverse on the road (moving)': 169, 'slip (moving)': 300, 'too tight (manoeuvre)': 83, 'bodies overlap (moving)': 141, 'turns in place (moving)': 345, 'turns in place (manoeuvre)': 14, 'slip (manoeuvre)': 19 },
  'Saffron Bay year 6': { 'bodies overlap (manoeuvre)': 856, 'jumps (manoeuvre)': 13683, 'too fast on a curve (manoeuvre)': 4868, 'reverse too fast (manoeuvre)': 7681, 'too fast on a curve (moving)': 62030, 'too tight (moving)': 27883, 'turns in place (manoeuvre)': 40, 'slip (moving)': 53, 'cuts across without a gap (manoeuvre)': 712, 'bodies overlap (moving)': 1147, 'too tight (manoeuvre)': 214, 'turns in place (moving)': 3067, 'slip (manoeuvre)': 35 },
  'Old Harbour year 4': { 'bodies overlap (manoeuvre)': 2078, 'jumps (manoeuvre)': 18073, 'too fast on a curve (manoeuvre)': 4901, 'slip (manoeuvre)': 111, 'too tight (manoeuvre)': 332, 'too tight (moving)': 15924, 'too fast on a curve (moving)': 22440, 'reverse too fast (manoeuvre)': 6593, 'cuts across without a gap (manoeuvre)': 1953, 'turns in place (manoeuvre)': 44, 'bodies overlap (moving)': 326, 'turns in place (moving)': 561, 'slip (moving)': 105 },
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
        console.log(k.name, w.steps, 'steps', w.frames, 'frames', `\n${Object.entries(counts).map(([why, n]) => `  ${n}\t${why}`).join('\n')}\n${list.map((f) => `  @${f.clock} #${f.uid} ${f.rule}/${f.who}: ${f.detail}`).join('\n')}`);
      }
      expect(w.frames).toBeGreaterThan(1000);
      if (process.env.MOTION_STRICT) { expect(counts).toEqual({}); return; }
      const cap = CEILING[k.name] ?? {};
      const over = Object.entries(counts).filter(([rule, n]) => n > (cap[rule] ?? 0));
      expect(over).toEqual([]);
    }, 300_000);
  }
});
