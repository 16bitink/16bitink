import { garageAccess } from './door';
import type { Access } from '../sim/trafficTypes';
import type { FuelView, Lot, Pt } from '../sim/types';
import type { Chain, Leg, Place, Stay, Stop, Tour } from './day';
import { clockAt, dayKindAt, SEASON_END, WEEKEND_AT } from './clock';
import { distPt } from './geometry';
import { carById, fleetOf } from './households';
import { chooseHome, drive, lookOf, newLeg, startOf, startTour } from './legs';
import type { Choice } from './modes';
import { aimOf } from './manoeuvre';
import { chooseSpot } from './parking';
import { accessOf, cellsBetween, pointOf } from './places';
import { routineOf } from './routine';
import { scoreTrip } from './score';
import type { City } from './state';
import { FUEL_LOW, PUMPS, STOPS } from './tune';

/** A household's day, hop by hop: from one stop to the next, petrol on the way, everyone home at night. */

const BEND = 1.25;
const LATE_FACTOR = 1.2;
/** A day's chains may still set off until just after the day's end; the night sweeps up the rest. */
const GRACE = 1;

export const homeOf = (t: Tour): Place => t.chain?.home ?? t.home ?? t.from;

/** Nobody but lorries and the city's own late evenings comes or goes after this hour; a crowd's night out ends later. */
export const QUIET_HOUR = 21;
const CROWD_HOUR = 22.5;

/** A household's own day: a late shift or a dinner may still be out at midnight, and the small hours bring it home. */
const ownDay = (t: Tour): boolean => !!t.chain && t.chain.id > 0;

/** After this clock a household's day sets off no more: what is left the night brings home. */
export function lastDeparture(t: Tour): number {
  if (!ownDay(t)) return Infinity;
  return t.chain!.kind === 'weekend' ? SEASON_END - GRACE : WEEKEND_AT + GRACE;
}

/** When a visitor, a commuter from out of town or a borrowed trip must set off home to be gone by the quiet hours. Null: their own time. */
export function leaveBy(c: City, leg: Leg): number | null {
  const t = leg.tour;
  if (t.purpose === 'truck' || ownDay(t)) return null;
  const crowd = t.purpose === 'event' && !('lot' in t.to && c.lots[t.to.lot]?.kind === 'beach');
  return clockAt(crowd ? CROWD_HOUR : QUIET_HOUR, dayKindAt(c.clock)) - leg.free;
}

/** The hop to stop i of a chain, from where they are now. */
export function hopTour(c: City, ch: Chain, i: number, from: Place): Tour {
  const s = ch.stops[i]!;
  return {
    id: ch.id * 100 + i, from, to: s.place, purpose: s.purpose, leave: c.clock, until: s.until, stay: s.stay,
    owns: ch.car !== null, value: ch.value, seed: ch.seed, chain: ch, stop: i, home: ch.home,
  };
}

/** The same trip as one going home: `from` is home and `to` is where they are, as the old there-and-back tours had it. */
export function homeward(was: Leg): Leg {
  const ch = was.tour.chain;
  if (!ch || !was.out) return was;
  ch.now = ch.stops.length;
  return { ...was, tour: { ...was.tour, from: ch.home, to: was.tour.to, stop: ch.stops.length } };
}

/** The stay is over and there is another stop: go on to it. False: they go home. */
export function goOn(c: City, s: Stay): boolean {
  const leg = s.leg;
  const ch = leg.tour.chain;
  if (!ch || !leg.out) return false;
  const next = (leg.tour.stop ?? 0) + 1;
  if (next >= ch.stops.length) return false;
  const here = leg.tour.to;
  const t = hopTour(c, ch, next, here);
  ch.now = next;
  const car = carById(c, ch.car);
  if (!car || car.leg) { startTour(c, { ...t, owns: false }); return true; }
  const pick: Choice = { mode: 'car', minutes: 0, seconds: 0, coins: 0, spot: chooseSpot(c, t.to, c.clock, false, []), lines: [] };
  const hop = newLeg(c, t, true, pick);
  hop.car = car.uid;
  hop.leaving = car.where;
  const go = refuel(c, hop);
  drive(c, go, carAt(c, go) ?? startOf(c, s.from, car.where?.spot ?? s.spot, here), aimOf(c, go) ?? accessOf(c, go.tour.to));
  return true;
}

