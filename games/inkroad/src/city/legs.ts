import { STEP, TRIPS_PER_CAR } from '../sim/constants';
import { dayKindAt, NIGHT_END, WEEKEND_AT } from './clock';
import { carById, standCar } from './households';
import { arrivedAt, carAt, endOfTrip, goOn, homeOf, homeward, lastDeparture, leaveBy, queueAtPump, refuel } from './hops';
import { stand, unstand } from './stand';
import type { Access, Arrival, SpawnRequest } from '../sim/trafficTypes';
import type { Pt, VehicleKind } from '../sim/types';
import { periodAt } from './clock';
import type { Leg, Place, Spot, Standing, Tour } from './day';
import { lotById, emit, has, type City } from './state';
import { bank } from './money';
import { choices, freeSeconds, pickMode, type Choice } from './modes';
import { accessExists } from './net';
import { chooseSpot, isLegal, priceAt, roughSpot, walkCells } from './parking';
import { accessOf, pointOf } from './places';
import { fareShare } from './rules/minibus';
import { scoreFine, scoreHomeCharge, scoreLost, scoreParking, scorePay, scorePricedOut, scoreTrip } from './score';
import { COST, DODGE, DOUBLE_PARK_SECONDS, SEARCH_TRIES, STOPS, WEATHER_PATIENCE } from './tune';
import { bestRide } from './transit';
import { placeKey } from './day';
import { catchChance, daring, doubleSpot, streetFine } from './fines';
export { catchChance, daring } from './fines';
import { aimAt, aimOf, arrivalSlot, backIn, crossClear, crossHold, holdFrom, holdOut, pulledOut, pullingOut, readyAtEdge, standingAccess, stoppedAt, turnIn } from './manoeuvre';
import { doorBack, doorGone, doorIn, doorReady, nearestDoor, needsDoor, type Look } from './door';
import { kindOf, legKind } from './vehicleKinds';
import { hasRoom } from './slots';
import { callTaxi, dropOff, isDropOff, pullOver, riderLost, sendAway, sendStraysAway, stopOnRoad, taxiArrive } from './kerbside';

const TINTS = 8;
const TRANSIT_FEEL = 0.64;
const HELD_LIMIT = 40;
/** Minutes' worth of charges that make staying home the price's doing, not the road's. */
const PRICED_AWAY = 6;
const MEMORY_NEW = 0.4;
/** Seconds a car waits for a pump when all four are busy. */
const PUMP_WAIT = 4;

export { kindOf } from './vehicleKinds';

export function newLeg(c: City, tour: Tour, out: boolean, pick: Choice): Leg {
  const [a, b] = out ? [tour.from, tour.to] : [tour.to, tour.from];
  const leg: Leg = {
    tour, out, mode: pick.mode, start: c.clock, free: freeSeconds(c, a, b) / c.weather.speed ** WEATHER_PATIENCE, tag: -1, spot: pick.spot, tried: [], paid: 0,
    lines: pick.lines, done: false, target: b, heldAt: -1, from: null, to: null, leaving: null, tolls: 0, car: null, uid: -1, parked: null, slot: -1,
  };
  return leg;
}

/** Try to put a leg's car on the road. False: the entry is full, try again. */
function enter(c: City, leg: Leg, from: Access, to: Access): boolean {
  const tag = leg.tag >= 0 ? leg.tag : c.day.legs.push(leg) - 1;
  leg.tag = tag;
  const car = carById(c, leg.car);
  const look = lookOf(c, leg);
  // A car in a space pulls out from its own slot, once its lane has a gap, and holds the lane while it does.
  // A car with none drawn comes out of the building's entrance the same way.
  const out = pullingOut(leg);
  const door = !out && needsDoor({ from } as SpawnRequest);
  const base: SpawnRequest = { from: out ? standingAccess(c, out) : from, to, ...look, value: leg.tour.value, tag };
  if (out && !readyAtEdge(c, out, base)) return false;
  const hold = out ? out.edge?.hold ?? holdOut(out.spot) : 0;
  const req: SpawnRequest = hold > 0 ? { ...base, hold } : base;
  if (out && !crossClear(c, out)) return false;
  if (door && !doorReady(c, leg, req, look)) return false;
  const uid = c.traffic.spawn(req);
  if (uid < 0) return false;
  leg.uid = uid;
  if (out) { crossHold(c, out); pulledOut(c, uid, out, holdFrom(c, uid, out, hold)); }
  if (door) doorGone(c, leg, uid);
  c.day.drawn[dayKindAt(c.clock)] += 1;
  releaseSpot(c, leg);
  if (car) { car.where = null; car.away = false; car.leg = leg; }
  return true;
}

