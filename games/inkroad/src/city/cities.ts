import type { CityDef } from '../sim/types';
import { SAFFRON } from './defs/saffron';
import { checkCity } from './validate';

/** City 1 ships with the game (free). Paid cities are loaded from content/ or the server and checked here. */
export const FREE_CITIES: readonly CityDef[] = [SAFFRON];
export const FREE_CITY: CityDef = SAFFRON;

export const cityById = (id: string, extra: readonly CityDef[] = []): CityDef | undefined => [...FREE_CITIES, ...extra].find((c) => c.id === id);

/** Check untrusted cities; bad ones are left out and reported. */
export function loadCities(list: readonly unknown[]): { readonly cities: readonly CityDef[]; readonly problems: readonly string[] } {
  const cities: CityDef[] = [];
  const problems: string[] = [];
  for (const x of list) {
    try { cities.push(checkCity(x)); } catch (e) { problems.push(e instanceof Error ? e.message : String(e)); }
  }
  return { cities, problems };
}
