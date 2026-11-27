import type { Access, LanePose, SpawnRequest } from '../sim/trafficTypes';
import type { Pt, Road } from '../sim/types';
import type { Leg, Spot, Standing } from './day';
import { centreOf } from './geometry';
import { accessExists } from './net';
import { bodyPose, routeLength } from '../sim/slotGeometry';
import { claim, clearToLeave, freeSlots, pickSlot, roadSlots, sAlong, sideHeading, spanOf, standS } from './slots';
import { legKind } from './vehicleKinds';
import { viewKind } from './stand';
import { emit, lotById, type City } from './state';
import { AISLE_SPEED, BAY_PX, PARK_IN, PARK_IN_MOVE, PARK_OUT, PARK_OUT_MOVE, TURN_IN, TURN_IN_MOVE, TURN_OUT, TURN_OUT_MOVE } from './tune';
import { STEP } from '../sim/constants';
import { kerbStart } from './door';

/**
 * Cars never teleport: a parking car drives to its own slot, holds its lane while it turns in, and is
 * listed in its slot at once; a leaving car waits for a gap, holds the lane while it pulls out, then drives off.
 * Every move is told to the view as a `park` event, in the step `parking` changes.
 */

const onRoad = (spot: Spot): boolean => spot.kind === 'kerb' || spot.kind === 'street';
const roadOf = (c: City, id: number): Road | undefined => c.net.roads.find((r) => r.id === id);

/** Seconds the lane is held turning in, and pulling out: parallel parking along a road, a short turn elsewhere. */
export const holdIn = (spot: Spot): number => (onRoad(spot) ? PARK_IN : TURN_IN);
export const holdOut = (spot: Spot): number => (onRoad(spot) ? PARK_OUT : spot.kind === 'double' ? 0 : TURN_OUT);
/** Seconds a car takes from a two-row car park's gate along the aisle to its bay (none elsewhere). */
function aisleSeconds(e: Standing): number {
  const l = e.spot.layout;
  if (!l?.aisle) return 0;
  const pose = bodyPose(l, spanOf(e.spot, e.slot, e.kind), e.kind);
  return pose ? routeLength(l, pose) / AISLE_SPEED : 0;
}

/** Seconds of the whole move, the lane part included (never shorter than it). */
const moveIn = (e: Standing): number => Math.max(holdIn(e.spot), onRoad(e.spot) ? PARK_IN_MOVE : TURN_IN_MOVE + aisleSeconds(e));
const moveOut = (e: Standing): number => Math.max(holdOut(e.spot), onRoad(e.spot) ? PARK_OUT_MOVE : TURN_OUT_MOVE + aisleSeconds(e));

/** Where a car standing here sets off from: its own slot's place along the road, or the place's access. */
export function standingAccess(c: City, e: Standing): Access {
  if ((onRoad(e.spot) || e.spot.kind === 'double') && e.s !== undefined) {
    const at = { road: e.spot.id, s: e.s };
    if (accessExists(c.net, at)) return at;
  }
  return e.spot.access;
}

/** Where a car stopped by a place stands in the lane: along its road for road places, else the place's access. */
export function stoppedAt(c: City, spot: Spot, at: Pt): Access {
  const road = onRoad(spot) ? roadOf(c, spot.id) : undefined;
  return road ? { road: road.id, s: sAlong(road, at) } : spot.access;
}

/** Px along the road nearest to where the driver is going. */
function targetS(c: City, leg: Leg, road: Road): number {
  const lot = 'lot' in leg.target ? lotById(c, leg.target.lot) : undefined;
  return lot ? sAlong(road, centreOf(lot)) : 0;
}

/** Where a driver heading for this place drives: the slot it is promised, or the place's access. */
export function aimAt(c: City, leg: Leg, spot: Spot): Access {
  if (!onRoad(spot)) return spot.access;
  const road = roadOf(c, spot.id);
  if (!road) return spot.access;
  const kind = legKind(c, leg);
  const k = pickSlot(c, spot, targetS(c, leg, road), leg, leg.tour.id, kind);
  const s = k >= 0 ? standS(c, spot, spanOf(spot, k, kind)) : undefined;
  if (s === undefined) return spot.access;
  claim(c, spot, k, leg);
  return { road: spot.id, s };
}

export const aimOf = (c: City, leg: Leg): Access | null => (leg.spot ? aimAt(c, leg, leg.spot) : null);

