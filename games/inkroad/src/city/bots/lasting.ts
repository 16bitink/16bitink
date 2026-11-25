import type { CityDef, CityView, Junction } from '../../sim/types';
import { createCity } from '../city';
import { beginner, nobody } from './beginner';
import { beginnerSaves } from './families';
import { playYear } from './play';
import type { Bot } from './tools';

/**
 * "It won't last": junctions that are good at the end of year 3, seen again in year 7.
 * `alone`: nobody touches anything. `kept`: the beginner plays on, and a junction counts as gone
 * when it turned bad or had to be rebuilt. Nobody is sacked on the way.
 */
export interface Lasting { readonly seed: number; readonly good: number; readonly alone: number; readonly kept: number; readonly detail: readonly string[] }

const FROM = 4; // the start of year 4 shows year 3's last day
const TO = 7;
const BUSY = 12;
const FINE = 7; // seconds: where grade C begins
const BAD = 12; // grade D

const keyOf = (j: Junction): string => `${j.cell.gx},${j.cell.gy}`;
const real = (city: CityView): readonly Junction[] => city.junctions.filter((j) => j.arms.length >= 3 && !j.ramp);
const looksOf = (city: CityView, j: Junction): string =>
  `${j.control}${j.arms.map((id) => city.roads.find((r) => r.id === id)?.type ?? '').sort().join()}${city.roads.filter((r) => r.flyover?.node === j.id).length}`;

/** The worst wait of each junction over the last season of every year, and how it looks now. */
function watch(city: CityView, bot: Bot): { readonly waits: ReadonlyMap<string, number>; readonly looks: ReadonlyMap<string, string> } {
  const waits = new Map<string, number>();
  while (city.year <= TO && city.phase === 'yearStart') {
    playYear(city, bot, 0);
    for (const j of real(city)) { const s = city.junctionStats(j.id); if (s.cars >= BUSY) waits.set(keyOf(j), Math.max(waits.get(keyOf(j)) ?? 0, s.wait)); }
  }
  return { waits, looks: new Map(real(city).map((j) => [keyOf(j), looksOf(city, j)])) };
}

export function lasting(def: CityDef, seed: number): Lasting {
  const save = beginnerSaves(def, seed)[FROM] as object;
  const forgiving: CityDef = { ...def, years: def.years.map((y) => ({ ...y, cannotLose: true })) };
  const start = createCity(forgiving, seed, save);
  const good = real(start).filter((j) => { const s = start.junctionStats(j.id); return s.cars >= BUSY && s.wait < FINE; });
  const before = new Map(good.map((j) => [keyOf(j), looksOf(start, j)]));
  const alone = watch(createCity(forgiving, seed, save), nobody);
  const kept = watch(createCity(forgiving, seed, save), beginner);
  const bad = (k: string, w: typeof alone): boolean => (w.waits.get(k) ?? 0) >= BAD;
  const gone = (k: string): boolean => bad(k, kept) || kept.looks.get(k) !== before.get(k);
  const keys = good.map(keyOf);
  return {
    seed, good: keys.length, alone: keys.filter((k) => bad(k, alone)).length, kept: keys.filter(gone).length,
    detail: keys.map((k) => `${k} alone ${(alone.waits.get(k) ?? 0).toFixed(0)}s kept ${(kept.waits.get(k) ?? 0).toFixed(0)}s${gone(k) ? ' gone' : ''}`),
  };
}