/** Leave by road; wait at the kerb when the road is full. */
export function drive(c: City, leg: Leg, from: Access | null, to: Access | null): void {
  if (leg.car !== null && leg.leaving === null) leg.leaving = carById(c, leg.car)?.where ?? null;
  if (!from || !to || !accessExists(c.net, from) || !accessExists(c.net, to)) { lose(c, leg); return; }
  leg.from = from;
  leg.to = to;
  if (enter(c, leg, from, to)) return;
  leg.heldAt = c.clock;
  c.day.waiting.push(leg);
}

function lose(c: City, leg: Leg): void {
  leg.done = true;
  scoreLost(c, leg, pointOf(c, leg.out ? leg.tour.from : leg.tour.to), 'gaveUp');
}

/** A car turning in, or leaving its slot for the lane edge, moves on by the step; the rest (a car waiting for a moving neighbour too) try every RETRY_EVERY. */
const onTheMove = (c: City, leg: Leg): boolean => {
  const e = pullingOut(leg);
  return !!leg.door || (!!e && (!!e.edge || (e.readyAt ?? -Infinity) >= c.clock - STEP));
};

/** How a leg's car looks: a household's own, or one picked by the tour. */
export function lookOf(c: City, leg: Leg): Look {
  const car = carById(c, leg.car);
  return car ? { kind: car.kind, tint: car.tint } : { kind: kindOf(leg.tour, leg.mode), tint: Math.floor(leg.tour.seed * TINTS * 97) % TINTS };
}

/** Cars held up at home or in a car park try again. A car already at the lane edge waits there for its gap. */
export function retryWaiting(c: City, all: boolean): void {
  if (c.day.waiting.length === 0) return;
  const still: Leg[] = [];
  for (const leg of c.day.waiting) {
    if (!all && !onTheMove(c, leg)) { still.push(leg); continue; }
    const ok = leg.from && leg.to && accessExists(c.net, leg.from) && accessExists(c.net, leg.to);
    if (!ok || (c.clock - leg.heldAt > HELD_LIMIT && !pullingOut(leg)?.edge && !leg.door)) { lose(c, leg); giveUpLeaving(c, leg); continue; }
    if (enter(c, leg, leg.from!, leg.to!)) continue;
    still.push(leg);
  }
  c.day.waiting = still;
}

/** A held car that gives up its trip goes back where it stood: into its slot, or back inside. */
function giveUpLeaving(c: City, leg: Leg): void {
  doorBack(c, leg, lookOf(c, leg));
  const e = pullingOut(leg);
  // A visitor's car (a lorry, a taxi) has nobody else to drive it: it tries again in a while.
  if (e) { backIn(c, e); leg.leaving = null; if (e.household === undefined) sendAway(c, e, leg.tour, HELD_LIMIT); return; }
  releaseSpot(c, leg);
}

function releaseSpot(c: City, leg: Leg): void {
  if (!leg.leaving) return;
  unstand(c, leg.leaving);
  leg.leaving = null;
}

