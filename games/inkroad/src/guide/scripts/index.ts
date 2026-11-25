import type { CityDef } from '../../sim/types';
import type { Script } from '../types';
import { CITY_STEPS } from './cities';
import { coachSteps } from './fromCoach';
import { SAFFRON_1 } from './saffron1';
import { SAFFRON_6_9 } from './saffronBig';
import { SAFFRON_2_5 } from './saffronTools';

const SAFFRON = 1;

/** The guide's script for a year of a city (1 to 10), or null. */
export function scriptFor(def: Pick<CityDef, 'number' | 'years'>, year: number): Script | null {
  const key = `${def.number}:${year}`;
  if (key === SAFFRON_1.key) return SAFFRON_1;
  const own = def.number === SAFFRON ? SAFFRON_2_5[year] ?? SAFFRON_6_9[year] : CITY_STEPS[key];
  const steps = own ?? coachSteps(def.years[year - 1]?.coach ?? []);
  return steps.length > 0 ? { key, steps } : null;
}
