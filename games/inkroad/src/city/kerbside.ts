import { CELL } from '../sim/constants';
import { roadAt } from '../sim/netQuery';
import type { Access, Arrival } from '../sim/trafficTypes';
import type { Leg, Place, Spot, Standing, Tour } from './day';
import { distPt } from './geometry';
import { completeTrip, drive, finish, newLeg, stayThere, standHere } from './legs';
import { arrivalSlot, shoulderFrom, standingAccess } from './manoeuvre';
import { STOPS } from './tune';
import { accessExists } from './net';
import { doubleSpot } from './fines';
import { accessOf, accessPoint, pointOf } from './places';
import { scoreLost } from './score';
import { freeSlots, sAlong } from './slots';
import { legKind } from './vehicleKinds';
import type { City } from './state';
import type { Choice } from './modes';

/**
 * Cars that have no space of their own at a place never drive into its building (only multi-storey and underground
 * car parks are entered). A taxi stops at the kerb in front of the gate and drives off to the nearest map gate; a
 * taxi called for a ride home comes from that gate first. A car that gives up in a jam pulls onto the shoulder.
 */

/** Seconds a taxi stands at the kerb to let its rider out, or to take one in. */
export const TAXI_DROP = 3;
export const TAXI_PICK = 4;
/** Seconds a car that gave up stands in the lane before it edges onto the shoulder. */
const GAVE_UP_HOLD = 3;

const TAXI: Choice = { mode: 'taxi', minutes: 0, seconds: 0, coins: 0, spot: null, lines: [] };

/** The open map gate nearest a point (a taxi's base), or null. */
export function nearestGate(c: City, at: { readonly x: number; readonly y: number }): Place | null {
  let best: Place | null = null;
  let d = Infinity;
  for (const j of c.net.junctions) {
    if (!j.gate || !accessExists(c.net, { gate: j.id })) continue;
    const e = distPt({ x: j.x, y: j.y }, at);
    if (e < d) { d = e; best = { gate: j.id }; }
  }
  return best;
}

/** A trip nobody makes for themselves (a taxi to or from its base): it is not judged, paid or remembered. */
const emptyTour = (from: Place, to: Place, like: Tour): Tour => ({
  id: -1, from, to, purpose: 'through', leave: 0, until: null, stay: 0, owns: false, value: like.value, seed: like.seed, deadhead: true,
});

const kerbOf = (c: City, p: Place): Extract<Access, { road: number }> | null => {
  const a = accessOf(c, p);
  return a && 'road' in a && accessExists(c.net, a) ? a : null;
};

/** After `hold` seconds where it stands, a car with nobody to wait for drives off by road to the nearest gate. */
export function sendAway(c: City, e: Standing, like: Tour, hold: number): void {
  const from = standingAccess(c, e);
  const gate = nearestGate(c, accessPoint(c, from));
  if (!gate) return;
  const away = newLeg(c, emptyTour(gate, gate, like), true, TAXI);
  c.day.stays.push({ leg: away, until: c.clock + hold + 1, spot: null, from, parked: e });
}

/** Cars standing in the lane or on the shoulder that nobody will drive (a taxi whose rider gave up): off they go. */
export function sendStraysAway(c: City, like: Tour): void {
  const going = new Set([...c.day.stays.map((s) => s.parked), ...c.day.waiting.map((l) => l.leaving)]);
  for (const s of c.day.spots.values()) {
    if (s.kind !== 'double') continue;
    for (const e of s.cars) if (e.household === undefined && !going.has(e)) sendAway(c, e, like, 0);
  }
}