/** Someone is ready to leave: choose how, and go. */
export function startTour(c: City, tour: Tour): void {
  const list = choices(c, tour, c.clock);
  const pick = pickMode(list, tour.seed);
  if (!pick) return;
  const leg = newLeg(c, tour, true, pick);
  const ch = tour.chain;
  if (ch && (pick.mode === 'car' || pick.mode === 'ride')) leg.car = ch.car; else if (ch) ch.car = null;
  if (ch) ch.now = tour.stop ?? 0;
  const dear = list.find((x) => x.mode === 'car')?.coins ?? 0;
  if (pick.mode !== 'car' && dear > 0) scorePricedOut(c, leg, dear);
  if (pick.mode === 'stay') { leg.done = true; if (ch) ch.now = ch.stops.length + 1; if (ch?.kind === 'weekend') return; if (dear * COST.minPerCoin < PRICED_AWAY) scoreLost(c, leg, pointOf(c, tour.from), 'stayed'); return; }
  if (pick.mode === 'transit' || pick.mode === 'walk') { offRoad(c, leg, pick); stayThere(c, leg, null, null); return; }
  const go = refuel(c, leg);
  drive(c, go, carAt(c, go) ?? accessOf(c, go.tour.from), aimOf(c, go) ?? accessOf(c, go.tour.to));
}

/** A trip that isn't drawn: on foot, or a seat on a line. */
export function offRoad(c: City, leg: Leg, pick: Choice): void {
  leg.done = true;
  const feel = leg.mode === 'walk' ? Math.min(pick.seconds, leg.free) : pick.seconds * TRANSIT_FEEL;
  scoreTrip(c, leg, feel);
  if (leg.mode === 'walk') { scorePay(c, leg, 0); return; }
  board(c, leg, pick.lines);
  scorePay(c, leg, c.prices.fare * pick.lines.length);
}

function board(c: City, leg: Leg, lines: readonly number[]): void {
  const s = c.day.stats;
  s.transit += 1;
  s.riders += TRIPS_PER_CAR;
  for (const id of lines) {
    const key = `${id}:${periodAt(c.clock)}`;
    s.lineLoad.set(key, (s.lineLoad.get(key) ?? 0) + 1);
    s.lineRiders.set(id, (s.lineRiders.get(id) ?? 0) + TRIPS_PER_CAR);
    bank(c, 'fares', c.prices.fare * (has(c, 'tap') ? 1.2 : 1) * fareShare(c, id), pointOf(c, leg.out ? leg.tour.from : leg.tour.to));
  }
}

export function stayThere(c: City, leg: Leg, spot: Spot | null, from: Access | null): void {
  const t = leg.tour;
  if (t.purpose === 'through') return;
  if (t.chain) arrivedAt(c, leg);
  // A driver who stood in the lane for a gap across the road still stays as long once in.
  const wish = Math.max(c.clock + (leg.parked?.crossWait ?? 0) + t.stay, t.until ?? 0);
  const by = leaveBy(c, leg);
  const until = by === null ? wish : Math.min(wish, by);
  c.day.stays.push({ leg, until: Math.max(until, c.clock + 2), spot, from, parked: leg.parked });
}

/** The stay is over: home again, the way they came. */
export function leaveAll(c: City): void {
  const due = c.day.stays.filter((s) => s.until <= c.clock);
  if (due.length === 0) return;
  c.day.stays = c.day.stays.filter((s) => s.until > c.clock);
  for (const s of due) {
    // A household's day that ran past its last departure: no more stops, but the car still goes home by road.
    if (c.clock > lastDeparture(s.leg.tour) || !goOn(c, s)) goHome(c, s.leg, s.spot, s.from, s.parked);
  }
}

/** Where a car standing at `spot` (or held in the lane at `from`) sets off. */
export const startOf = (c: City, from: Access | null, spot: Spot | null, here: Place): Access | null =>
  (from && accessExists(c.net, from) ? from : spot && accessExists(c.net, spot.access) ? spot.access : accessOf(c, here));

function goHome(c: City, was: Leg, spot: Spot | null, from: Access | null, parked: Standing | null): void {
  const came = homeward(was);
  const t = came.tour;
  const base: Choice = { mode: came.mode, minutes: 0, seconds: 0, coins: 0, spot: null, lines: came.lines };
  const leg = newLeg(c, t, false, base);
  if (came.mode === 'walk') { offRoad(c, leg, { ...base, seconds: leg.free }); return; }
  if (came.mode === 'transit') { rideHome(c, leg, base); return; }
  if (came.mode === 'ride') { c.day.stats.transit += 1; board(c, leg, came.lines); }
  if (came.mode === 'taxi' && callTaxi(c, leg)) return;
  const dest = chooseHome(c, t.from);
  leg.spot = dest;
  leg.leaving = parked;
  leg.car = was.car;
  const go = refuel(c, leg);
  const start = startOf(c, from, spot, t.to);
  drive(c, go, start, (t.purpose === 'truck' || leg.mode === 'taxi' ? null : aimOf(c, go)) ?? accessOf(c, go === leg ? t.from : go.tour.to));
}