/** The nearest petrol station on the way, by the crow's road. */
function stationFor(c: City, a: Pt, b: Pt): Lot | null {
  let best: Lot | null = null;
  let cost = Infinity;
  for (const l of c.lots) {
    if (l.kind !== 'fuel' || l.level === 0 || !l.access) continue;
    const at = pointOf(c, { lot: l.id });
    const d = distPt(a, at) + distPt(at, b);
    if (d < cost) { cost = d; best = l; }
  }
  return best;
}

/** Under a fifth of a tank, this hop calls at a petrol station first. Returns the leg to drive. */
export function refuel(c: City, leg: Leg): Leg {
  const car = carById(c, leg.car);
  const ch = leg.tour.chain;
  if (!car || !ch || car.electric || car.tank >= FUEL_LOW || leg.mode !== 'car') return leg;
  const i = leg.out ? leg.tour.stop ?? 0 : ch.stops.length;
  if (ch.stops[i]?.kind === 'fuel' || ch.stops[i - 1]?.kind === 'fuel') return leg;
  const from = leg.out ? leg.tour.from : leg.tour.to;
  const station = stationFor(c, pointOf(c, from), pointOf(c, leg.target));
  if (!station) return leg;
  const stop: Stop = { kind: 'fuel', label: 'Petrol', place: { lot: station.id }, at: c.clock, until: null, stay: STOPS.fuel, purpose: 'shop' };
  ch.stops = [...ch.stops.slice(0, i), stop, ...ch.stops.slice(i)];
  ch.now = i;
  const pick: Choice = { mode: 'car', minutes: 0, seconds: 0, coins: 0, spot: c.day.spots.get(`lot:${station.id}`) ?? null, lines: [] };
  const hop = newLeg(c, hopTour(c, ch, i, from), true, pick);
  hop.car = leg.car;
  hop.leaving = leg.leaving;
  return hop;
}

const pumpOf = (c: City, lot: number): { served: number; queue: Leg[] } => {
  const have = c.day.pumps.get(lot);
  if (have) return have;
  const made = { served: 0, queue: [] as Leg[] };
  c.day.pumps.set(lot, made);
  return made;
};

/** All four pumps busy: this car waits in the lane by the station. */
export function queueAtPump(c: City, leg: Leg): boolean {
  const ch = leg.tour.chain;
  if (!ch || !leg.out || ch.stops[leg.tour.stop ?? -1]?.kind !== 'fuel' || !leg.spot) return false;
  if (leg.spot.used < leg.spot.spaces) return false;
  pumpOf(c, leg.spot.id).queue.push(leg);
  return true;
}

/** Waiting cars at a station now. */
export const waitingAt = (c: City, lot: number): number => (c.day.pumps.get(lot)?.queue ?? []).filter((l) => l.parked && l.parked.spot.cars.includes(l.parked)).length;

/** They got there: how late, and a full tank at a station. */
export function arrivedAt(c: City, leg: Leg): void {
  const ch = leg.tour.chain;
  const i = leg.tour.stop ?? 0;
  const stop = ch?.stops[i];
  if (!ch || !stop || !leg.out) return;
  ch.late[i] = Math.max(0, Math.round(c.clock - stop.at));
  if (stop.kind !== 'fuel') return;
  const car = carById(c, leg.car);
  if (car) car.tank = 1;
  if ('lot' in stop.place) pumpOf(c, stop.place.lot).served += 1;
}

