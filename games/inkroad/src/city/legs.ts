import { TRIPS_PER_CAR } from '../sim/constants';
import type { Access, Arrival, SpawnRequest } from '../sim/trafficTypes';
import type { Pt, VehicleKind } from '../sim/types';
import { periodAt } from './clock';
import type { Leg, Place, Spot, Tour } from './day';
import { lotById, emit, has, type City } from './state';
import { bank } from './money';
import { choices, freeSeconds, pickMode, type Choice } from './modes';
import { accessExists } from './net';
import { chooseSpot, priceAt, walkCells } from './parking';
import { accessOf, pointOf } from './places';
import { fareShare } from './rules/minibus';
import { scoreFine, scoreHomeCharge, scoreLost, scoreParking, scorePay, scorePricedOut, scoreTrip } from './score';
import { CATCH_RATE, COST, DODGE, DOUBLE_PARK_SECONDS, LAST_DEPARTURE, SEARCH_TRIES, WEATHER_PATIENCE } from './tune';
import { bestRide } from './transit';
import { placeKey } from './day';

const TINTS = 8;
const VAN_SHARE = 0.12;
const TRANSIT_FEEL = 0.64;
const HELD_LIMIT = 40;
/** Minutes' worth of charges that make staying home the price's doing, not the road's. */
const PRICED_AWAY = 6;
const MEMORY_NEW = 0.4;

const kindOf = (t: Tour, mode: Leg['mode']): VehicleKind => (mode === 'taxi' ? 'taxi' : t.purpose === 'truck' ? 'truck' : t.seed < VAN_SHARE ? 'van' : 'car');

function newLeg(c: City, tour: Tour, out: boolean, pick: Choice): Leg {
  const [a, b] = out ? [tour.from, tour.to] : [tour.to, tour.from];
  const leg: Leg = {
    tour, out, mode: pick.mode, start: c.clock, free: freeSeconds(c, a, b) / c.weather.speed ** WEATHER_PATIENCE, tag: -1, spot: pick.spot, tried: [], paid: 0,
    lines: pick.lines, done: false, target: b, heldAt: -1, from: null, to: null, leaving: null, tolls: 0,
  };
  return leg;
}

/** Try to put a leg's car on the road. False: the entry is full, try again. */
function enter(c: City, leg: Leg, from: Access, to: Access): boolean {
  const tag = leg.tag >= 0 ? leg.tag : c.day.legs.push(leg) - 1;
  leg.tag = tag;
  const req: SpawnRequest = { from, to, kind: kindOf(leg.tour, leg.mode), tint: Math.floor(leg.tour.seed * TINTS * 97) % TINTS, value: leg.tour.value, tag };
  return c.traffic.spawn(req) >= 0;
}

