import { MOTION_SWITCHES } from '../sim/switches';
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
import { honestTimes, KERB_OUT, moveTimes, slotOfStanding } from './moveTimes';
import { halfWidth, laneOffset, lanesPerLink } from '../sim/roadGeom';
import { GAME_PACE, GAP_S, R_MIN } from '../sim/kinematics';
import { polyLength } from './geometry';

/**
 * Hold the lane only while the drawn path's body is in it, for that part's own time at the played paces
 * (src/city/moveTimes.ts), wait for a gap across the road, aim off-road arrivals at their slot. Off for now: on, the
 * bots fall from year 7 to year 3 (docs/inkroad-build.md "Car motion rules", round 2). Off: the old fixed seconds.
 */
/** Read live from src/sim/switches.ts (the motion lab turns it on per run). */
export const plannedTimes = (): boolean => MOTION_SWITCHES.PLANNED_TIMES;

/** Gap acceptance across the far lanes (src/sim/switches.ts GAP_ACCEPT), with or without PLANNED_TIMES. */
export const gapAccept = (): boolean => MOTION_SWITCHES.GAP_ACCEPT;

/** Road stops and bare kerbs as real moves (src/sim/switches.ts ROAD_STOPS). */
export const roadStops = (): boolean => MOTION_SWITCHES.ROAD_STOPS;

/** The planned move, for its crossing only: is the slot across the road, and where it crosses (null: not across). */
function across(c: City, e: Standing, lane: LanePose, dir: 'in' | 'out', timed: ReturnType<typeof moveTimes>): Access | null {
  const t = timed ?? (gapAccept() ? moveTimes(c, e, lane, dir) : null);
  return t?.cross && t.at ? t.at : null;
}

/** Seconds of clear far lanes a driver wants before turning across them (3 s real, at the game's pace). */
export const CROSS_GAP = GAP_S / GAME_PACE;

/** Pulling out across the far lanes: only into a gap, and they are held while the body is in them. */
/** The car stands in the lane where the traffic put it (maybe not quite at its edge pose): it holds the lane as long as that path needs. */
export function holdFrom(c: City, uid: number, e: Standing, hold: number): number {
  const real = plannedTimes() ? c.traffic.poseOf(uid) : null;
  const t = real ? moveTimes(c, e, real, 'out') : null;
  if (!t || t.lane <= hold) return hold;
  c.traffic.holdLonger(uid, t.lane);
  return t.lane;
}

export function crossClear(c: City, e: Standing): boolean {
  const at = e.edge?.cross;
  return !at || !e.edge || c.traffic.gapAcross(at, e.edge.lane.a, CROSS_GAP) <= 0;
}

export function crossHold(c: City, e: Standing): void {
  const at = e.edge?.cross;
  if (at && e.edge) c.traffic.holdAcross(at, e.edge.lane.a, e.edge.hold ?? 0);
}

/** Px from a road's end a car joining its lane keeps clear (the junction's corner, JUNCTION_CLEAR, and a little). */
const END_ROOM = 40;
/** The parallel S's own room past its slot (src/sim/parkPaths.ts MARGIN). */
const S_MARGIN = 2;

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

/**
 * A kerb car stops (and pulls out to) a parallel S ahead of its slot, the way its side's traffic runs: it backs
 * straight into the S, and drives straight out of it (src/sim/parkPaths.ts), never reversing along the lane.
 */