export const chooseHome = (c: City, p: Place): Spot | null => ('lot' in p ? chooseSpot(c, p, c.clock, true, []) : null);

function rideHome(c: City, leg: Leg, base: Choice): void {
  const ride = bestRide(c, pointOf(c, leg.tour.to), pointOf(c, leg.tour.from), periodAt(c.clock));
  if (ride) { offRoad(c, leg, { ...base, seconds: ride.seconds + ride.wait + ride.walk * COST.walkPerCell + ride.crowd, lines: ride.lines }); return; }
  const taxi: Leg = { ...leg, mode: 'taxi' };
  drive(c, taxi, accessOf(c, leg.tour.to), accessOf(c, leg.tour.from));
}

// ---------------------------------------------------------------- arriving

function remember(c: City, leg: Leg, seconds: number): void {
  const [a, b] = leg.out ? [leg.tour.from, leg.tour.to] : [leg.tour.to, leg.tour.from];
  const key = `${placeKey(a)}>${placeKey(b)}`;
  const was = c.memory.get(key);
  c.memory.set(key, was === undefined ? seconds : was * (1 - MEMORY_NEW) + seconds * MEMORY_NEW);
}

/** The trip is over: the car turns into the place it now stands in, or leaves the road where it is (a gate, a driveway, a car park). */
export function finish(c: City, leg: Leg, uid: number, into: Standing | null = null, hold?: number, blockAt?: Access): void {
  leg.done = true;
  const inside = !into && doorIn(c, uid, leg, lookOf(c, leg));
  if (!inside) turnIn(c, uid, into, hold, blockAt);
  endOfTrip(c, leg);
  // A household car that went into a building (no space of its own drawn) is off the map until it is next driven.
  const car = inside ? carById(c, leg.car) : undefined;
  if (car && !car.where) car.away = true;
}

export function arrive(c: City, a: Arrival): void {
  const leg = c.day.legs[a.tag];
  if (a.tag < 0 || !leg || leg.done) { if (a.tag >= 0) c.traffic.remove(a.uid); return; }
  if (leg.tolls < a.tolls) { bank(c, c.prices.zone > 0 ? 'zone' : 'tolls', a.tolls - leg.tolls, a.at); leg.tolls = a.tolls; }
  if (queueAtPump(c, leg)) { waitAtPump(c, leg, a); return; }
  // A taxi drops its rider at the door like any taxi; only a household car stands at the gate for the school run.
  if (isDropOff(leg) && leg.mode !== 'taxi') { dropOff(c, leg, a); return; }
  if (leg.mode === 'taxi' && 'lot' in leg.target) { taxiArrive(c, leg, a); return; }
  const drivesIn = 'gate' in leg.target || leg.mode === 'taxi';
  if (drivesIn) { completeTrip(c, leg, a); finish(c, leg, a.uid); if (leg.out) stayThere(c, leg, null, accessOf(c, leg.target)); return; }
  if (leg.spot && hasRoom(c, leg.spot, leg, legKind(c, leg))) {
    if (dodges(c, leg, leg.spot)) doublePark(c, leg, a, a.at); else park(c, leg, a, leg.spot);
    return;
  }
  if (leg.spot) leg.tried.push(leg.spot.key);
  const next = leg.tried.length < SEARCH_TRIES ? chooseSpot(c, leg.target, c.clock, !leg.out, leg.tried) : null;
  if (next && c.traffic.redirect(a.uid, aimAt(c, leg, next))) { leg.spot = next; return; }
  noSpace(c, leg, a);
}

