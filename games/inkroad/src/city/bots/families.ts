import type { Bar, CityDef } from '../../sim/types';
import { createCity } from '../city';
import { beginner, nobody } from './beginner';
import { FAMILIES } from './moves';
import { only } from './planner';
import { playYear } from './play';
import type { Bot } from './tools';

/**
 * From the same start of each year (the beginner's city), what does one kind of answer alone do?
 * One job is one seed and one bot, so the lab can run them side by side.
 */
export interface FamilyRow {
  readonly year: number; readonly bot: string; readonly seed: number; readonly from: number; readonly to: number;
  readonly bars: Readonly<Record<Bar, number>>; readonly money: number; readonly lost: boolean; readonly did: readonly string[];
}

export const FAMILY_NAMES: readonly string[] = [nobody.name, ...FAMILIES];
const botFor = (name: string, log: (what: string) => void): Bot => { const f = FAMILIES.find((x) => x === name); return f ? only(f, log) : nobody; };

/** The beginner's save at the start of each year. A year it loses is forgiven, so every year can be measured. */
export function beginnerSaves(def: CityDef, seed: number): readonly unknown[] {
  const saves: unknown[] = [];
  let city = createCity(def, seed);
  for (let y = 1; y <= def.years.length; y++) {
    saves[y] = JSON.parse(JSON.stringify(city.save()));
    if (y === def.years.length) break;
    playYear(city, beginner, 0);
    if (city.phase === 'yearStart') continue;
    city = createCity(def, seed, { ...(city.save() as object), letters: [], bailouts: 0, phase: 'yearEnd' });
    city.apply({ t: 'next' });
  }
  return saves;
}

export function familyRows(def: CityDef, seed: number, name: string, saves: readonly unknown[], from: number, to: number): readonly FamilyRow[] {
  const out: FamilyRow[] = [];
  for (let year = from; year <= to; year++) {
    // Two letters in the drawer would end a weak year half way: measure the whole year.
    const city = createCity(def, seed, { ...(saves[year] as object), letters: [] });
    const start = city.approval;
    const did: string[] = [];
    const row = playYear(city, botFor(name, (what) => did.push(what)), 0);
    out.push({ year, bot: name, seed, from: start, to: row.late, bars: row.bars as Readonly<Record<Bar, number>>, money: row.money, lost: row.replaced, did });
  }
  return out;
}