function aheadOf(c: City, spot: Spot, k: number, s: number, way: 1 | -1 = 1): number {
  const road = roadOf(c, spot.id);
  const side = roadSlots(c, spot)[k]?.side;
  if (!road || side === undefined) return s;
  // Before ROAD_STOPS (src/sim/switches.ts): the half-width less the kerb lane, along the slot's side, clamped to the road.
  if (!roadStops()) {
    const d0 = Math.max(0, halfWidth(road) + KERB_OUT - laneOffset(road, lanesPerLink(road) - 1));
    const phi0 = d0 >= 2 * R_MIN ? Math.PI / 2 : Math.acos(1 - d0 / (2 * R_MIN));
    return Math.min(polyLength(road.line), Math.max(0, s + way * side * (2 * R_MIN * Math.sin(phi0) + S_MARGIN)));
  }
  // Sideways from the kerb slot to the kerb lane it leaves into (on a one-way street, the right-hand one: across from the left kerb).
  const lane = road.oneWay ? laneOffset(road, lanesPerLink(road) - 1) : side * laneOffset(road, lanesPerLink(road) - 1);
  const d = Math.abs(side * (halfWidth(road) + KERB_OUT) - lane);
  const phi = d >= 2 * R_MIN ? Math.PI / 2 : Math.acos(1 - d / (2 * R_MIN));
  // A one-way street's cars on both kerbs face the way it runs (src/city/moveTimes.ts roadSlotPose).
  const along = road.oneWay ? 1 : side;
  const at = s + way * along * (2 * R_MIN * Math.sin(phi) + S_MARGIN);
  // Never so near the road's end that the car is still easing into its lane on the junction (it keeps to the slot then).
  const len = polyLength(road.line);
  const lo = Math.min(s, END_ROOM), hi = Math.max(s, len - END_ROOM);
  return Math.min(hi, Math.max(lo, at));
}

/**
 * The lanes a kerb slot is reached in and left from on a two-way road: the ones running on its side (slot.side is the
 * way they run along the road's line). A driver goes round rather than swing nose-first across the oncoming lane.
 */
function sideDir(c: City, spot: Spot, k: number): { dir?: 1 | -1 } {
  if (!gapAccept() || !onRoad(spot)) return {};
  const road = roadOf(c, spot.id);
  const side = roadSlots(c, spot)[k]?.side;
  return road && !road.oneWay && side !== undefined ? { dir: side } : {};
}

/** The lanes a car stopped on a two-way road drives on in: the ones it faces (its side). */
function facing(c: City, e: Standing): { dir?: 1 | -1 } {
  const road = roadOf(c, e.spot.id);
  if (!road || road.oneWay || e.side === undefined || e.lat === undefined) return {};
  // Facing a dead end there is no way on ahead: either lane, as before ROAD_STOPS (it turns round where it stands).
  const ahead = c.net.junctions.find((j) => j.id === (e.side! > 0 ? road.b : road.a));
  return ahead && ahead.arms.length === 1 && ahead.gate === undefined ? {} : { dir: e.side };
}

