import type { Access } from '../sim/trafficTypes';
import type { SlotLayout } from '../sim/slotGeometry';
import type { Bar, DayKind, Id, Pt, VehicleKind } from '../sim/types';

/** One drawn day: who travels, where they park, how it went. Working memory, thrown away at night. */
export type Place = { readonly lot: Id } | { readonly gate: Id };
export type Purpose = 'work' | 'school' | 'shop' | 'visit' | 'through' | 'truck' | 'event';
export type Mode = 'car' | 'taxi' | 'transit' | 'ride' | 'walk' | 'stay';

/** One stop of a household's day: where, why, and when they mean to be there (season clock). */
export type StopKind = 'work' | 'school' | 'nursery' | 'shop' | 'food' | 'fun' | 'visit' | 'errand' | 'fuel' | 'out' | 'home';
export interface Stop {
  readonly kind: StopKind;
  readonly label: string;
  readonly place: Place;
  readonly at: number;
  /** Clock at which they leave again, or null for a stay of `stay` seconds. */
  readonly until: number | null;
  readonly stay: number;
  readonly purpose: Purpose;
}
/** A grown-up's day: stops one after another, then home. Lives in Day.chains. */
export interface Chain {
  readonly id: number;
  readonly household: Id;
  readonly person: number;
  readonly home: Place;
  readonly kind: DayKind;
  readonly seed: number;
  readonly value: number;
  /** The household car this grown-up has with them (fleet uid), or null. */
  car: number | null;
  stops: readonly Stop[];
  /** Minutes late at each stop reached so far. */
  late: number[];
  /** The stop they are heading to or at: -1 before leaving home, stops.length on the way home, past it once home. */
  now: number;
}

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
  /** A household's hop: its day, and the index of the stop it goes to (stops.length: home). */
  readonly chain?: Chain;
  readonly stop?: number;
  /** Where the traveller lives, when it is not `from` (a hop between two stops). */
  readonly home?: Place;
  /** A taxi going to fetch somebody or back to its base: nobody's trip, never judged. */
  readonly deadhead?: boolean;
}

/** A car standing in a place. `spot` moves with it when its place goes away. */
export interface Standing {
  readonly uid: number;
  readonly tint: number;
  readonly kind: VehicleKind;
  readonly household?: Id;
  slot: number;
  s?: number;
  side?: -1 | 1;
  /** A car stopped in the lane (double): px sideways of the road line where it stands (signed like the line's right), where it really stopped. */
  lat?: number;
  /** A car stopped in the lane that pulled onto the shoulder (a taxi at the kerb, a driver who gave up): it rejoins from there. */
  shoulder?: boolean;
  /** Counted in the place's `used` (a household's own car at home is not: it has its own space). */
  readonly counted: boolean;
  spot: Spot;
  /** A car stopped in its lane: the uid of the hidden stand-in that blocks the lane where it stands. */
  blockUid?: number;
  /** Times it looked for a way out that fits and found none (src/city/manoeuvre.ts readyAtEdge). */
  blocked?: number;
  /** Where its move in left it standing (the body's middle), drawn there exactly and left from there (src/city/movePlan.ts). */
  stood?: { readonly x: number; readonly y: number; readonly a: number };
  /** Clock until which it is still turning in: it may not leave before. */
  readyAt?: number;
  /** Seconds it stood in its lane waiting for a gap across the road before turning in: its stay starts after them. */
  crossWait?: number;
  /** Leaving: off the road at the lane edge (not drawn in `parking`, its slot still its own), ready for the lane at `goAt`, where it will stand. */
  edge?: { readonly goAt: number; readonly lane: { readonly x: number; readonly y: number; readonly a: number }; /** Seconds the lane is held pulling out (the planned move's lane part). */ readonly hold?: number; /** It turns across the far lanes here. */ readonly cross?: Access; /** The lane access its spawn uses (the planned move joins the lane there). */ readonly from?: Access; /** It turns round on the road: both ways must be clear. */ readonly both?: boolean; /** Px of its lane behind the joining point its move sweeps (kept clear before it goes). */ readonly back?: number };
}

/** A parking place: private spaces of a block, kerb bays, a car park. */
export interface Spot {
  readonly key: string;
  /** street, sand and double are where cars stand when there is nowhere they may. */
  readonly kind: 'private' | 'home' | 'kerb' | 'park' | 'street' | 'sand' | 'double';
  readonly id: Id; // lot, road or car park
  readonly spaces: number;
  used: number;
  readonly access: Access;
  /** Off-road places: the drawn slots (src/sim/slotGeometry.ts), which `spaces` never exceeds. */
  readonly layout?: SlotLayout;
  readonly at: Pt;
  /** Sum of used/spaces, sampled, and samples taken. */
  sum: number;
  samples: number;
  /** The cars standing here, oldest first, and a counter bumped when they change. */
  cars: Standing[];
  ver: number;
}

export interface Leg {
  /** It found the free spaces only on the far kerb and went round to come back on their side (once). */
  wentRound?: boolean;
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
  /** The place it frees once it is on the road. */
  leaving: Standing | null;
  tolls: number;
  /** The household car it drives (fleet uid), its traffic uid on the road, and where it stood once there. */
  car: number | null;
  uid: number;
  parked: Standing | null;
  /** The slot it was promised in `spot` (road places), or -1. */
  slot: number;
  /** A car with no space to pull out of comes out of a building's entrance (`door.ts`): its move, once told. */
  door?: { readonly uid: number; readonly goAt: number; readonly lane: { readonly x: number; readonly y: number; readonly a: number }; readonly key: string; /** Seconds its spawn holds the lane (the move from the edge into it). */ readonly hold: number };
  /** A taxi on its way to fetch somebody: their ride home, set off from the kerb once it is there. */
  then?: Leg;
}

export interface Stay { readonly leg: Leg; readonly until: number; readonly spot: Spot | null; readonly from: Access | null; readonly parked: Standing | null }

export interface Tally { sum: number; w: number }
export interface LotTally { readonly trips: Tally; readonly parking: Tally }
/** Something that went badly at a place, for complaints and the review. */
export interface Sore { readonly bar: Bar; readonly kind: string; readonly at: Pt; readonly weight: number; readonly lot: Id | null; readonly n: number; readonly place?: string; readonly household?: Id }

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
  /** Households' days: the drawn day's (replaced at the weekend) and the workday's, for the night's letters. */
  chains: Map<Id, Chain[]>;
  workChains: Map<Id, Chain[]>;
  /** Cars that entered the road, by day. */
  drawn: Record<DayKind, number>;
  /** Petrol stations: cars served and in the queue now. */
  pumps: Map<Id, { served: number; queue: Leg[] }>;
  parkingDirty: boolean;
  /** A car turned into or out of a space this step: the view is rebuilt before the step ends. */
  parkingNow: boolean;
  /** Far lanes to hold for a car turning across them, from clock `from` (it waited for its gap). */
  crossings: { readonly from: number; readonly at: Access; readonly a: number; readonly seconds: number }[];
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
  chains: new Map(), workChains: new Map(), drawn: { work: 0, weekend: 0 }, pumps: new Map(), parkingDirty: true, parkingNow: false, crossings: [],
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
