import type { Command, Quote, SpecialView } from '../../sim/types';
import { no } from '../commands/shared';
import { clamp } from '../geometry';
import type { City, DayReport } from '../state';
import { ageView, repair, replaceRoad, tickHoles, wear, wornStreets } from './ageing';
import { beach, dawnBeaches, yearBeaches } from './beach';
import { dawnSea, nightSea } from './beachDay';
import { boulevard, freewayStreets, freewayVeto, freewayView, monthFreeway } from './freeway';
import { holdAuction, licencePain, licences, licenceView, nightLicences } from './licences';
import { dawnMinis, minibus, miniStreets, miniView, nightMinis, tickMinis } from './minibus';
import { dawnTolls, nightTolls, speedToll, tickTolls, tollLimit, tollView } from './speedTolls';

/**
 * The special rules of cities 3 to 5, called from one place each in src/city.
 * Everything here does nothing in a city whose def.rules don't ask for it.
 */
export const RULE_HANDLERS = { licences, speedToll, tollLimit, minibus, repair, replace: replaceRoad, boulevard, beach } as const;
export const QUIET_RULES: readonly Command['t'][] = ['licences', 'tollLimit', 'beach'];

/** January, after the roads and blocks of the year are in. */
export function yearRules(c: City): void {
  yearBeaches(c);
  holdAuction(c);
}

/** Dawn of a season, before the day is planned. */
export function dawnRules(c: City): void {
  dawnBeaches(c);
  dawnSea(c);
  dawnTolls(c);
  dawnMinis(c);
}

/** Once a second of the day. True when tolls changed. */
export function tickRules(c: City): boolean {
  tickMinis(c);
  tickHoles(c);
  return tickTolls(c);
}

/** The day's report with the city's own joys and griefs in it (and their complaints in the post). */
export function reportRules(c: City, r: DayReport): DayReport {
  nightTolls(c);
  nightLicences(c);
  const streets = miniStreets(c, r) + wornStreets(c) + freewayStreets(c) + nightSea(c, r);
  const pain = licencePain(c);
  if (streets === 0 && pain === 0) return r;
  return { ...r, streets: clamp(r.streets + streets, 0, 100), cost: clamp(r.cost - pain, 0, 100) };
}

/** Night, when the roads are empty again: the season's last payday. */
export function nightRules(c: City): void {
  nightMinis(c);
  wear(c);
  monthFreeway(c, true);
}

/** A payday inside the day, after the works. */
export function monthRules(c: City): void {
  monthFreeway(c, false);
}

const HILL_WORDS: Readonly<Record<string, string>> = {
  'Old quarter: only a street fits here': 'Too steep: only a street climbs here',
  'These old walls will not move': 'The hill will not move',
  'No decks over old roofs': 'No decks on a hillside',
};

/** Vetoes and wording on top of the usual price. */
export function quoteRules(c: City, cmd: Command, q: Quote): Quote {
  const veto = q.ok ? freewayVeto(c, cmd) : null;
  if (veto) return { ...no(veto), ...(q.line ? { line: q.line } : {}) };
  const why = c.def.rules.steep && q.why ? HILL_WORDS[q.why] : undefined;
  return why ? { ...q, why } : q;
}

export function specialView(c: City): SpecialView | undefined {
  const r = c.def.rules;
  if (!r.licences && !r.speedTolls && !r.minibuses && !r.ageing && !r.freeway) return undefined;
  const parts = { licences: licenceView(c), speedTolls: tollView(c), minibuses: miniView(c), ageing: ageView(c), freeway: freewayView(c) };
  return Object.fromEntries(Object.entries(parts).filter(([, v]) => v !== undefined)) as SpecialView;
}

