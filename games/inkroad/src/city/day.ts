import type { Access } from '../sim/trafficTypes';
import type { Bar, Id, Pt } from '../sim/types';

/** One drawn day: who travels, where they park, how it went. Working memory, thrown away at night. */
export type Place = { readonly lot: Id } | { readonly gate: Id };
export type Purpose = 'work' | 'school' | 'shop' | 'visit' | 'through' | 'truck' | 'event';
export type Mode = 'car' | 'taxi' | 'transit' | 'ride' | 'walk' | 'stay';

export interface Tour {
  readonly id: number;
  readonly from: Place;
  readonly to: Place;
  readonly purpose: Purpose;
  readonly leave: number;
  /** Clock at which the stay ends: an hour (work) or a length (shops). */
  readonly until: number | null;
  readonly stay: number;
  readonly owns: boolean;
  readonly value: number; // coins per second
  /** Extra fine-grained choice noise, fixed per tour. */
  readonly seed: number;
}

/** A parking place: private spaces of a block, kerb bays, a car park. */
export interface Spot {
  readonly key: string;
  readonly kind: 'private' | 'home' | 'kerb' | 'park';
  readonly id: Id; // lot, road or car park
  readonly spaces: number;
  used: number;
  readonly access: Access;
  readonly at: Pt;
  /** Sum of used/spaces, sampled, and samples taken. */
  sum: number;
  samples: number;
}

export interface Leg {
  readonly tour: Tour;
  readonly out: boolean;
  readonly mode: Mode;
  readonly start: number;
  readonly free: number; // free-flow seconds, for judging
  /** Its index in Day.legs (the traffic's tag), -1 before it enters the road. */
  tag: number;
  spot: Spot | null;
  tried: string[];
  paid: number;
  /** Transit seconds and money for legs that are not drawn. */
  readonly lines: readonly Id[];
  done: boolean;
  /** Back to a block that has no space: it still must go somewhere. */
  readonly target: Place;
  heldAt: number; // clock when it first could not enter the road, or -1
  from: Access | null;
  to: Access | null;
  /** The space it frees once it is on the road. */
  leaving: Spot | null;
  tolls: number;
}

export interface Stay { readonly leg: Leg; readonly until: number; readonly spot: Spot | null; readonly from: Access | null }

export interface Tally { sum: number; w: number }
export interface LotTally { readonly trips: Tally; readonly parking: Tally }
/** Something that went badly at a place, for complaints and the review. */
export interface Sore { readonly bar: Bar; readonly kind: string; readonly at: Pt; readonly weight: number; readonly lot: Id | null; readonly n: number; readonly place?: string }

export interface DayStats {
  trips: Tally; parking: Tally; cost: Tally; ratio: Tally; pay: Tally; seconds: Tally;
  count: number; onTime: number; gaveUp: number; stayed: number; transit: number; doubled: number; fined: number; fines: number; riders: number;
  found: Map<string, Tally>;
  lots: Map<Id, LotTally>;
  sores: Sore[];
  crashes: number;
  homeCharges: number;
  lineRiders: Map<Id, number>;
  lineLoad: Map<string, number>; // `${line}:${period}`
}

export interface Day {
  plan: readonly Tour[];
  next: number;
  legs: Leg[];
  waiting: Leg[]; // could not enter the road yet
  stays: Stay[];
  spots: Map<string, Spot>;
  stats: DayStats;
  /** Scheduled happenings: clock and what. */
  agenda: { readonly at: number; readonly kind: string; readonly place?: string }[];
  red: Set<Id>; // junctions red now
  /** Payers who share a neighbour's car today, and what it would have cost them: they grumble all the same. */
  shared: readonly { readonly tour: Tour; readonly coins: number }[];
  moneyMade: number; // operating income this day, for a save made in the middle of it
  sampled: number;
  retimed: Set<number>;
  period: string;
}

const tally = (): Tally => ({ sum: 0, w: 0 });
export const emptyStats = (): DayStats => ({
  trips: tally(), parking: tally(), cost: tally(), ratio: tally(), pay: tally(), seconds: tally(),
  count: 0, onTime: 0, gaveUp: 0, stayed: 0, transit: 0, doubled: 0, fined: 0, fines: 0, riders: 0,
  found: new Map(), lots: new Map(), sores: [], crashes: 0, homeCharges: 0, lineRiders: new Map(), lineLoad: new Map(),
});

export const emptyDay = (): Day => ({
  plan: [], next: 0, legs: [], waiting: [], stays: [], spots: new Map(), stats: emptyStats(),
  agenda: [], red: new Set(), shared: [], moneyMade: 0, sampled: 0, retimed: new Set(), period: '',
});

export function add(t: Tally, v: number, w = 1): void { t.sum += v * w; t.w += w; }
export const mean = (t: Tally | undefined, none: number): number => (t && t.w > 0 ? t.sum / t.w : none);

export function lotTally(s: DayStats, lot: Id): LotTally {
  const have = s.lots.get(lot);
  if (have) return have;
  const made: LotTally = { trips: tally(), parking: tally() };
  s.lots.set(lot, made);
  return made;
}

export function foundTally(s: DayStats, key: string): Tally {
  const have = s.found.get(key);
  if (have) return have;
  const made = tally();
  s.found.set(key, made);
  return made;
}

export const placeKey = (p: Place): string => ('lot' in p ? `L${p.lot}` : `G${p.gate}`);
