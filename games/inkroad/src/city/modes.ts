import type { Cell, Id } from '../sim/types';
import { CELL } from '../sim/constants';
import { periodAt } from './clock';
import type { Mode, Place, Spot, Tour } from './day';
import { placeKey } from './day';
import { cellPt, distPt } from './geometry';
import { chooseSpot, priceAt, spotCost } from './parking';
import { accessOf, cellsBetween, pointOf } from './places';
import type { City } from './state';
import { lotById } from './state';
import { bestRide, isRunning, rideMinutes, type Ride } from './transit';
import { COST, RIDE_LINK } from './tune';

export interface Choice {
  readonly mode: Mode;
  readonly minutes: number; // the one formula's total
  readonly seconds: number; // door to door, expected
  readonly coins: number;
  readonly spot: Spot | null;
  readonly lines: readonly Id[];
}

/** A fair trip on good roads: the crow's way with a bend factor. It doesn't know the network, so a missing bridge shows. */
const BEND = 1.25;
const FREE_SPEED = 54;
const START_STOP = 3;
const freeCache = new WeakMap<object, Map<string, number>>();
export function freeSeconds(c: City, a: Place, b: Place): number {
  const map = freeCache.get(c.net) ?? new Map<string, number>();
  freeCache.set(c.net, map);
  const key = `${placeKey(a)}>${placeKey(b)}`;
  const have = map.get(key);
  if (have !== undefined) return have;
  const secs = (distPt(pointOf(c, a), pointOf(c, b)) * BEND) / FREE_SPEED + START_STOP;
  map.set(key, secs);
  return secs;
}

/** Seconds a driver expects: half what the roads look like now, half what they remember. */
function carSeconds(c: City, a: Place, b: Place, live: number): number {
  const was = c.memory.get(`${placeKey(a)}>${placeKey(b)}`);
  return was === undefined ? live : live * (1 - COST.memory) + was * COST.memory;
}

function byCar(c: City, t: Tour, clock: number): Choice | null {
  const a = accessOf(c, t.from);
  const b = accessOf(c, t.to);
  if (!a || !b) return null;
  const spot = 'lot' in t.to ? chooseSpot(c, t.to, clock, false, []) : null;
  const trip = c.traffic.estimate(a, spot?.access ?? b, t.value);
  if (!trip.reachable) return null;
  const secs = carSeconds(c, t.from, t.to, trip.seconds);
  const lot = 'lot' in t.to ? lotById(c, t.to.lot) : undefined;
  const parkMinutes = lot && spot ? spotCost(c, lot, spot, clock, false) : 'lot' in t.to ? COST.walkMaxCells : 0;
  const coins = trip.toll;
  const price = spot ? priceAt(c, spot, clock, false) : 0;
  return { mode: 'car', minutes: COST.carFixed + secs * (1 + COST.fuelPerMin) + coins * COST.minPerCoin + parkMinutes, seconds: secs, coins: coins + price, spot, lines: [] };
}

function byTaxi(c: City, t: Tour): Choice | null {
  const a = accessOf(c, t.from);
  const b = accessOf(c, t.to);
  if (!a || !b) return null;
  const trip = c.traffic.estimate(a, b, t.value);
  if (!trip.reachable) return null;
  const secs = carSeconds(c, t.from, t.to, trip.seconds);
  const fare = COST.taxiFare - COST.taxiFarePerRank * c.policies.taxis + secs * COST.taxiPerMin + trip.toll;
  const wait = COST.taxiWait - COST.taxiWaitPerRank * c.policies.taxis;
  return { mode: 'taxi', minutes: secs + wait + fare * COST.minPerCoin, seconds: secs + wait, coins: fare, spot: null, lines: [] };
}

const rideChoice = (c: City, mode: Mode, r: Ride, extra: number, coins: number, spot: Spot | null): Choice => {
  const secs = r.seconds + r.wait + r.walk * 1.5 + extra;
  const fare = c.prices.fare * r.lines.length;
  return { mode, minutes: rideMinutes(r) + extra + fare * COST.fareMin + coins * COST.minPerCoin, seconds: secs, coins: fare + coins, spot, lines: r.lines };
};

function byTransit(c: City, t: Tour, clock: number): Choice | null {
  const ride = bestRide(c, pointOf(c, t.from), pointOf(c, t.to), periodAt(clock));
  return ride ? rideChoice(c, 'transit', ride, 0, 0, null) : null;
}

/** Drive to a park and ride, then take the line. */
function byRide(c: City, t: Tour, clock: number): Choice | null {
  if (!t.owns) return null;
  const a = accessOf(c, t.from);
  if (!a) return null;
  let best: Choice | null = null;
  for (const p of c.parks) {
    const spot = p.kind === 'ride' ? c.day.spots.get(`park:${p.id}`) : undefined;
    if (!spot || spot.used >= spot.spaces || !linkedStop(c, spot)) continue;
    const ride = bestRide(c, spot.at, pointOf(c, t.to), periodAt(clock));
    if (!ride) continue;
    const trip = c.traffic.estimate(a, spot.access, t.value);
    if (!trip.reachable) continue;
    const pick = rideChoice(c, 'ride', ride, trip.seconds, trip.toll + priceAt(c, spot, clock, false) / 2, spot);
    if (!best || pick.minutes < best.minutes) best = pick;
  }
  return best;
}

const linkedStop = (c: City, spot: Spot): boolean =>
  c.lines.some((l) => isRunning(l) && l.stops.some((s: Cell) => distPt(cellPt(s), spot.at) <= RIDE_LINK * CELL));

function onFoot(c: City, t: Tour): Choice | null {
  const cells = cellsBetween(pointOf(c, t.from), pointOf(c, t.to));
  if (cells > COST.walkMaxCells) return null;
  const minutes = cells * COST.walkPerCell;
  return { mode: 'walk', minutes: minutes + 2, seconds: minutes, coins: 0, spot: null, lines: [] };
}

/** Every way this tour could be made now, with the one formula's cost. */
export function choices(c: City, t: Tour, clock: number): readonly Choice[] {
  if (t.purpose === 'truck' || t.purpose === 'through') {
    const car = byCar(c, t, clock);
    return car ? [car] : [];
  }
  const fromGate = 'gate' in t.from;
  const stay = (t.purpose === 'shop' || t.purpose === 'visit' ? COST.stayBase : COST.stayBase * 1.4) + freeSeconds(c, t.from, t.to) * COST.stayPerMin;
  const home: Choice = { mode: 'stay', minutes: stay, seconds: 0, coins: 0, spot: null, lines: [] };
  const all = [
    t.owns || fromGate ? byCar(c, t, clock) : null,
    fromGate ? null : byTaxi(c, t),
    byTransit(c, t, clock), byRide(c, t, clock), fromGate ? null : onFoot(c, t), home,
  ];
  return all.filter((x): x is Choice => x !== null);
}

/** Cheapest most often, with a little randomness (logit). */
export function pickMode(list: readonly Choice[], roll: number): Choice | null {
  if (list.length === 0) return null;
  const best = Math.min(...list.map((x) => x.minutes));
  const weights = list.map((x) => Math.exp(-(x.minutes - best) / COST.theta));
  const total = weights.reduce((n, w) => n + w, 0);
  let left = roll * total;
  for (let i = 0; i < list.length; i++) {
    left -= weights[i]!;
    if (left <= 0) return list[i]!;
  }
  return list[list.length - 1]!;
}