/** Door to door, waiting at home for a gap included. */
export function completeTrip(c: City, leg: Leg, a: Arrival): number {
  if (leg.tour.deadhead) return 0;
  const seconds = c.clock - leg.start;
  scoreTrip(c, leg, seconds);
  remember(c, leg, seconds);
  const coins = a.tolls;
  if (leg.mode === 'taxi' || 'gate' in leg.target) scorePay(c, leg, coins);
  return coins;
}

function park(c: City, leg: Leg, a: Arrival, spot: Spot): void {
  const coins = completeTrip(c, leg, a);
  // Every visitor stands where it parked, in sight: nobody drives into a building.
  const closed = leg.car === null && !leg.tour.chain && c.clock >= WEEKEND_AT - STEP / 2 && c.clock < NIGHT_END;
  // Somebody home in a car that is not one of the household's drawn ones puts it in their own garage.
  const garage = !leg.out && leg.car === null && spot.kind === 'home';
  leg.parked = garage ? null : standHere(c, leg, a, spot, true, undefined, arrivalSlot(c, leg, spot, c.traffic.poseOf(a.uid)));
  finish(c, leg, a.uid, leg.parked);
  if (garage) spot.used += 1;
  if (spot.kind === 'street') streetFine(c, leg, a.at);
  const price = priceAt(c, spot, c.clock, !leg.out);
  if (price > 0) bank(c, 'parking', price, spot.at);
  if (!leg.out && price > 0) scoreHomeCharge(c, leg, price); else scorePay(c, leg, coins + price);
  const lot = 'lot' in leg.target ? lotById(c, leg.target.lot) : undefined;
  if (leg.mode === 'ride' && leg.out && !closed) { board(c, leg, leg.lines); scoreParking(c, leg, 'ok', 0); stayThere(c, leg, spot, null); return; }
  scoreParking(c, leg, isLegal(spot) ? 'ok' : 'illegal', lot && isLegal(spot) ? walkCells(lot, spot) : 0);
  // One who came after closing sets off again at once (its stay is over), by road like the rest.
  if (leg.out) stayThere(c, leg, spot, null);
}


/** Why pay, when nobody looks? */
function dodges(c: City, leg: Leg, spot: Spot): boolean {
  if (c.year < DODGE.year || leg.mode === 'ride') return false;
  const price = priceAt(c, spot, c.clock, !leg.out);
  return price > 0 && c.dice.next() < daring(c) * Math.min(DODGE.max, price * DODGE.perCoin);
}

/** Every place was full: double-park if they dare, or give the trip up. */
function noSpace(c: City, leg: Leg, a: Arrival): void {
  const at: Pt = a.at;
  const rough = roughSpot(c, leg.target, leg.tried);
  if (rough && c.traffic.redirect(a.uid, aimAt(c, leg, rough))) { leg.spot = rough; return; }
  if (leg.tour.purpose === 'truck' || c.dice.next() < daring(c) || !leg.out) { doublePark(c, leg, a, at); return; }
  scoreParking(c, leg, 'none', 0);
  const where = homeOf(leg.tour);
  const home = accessOf(c, where);
  const back: Choice = { mode: 'car', minutes: 0, seconds: 0, coins: 0, spot: chooseHome(c, where), lines: [] };
  if (home && c.traffic.redirect(a.uid, back.spot?.access ?? home)) {
    const leg2 = newLeg(c, homeward(leg).tour, false, back);
    leg2.car = leg.car;
    leg2.uid = leg.uid;
    if (leg.tour.chain) leg.tour.chain.now = leg.tour.chain.stops.length;
    leg2.tag = leg.tag;
    leg2.tolls = leg.tolls;
    leg.done = true;
    c.day.legs[leg.tag] = leg2;
    return;
  }
  doublePark(c, leg, a, at);
}

