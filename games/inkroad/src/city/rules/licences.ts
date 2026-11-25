import type { SpecialView } from '../../sim/types';
import { no, priced, type Handler } from '../commands/shared';
import { areaOf, centreOf, clamp } from '../geometry';
import { population } from '../growth';
import { earn } from '../money';
import { sore } from '../score';
import type { City } from '../state';
import { emit } from '../state';
import { PEOPLE_PER_CELL } from '../tune';
import { ruleState, setRule, type LicenceState } from './state';

/**
 * Twin Isles: a car needs a licence. A tenth of them run out each year, the
 * player decides how many new ones are sold, and an auction finds the price.
 * Few licences: calm roads, dear cars. Many: cheap cars, full roads.
 */
export const LICENCE = {
  step: 100, expire: 0.1, people: 4, base: 7, power: 1.15, maxPrice: 40, coinsPerHundred: 1,
  dearFrom: 12, pain: 1.1, maxPain: 26, habit: 0.008, ride: 0.6, floor: 0.2, room: 1.5, clerk: 0.12, waiting: 0.35,
} as const;

/** Households now, and (with `soon`) in the blocks that open next January. */
function homes(c: City, soon = false): number {
  const coming = soon ? c.def.lots.reduce((n, l, id) => n + (l.kind === 'home' && l.opensYear === c.year + 1 && c.lots[id]?.level === 0 ? areaOf(l) * (PEOPLE_PER_CELL[l.level ?? 1] ?? 0) * PEOPLE_SHOWN : 0), 0) : 0;
  return Math.max(1, Math.round((population(c) + coming) / LICENCE.people));
}
/** population() counts ten residents for each of these. */
const PEOPLE_SHOWN = 10;
const hundreds = (n: number): number => Math.round(n / LICENCE.step) * LICENCE.step;
const open = (c: City): boolean => c.def.rules.licences !== undefined && c.year >= c.def.rules.licences.from;

/** Share of trips people would like to make in their own car. */
export function wish(c: City, year = c.year): number {
  const rule = c.def.rules.licences;
  if (!rule) return c.ownership;
  return clamp(rule.wish + LICENCE.habit * (year - rule.from) - (c.report?.transit ?? 0) * LICENCE.ride, LICENCE.floor, 0.97);
}

export interface Auction { readonly sold: number; readonly price: number; readonly income: number; readonly wanted: number }
/** What an auction does: bidders against licences. */
export function auction(wanted: number, quota: number): Auction {
  const sold = Math.max(0, Math.min(quota, wanted));
  if (quota <= 0 || wanted <= 0) return { sold, price: quota <= 0 && wanted > 0 ? LICENCE.maxPrice : 1, income: 0, wanted };
  const price = clamp(Math.round(LICENCE.base * (wanted / quota) ** LICENCE.power), 1, LICENCE.maxPrice);
  return { sold, price, income: Math.round((sold / LICENCE.step) * price * LICENCE.coinsPerHundred), wanted };
}

const kept = (s: LicenceState): number => Math.round(s.cars * (1 - LICENCE.expire));
const wantedNow = (c: City, s: LicenceState): number => hundreds(Math.max(0, wish(c) * homes(c) - kept(s)));
/** Who will bid next January. */
const wantedNext = (c: City, s: LicenceState): number => hundreds(Math.max(0, wish(c, c.year + 1) * homes(c, true) - kept(s)));

/** As many cars as licences, shared among today's homes. */
function applyCars(c: City, s: LicenceState): void {
  c.ownership = clamp(s.cars / homes(c), LICENCE.floor, Math.max(LICENCE.floor, wish(c)));
}

/** What a careful clerk would sell next: the ones that run out, and a third of those still waiting. */
const suggested = (c: City, cars: number): number =>
  Math.max(LICENCE.step, hundreds(cars * LICENCE.clerk + Math.max(0, wish(c) * homes(c) - cars) * LICENCE.waiting));

/** January: last year's oldest licences are gone, the new ones are sold. */
export function holdAuction(c: City): void {
  if (!open(c)) return;
  const s = ruleState(c).licences;
  if (!s) {
    const cars = hundreds(c.ownership * homes(c));
    setRule(c, { licences: { cars, quota: suggested(c, cars), wanted: 0, price: 0, sold: 0, income: 0 } });
    return;
  }
  const r = auction(wantedNow(c, s), s.quota);
  const cars = kept(s) + r.sold;
  const next: LicenceState = { cars, quota: suggested(c, cars), wanted: r.wanted, price: r.price, sold: r.sold, income: r.income };
  setRule(c, { licences: next });
  applyCars(c, next);
  if (r.income > 0) earn(c, 'auction', r.income);
  emit(c, { t: 'toast', who: 'pim', text: `${r.sold} car licences sold at ${r.price} coins. ${r.price >= LICENCE.dearFrom ? 'Somebody paid with a piano.' : 'Very polite bidding.'}` });
}

export const isDear = (price: number): boolean => price >= LICENCE.dearFrom;
/** Points off the Cost bar while licences are dear. */
export const licencePain = (c: City): number => {
  const price = ruleState(c).licences?.price ?? 0;
  return clamp((price - LICENCE.dearFrom) * LICENCE.pain, 0, LICENCE.maxPain);
};

/** Every night: more homes share the same licences. */
export function nightLicences(c: City): void {
  const s = ruleState(c).licences;
  if (!s || !open(c)) return;
  applyCars(c, s);
  const pain = licencePain(c);
  if (pain <= 0) return;
  const list = c.lots.filter((l) => l.kind === 'home' && l.level > 0);
  const home = list[(c.year * 4 + c.season) % Math.max(1, list.length)];
  if (home) sore(c, { bar: 'cost', kind: 'licence', at: centreOf(home), weight: 2 + pain / 4, lot: home.id, n: s.price });
}

const maxQuota = (c: City, s: LicenceState): number => Math.max(LICENCE.step * 4, hundreds(wantedNext(c, s) * LICENCE.room));

export const licences: Handler<'licences'> = {
  quote(c, cmd) {
    const s = ruleState(c).licences;
    if (!s || !open(c)) return no('Nobody sells licences yet');
    if (c.phase !== 'yearEnd') return no('The auction hall opens at the year\'s end');
    if (!Number.isInteger(cmd.quota) || cmd.quota < 0 || cmd.quota % LICENCE.step !== 0) return no('Whole hundreds, please');
    if (cmd.quota > maxQuota(c, s)) return no('More licences than residents, even counting the hedgehogs');
    return priced(c, 0);
  },
  run(c, cmd) {
    const s = ruleState(c).licences;
    if (s) setRule(c, { licences: { ...s, quota: cmd.quota } });
    return { x: 0, y: 0 };
  },
};

export function licenceView(c: City): SpecialView['licences'] {
  const s = ruleState(c).licences;
  if (!s || !open(c)) return undefined;
  const next = auction(wantedNext(c, s), s.quota);
  return {
    cars: s.cars, wanted: next.wanted, quota: s.quota, min: 0, max: maxQuota(c, s), step: LICENCE.step, expiring: s.cars - kept(s),
    lastPrice: s.price, lastSold: s.sold, lastIncome: s.income, dear: isDear(s.price),
    forecast: { sold: next.sold, price: next.price, income: next.income, dear: isDear(next.price) }, open: c.phase === 'yearEnd',
  };
}
