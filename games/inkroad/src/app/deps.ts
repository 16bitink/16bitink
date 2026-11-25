import type { CreateWorld } from '../scenes/port';
import type { CityDef, CityView } from '../sim/types';

/** What the app needs from the city content and the world; the real ones are wired in src/index.ts. */
export interface Content {
  /** Cities that ship with the game (Saffron Bay), by number. */
  free(): readonly CityDef[];
  /** Cities from the paid payload (host.loadContent); returns all that parsed. Throws on a payload it cannot read. */
  installPaid(payload: unknown): readonly CityDef[];
  /** A city at its start, or at a year start from `snap` (a CityView.save()). */
  createCity(def: CityDef, seed: number, snap: unknown | null): CityView;
  /** Any year of a city with no snapshot: the city plays itself up to it (about 0.4 s a year). */
  cityAtYear(def: CityDef, seed: number, year: number): CityView;
}

export interface Deps { readonly content: Content; readonly createWorld: CreateWorld }

/** Same city, same seed: a retry plays the same year. */
export const citySeed = (cityNo: number): number => 1000 + cityNo * 7919;
