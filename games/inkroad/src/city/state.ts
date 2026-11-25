import type { Network, Traffic } from '../sim/trafficTypes';
import type {
  Bar, CarPark, CityDef, CityEvent, Commission, Complaint, Control, Id, JunctionStats, Ledger, Letter, Lot, Movement, Phase, Policies, Prices,
  Project, Pt, RoadStats, TransitLine,
} from '../sim/types';
import type { Day } from './day';
import type { Dice } from './rng';
import type { RuleDay, RuleState } from './rules/state';

export interface Mood { readonly trips: number; readonly parking: number; readonly cool: number; readonly bad: number }

/** What last day's measurements said, kept after the traffic clears them. */
export interface Measures {
  readonly junctions: ReadonlyMap<Id, JunctionStats>;
  readonly roads: ReadonlyMap<Id, RoadStats>;
  readonly movements: ReadonlyMap<Id, readonly Movement[]>;
}

/** One day's result in plain numbers (saved, read by goals and cards). */
export interface DayReport {
  readonly trips: number; readonly parking: number; readonly cost: number; readonly streets: number;
  readonly count: number; readonly gaveUp: number; readonly stayed: number; readonly onTime: number;
  readonly transit: number; readonly doubled: number; readonly fines: number; readonly fined: number;
  readonly meanRatio: number; readonly meanPay: number; readonly meanSeconds: number;
  /** Share of drivers who found a space, by district and by lot kind. */
  readonly found: Readonly<Record<string, number>>;
  readonly riders: number;
}

export interface ActiveCommission extends Commission { readonly kind: string; readonly target: number; readonly seasonsLeft: number }

/** The zone charge: tried for a season or more, then voted on. Support is lowest the day before it starts. */
export interface Vote { readonly running: boolean; readonly kept: boolean | null; readonly support: number; readonly seasons: number; readonly base: { readonly trips: number; readonly streets: number } | null }

/** The whole city while it runs. Collections are immutable values that get replaced; the object itself is owned by city.ts. */
export interface City {
  readonly def: CityDef;
  readonly seed: number;
  dice: Dice;
  net: Network;
  traffic: Traffic;
  year: number;
  season: 0 | 1 | 2 | 3;
  phase: Phase;
  clock: number;
  carry: number; // unspent seconds
  nextId: number;
  lots: readonly Lot[];
  parks: readonly CarPark[];
  lines: readonly TransitLine[];
  projects: readonly Project[];
  money: number;
  approval: number;
  bars: Readonly<Record<Bar, number>>;
  lastBars: Readonly<Record<Bar, number>> & { readonly approval: number };
  yearApprovals: readonly number[];
  /** Each season's mean trip ratio and pay this year: what people got used to. */
  yearHabits: readonly { readonly ratio: number; readonly pay: number; readonly transit: number }[];
  letters: readonly Letter[];
  plates: readonly number[];
  prices: Prices;
  priceBase: Prices;
  policies: Policies;
  ledger: Ledger;
  lastLedger: Ledger;
  purse: Record<'parking' | 'fines' | 'tolls' | 'fares' | 'zone', number>; // fractions not yet a whole coin
  techs: readonly string[];
  techChoices: readonly string[];
  commissions: readonly ActiveCommission[];
  floated: readonly ('parking' | 'tolls')[];
  bailouts: number;
  expect: { trip: number; pay: number };
  ownership: number;
  moods: Map<Id, Mood>;
  memory: Map<string, number>;
  vote: Vote;
  weather: { speed: number; crashes: number };
  day: Day;
  services: Map<Id, number>; // line -> traffic service
  measures: Measures;
  report: DayReport | null;
  complaints: readonly Complaint[];
  events: CityEvent[];
  /** Special rules of cities 3 to 5 (src/city/rules). */
  rule?: RuleState;
  ruleDay?: RuleDay;
  replacedWhy: { readonly text: string; readonly spots: readonly { readonly at: Pt; readonly text: string }[] } | undefined;
}

export const emptyLedger = (): Ledger => ({
  income: { parking: 0, fines: 0, tolls: 0, fares: 0, zone: 0, grant: 0, auction: 0, float: 0, budget: 0 },
  costs: { building: 0, land: 0, upkeep: 0, transit: 0, staff: 0, interest: 0 },
});

export const emptyMeasures = (): Measures => ({ junctions: new Map(), roads: new Map(), movements: new Map() });

/** Opened by the years reached so far. A kind no year lists is open from the start. */
function opened<T>(c: City, lists: readonly (readonly T[] | undefined)[], all: readonly T[]): readonly T[] {
  const listed = new Set(lists.flatMap((l) => l ?? []));
  const now = new Set(lists.slice(0, c.year).flatMap((l) => l ?? []));
  return all.filter((x) => now.has(x) || !listed.has(x));
}

export const yearDef = (c: City) => {
  const y = c.def.years[c.year - 1];
  if (!y) throw new Error(`No year ${c.year} in ${c.def.id}`);
  return y;
};

export const openControls = (c: City): readonly Control[] =>
  [...opened<Control>(c, c.def.years.map((y) => y.controls), ['yield', 'roundabout', 'signal']), ...(c.techs.includes('smart') ? ['smart' as const] : [])];
export const openParks = (c: City) => opened(c, c.def.years.map((y) => y.parks), ['lot', 'multi', 'under', 'ride'] as const);
export const openPolicies = (c: City) =>
  opened<keyof Policies>(c, c.def.years.map((y) => y.policies), ['inspectors', 'permits', 'truckHours', 'nightWorks', 'taxis']);
export const openTools = (c: City) => [...new Set(c.def.years.slice(0, c.year).flatMap((y) => y.tools))];

export const has = (c: City, tech: string): boolean => c.techs.includes(tech);
export const lotById = (c: City, id: Id): Lot | undefined => c.lots.find((l) => l.id === id);
export const roadById = (c: City, id: Id) => c.net.roads.find((r) => r.id === id);
export const junctionById = (c: City, id: Id) => c.net.junctions.find((j) => j.id === id);
export const isOpen = (l: Lot): boolean => l.level > 0;

export function emit(c: City, e: CityEvent): void { c.events.push(e); }
