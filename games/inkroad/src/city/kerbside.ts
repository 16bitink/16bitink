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
import { freeSlots, roadSlots, sAlong, sideHeading } from './slots';
import { pointAt } from '../sim/geom';
import { halfWidth, laneOffset, lanesPerLink } from '../sim/roadGeom';
import { R_MIN } from '../sim/kinematics';
import { DRIVEWAY } from '../sim/tune';
import { KERB_OUT } from './movePlan';
import type { Road } from '../sim/types';
import { polyLength } from './geometry';
import { sizeOf } from '../sim/vehicleSize';
import { MOTION_SWITCHES } from '../sim/switches';
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

/** The open map gate nearest a point (a taxi's base), or null. With a heading, only gates ahead of it count when there are any. */
export function nearestGate(c: City, at: { readonly x: number; readonly y: number }, a?: number): Place | null {
  let best: Place | null = null;
  let d = Infinity;
  const ahead = (j: { readonly x: number; readonly y: number }): boolean => a === undefined || (j.x - at.x) * Math.cos(a) + (j.y - at.y) * Math.sin(a) > 0;
  const open = c.net.junctions.filter((j) => j.gate && accessExists(c.net, { gate: j.id }));
  const pool = open.some(ahead) ? open.filter(ahead) : open;
  for (const j of pool) {
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
  // A car stopped on the road drives on the way it faces (to the nearest gate ahead), never turning round in the street.
  const gate = nearestGate(c, accessPoint(c, from), facingOf(c, e));
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
  // A taxi pulls to the kerb (where the sim draws it stopping): it stands there, never back out into the lane.
  stopOnRoad(c, e, c.traffic.poseOf(a.uid), true);
  finish(c, leg, a.uid, e, hold, road ?? undefined);
  if (rider) {
    // Their ride starts at the kerb: the taxi's way there is the taxi's, as when taxis came out of the door.
    const ride: Leg = { ...rider, start: c.clock, leaving: e };
    drive(c, ride, e ? standingAccess(c, e) : road ?? accessOf(c, leg.target), accessOf(c, rider.tour.from));
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
  // It stood in the lane: onto the shoulder ahead of it with a forward S.
  stopOnRoad(c, e, pose ?? { x: a.at.x, y: a.at.y, a: a.a ?? 0 }, true);
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


/**
 * A car stopped on the road (double): it stands where it really is. In the lane (`shoulder` false: double parking, a
 * pump queue) it is the middle of its outer lane; on the shoulder (a taxi at the kerb, a driver who gave up) the line
 * the sim draws a car arriving at, or leaving, the kerb (DRIVEWAY.slide outside the lane). When the car is drawn
 * elsewhere across the road, its place is a forward S ahead of it, never beside it (no sideways step, no reversing).
 */
export function stopOnRoad(c: City, e: Standing | null, pose: { readonly x: number; readonly y: number; readonly a: number } | null, shoulder: boolean): void {
  const road = e && e.s !== undefined ? c.net.roads.find((r) => r.id === e.spot.id) : undefined;
  if (!e || !road || !pose || e.s === undefined) return;
  const side = sideHeading(road, e.s, pose.a);
  const p = pointAt(road.line, e.s);
  const here = (pose.x - p.x) * -Math.sin(p.heading) + (pose.y - p.y) * Math.cos(p.heading);
  const lane = road.oneWay ? laneOffset(road, side > 0 ? lanesPerLink(road) - 1 : 0) : side * laneOffset(road, lanesPerLink(road) - 1);
  // The shoulder is the paved edge at most (the owner, phase B: a car stops in its lane, a little toward the kerb at
  // most; parked cars stand in the kerb's band beyond it).
  const edge = Math.max(0, halfWidth(road) - Math.abs(lane) - sizeOf(e.kind).wid / 2 - EDGE_GAP);
  // A taxi or a driver pulling over where the kerb is free pulls right in to the kerb, out of the lane (a forward S);
  // otherwise (double parking, a full kerb) it stops in its lane hugging the parked row (the paved edge), straight.
  const kerbLat = halfWidth(road) + KERB_OUT;
  const inKerb = shoulder && !road.oneWay && (road.kerb || road.type === 'street') && kerbFree(c, road, side, sAlong(road, pose), sizeOf(e.kind).len) && clearAhead(c, pose, sizeOf(e.kind).len);
  const lat = inKerb ? side * kerbLat : lane + side * Math.min(DRIVEWAY.slide, edge);
  const d = Math.abs(lat - here);
  const run = d < SAME_LINE ? 0 : 2 * R_MIN * Math.sin(d >= 2 * R_MIN ? Math.PI / 2 : Math.acos(1 - d / (2 * R_MIN))) + S_ROOM;
  // From where it really is (not the stand-in's spacing), and never onto a car already standing on that line ahead.
  let at = sAlong(road, pose) + side * run;
  const room = sizeOf(e.kind).len + S_ROOM;
  for (const o of e.spot.cars) {
    if (o === e || o.s === undefined || o.lat === undefined || o.side !== side || Math.abs(o.lat - lat) > SAME_LANE) continue;
    if (Math.abs(o.s - at) < (room + sizeOf(o.kind).len) / 2) at = o.s - side * (room + sizeOf(o.kind).len) / 2;
  }
  // No room for the S before a junction's corner: it stands where it stopped (the S would end on the junction).
  const len = polyLength(road.line);
  const room2 = at >= ROAD_END && at <= len - ROAD_END;
  e.s = room2 ? at : sAlong(road, pose);
  e.side = side;
  e.lat = room2 ? lat : here;
  e.shoulder = shoulder;
  e.spot.ver += 1;
}

/** Is the kerb on `side` free of standing cars along `len` px ahead of s (and a little behind)? */
function kerbFree(c: City, road: Road, side: number, s: number, len: number): boolean {
  for (const spot of c.day.spots.values()) {
    if ((spot.kind !== 'kerb' && spot.kind !== 'street' && spot.kind !== 'double') || spot.id !== road.id) continue;
    for (const o of spot.cars) {
      const os = o.s ?? (spot.kind !== 'double' ? roadSlots(c, spot)[o.slot]?.s : undefined);
      const oside = o.side ?? (spot.kind !== 'double' ? roadSlots(c, spot)[o.slot]?.side : undefined);
      if (os === undefined || oside !== side || (spot.kind === 'double' && !o.shoulder)) continue;
      if (Math.abs(os - (s + side * KERB_REACH)) < len + KERB_REACH) return false;
    }
  }
  return true;
}
/** No car on the road in the stretch ahead its forward S to the kerb sweeps (a car stuck in a queue stays in its lane). */
function clearAhead(c: City, pose: { readonly x: number; readonly y: number; readonly a: number }, len: number): boolean {
  const t = c.traffic.cars;
  for (let i = 0; i < t.count; i++) {
    if (t.alive[i] !== 1) continue;
    const dx = t.x[i]! - pose.x, dy = t.y[i]! - pose.y;
    const along = dx * Math.cos(pose.a) + dy * Math.sin(pose.a), lat = -dx * Math.sin(pose.a) + dy * Math.cos(pose.a);
    if (along > 1 && along < KERB_REACH + len && Math.abs(lat) < 6) return false;
  }
  return true;
}

/** Px ahead of where it stops that a car pulling in to the kerb uses (its forward S). */
const KERB_REACH = 30;

/** Px a car on the shoulder keeps from the paved edge. */
const EDGE_GAP = 0.3;
/** Px sideways under which a car already stands on its line; px of room past a forward S. */
const SAME_LINE = 0.5;
const S_ROOM = 2;
/** Px sideways within which two stopped cars share a line. */
const SAME_LANE = 6;
/** Px from a road's end a stopped car keeps clear (the renderer's JUNCTION_CLEAR). */
const ROAD_END = 36;

/** The heading of a car standing on the road (its side of the road line), if it stands on one. */
function facingOf(c: City, e: Standing): number | undefined {
  const road = e.spot.kind === 'double' && e.s !== undefined && e.side !== undefined && e.lat !== undefined ? c.net.roads.find((r) => r.id === e.spot.id) : undefined;
  return road && e.s !== undefined ? pointAt(road.line, e.s).heading + (e.side! < 0 ? Math.PI : 0) : undefined;
}