/** A taxi at a lot: it stops at the kerb in front of the gate, its rider gets out (or in), and it drives on. */
export function taxiArrive(c: City, leg: Leg, a: Arrival): void {
  completeTrip(c, leg, a);
  const road = kerbOf(c, leg.target);
  const rider = leg.then;
  const hold = rider ? TAXI_PICK : TAXI_DROP;
  const e = road ? standHere(c, leg, a, doubleSpot(c, road.road), false, road.s) : null;
  finish(c, leg, a.uid, e, hold, road ?? undefined);
  if (rider) {
    // Their ride starts at the kerb: the taxi's way there is the taxi's, as when taxis came out of the door.
    const ride: Leg = { ...rider, start: c.clock, leaving: e };
    drive(c, ride, road ?? accessOf(c, leg.target), accessOf(c, rider.tour.from));
    return;
  }
  if (leg.out) stayThere(c, leg, null, accessOf(c, leg.target));
  if (e && !leg.tour.deadhead) sendAway(c, e, leg.tour, hold);
}

/** A ride home by taxi from a lot: the taxi comes from the nearest gate first. False: no gate, the old way. */
export function callTaxi(c: City, rider: Leg): boolean {
  const at = rider.tour.to;
  if (!('lot' in at) || rider.tour.deadhead || !kerbOf(c, at)) return false;
  const gate = nearestGate(c, pointOf(c, at));
  if (!gate) return false;
  const pick = newLeg(c, emptyTour(gate, at, rider.tour), true, TAXI);
  pick.then = rider;
  drive(c, pick, accessOf(c, gate), accessOf(c, at));
  return true;
}

/** A car that gave up in a jam pulls over where it is: stopped in the lane a moment, then on the shoulder. Null: no road here. */
export function pullOver(c: City, leg: Leg, a: Arrival): { readonly e: Standing; readonly road: Access } | null {
  const road = roadAt(c.net, { gx: a.at.x / CELL, gy: a.at.y / CELL });
  if (!road) return null;
  const at: Access = { road: road.id, s: sAlong(road, a.at) };
  const e = standHere(c, leg, a, doubleSpot(c, road.id), false, at.s);
  if (!e) return null;
  const pose = c.traffic.poseOf(a.uid);
  finish(c, leg, a.uid, e, GAVE_UP_HOLD, at);
  // The traffic may have let the car go already: it is shown stopping where it was last drawn all the same.
  if (!pose) shoulderFrom(c, e, { x: a.at.x, y: a.at.y, a: a.a ?? 0 }, GAVE_UP_HOLD);
  return { e, road: at };
}

/** A taxi sent to fetch somebody gave up: they never got their ride. */
export function riderLost(c: City, leg: Leg, at: { readonly x: number; readonly y: number }): void {
  const rider = leg.then;
  if (!rider || rider.done) return;
  rider.done = true;
  const ch = rider.tour.chain;
  if (ch) ch.now = ch.stops.length + 1;
  scoreLost(c, rider, at, 'gaveUp');
}

/** A school run stops at the gate for a moment: no space is looked for, none is taken. */
export const isDropOff = (leg: Leg): boolean => {
  const stop = leg.out ? leg.tour.chain?.stops[leg.tour.stop ?? -1] : undefined;
  return !!stop && (stop.kind === 'school' || stop.kind === 'nursery') && stop.stay <= STOPS.drop;
};

export function dropOff(c: City, leg: Leg, a: Arrival): void {
  completeTrip(c, leg, a);
  const kind = legKind(c, leg);
  const room = (s: Spot | null | undefined): Spot | null => (s && freeSlots(c, s, leg, kind).length > 0 ? s : null);
  const place = room('lot' in leg.target ? c.day.spots.get(`lot:${leg.target.lot}`) : null) ?? room(leg.spot);
  // Every bay taken: the car stops in the lane by the gate for the drop, like a taxi.
  if (!place && stopInLane(c, leg, a)) return;
  leg.parked = standHere(c, leg, a, place, false, undefined, place ? arrivalSlot(c, leg, place, c.traffic.poseOf(a.uid)) : undefined);
  finish(c, leg, a.uid, leg.parked);
  stayThere(c, leg, place, place ? null : accessOf(c, leg.target));
}

/** A drop-off with no bay free: it stands in the lane where it stopped, then edges onto the shoulder. */
function stopInLane(c: City, leg: Leg, a: Arrival): boolean {
  const over = pullOver(c, leg, a);
  if (!over) return false;
  leg.parked = over.e;
  stayThere(c, leg, over.e.spot, null);
  return true;
}

