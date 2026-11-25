import type { Id, Period } from '../../sim/types';
import type { City } from '../state';

/** What the special rules of cities 3 to 5 remember. JSON-safe: it is saved as it is. Values are replaced, never edited. */
export interface LicenceState {
  readonly cars: number; readonly quota: number; readonly wanted: number;
  readonly price: number; readonly sold: number; readonly income: number;
}
export interface TollState {
  readonly max: number;
  /** Yesterday's closing price of each period: the first price of the same period today. */
  readonly memo: Readonly<Record<Period, number>>;
  readonly kept: number;
}
export interface MiniState { readonly protest: number; readonly strengths: Readonly<Record<string, number>>; readonly seenLane: boolean; readonly names: number }
export interface Dig { readonly road: Id; readonly left: number }
/** What became of a beach. `unbooked`: coins of a sale still to be written into a season's books. */
export interface BeachRecord {
  readonly state: 'open' | 'sold' | 'public';
  readonly lean: 'sell' | 'public'; readonly why: string;
  readonly advice: 'sell' | 'public' | 'out' | null; readonly line: string;
  readonly year: number; readonly unbooked: number; readonly visitors: number; readonly found: number;
}
export interface FreewayState { readonly digs: readonly Dig[]; readonly done: number }

export interface RuleState {
  readonly licences: LicenceState | null;
  readonly toll: TollState;
  readonly minis: MiniState;
  readonly freeway: FreewayState;
  readonly beaches: Readonly<Record<string, BeachRecord>>;
}

/** Working memory of the drawn day (not saved: a day saved half way starts again). */
export interface RuleDay {
  readonly period: Period | null;
  readonly price: number;
  readonly speeds: ReadonlyMap<Id, number>;
  readonly last: Readonly<Partial<Record<Period, number>>>;
  readonly inBand: number; readonly samples: number; readonly wait: number;
  readonly holes: number;
}

const START_MAX = 4;
const NO_PRICES: Readonly<Record<Period, number>> = { dawn: 0, am: 1, mid: 0, pm: 1, night: 0 };

export const FRESH_RULES: RuleState = {
  licences: null,
  toll: { max: START_MAX, memo: NO_PRICES, kept: 0 },
  minis: { protest: 0, strengths: {}, seenLane: false, names: 0 },
  freeway: { digs: [], done: 0 },
  beaches: {},
};
export const FRESH_DAY: RuleDay = { period: null, price: 0, speeds: new Map(), last: {}, inBand: 0, samples: 0, wait: 0, holes: 0 };

export const ruleState = (c: City): RuleState => c.rule ?? FRESH_RULES;
export function setRule(c: City, patch: Partial<RuleState>): void { c.rule = { ...ruleState(c), ...patch }; }
export const ruleDay = (c: City): RuleDay => c.ruleDay ?? FRESH_DAY;
export function setRuleDay(c: City, patch: Partial<RuleDay>): void { c.ruleDay = { ...ruleDay(c), ...patch }; }

type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const numbers = (x: unknown): boolean => isObj(x) && Object.values(x).every((v) => typeof v === 'number' && Number.isFinite(v));

const beachOk = (x: unknown): boolean => isObj(x) && ['open', 'sold', 'public'].includes(x.state as string) && ['sell', 'public'].includes(x.lean as string)
  && typeof x.why === 'string' && typeof x.line === 'string' && numbers({ a: x.year, b: x.unbooked, c: x.visitors, d: x.found });

/** A saved rule state, or a fresh one where it makes no sense. */
export function readRules(x: unknown): RuleState {
  if (!isObj(x)) return FRESH_RULES;
  const { licences, toll, minis, freeway, beaches } = x as Partial<Record<keyof RuleState, unknown>>;
  const tollOk = isObj(toll) && typeof toll.max === 'number' && typeof toll.kept === 'number' && numbers(toll.memo);
  const minisOk = isObj(minis) && typeof minis.protest === 'number' && numbers(minis.strengths);
  const freewayOk = isObj(freeway) && typeof freeway.done === 'number' && Array.isArray(freeway.digs) && freeway.digs.every(numbers);
  return {
    licences: numbers(licences) ? (licences as LicenceState) : null,
    toll: tollOk ? (toll as unknown as TollState) : FRESH_RULES.toll,
    minis: minisOk ? (minis as unknown as MiniState) : FRESH_RULES.minis,
    freeway: freewayOk ? (freeway as unknown as FreewayState) : FRESH_RULES.freeway,
    beaches: isObj(beaches) ? Object.fromEntries(Object.entries(beaches).filter(([, v]) => beachOk(v))) as RuleState['beaches'] : {},
  };
}
