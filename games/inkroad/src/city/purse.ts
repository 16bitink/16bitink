import { earn, total } from './money';
import type { City } from './state';
import { emit } from './state';
import { PURSE } from './tune';

/** The Council's purse strings: money nobody spends goes home at the year's end. */

/** What a season brings in, without windfalls. */
function seasonIncome(c: City): number {
  const { parking, fines, tolls, fares, zone, budget } = c.lastLedger.income;
  return total({ parking, fines, tolls, fares, zone, budget });
}

/** Coins the authority may carry into the next year without a question. */
export const purseLimit = (c: City): number => Math.max(PURSE.least, Math.round(seasonIncome(c) * PURSE.seasons));

const over = (c: City): number => Math.max(0, c.money - purseLimit(c));

/** Half a year ahead Pim says so, so that nobody is surprised. */
export function warnPurse(c: City): void {
  if (c.season !== PURSE.warnSeason || over(c) < PURSE.worth) return;
  emit(c, { t: 'toast', who: 'pim', text: `The Council counts our coins in winter. Past ${purseLimit(c)} it takes most of them home. I can hide nine in my cheeks.` });
}

export function takeBack(c: City): void {
  const back = Math.round(over(c) * PURSE.takes);
  if (back < PURSE.worth) return;
  earn(c, 'budget', -back);
  emit(c, { t: 'toast', who: 'pim', text: `The Council took back ${back} unspent coins. Sulo said the purse looked heavy for such a small animal.` });
}
