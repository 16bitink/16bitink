import type { CityDef, CityView } from '../sim/types';
import { beginner } from './bots/beginner';
import { playYear } from './bots/play';
import { createCity } from './city';

/**
 * A city at the start of a year with no save to go by: a simple bot plays the
 * years before (under half a second each on a laptop). Letters and plates are the
 * bot's; a year the bot loses is forgiven.
 */
export function cityAtYear(def: CityDef, seed: number, year: number): CityView {
  let city = createCity(def, seed);
  const last = Math.min(year, def.years.length);
  while (city.year < last) {
    const before = city.year;
    playYear(city, beginner, 0);
    if (city.year === before) city = forgiven(def, seed, city);
    if (city.year === before) break;
  }
  return city;
}

/** Replaced on the way: wipe the letters and carry on into the next year. */
function forgiven(def: CityDef, seed: number, city: CityView): CityView {
  const save = city.save() as Record<string, unknown>;
  const back = createCity(def, seed, { ...save, letters: [], bailouts: 0, approval: 50, phase: 'yearEnd' });
  back.apply({ t: 'next' });
  return back;
}