/** Leave by road; wait at the kerb when the road is full. */
export function drive(c: City, leg: Leg, from: Access | null, to: Access | null): void {
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

/** Cars held up at home or in a car park try again. */
export function retryWaiting(c: City): void {
  if (c.day.waiting.length === 0) return;
  const still: Leg[] = [];
  for (const leg of c.day.waiting) {
    const ok = leg.from && leg.to && accessExists(c.net, leg.from) && accessExists(c.net, leg.to);
    if (!ok || c.clock - leg.heldAt > HELD_LIMIT) { lose(c, leg); releaseSpot(leg); continue; }
    if (enter(c, leg, leg.from!, leg.to!)) { releaseSpot(leg); continue; }
    still.push(leg);
  }
  c.day.waiting = still;
}

function releaseSpot(leg: Leg): void {
  if (!leg.leaving) return;
  leg.leaving.used = Math.max(0, leg.leaving.used - 1);
  leg.leaving = null;
}

/** Someone is ready to leave: choose how, and go. */
export function startTour(c: City, tour: Tour): void {
  const list = choices(c, tour, c.clock);
  const pick = pickMode(list, tour.seed);
  if (!pick) return;
  const leg = newLeg(c, tour, true, pick);
  const dear = list.find((x) => x.mode === 'car')?.coins ?? 0;
  if (pick.mode !== 'car' && dear > 0) scorePricedOut(c, leg, dear);
  if (pick.mode === 'stay') { leg.done = true; if (dear * COST.minPerCoin < PRICED_AWAY) scoreLost(c, leg, pointOf(c, tour.from), 'stayed'); return; }
  if (pick.mode === 'transit' || pick.mode === 'walk') { offRoad(c, leg, pick); stayThere(c, leg, null, null); return; }
  drive(c, leg, accessOf(c, tour.from), pick.spot?.access ?? accessOf(c, tour.to));
}

/** A trip that isn't drawn: on foot, or a seat on a line. */
function offRoad(c: City, leg: Leg, pick: Choice): void {
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

function stayThere(c: City, leg: Leg, spot: Spot | null, from: Access | null): void {
  const t = leg.tour;
  if (t.purpose === 'through') return;
  const until = Math.max(c.clock + t.stay, t.until ?? 0);
  c.day.stays.push({ leg, until: Math.max(until, c.clock + 2), spot, from });
}

/** The stay is over: home again, the way they came. */
export function leaveAll(c: City): void {
  const due = c.day.stays.filter((s) => s.until <= c.clock);
  if (due.length === 0) return;
  c.day.stays = c.day.stays.filter((s) => s.until > c.clock);
  for (const s of due) {
    if (c.clock > LAST_DEPARTURE) continue; // they stay over
    goHome(c, s.leg, s.spot, s.from);
  }
}

function goHome(c: City, came: Leg, spot: Spot | null, from: Access | null): void {
  const t = came.tour;
  const base: Choice = { mode: came.mode, minutes: 0, seconds: 0, coins: 0, spot: null, lines: came.lines };
  const leg = newLeg(c, t, false, base);
  if (came.mode === 'walk') { offRoad(c, leg, { ...base, seconds: leg.free }); return; }
  if (came.mode === 'transit') { rideHome(c, leg, base); return; }
  if (came.mode === 'ride') { c.day.stats.transit += 1; board(c, leg, came.lines); }
  const dest = chooseHome(c, t.from);
  leg.spot = dest;
  leg.leaving = spot;
  const start = from && accessExists(c.net, from) ? from : spot && accessExists(c.net, spot.access) ? spot.access : accessOf(c, t.to);
  drive(c, leg, start, (t.purpose === 'truck' || leg.mode === 'taxi' ? null : dest?.access) ?? accessOf(c, t.from));
  if (leg.heldAt < 0) releaseSpot(leg);
}

const chooseHome = (c: City, p: Place): Spot | null => ('lot' in p ? chooseSpot(c, p, c.clock, true, []) : null);

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

function finish(c: City, leg: Leg, uid: number): void {
  leg.done = true;
  c.traffic.remove(uid);
}

export function arrive(c: City, a: Arrival): void {
  const leg = c.day.legs[a.tag];
  if (a.tag < 0 || !leg || leg.done) { if (a.tag >= 0) c.traffic.remove(a.uid); return; }
  if (leg.tolls < a.tolls) { bank(c, c.prices.zone > 0 ? 'zone' : 'tolls', a.tolls - leg.tolls, a.at); leg.tolls = a.tolls; }
  const drivesIn = 'gate' in leg.target || leg.mode === 'taxi' || leg.tour.purpose === 'truck';
  if (drivesIn) { completeTrip(c, leg, a); finish(c, leg, a.uid); if (leg.out) stayThere(c, leg, null, accessOf(c, leg.target)); return; }
  if (leg.spot && leg.spot.used < leg.spot.spaces) {
    if (dodges(c, leg, leg.spot)) doublePark(c, leg, a, a.at); else park(c, leg, a, leg.spot);
    return;
  }
  if (leg.spot) leg.tried.push(leg.spot.key);
  const next = leg.tried.length < SEARCH_TRIES ? chooseSpot(c, leg.target, c.clock, !leg.out, leg.tried) : null;
  if (next && c.traffic.redirect(a.uid, next.access)) { leg.spot = next; return; }
  noSpace(c, leg, a);
}

/** Door to door, waiting at home for a gap included. */
function completeTrip(c: City, leg: Leg, a: Arrival): number {
  const seconds = c.clock - leg.start;
  scoreTrip(c, leg, seconds);
  remember(c, leg, seconds);
  const coins = a.tolls;
  if (leg.mode === 'taxi' || 'gate' in leg.target) scorePay(c, leg, coins);
  return coins;
}

function park(c: City, leg: Leg, a: Arrival, spot: Spot): void {
  const coins = completeTrip(c, leg, a);
  finish(c, leg, a.uid);
  spot.used += 1;
  const price = priceAt(c, spot, c.clock, !leg.out);
  if (price > 0) bank(c, 'parking', price, spot.at);
  if (!leg.out && price > 0) scoreHomeCharge(c, leg, price); else scorePay(c, leg, coins + price);
  const lot = 'lot' in leg.target ? lotById(c, leg.target.lot) : undefined;
  if (leg.mode === 'ride' && leg.out) { board(c, leg, leg.lines); scoreParking(c, leg, 'ok', 0); stayThere(c, leg, spot, null); return; }
  scoreParking(c, leg, 'ok', lot ? walkCells(lot, spot) : 0);
  if (leg.out) stayThere(c, leg, spot, null);
}

/** Chance an inspector sees a badly parked car. */
export const catchChance = (c: City): number => 1 - Math.exp(-CATCH_RATE * c.policies.inspectors * (has(c, 'scancars') ? 2 : 1));
const FINE_FEAR = 0.35;
export const daring = (c: City): number => COST.doublePark * (has(c, 'drones') ? 0.65 : 1) * Math.exp(-catchChance(c) * c.prices.fine * FINE_FEAR);

/** Why pay, when nobody looks? */
function dodges(c: City, leg: Leg, spot: Spot): boolean {
  if (c.year < DODGE.year || leg.mode === 'ride') return false;
  const price = priceAt(c, spot, c.clock, !leg.out);
  return price > 0 && c.dice.next() < daring(c) * Math.min(DODGE.max, price * DODGE.perCoin);
}

/** Every place was full: double-park if they dare, or give the trip up. */
function noSpace(c: City, leg: Leg, a: Arrival): void {
  const at: Pt = a.at;
  if (c.dice.next() < daring(c) || !leg.out) { doublePark(c, leg, a, at); return; }
  scoreParking(c, leg, 'none', 0);
  const home = accessOf(c, leg.tour.from);
  const back: Choice = { mode: 'car', minutes: 0, seconds: 0, coins: 0, spot: chooseHome(c, leg.tour.from), lines: [] };
  if (home && c.traffic.redirect(a.uid, back.spot?.access ?? home)) {
    const leg2 = newLeg(c, leg.tour, false, back);
    leg2.tag = leg.tag;
    leg2.tolls = leg.tolls;
    leg.done = true;
    c.day.legs[leg.tag] = leg2;
    return;
  }
  finish(c, leg, a.uid);
}

function doublePark(c: City, leg: Leg, a: Arrival, at: Pt): void {
  completeTrip(c, leg, a);
  finish(c, leg, a.uid);
  scoreParking(c, leg, 'illegal', 0);
  c.day.stats.doubled += 1;
  const from = leg.spot?.access ?? accessOf(c, leg.target);
  const secs = DOUBLE_PARK_SECONDS * (has(c, 'tow') ? 0.45 : 1);
  if (from && 'road' in from && accessExists(c.net, from)) c.traffic.block(from, secs, 2);
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
  emit(c, { t: 'gaveUp', at: a.at });
  scoreLost(c, leg, a.at, 'gaveUp');
}
