import { paydaysDone } from '../city/clock';
import { MONTHS, MONTHS_PER_SEASON, SEASONS, YEARS_PER_CITY } from '../sim/constants';
import type { Phase } from '../sim/types';

/** Number and text formatting for the screens. Pure, so it is tested. */

/** Whole coins with thousands commas: 12480 -> "12,480". Negative keeps its minus. */
export function num(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(Math.abs(n));
  const s = String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 && r !== 0 ? `-${s}` : s;
}

/** A change: "+40", "-12", "0". */
export function signed(n: number): string {
  const r = Math.round(n);
  if (r === 0 || !Number.isFinite(n)) return '0';
  return r > 0 ? `+${num(r)}` : num(r);
}

/** A share 0..1 as "63%". */
export const pct = (x: number): string => `${Math.round(Math.min(1, Math.max(0, x)) * 100)}%`;

/** Hour 0..24 as "07:30". */
export function clockText(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const m = Math.floor((h % 1) * 60);
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const seasonName = (s: number): string => SEASONS[Math.min(3, Math.max(0, Math.floor(s)))] ?? SEASONS[0]!;

/** "Year 3, Winter": the season a review closes. */
export const seasonLine = (year: number, season: number): string => `Year ${year}, ${seasonName(season)}`;

/** A month of the Council's year, 0 = March; it wraps. */
export const monthName = (m: number): string => MONTHS[((Math.floor(m) % MONTHS.length) + MONTHS.length) % MONTHS.length]!;

/** "Year 3, May": the month that is on (at a review, the one just paid). */
export const dateLine = (year: number, month: number): string => `Year ${year}, ${monthName(month)}`;

/** The month works with `left` paydays to go are over in: they end at the payday before it. */
export function opensMonth(city: { readonly phase: Phase; readonly season: number; readonly month: number }, left: number): string {
  return monthName(paydaysDone(city.phase, city.season, city.month - city.season * MONTHS_PER_SEASON) + left);
}

/** The year as it is shown: a city's years run on from the one before (Old Harbour starts in year 11). */
export const shownYear = (city: { readonly def: { readonly number: number }; readonly year: number }, year = city.year): number => (city.def.number - 1) * YEARS_PER_CITY + year;

/** The level number of the site's stats: city 2 year 3 is 13. */
export const levelNumber = (city: number, year: number): number => (city - 1) * YEARS_PER_CITY + year;

export type Trend = 'up' | 'down' | 'same';
/** Which way a value moved against the last one; moves under `eps` count as the same. */
export function trend(now: number, before: number, eps = 1): Trend {
  if (now - before >= eps) return 'up';
  return before - now >= eps ? 'down' : 'same';
}

const PLATE_BASE = '80417';
export const PLATE_MIN_DIGITS = 1;
export const PLATES_PER_DIGIT = 6;

/** The director's number plate: five digits, one fewer for every 6 plates collected, down to one. */
export function plateNumber(totalPlates: number): string {
  const lost = Math.min(PLATE_BASE.length - PLATE_MIN_DIGITS, Math.floor(Math.max(0, totalPlates) / PLATES_PER_DIGIT));
  return PLATE_BASE.slice(0, PLATE_BASE.length - lost);
}

/** Seconds as "1:05". */
export function minutes(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Player text never holds em or en dashes: swaps them for a plain hyphen. */
export const plain = (s: string): string => s.replace(/[–—]/g, '-');

/** "3 months" */
export const monthsText = (n: number): string => `${n} ${n === 1 ? 'month' : 'months'}`;

/** '3 months of road works, road closed, open in September': works on a road close it, unless they are done by night. */
export function worksText(q: { readonly works: number; readonly closes?: boolean; readonly opens?: number }): string {
  const n = `${monthsText(q.works)} of road works`;
  const opens = q.opens !== undefined ? `, ${q.closes === true ? 'open' : 'done'} in ${monthName(q.opens)}` : '';
  return q.closes === true ? `${n}, road closed${opens}` : q.closes === false ? `${n} by night, road open${opens}` : `${n}${opens}`;
}
