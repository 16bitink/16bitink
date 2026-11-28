import type { LanePose } from '../sim/trafficTypes';
import type { Id, Lot, RoutineProfile } from '../sim/types';
import type { Leg, Spot, Standing } from './day';
import { builtArea } from './geometry';
import { residentFor } from './residents';
import { createDice, mixSeed } from './rng';
import { routineOf } from './routine';
import { freeSlots } from './slots';
import { stand, unstand } from './stand';
import type { City } from './state';
import { FAMILY, HOME_TOURS, HOUSEHOLDS_PER_TOUR } from './tune';

/** Everybody who lives in the city for good: households with their cars. Derived from the lots and the seed, never saved. */
export interface Household {
  readonly id: Id;
  readonly lot: Id;
  readonly index: number;
  readonly who: string;
  readonly animal: string;
  readonly adults: 1 | 2;
  readonly child: 'none' | 'school' | 'nursery';
  readonly seed: number;
  /** Fixed rolls: having a car (against the city's car ownership), a second car. */
  readonly carRoll: number;
  readonly secondRoll: number;
}
export interface FleetCar {
  readonly uid: number;
  readonly tint: number;
  readonly kind: 'car' | 'van';
  readonly household: Id;
  readonly electric: boolean;
  /** 0 empty .. 1 full. */
  tank: number;
  /** Where it stands, or null while it is out (on the road, or out of town). */
  where: Standing | null;
  /** Entrance of the building or structure where the car is parked indoors. */
  garage?: string;
  garagePose?: LanePose;
  /** The leg it is driving now. */
  leg: Leg | null;
  /** Out by a gate: the place it left the map, to come back to. */
  away: boolean;
}
export interface Fleet {
  readonly households: ReadonlyMap<Id, Household>;
  readonly byLot: ReadonlyMap<Id, readonly Household[]>;
  readonly cars: ReadonlyMap<number, FleetCar>;
  readonly carsOf: ReadonlyMap<Id, readonly FleetCar[]>;
}

/** Household ids: the lot's id times this, plus the household's index in it. */
export const HOUSEHOLD_STRIDE = 1000;
/** Household car uids start here, far above the traffic's own. */
export const FLEET_UID = 1 << 30;
const TINTS = 8;
const VAN_SHARE = 0.12;
const TANK_MIN = 0.25;
const KIN = { household: 811, car: 812 } as const;

/** How many households a home block holds now. */
export function householdsIn(c: City, l: Lot, profile: RoutineProfile): number {
  if (l.kind !== 'home' || l.level === 0 || !l.access) return 0;
  const n = builtArea(l) * (HOME_TOURS[l.level] ?? 0) * HOUSEHOLDS_PER_TOUR * (profile.homes ?? 1);
  const whole = Math.floor(n);
  return whole + (createDice(mixSeed(c.seed, KIN.household, l.id)).chance(n - whole) ? 1 : 0);
}

function makeHousehold(c: City, l: Lot, index: number): Household {
  const id = l.id * HOUSEHOLD_STRIDE + index;
  const seed = mixSeed(c.seed, KIN.household, id);
  const d = createDice(seed);
  const who = residentFor(seed >>> 3, c.def.style);
  const two = d.chance(FAMILY.two);
  const kid = d.chance(FAMILY.child);
  const child = !kid ? 'none' : d.chance(FAMILY.nursery) ? 'nursery' : 'school';
  return { id, lot: l.id, index, who: who.name, animal: who.animal, adults: two ? 2 : 1, child, seed, carRoll: d.next(), secondRoll: d.next() };
}

/** Cars a household has this year: car ownership rises, and the same households gain one first. */
export function carCount(c: City, h: Household, profile: RoutineProfile): number {
  if (h.carRoll >= c.ownership) return 0;
  return h.adults === 2 && h.secondRoll < profile.secondCar ? 2 : 1;
}