/** Its promised slot if still free (or the one across the road at the same place, on its own side), else the nearest free one on its side. */
export function arrivalSlot(c: City, leg: Leg, spot: Spot, lane: LanePose | null): number {
  const slots = roadSlots(c, spot);
  const road = slots.length > 0 ? roadOf(c, spot.id) : undefined;
  const kind = legKind(c, leg);
  if (!road || !lane) return pickSlot(c, spot, 0, leg, leg.tour.id, kind);
  const free = freeSlots(c, spot, leg, kind);
  const s = sAlong(road, lane);
  const side = sideHeading(road, s, lane.a);
  const mine = leg.spot === spot && leg.slot >= 0 && free.includes(leg.slot) ? leg.slot : -1;
  const pair = mine ^ 1;
  if (mine >= 0 && slots[mine]?.side !== side && free.includes(pair) && slots[pair] && Math.abs(slots[pair]!.s - slots[mine]!.s) < BAY_PX * 2) return pair;
  if (mine >= 0) return mine;
  const cost = (k: number): number => (slots[k] ? Math.abs(slots[k]!.s - s) + (slots[k]!.side === side ? 0 : BAY_PX * 2) : Infinity);
  return free.length > 0 ? free.reduce((a, b) => (cost(b) < cost(a) ? b : a)) : -1;
}

function tell(c: City, dir: 'in' | 'out', e: Standing, lane: LanePose, seconds: number, move: number): void {
  emit(c, { t: 'park', dir, car: e.uid, key: e.spot.key, slot: e.slot, lane, seconds, move, tint: e.tint, kind: viewKind(e.kind) });
  c.day.parkingNow = true;
}

/** Off the lane onto the shoulder, after a double-parked car's (or a pump queue's) stand in the lane. */
const SHOULDER_MOVE = TURN_IN_MOVE - TURN_IN;

/**
 * The car has stopped by its space: it turns in, holding its lane, and is already listed there. A double-parked car
 * holds its lane for `hold` seconds first. Without a space it simply leaves the road (a gate).
 */
export function turnIn(c: City, uid: number, e: Standing | null, hold?: number, blockAt?: Access): void {
  if (!e) { c.traffic.remove(uid); return; }
  const seconds = hold ?? holdIn(e.spot);
  const lane = c.traffic.poseOf(uid);
  // Double-parked: the lane is blocked where it always was (a hidden stand-in), while the view shows this car standing.
  if (lane && blockAt) { c.traffic.remove(uid); c.traffic.block(blockAt, seconds, 4); } else if (!lane || !c.traffic.park(uid, seconds)) { c.traffic.remove(uid); return; }
  const move = e.spot.kind === 'double' ? seconds + SHOULDER_MOVE : moveIn(e);
  e.readyAt = c.clock + move;
  tell(c, 'in', e, lane, seconds, move);
}

/** A car already off the road (the traffic let it go) is shown stopping at `lane`, then onto the shoulder. */
export function shoulderFrom(c: City, e: Standing, lane: LanePose, hold: number): void {
  const move = hold + SHOULDER_MOVE;
  e.readyAt = c.clock + move;
  tell(c, 'in', e, lane, hold, move);
}

/** The place a leg's car pulls out of, when it stood in one (a double-parked car pulls off the shoulder too). */
export const pullingOut = (leg: Leg): Standing | null => {
  const e = leg.leaving;
  return e && e.spot.cars.includes(e) ? e : null;
};

/**
 * Before a car pulls into the lane it drives off its slot to the lane edge. True: it is at the edge, ready to look
 * for a gap. False: not yet (still turning in, or on its way to the edge: the 'out' is told when it sets off).
 */
export function readyAtEdge(c: City, e: Standing, req: SpawnRequest): boolean {
  if (e.edge) return c.clock >= e.edge.goAt - STEP / 2;
  if (e.readyAt !== undefined && c.clock < e.readyAt - STEP / 2) return false;
  // A neighbour turning in or driving off: wait for it, never sweep over it.
  if (!clearToLeave(c, e)) return false;
  const pose = c.traffic.entryPose(req);
  if (!pose) return true;
  const seconds = holdOut(e.spot);
  // With no lane hold it joins the lane moving: the move ends where its kerb slide begins.
  const lane = seconds > 0 ? pose : kerbStart(pose);
  const move = moveOut(e);
  e.edge = { goAt: c.clock + move - seconds, lane };
  e.spot.ver += 1;
  c.day.parkingDirty = true;
  tell(c, 'out', e, lane, seconds, move);
  return move - seconds <= STEP / 2;
}

/** It found its gap and stands in the lane: tell the view, before its place lets it go. */
export function pulledOut(c: City, uid: number, e: Standing, seconds: number): void {
  const lane = c.traffic.poseOf(uid) ?? e.edge?.lane;
  if (lane) emit(c, { t: 'parkGo', car: e.uid, key: e.spot.key, lane, seconds, uid });
  c.day.parkingNow = true;
}

/** It gave up waiting at the edge: back into its own slot, which nobody took. */
export function backIn(c: City, e: Standing | null): void {
  if (!e?.edge) return;
  const lane = e.edge.lane;
  e.edge = undefined;
  e.spot.ver += 1;
  c.day.parkingDirty = true;
  if (!e.spot.cars.includes(e)) return;
  e.readyAt = c.clock + moveIn(e);
  tell(c, 'in', e, lane, 0, moveIn(e));
}

