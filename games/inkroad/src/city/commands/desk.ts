import type { Policies, Prices } from '../../sim/types';
import { answerCommission } from '../commissions';
import type { City } from '../state';
import { openPolicies, openTools } from '../state';
import { applyConditions } from '../run';
import { MONTHS_PER_SEASON } from '../../sim/constants';
import { earn, lastMonths } from '../money';
import { FLOAT_MONTHS, PRICE_RANGE } from '../tune';
import { dropZone, syncZone } from '../zone';
import { next as closeCard } from '../years';
import { no, priced, type Handler } from './shared';

export interface Limit { readonly min: number; readonly max: number; readonly step: number; readonly open: boolean }

/** Which prices exist yet. */
function priceOpen(c: City, k: keyof Prices): boolean {
  const tools = openTools(c);
  if (k === 'park' || k === 'parkPeak') return tools.includes('kerb') || tools.includes('parking');
  if (k === 'toll' || k === 'tollPeak') return tools.includes('toll');
  if (k === 'fare') return tools.some((t) => t === 'bus' || t === 'tram' || t === 'metro' || t === 'boat');
  if (k === 'zone') return tools.includes('zone') && c.vote.kept !== false;
  return openPolicies(c).includes('inspectors');
}

/** One step either way from what the price was when the review opened. */
export function priceLimits(c: City): Readonly<Record<keyof Prices, Limit>> {
  const of = (k: keyof Prices): Limit => {
    const r = PRICE_RANGE[k];
    const base = c.priceBase[k];
    return { min: Math.max(r.min, base - r.step), max: Math.min(r.max, base + r.step), step: r.step, open: priceOpen(c, k) };
  };
  return { park: of('park'), parkPeak: of('parkPeak'), fine: of('fine'), toll: of('toll'), tollPeak: of('tollPeak'), fare: of('fare'), zone: of('zone') };
}

const HERE = { x: 0, y: 0 };

export const prices: Handler<'prices'> = {
  quote(c, cmd) {
    if (c.phase !== 'review') return no('Prices change at the night review');
    const limits = priceLimits(c);
    for (const [k, v] of Object.entries(cmd.prices)) {
      const l = limits[k as keyof Prices];
      if (!l || typeof v !== 'number' || !Number.isInteger(v)) return no('Not a price');
      if (!l.open) return no('Not in this year\'s toolbox yet');
      if (v < l.min || v > l.max) return no('One step a season, no more');
    }
    return priced(c, 0);
  },
  run(c, cmd) {
    c.prices = { ...c.prices, ...cmd.prices };
    if (cmd.prices.zone !== undefined) syncZone(c);
    return HERE;
  },
};

const NUMBER_LIMITS: Readonly<Partial<Record<keyof Policies, number>>> = { inspectors: 5, taxis: 3 };

export const policies: Handler<'policies'> = {
  quote(c, cmd) {
    const open = openPolicies(c);
    for (const [k, v] of Object.entries(cmd.policies)) {
      const key = k as keyof Policies;
      if (!open.includes(key)) return no('Not in this year\'s toolbox yet');
      const max = NUMBER_LIMITS[key];
      if (max === undefined ? typeof v !== 'boolean' : !Number.isInteger(v) || (v as number) < 0 || (v as number) > max) return no('Not on the menu');
    }
    return priced(c, 0);
  },
  run(c, cmd) {
    c.policies = { ...c.policies, ...cmd.policies };
    if (c.phase === 'day') applyConditions(c);
    return HERE;
  },
};

export const tech: Handler<'tech'> = {
  quote(c, cmd) {
    if (c.phase !== 'yearEnd') return no('Technologies come at the year\'s end');
    return c.techChoices.includes(cmd.id) ? priced(c, 0) : no('Not on offer this year');
  },
  run(c, cmd) { c.techs = [...c.techs, cmd.id]; c.techChoices = []; return HERE; },
};

export const commission: Handler<'commission'> = {
  quote: (c, cmd) => (c.commissions.some((x) => x.id === cmd.id && x.state === 'offered') ? priced(c, 0) : no('That offer is gone')),
  run(c, cmd) { answerCommission(c, cmd.id, cmd.take); return HERE; },
};

/** A month of the stream, by the last three months' mean, times the months the float buys. */
export const floatPrice = (c: City, stream: 'parking' | 'tolls'): number => Math.round((lastMonths(c).income[stream] / MONTHS_PER_SEASON) * FLOAT_MONTHS);

export const floatCo: Handler<'float'> = {
  quote(c, cmd) {
    if (c.phase !== 'review' && c.phase !== 'yearEnd') return no('Sign it at the night review');
    if (c.floated.includes(cmd.stream)) return no('Sold already');
    return floatPrice(c, cmd.stream) > 0 ? priced(c, 0) : no('Nobody buys a stream with no water in it');
  },
  run(c, cmd) {
    earn(c, 'float', floatPrice(c, cmd.stream));
    c.floated = [...c.floated, cmd.stream];
    return HERE;
  },
};

/** The zone charge goes to the people: counted at the next review, or dropped now. */
export const vote: Handler<'vote'> = {
  quote(c, cmd) {
    if (!openTools(c).includes('zone') || c.vote.kept !== null) return no('There is nothing to vote on');
    if (c.vote.running) return no('The boxes are out already');
    if (cmd.keep && c.vote.seasons === 0) return no('Let them feel it for a season first');
    return priced(c, 0);
  },
  run(c, cmd) {
    if (cmd.keep) c.vote = { ...c.vote, running: true }; else dropZone(c);
    return HERE;
  },
};

export const next: Handler<'next'> = {
  quote: (c) => (c.phase === 'yearStart' || c.phase === 'review' || c.phase === 'yearEnd' ? priced(c, 0) : no('The day is still running')),
  run(c) { closeCard(c); return HERE; },
};