function doublePark(c: City, leg: Leg, a: Arrival, at: Pt): void {
  completeTrip(c, leg, a);
  scoreParking(c, leg, 'illegal', 0);
  c.day.stats.doubled += 1;
  const from = leg.spot ? stoppedAt(c, leg.spot, at) : accessOf(c, leg.target);
  const secs = DOUBLE_PARK_SECONDS * (has(c, 'tow') ? 0.45 : 1);
  // The car itself stops in the lane, blocking it, then edges onto the shoulder: the same car, never a stand-in.
  const road = from && 'road' in from && accessExists(c.net, from) ? from : null;
  leg.parked = road ? standHere(c, leg, a, doubleSpot(c, road.road), false, road.s) : null;
  stopOnRoad(c, leg.parked, c.traffic.poseOf(a.uid), false);
  finish(c, leg, a.uid, leg.parked, secs, road ?? undefined);
  if (c.prices.fine > 0 && c.dice.chance(catchChance(c))) {
    bank(c, 'fines', c.prices.fine, at);
    scoreFine(c, leg, at, c.prices.fine);
    emit(c, { t: 'fine', at, amount: c.prices.fine });
  }
  if (leg.out) stayThere(c, leg, null, from);
}

export function gaveUp(c: City, a: Arrival): void {
  const leg = c.day.legs[a.tag];
  if (a.tag < 0 || !leg || leg.done) return;
  leg.done = true;
  riderLost(c, leg, a.at);
  // It pulls onto the shoulder where it is; a household car is driven home from there, anybody else's drives off.
  const over = pullOver(c, leg, a);
  if (!over) doorIn(c, a.uid, leg, lookOf(c, leg), nearestDoor(c, a.at), { x: a.at.x, y: a.at.y, a: a.a ?? 0 });
  if (over && carById(c, leg.car)) { if (leg.tour.chain) leg.tour.chain.now = leg.tour.chain.stops.length; } else carHome(c, leg);
  if (over && leg.car === null) sendAway(c, over.e, leg.tour, DOUBLE_PARK_SECONDS);
  emit(c, { t: 'gaveUp', at: a.at });
  scoreLost(c, leg, a.at, 'gaveUp');
}

/** The car stops here: a household's keeps its own uid and look, anybody else's stands under its traffic uid. */
export function standHere(c: City, leg: Leg, a: Arrival, spot: Spot | null, counted: boolean, at?: number, slot?: number): Standing | null {
  if (!spot) return null;
  const car = carById(c, leg.car);
  if (car) return standCar(c, car, spot, counted, at, slot);
  return stand(c, spot, { uid: a.uid, tint: Math.floor(leg.tour.seed * TINTS * 97) % TINTS, kind: kindOf(leg.tour, leg.mode) }, counted, at, slot);
}

/** A household car whose trip ended badly pulled in at a building: off the map until it is next driven (never put home by hand). */
export function carHome(c: City, leg: Leg): void {
  const car = carById(c, leg.car);
  if (!car || car.where) return;
  car.leg = null;
  car.away = true;
  if (leg.tour.chain) leg.tour.chain.now = leg.tour.chain.stops.length + 1;
}

/** Every pump is busy: the car waits in the lane, and the queue stands on the road. */
function waitAtPump(c: City, leg: Leg, a: Arrival): void {
  completeTrip(c, leg, a);
  scoreParking(c, leg, 'ok', 0);
  const from = leg.spot?.access ?? accessOf(c, leg.target);
  const road = from && 'road' in from && accessExists(c.net, from) ? from : null;
  leg.parked = road ? standHere(c, leg, a, doubleSpot(c, road.road), false, road.s) : null;
  stopOnRoad(c, leg.parked, c.traffic.poseOf(a.uid), false);
  finish(c, leg, a.uid, leg.parked, PUMP_WAIT, road ?? undefined);
  arrivedAt(c, leg);
  c.day.stays.push({ leg, until: c.clock + leg.tour.stay + PUMP_WAIT, spot: null, from, parked: leg.parked });
}

/**
 * Midnight after the workday: every visitor still standing somewhere sets off now, by road (one held at a full
 * exit keeps waiting for its gap). Household cars are already on their way home.
 */
export function closeWorkday(c: City): void {
  const like = c.day.plan[0];
  if (like) sendStraysAway(c, like);
  c.day.stays = c.day.stays.map((s) => (s.leg.car !== null || s.leg.tour.chain ? s : { ...s, until: Math.min(s.until, c.clock) }));
}
