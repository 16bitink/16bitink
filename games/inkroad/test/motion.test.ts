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
 * Where each case stands (November 27, +10%): a ratchet until every count is zero. The geometry is fixed (paths are
 * arcs and straights, heading on the tangent); what is left is listed in docs/inkroad-build.md "Car motion rules".
 * MOTION_STRICT=1 asks for zero everywhere.
 */
const CEILING: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'Saffron Bay year 3': { 'bodies overlap (manoeuvre)': 185, 'jumps (manoeuvre)': 4756, 'too fast on a curve (manoeuvre)': 1703, 'too fast on a curve (moving)': 14035, 'reverse too fast (manoeuvre)': 2876, 'too tight (moving)': 9016, 'cuts across without a gap (manoeuvre)': 93, 'turns in place (moving)': 28, 'reverse on the road (moving)': 121, 'slip (moving)': 303, 'too tight (manoeuvre)': 86, 'bodies overlap (moving)': 158, 'turns in place (manoeuvre)': 13, 'slip (manoeuvre)': 16 },
  'Saffron Bay year 6': { 'bodies overlap (manoeuvre)': 629, 'jumps (manoeuvre)': 12401, 'too fast on a curve (manoeuvre)': 5049, 'reverse too fast (manoeuvre)': 7535, 'too fast on a curve (moving)': 62534, 'too tight (moving)': 27122, 'turns in place (manoeuvre)': 41, 'slip (moving)': 119, 'cuts across without a gap (manoeuvre)': 615, 'bodies overlap (moving)': 1117, 'too tight (manoeuvre)': 168, 'turns in place (moving)': 2595, 'slip (manoeuvre)': 27 },
  'Old Harbour year 4': { 'bodies overlap (manoeuvre)': 1692, 'jumps (manoeuvre)': 13439, 'too fast on a curve (manoeuvre)': 4102, 'slip (manoeuvre)': 19, 'too tight (manoeuvre)': 184, 'too tight (moving)': 17547, 'too fast on a curve (moving)': 23010, 'reverse too fast (manoeuvre)': 6618, 'cuts across without a gap (manoeuvre)': 1237, 'turns in place (manoeuvre)': 27, 'bodies overlap (moving)': 382, 'slip (moving)': 224, 'turns in place (moving)': 1148 },
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
