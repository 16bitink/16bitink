import type { CityDef, CityView } from '../../sim/types';
import { createCity } from '../city';
import type { Bot } from './tools';

/** Plays a bot through a city and reports each year, with retries from the year's save. */
export interface YearRow {
  readonly year: number; readonly attempt: number; readonly approval: number; readonly bars: Readonly<Record<string, number>>; readonly money: number;
  readonly plates: number; readonly letters: number; readonly worst: readonly string[]; readonly goal: string; readonly replaced: boolean;
  readonly population: number; readonly peakCars: number; readonly income: number; readonly seasons: readonly string[];
  /** Mean approval of the last two seasons: less noisy than one day. */
  readonly late: number;
}
export interface PlayOptions { readonly from?: number; readonly to?: number; readonly retries?: number; readonly log?: (line: string) => void }

const NOON = 45;
const EVENING = 100;
const TICK = 5;

function playDay(city: CityView, bot: Bot, attempt: number, onTick: (n: number) => void): void {
  bot.act(city, 'dawn', attempt);
  let noon = false;
  let evening = false;
  while (city.phase === 'day') {
    city.advance(TICK);
    onTick(alive(city));
    if (!noon && city.phase === 'day' && city.clock >= NOON) { noon = true; bot.act(city, 'noon', attempt); }
    if (!evening && city.phase === 'day' && city.clock >= EVENING) { evening = true; bot.act(city, 'evening', attempt); }
  }
}

function alive(city: CityView): number {
  let n = 0;
  for (let i = 0; i < city.cars.count; i++) n += city.cars.alive[i]!;
  return n;
}

const worstJunctions = (city: CityView): readonly string[] =>
  city.junctions.filter((j) => j.arms.length >= 3).map((j) => ({ j, s: city.junctionStats(j.id) }))
    .sort((a, b) => b.s.wait * b.s.cars - a.s.wait * a.s.cars).slice(0, 3)
    .map(({ j, s }) => `${j.cell.gx},${j.cell.gy}${j.control[0]} ${s.wait.toFixed(0)}s x${s.cars}`);

export function playYear(city: CityView, bot: Bot, attempt: number): YearRow {
  const year = city.year;
  let peak = 0;
  let income = 0;
  const seasons: string[] = [];
  const approvals: number[] = [];
  bot.act(city, 'yearStart', attempt);
  city.apply({ t: 'next' });
  let worst: readonly string[] = [];
  for (;;) {
    playDay(city, bot, attempt, (n) => { peak = Math.max(peak, n); });
    worst = worstJunctions(city);
    income += Object.values(city.lastLedger.income).reduce((n, v) => n + v, 0);
    approvals.push(city.approval);
    seasons.push(`${city.approval.toFixed(0)}(${Object.values(city.bars).map((b) => b.toFixed(0)).join('/')}) $${city.money}`);
    if (city.phase === 'replaced') break;
    bot.act(city, 'review', attempt);
    const last = city.season === 3;
    city.apply({ t: 'next' });
    if (last) break;
  }
  const goal = city.goal;
  const row: YearRow = {
    year, attempt, approval: city.approval, bars: city.bars, money: city.money, plates: city.plates[year - 1] ?? 0, letters: city.letters.length, worst,
    goal: `${goal.value}/${goal.target}${goal.met ? ' ok' : ''}`, replaced: city.phase === 'replaced', population: city.population, peakCars: peak, income, seasons, late: approvals.slice(-2).reduce((n, v) => n + v, 0) / Math.min(2, approvals.length),
  };
  city.drainEvents();
  if (city.phase === 'yearEnd') { bot.act(city, 'yearEnd', attempt); city.apply({ t: 'next' }); }
  return row;
}

/** All years, retrying a lost year from its start (then from the year before). */
export function play(def: CityDef, seed: number, bot: Bot, opt: PlayOptions = {}): readonly YearRow[] {
  const to = opt.to ?? def.years.length;
  const rows: YearRow[] = [];
  const saves: unknown[] = [];
  let city = createCity(def, seed);
  let attempt = 0;
  let retries = opt.retries ?? 0;
  while (city.year <= to && city.phase === 'yearStart') {
    saves[city.year] = city.save();
    const row = playYear(city, bot, attempt);
    rows.push(row);
    if (!row.replaced) { attempt = 0; if (city.phase !== 'yearStart') break; continue; }
    if (retries <= 0) break;
    retries -= 1;
    attempt += 1;
    const back = Math.max(1, row.year - (attempt > 1 ? 1 : 0));
    city = createCity(def, seed, saves[back]);
  }
  return rows;
}
