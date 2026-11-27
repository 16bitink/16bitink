import { MONTHS_PER_SEASON } from '../sim/constants';
import type { Ledger, Pt } from '../sim/types';
import type { City } from './state';
import { emit, emptyLedger } from './state';
import { BANKED, FLOAT_KEEP } from './tune';

export type Stream = keyof typeof BANKED;

/** Add to one line of this month's books (a new ledger value). */
export function earn(c: City, key: keyof Ledger['income'], coins: number): void {
  if (coins === 0) return;
  c.money += coins;
  c.ledger = { ...c.ledger, income: { ...c.ledger.income, [key]: c.ledger.income[key] + coins } };
}

export function spend(c: City, key: keyof Ledger['costs'], coins: number): void {
  if (coins === 0) return;
  c.money -= coins;
  c.ledger = { ...c.ledger, costs: { ...c.ledger.costs, [key]: c.ledger.costs[key] + coins } };
}

const floated = (c: City, stream: Stream): boolean => (stream === 'parking' || stream === 'tolls') && c.floated.includes(stream);

/** A driver paid: the authority banks its part, in whole coins. */
export function bank(c: City, stream: Stream, coins: number, at: Pt): void {
  if (coins <= 0) return;
  const total = c.purse[stream] + coins * BANKED[stream] * (floated(c, stream) ? FLOAT_KEEP : 1);
  const whole = Math.floor(total);
  c.purse = { ...c.purse, [stream]: total - whole };
  if (whole === 0) return;
  earn(c, stream, whole);
  c.day.moneyMade += whole;
  emit(c, { t: 'money', at, amount: whole });
}

export const total = (o: Readonly<Record<string, number>>): number => Object.values(o).reduce((n, v) => n + v, 0);

/** Income less running costs, building left out: what the desk calls the balance. */
export const operating = (l: Ledger): number =>
  l.income.parking + l.income.fines + l.income.tolls + l.income.fares + l.income.zone - l.costs.upkeep - l.costs.transit - l.costs.staff - l.costs.interest;

/** Books added line by line. */
export function sumLedgers(list: readonly Ledger[]): Ledger {
  const add = <T extends Readonly<Record<string, number>>>(a: T, b: T): T => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v + (b[k] ?? 0)])) as T;
  return list.reduce((s, l) => ({ income: add(s.income, l.income), costs: add(s.costs, l.costs) }), emptyLedger());
}

/** The last three months together: at a review, the season's books. */
export const lastMonths = (c: City): Ledger => sumLedgers(c.books);
export const lastMonth = (c: City): Ledger => c.books[c.books.length - 1] ?? emptyLedger();

/** A payday: this month's books go on the shelf, a new page begins. */
export function closeBooks(c: City): void {
  c.books = [...c.books, c.ledger].slice(-MONTHS_PER_SEASON);
  c.ledger = emptyLedger();
}

/** The books without what drivers paid: a day started again at dawn earns that again. */
export const unearned = (l: Ledger): Ledger => ({ ...l, income: { ...l.income, parking: 0, fines: 0, tolls: 0, fares: 0, zone: 0 } });
