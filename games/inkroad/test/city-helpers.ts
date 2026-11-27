import type { CityView, Command } from '../src/sim/types';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import type { City } from '../src/city/state';
import { SEASON_END } from '../src/city/clock';
import { settleSeason } from '../src/city/settle';

export const SEED = 7;
export const newCity = (): CityView => createCity(SAFFRON, SEED);
/** The working state behind a CityView: tests reach in to set a scene. */
export const inner = (v: CityView): City => (v as unknown as { c: City }).c;

export function runDay(v: CityView): void {
  while (v.phase === 'day') v.advance(10);
}

/** A season of the city's clock passes without drawing it: its night is settled and the next dawn comes (works on the clock move on). */
export function passSeason(c: City): void {
  c.phase = 'day';
  c.clock = SEASON_END;
  settleSeason(c);
  if (c.season === 3) { c.year += 1; c.season = 0; } else c.season = (c.season + 1) as City['season'];
  c.phase = 'day';
  c.clock = 0;
}

/** Close cards and run days until the next year's card (or the end). */
export function runYear(v: CityView): void {
  const year = v.year;
  while (v.year === year && v.phase !== 'replaced' && v.phase !== 'cityDone') {
    if (v.phase === 'day') runDay(v); else v.apply({ t: 'next' });
  }
}

export const ok = (v: CityView, cmd: Command): void => {
  const q = v.apply(cmd);
  if (!q.ok) throw new Error(`refused: ${q.why}`);
};

/** A city jumped to the first day of a year, rich, without playing the years before. */
export function cityAtYear(year: number, money = 5000): CityView {
  const v = newCity();
  const c = inner(v);
  c.money = money;
  while (v.year < year) {
    c.phase = 'yearEnd';
    v.apply({ t: 'next' });
  }
  v.apply({ t: 'next' });
  return v;
}
