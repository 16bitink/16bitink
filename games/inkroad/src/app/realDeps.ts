import { createCity } from '../city/city';
import { cityAtYear } from '../city/replay';
import { FREE_CITIES, loadCities } from '../city/cities';
import { createWorld } from '../scenes/world';
import type { CityDef } from '../sim/types';
import type { Content, Deps } from './deps';

/** Untrusted paid cities, checked by the city module; bad ones are dropped and reported. */
export function parsePaid(payload: unknown): CityDef[] {
  if (!Array.isArray(payload)) throw new Error('paid content is not a list');
  const { cities, problems } = loadCities(payload);
  for (const p of problems) console.warn('[inkroad] a paid city was left out:', p);
  return [...cities];
}

const content: Content = {
  free: () => FREE_CITIES,
  installPaid: parsePaid,
  createCity: (def, seed, snap) => createCity(def, seed, snap ?? undefined),
  cityAtYear,
};

export function realDeps(): Deps {
  return { content, createWorld };
}