/** Off the road: the tank went down by the way it came; out by a gate, the car is out of town. Home again: the day is over. */
export function endOfTrip(c: City, leg: Leg): void {
  const ch = leg.tour.chain;
  if (ch && !leg.out && !('gate' in leg.target)) ch.now = ch.stops.length + 1;
  const car = carById(c, leg.car);
  if (!car || leg.mode === 'taxi') return;
  const [a, b] = leg.out ? [leg.tour.from, leg.tour.to] : [leg.tour.to, leg.tour.from];
  if (!car.electric) car.tank = Math.max(0, car.tank - (cellsBetween(pointOf(c, a), pointOf(c, b)) * BEND) / routineOf(c).petrol.range);
  car.leg = null;
  if ('gate' in leg.target) car.away = true;
}

/** Where its car stands, to set off from. */
export function carAt(c: City, leg: Leg): Access | null {
  const car = carById(c, leg.car);
  return car?.where?.spot.access ?? garageAccess(c, car?.garage);
}

/** Open petrol stations and their queues. */
export function fuelView(c: City): readonly FuelView[] {
  return c.lots.filter((l) => l.kind === 'fuel' && l.level > 0 && l.access).map((l) => {
    const spot = c.day.spots.get(`lot:${l.id}`);
    const waiting = waitingAt(c, l.id);
    return { lot: l.id, pumps: PUMPS, busy: Math.min(PUMPS, spot?.used ?? 0), waiting, spill: waiting > 0, served: c.day.pumps.get(l.id)?.served ?? 0 };
  });
}

/**
 * The guard: a household car standing away from home with nobody about to drive it (its trip home was given up at a
 * jammed exit, a hop could not start) is driven home now. Cars never stay behind by accident.
 */
export function sendStrandedHome(c: City): void {
  const busy = busyCars(c);
  for (const list of c.day.chains.values()) {
    for (const ch of list) {
      if (ch.now < 0 || ch.now > ch.stops.length) continue;
      driveHome(c, ch, busy);
    }
  }
}

/** Household cars somebody is about to drive, or driving: on the road, held at an exit, or parked for a stay. */
export function busyCars(c: City): Set<number> {
  const busy = new Set<number>();
  for (const s of c.day.stays) if (s.leg.car !== null) busy.add(s.leg.car);
  for (const l of c.day.waiting) if (l.car !== null) busy.add(l.car);
  for (const car of fleetOf(c).cars.values()) if (car.leg) busy.add(car.uid);
  return busy;
}

/** A chain's car standing away from home with nobody to drive it drives home now, by road. */
function driveHome(c: City, ch: Chain, busy: ReadonlySet<number>): void {
  const car = carById(c, ch.car);
  if (!car || car.leg || car.away || busy.has(car.uid)) return;
  const from = car.where?.spot.access ?? garageAccess(c, car.garage);
  if (!from) return;
  const home = ch.home;
  if ('lot' in home && (car.where?.spot.key ?? car.garage) === `lot:${home.lot}`) return;
  const here = ch.stops[Math.max(0, Math.min(ch.now, ch.stops.length - 1))]?.place;
  if (!here) return;
  ch.now = ch.stops.length;
  const t: Tour = { ...hopTour(c, ch, Math.max(0, Math.min(ch.now, ch.stops.length - 1)), here), from: home, to: here, stop: ch.stops.length };
  const spot = chooseHome(c, home);
  const leg = newLeg(c, t, false, { mode: 'car', minutes: 0, seconds: 0, coins: 0, spot, lines: [] });
  leg.car = car.uid;
  leg.leaving = car.where;
  drive(c, leg, from, aimOf(c, leg) ?? accessOf(c, home));
}

/**
 * The small hours inside a season: nobody is moved by hand. Cars still standing away with nobody to drive them
 * drive home by road; cars on the road, held at an exit or parked for a late stay carry on and get home on their
 * own; a car out of town (or inside a building) comes out of its home's door when next driven.
 */
export function smallHours(c: City): void {
  // Still on the road at night (a jam since the evening): it carries on home by road, never into a building.
  const busy = busyCars(c);
  for (const list of c.day.chains.values()) for (const ch of list) driveHome(c, ch, busy);
  for (const list of c.day.chains.values()) for (const ch of list) ch.now = ch.stops.length + 1;
}