/** Where a car standing here sets off from: its own slot's place along the road, or the place's access. */
export function standingAccess(c: City, e: Standing): Access {
  if ((onRoad(e.spot) || e.spot.kind === 'double') && e.s !== undefined) {
    // A kerb or street car pulls out with a forward S, so it joins the lane ahead of its slot (never beside it, which
    // would mean backing out); a car stopped on the road drives on the way it faces.
    const s = onRoad(e.spot) && (plannedTimes() || roadStops()) ? aheadOf(c, e.spot, e.slot, e.s) : e.s;
    const dir = e.spot.kind === 'double' ? facing(c, e) : sideDir(c, e.spot, e.slot);
    const at = { road: e.spot.id, s, ...dir };
    if (accessExists(c.net, at)) return at;
    const plain = { road: e.spot.id, s };
    if (accessExists(c.net, plain)) return plain;
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

/**
 * An off-road space: the driver is promised its slot now and stops in the lane by that slot's column (or its spot
 * along the strip), so the move in is a turn, not a long reverse along the lane.
 */
function aimOffRoad(c: City, leg: Leg, spot: Spot): Access {
  const l = spot.layout;
  const road = 'road' in spot.access ? roadOf(c, spot.access.road) : undefined;
  if (!l || !road) return spot.access;
  const kind = legKind(c, leg);
  const k = pickSlot(c, spot, 0, leg, leg.tour.id, kind);
  const pose = k >= 0 ? bodyPose(l, spanOf(spot, k, kind), kind) : null;
  if (!pose) return spot.access;
  const at = { road: road.id, s: sAlong(road, pose) };
  if (!accessExists(c.net, at)) return spot.access;
  claim(c, spot, k, leg);
  return at;
}

/** Where a driver heading for this place drives: the slot it is promised, or the place's access. */
export function aimAt(c: City, leg: Leg, spot: Spot): Access {
  if (!onRoad(spot)) return plannedTimes() ? aimOffRoad(c, leg, spot) : spot.access;
  const road = roadOf(c, spot.id);
  if (!road) return spot.access;
  const kind = legKind(c, leg);
  const k = pickSlot(c, spot, targetS(c, leg, road), leg, leg.tour.id, kind);
  const s = k >= 0 ? standS(c, spot, spanOf(spot, k, kind)) : undefined;
  if (s === undefined) return spot.access;
  claim(c, spot, k, leg);
  // A bare kerb is pulled over to with a forward S: the driver stops behind the space, never beside it.
  const stop = spot.kind === 'street' && roadStops() ? aheadOf(c, spot, k, s, -1) : plannedTimes() ? aheadOf(c, spot, k, s) : s;
  return { road: spot.id, s: stop, ...sideDir(c, spot, k) };
}

export const aimOf = (c: City, leg: Leg): Access | null => (leg.spot ? aimAt(c, leg, leg.spot) : null);

/** Its promised slot if still free (or the one across the road at the same place, on its own side), else the nearest free one on its side. */
export function arrivalSlot(c: City, leg: Leg, spot: Spot, lane: LanePose | null): number {
  const slots = roadSlots(c, spot);
  const road = slots.length > 0 ? roadOf(c, spot.id) : undefined;
  const kind = legKind(c, leg);
  if (!road || !lane) {
    const promised = leg.spot === spot && leg.slot >= 0 && freeSlots(c, spot, leg, kind).includes(leg.slot);
    return promised ? leg.slot : pickSlot(c, spot, 0, leg, leg.tour.id, kind);
  }
  const free = freeSlots(c, spot, leg, kind);
  const s = sAlong(road, lane);
  const side = sideHeading(road, s, lane.a);
  const mine = leg.spot === spot && leg.slot >= 0 && free.includes(leg.slot) ? leg.slot : -1;
  const pair = mine ^ 1;
  if (mine >= 0 && slots[mine]?.side !== side && free.includes(pair) && slots[pair] && Math.abs(slots[pair]!.s - slots[mine]!.s) < BAY_PX * 2) return pair;
  // Its promised slot even across the road (it was routed round to it where a way round exists); a new pick on a
  // two-way road is never on the far kerb (that is across the oncoming lane, nose first).
  const ownOnly = gapAccept() && !road.oneWay;
  if (mine >= 0) return mine;
  const cost = (k: number): number => (slots[k] && (!ownOnly || slots[k]!.side === side) ? Math.abs(slots[k]!.s - s) + (slots[k]!.side === side ? 0 : BAY_PX * 2) : Infinity);
  const best = free.length > 0 ? free.reduce((a, b) => (cost(b) < cost(a) ? b : a)) : -1;
  return best >= 0 && cost(best) < Infinity ? best : -1;
}

function tell(c: City, dir: 'in' | 'out', e: Standing, lane: LanePose, seconds: number, move: number, split?: number, wait = 0): void {
  emit(c, { t: 'park', dir, car: e.uid, key: e.spot.key, slot: e.slot, lane, seconds, move, ...(split !== undefined ? { split } : {}), ...(wait > 0 ? { wait } : {}), tint: e.tint, kind: viewKind(e.kind) });
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
  const lane = c.traffic.poseOf(uid);
  // A car stopped on the road (src/city/kerbside.ts stopOnRoad) eases onto its line by its drawn path's own time.
  // A move that swings the car round always takes its drawn path's own time (never a U in a fixed second).
  const timed = honestTimes(c, e, lane, 'in', plannedTimes() || (e.spot.kind === 'double' && e.lat !== undefined));
  // Across the road: wait for a gap in the far lanes, then hold them while the body is in them.
  const at = lane && e.spot.kind !== 'double' ? across(c, e, lane, 'in', timed) : null;
  const wait = at && lane ? c.traffic.gapAcross(at, lane.a, CROSS_GAP) : 0;
  e.crossWait = wait;
  if (at && lane) c.day.crossings.push({ from: c.clock + wait, at, a: lane.a, seconds: timed ? timed.lane : holdIn(e.spot) });
  const seconds = hold ?? wait + (timed ? timed.lane : holdIn(e.spot));
  // Double-parked: the lane is blocked where it always was (a hidden stand-in), while the view shows this car standing.
  if (lane && blockAt) { c.traffic.remove(uid); c.traffic.block(blockedAt(e, blockAt), seconds, 4); } else if (!lane || !c.traffic.park(uid, seconds)) { c.traffic.remove(uid); return; }
  const move = e.spot.kind === 'double' ? seconds + (timed ? timed.move : SHOULDER_MOVE) : timed ? Math.max(seconds, wait + timed.move) : wait + moveIn(e);
  e.readyAt = c.clock + move;
  tell(c, 'in', e, lane, seconds, move, timed?.split, wait);
}

/** A car stopped on the road blocks its lane where it is drawn standing (src/city/kerbside.ts stopOnRoad), not where it stopped. */
function blockedAt(e: Standing, at: Access): Access {
  return e.spot.kind === 'double' && e.lat !== undefined && e.s !== undefined && 'road' in at ? { ...at, s: e.s } : at;
}

/** A car already off the road (the traffic let it go) is shown stopping at `lane`, then onto the shoulder. */
export function shoulderFrom(c: City, e: Standing, lane: LanePose, hold: number): void {
  const timed = honestTimes(c, e, lane, 'in', plannedTimes());
  const move = hold + (timed ? timed.move : SHOULDER_MOVE);
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
  // A car stopped on the road (src/city/kerbside.ts stopOnRoad) sets off where it stands: from the lane, a held
  // moment there; from the shoulder, the sim's own slide into the lane (a forward S), with no lane hold.
  const onRoadStop = e.spot.kind === 'double' && e.lat !== undefined;
  // Facing away from its way on: it turns round on the road (a U, or a three-point turn) before it joins its lane,
  // timed by its drawn path at the manoeuvre paces, never squeezed into the fixed second (the whole path is the
  // move's own part: shoulderOut's split is its length).
  const turns = onRoadStop && turnsRound(c, e, pose);
  const timed = honestTimes(c, e, pose, 'out', (plannedTimes() && !onRoadStop) || turns);
  // Planned: always a held moment in the lane, so the moving car starts where the drawn one ends (no kerb slide).
  const seconds = turns ? STEP : timed ? Math.max(STEP, timed.lane) : onRoadStop && !e.shoulder ? STEP : holdOut(e.spot);
  // With no lane hold it joins the lane moving: the move ends where its kerb slide begins.
  const lane = seconds > 0 ? pose : kerbStart(pose);
  const move = timed ? Math.max(seconds, timed.move) : moveOut(e);
  const at = across(c, e, pose, 'out', timed);
  e.edge = { goAt: c.clock + move - seconds, lane, hold: seconds, ...(at ? { cross: at } : {}) };
  e.spot.ver += 1;
  c.day.parkingDirty = true;
  tell(c, 'out', e, lane, seconds, move, timed?.split);
  return move - seconds <= STEP / 2;
}

/** A car standing on the road faces against the lane it is to set off in. */
function turnsRound(c: City, e: Standing, pose: LanePose): boolean {
  const at = slotOfStanding(c, e, pose)?.pose;
  return !!at && Math.cos(at.a - pose.a) < 0;
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

