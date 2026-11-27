import { describe, expect, it } from 'vitest';
import { createCity } from '../src/city/city';
import { PAID_CITIES } from '../content/paid';
import type { CityView } from '../src/sim/types';
import { cityAtYear, inner } from './city-helpers';
import { TeleportWatch } from './teleport-helpers';

/** A city jumped to the first day of a year (Old Harbour is the first paid city). */
function harbourAt(year: number): CityView {
  const v = createCity(PAID_CITIES[0]!, 3);
  const c = inner(v);
  c.money = 9000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}

const CASES: readonly { readonly name: string; readonly make: () => CityView }[] = [
  { name: 'Saffron Bay year 3', make: () => cityAtYear(3) },
  { name: 'Saffron Bay year 6', make: () => cityAtYear(6) },
  { name: 'Old Harbour year 4', make: () => harbourAt(4) },
];

describe('cars never teleport (a whole season: workday, night, weekend)', () => {
  for (const k of CASES) {
    it(`${k.name}: every car arrives and leaves by road, every move animated`, () => {
      const w = new TeleportWatch(k.make());
      w.season();
      const counts = w.counts();
      if (process.env.TELEPORT_LOG) console.log(k.name, w.steps, 'steps', w.events, 'park events', `\n${Object.entries(counts).map(([why, n]) => `  ${n}\t${why}`).join('\n')}\n${w.found.filter((f) => !process.env.TELEPORT_CAUSE || f.cause.includes(process.env.TELEPORT_CAUSE)).slice(0, Number(process.env.TELEPORT_LOG) || 0).map((f) => `  @${f.clock} #${f.uid} ${f.cause}: ${f.detail}`).join('\n')}`);
      expect(w.events).toBeGreaterThan(100);
      expect(counts).toEqual({});
    }, 120_000);
  }
});