function makeCar(c: City, h: Household, k: number, profile: RoutineProfile): FleetCar {
  const uid = FLEET_UID + h.id * 2 + k;
  const d = createDice(mixSeed(c.seed, KIN.car, uid));
  const tint = Math.floor(d.next() * TINTS) % TINTS;
  const kind = d.chance(VAN_SHARE) ? 'van' : 'car';
  const electric = d.chance(profile.petrol.electric);
  // A season's tank is the car's own, the same for a city loaded from its save: it carries from the workday into the weekend.
  const tank = TANK_MIN + (1 - TANK_MIN) * createDice(mixSeed(c.seed, KIN.car, uid, c.year, c.season)).next();
  return { uid, tint, kind, household: h.id, electric, tank, where: null, leg: null, away: false };
}

/** Dawn: who lives where now. */
export function buildFleet(c: City, previous?: Fleet): Fleet {
  const profile = routineOf(c);
  const households = new Map<Id, Household>();
  const byLot = new Map<Id, Household[]>();
  const cars = new Map<number, FleetCar>();
  const carsOf = new Map<Id, FleetCar[]>();
  for (const l of c.lots) {
    const n = householdsIn(c, l, profile);
    if (n === 0) continue;
    const list: Household[] = [];
    for (let i = 0; i < n; i++) {
      const h = makeHousehold(c, l, i);
      list.push(h);
      households.set(h.id, h);
      const old = previous?.carsOf.get(h.id) ?? [];
      const own = Array.from({ length: Math.max(old.length, carCount(c, h, profile)) }, (_, k) => {
        if (old[k]) return old[k]!;
        const car = makeCar(c, h, k, profile);
        if (previous) car.garage = `lot:${h.lot}`;
        return car;
      });
      for (const car of own) cars.set(car.uid, car);
      carsOf.set(h.id, own);
    }
    byLot.set(l.id, list);
  }
  for (const old of previous?.cars.values() ?? []) if (!cars.has(old.uid)) cars.set(old.uid, old);
  return { households, byLot, cars, carsOf };
}

export const fleetOf = (c: City): Fleet => {
  if (!c.fleet) c.fleet = buildFleet(c);
  return c.fleet;
};

/** Every household car stands at home: own driveways, which visitors' parking does not count. */
export function parkAllAtHome(c: City): void {
  const fleet = fleetOf(c);
  for (const car of fleet.cars.values()) {
    car.leg = null;
    car.away = false;
    car.garage = car.garagePose = undefined;
    const h = fleet.households.get(car.household);
    const spot = h ? c.day.spots.get(`lot:${h.lot}`) : undefined;
    if (car.where && car.where.spot === spot && spot.cars.includes(car.where)) continue; // home already: it keeps its slot
    if (car.where) unstand(c, car.where);
    const slot = spot?.layout ? freeSlots(c, spot, null, car.kind)[0] : undefined;
    car.where = spot && slot !== undefined ? stand(c, spot, car, false, undefined, slot) : null;
    if (!car.where && h) car.garage = `lot:${h.lot}`;
  }
}

/** A household car standing in its own home's place now. */
export function isHome(c: City, e: Standing): boolean {
  if (e.household === undefined) return false;
  const h = fleetOf(c).households.get(e.household);
  return !!h && e.spot.key === `lot:${h.lot}` && fleetOf(c).cars.get(e.uid)?.where === e;
}

/** A household car arrives somewhere and stands there. */
export function standCar(c: City, car: FleetCar, spot: Spot, counted: boolean, s?: number, slot?: number): Standing {
  car.leg = null;
  car.away = false;
  car.garage = car.garagePose = undefined;
  car.where = stand(c, spot, car, counted, s, slot);
  return car.where;
}

export const householdOf = (c: City, id: Id): Household | undefined => fleetOf(c).households.get(id);
export const carById = (c: City, uid: number | null): FleetCar | undefined => (uid === null ? undefined : fleetOf(c).cars.get(uid));
