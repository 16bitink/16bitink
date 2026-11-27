import type { Access, LanePose, SpawnRequest } from '../sim/trafficTypes';
import type { MovePlay, Pt, Road } from '../sim/types';
import type { Leg, Spot, Standing } from './day';
import { centreOf } from './geometry';
import { accessExists } from './net';
import { bodyPose } from '../sim/slotGeometry';
import { claim, clearToLeave, freeSlots, pickSlot, roadSlots, sAlong, sideHeading, spanOf, standS } from './slots';
import { legKind } from './vehicleKinds';
import { viewKind } from './stand';
import { emit, lotById, type City } from './state';
import { BAY_PX } from './tune';
import { STEP } from '../sim/constants';
import { endOf, KERB_OUT, planIn, planOut, spaceOf } from './movePlan';
import { nearestRoad } from './moveGround';
import { halfWidth, laneOffset, lanesPerLink } from '../sim/roadGeom';
import { GAME_PACE, GAP_S, R_MIN } from '../sim/kinematics';
import { polyLength } from './geometry';
import { lastPose, withPrefix } from '../sim/vehicle/played';

/**
 * Parking moves (docs/inkroad-vehicle-model.md "Phase B"): each is planned and played by the vehicle model on the
 * place's real ground (src/city/movePlan.ts). The lane is held while the body is in it, for the move's real seconds;
 * a turn across the road waits for a gap in the far lanes and holds them; off-road arrivals stop by their slot.
 */

/** The planned move's crossing: where it crosses the far lanes (null: it does not). */
export const across = (plan: { readonly cross: Access | null }): Access | null => plan.cross;

/** Seconds of clear far lanes a driver wants before turning across them (3 s real, at the game's pace). */
export const CROSS_GAP = GAP_S / GAME_PACE;

/** Px past its joining point a pull-out keeps its lane clear (its nose, and a little). */
const OWN_AHEAD = 12;
/** Px behind the swept stretch too (the body's rear swinging over the lane). */
const OWN_BACK = 12;

/** Pulling out across the far lanes (or turning round on the road, both ways): only into a gap. */
export function crossClear(c: City, e: Standing): boolean {
  const own = e.edge?.from;
  if (e.edge && own && !c.traffic.laneClear(own, e.edge.lane.a, e.edge.back ?? 0, OWN_AHEAD, CROSS_GAP)) return false;
  const at = e.edge?.cross;
  if (!at || !e.edge) return true;
  const a = e.edge.lane.a;
  return c.traffic.gapAcross(at, a, CROSS_GAP) <= 0 && (!e.edge.both || c.traffic.gapAcross(at, a + Math.PI, CROSS_GAP) <= 0);
}

/** The far lanes are held while the body is in them. */
export function crossHold(c: City, e: Standing): void {
  const at = e.edge?.cross;
  if (at && e.edge) c.traffic.holdAcross(at, e.edge.lane.a, e.edge.hold ?? 0);
}

/** Px from a road's end a car joining its lane keeps clear (the junction's corner, JUNCTION_CLEAR, and a little). */
const END_ROOM = 40;
/** The parallel S's own room past its slot. */
const S_MARGIN = 2;

const onRoad = (spot: Spot): boolean => spot.kind === 'kerb' || spot.kind === 'street';
const roadOf = (c: City, id: number): Road | undefined => c.net.roads.find((r) => r.id === id);

/**
 * A kerb car stops (and pulls out to) a parallel S ahead of its slot, the way its side's traffic runs: it backs
 * straight into the S, and drives straight out of it, never reversing along the lane.
 */
function aheadOf(c: City, spot: Spot, k: number, s: number, way: 1 | -1 = 1): number {
  const road = roadOf(c, spot.id);
  const side = roadSlots(c, spot)[k]?.side;
  if (!road || side === undefined) return s;
  // Sideways from the kerb slot to the kerb lane it leaves into (on a one-way street, the right-hand one: across from the left kerb).
  const lane = road.oneWay ? laneOffset(road, lanesPerLink(road) - 1) : side * laneOffset(road, lanesPerLink(road) - 1);
  const d = Math.abs(side * (halfWidth(road) + KERB_OUT) - lane);
  const phi = d >= 2 * R_MIN ? Math.PI / 2 : Math.acos(1 - d / (2 * R_MIN));
  // A one-way street's cars on both kerbs face the way it runs.
  const along = road.oneWay ? 1 : side;
  const at = s + way * along * (2 * R_MIN * Math.sin(phi) + S_MARGIN);
  // Never so near the road's end that the car is still easing into its lane on the junction (it keeps to the slot then).
  const len = polyLength(road.line);
  const lo = Math.min(s, END_ROOM), hi = Math.max(s, len - END_ROOM);
  return Math.min(hi, Math.max(lo, at));
}

/**
 * The lanes a kerb slot is reached in and left from on a two-way road: the ones running on its side (slot.side is the
 * way they run along the road's line). A driver parks on the kerb of their own direction and goes round for the other.
 */
function sideDir(c: City, spot: Spot, k: number): { dir?: 1 | -1 } {
  if (!onRoad(spot)) return {};
  const road = roadOf(c, spot.id);
  const side = roadSlots(c, spot)[k]?.side;
  return road && !road.oneWay && side !== undefined ? { dir: side } : {};
}

/**
 * The lanes a car stopped on a two-way road drives on in: the ones it faces (its side). It never turns round where it
 * stands (the owner, phase B: double parking leaves forward); facing a dead end it turns round at the end.
 */
function facing(c: City, e: Standing): { dir?: 1 | -1 } {
  const road = roadOf(c, e.spot.id);
  return !road || road.oneWay || e.side === undefined || e.lat === undefined ? {} : { dir: e.side };
}

/** Where a car standing here sets off from: its own slot's place along the road, or the place's access. */
export function standingAccess(c: City, e: Standing): Access {
  if ((onRoad(e.spot) || e.spot.kind === 'double') && e.s !== undefined) {
    // A kerb or street car pulls out with a forward S, so it joins the lane ahead of its slot (never beside it, which
    // would mean backing out); a car stopped on the road drives on the way it faces.
    const s = onRoad(e.spot) ? aheadOf(c, e.spot, e.slot, e.s) : e.s;
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
  const kind = legKind(c, leg);
  const k = l ? pickSlot(c, spot, 0, leg, leg.tour.id, kind) : -1;
  const pose = l && k >= 0 ? bodyPose(l, spanOf(spot, k, kind), kind) : null;
  // The road by the space (a beach's sand may lie by another road than its lot's access).
  const road = pose && spot.kind === 'sand' ? nearestRoad(c, pose) : 'road' in spot.access ? roadOf(c, spot.access.road) : undefined;
  if (!l || !road || !pose) return spot.access;
  // A two-row car park is entered by its gate: the driver stops by the gate, not by the bay.
  const by = l.aisle ? l.aisle.gate : pose;
  const at = { road: road.id, s: sAlong(road, by) };
  if (!accessExists(c.net, at)) return spot.access;
  claim(c, spot, k, leg);
  return at;
}

/** Where a driver heading for this place drives: the slot it is promised, or the place's access. */
export function aimAt(c: City, leg: Leg, spot: Spot): Access {
  if (!onRoad(spot)) return aimOffRoad(c, leg, spot);
  const road = roadOf(c, spot.id);
  if (!road) return spot.access;
  const kind = legKind(c, leg);
  const k = pickSlot(c, spot, targetS(c, leg, road), leg, leg.tour.id, kind);
  const s = k >= 0 ? standS(c, spot, spanOf(spot, k, kind)) : undefined;
  if (s === undefined) return spot.access;
  claim(c, spot, k, leg);
  // A bare kerb is pulled over to with a forward S: the driver stops behind the space, never beside it.
  const stop = spot.kind === 'street' ? aheadOf(c, spot, k, s, -1) : aheadOf(c, spot, k, s);
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
  // A driver parks on the kerb of their own direction (routed round to it): never one across the oncoming lane.
  const ownOnly = !road.oneWay;
  if (mine >= 0 && (!ownOnly || slots[mine]?.side === side)) return mine;
  const cost = (k: number): number => (slots[k] && (!ownOnly || slots[k]!.side === side) ? Math.abs(slots[k]!.s - s) + (slots[k]!.side === side ? 0 : BAY_PX * 2) : Infinity);
  const best = free.length > 0 ? free.reduce((a, b) => (cost(b) < cost(a) ? b : a)) : -1;
  return best >= 0 && cost(best) < Infinity ? best : -1;
}

function tell(c: City, dir: 'in' | 'out', e: Standing, lane: LanePose, seconds: number, move: number, play: MovePlay, wait = 0): void {
  emit(c, { t: 'park', dir, car: e.uid, key: e.spot.key, slot: e.slot, lane, seconds, move, ...(wait > 0 ? { wait } : {}), tint: e.tint, kind: viewKind(e.kind), play });
  c.day.parkingNow = true;
}

/**
 * The car has stopped by its space: it turns in along its played move, holding its lane while its body is in it
 * (after waiting for a gap when it crosses the far lanes), and is already listed there. A car stopped on the road
 * (double-parked) holds its lane for `hold` seconds. Without a space it simply leaves the road (a gate).
 */
export function turnIn(c: City, uid: number, e: Standing | null, hold?: number, blockAt?: Access): void {
  if (!e) { c.traffic.remove(uid); return; }
  const drawn = c.traffic.framesOf(uid);
  const lane = withMotion(c.traffic.poseOf(uid), drawn);
  const plan = lane ? planIn(c, e, lane, uid, (at, a) => c.traffic.gapAcross(at, a, CROSS_GAP)) : null;
  if (!lane || !plan) { c.traffic.remove(uid); return; }
  const at = plan.cross;
  const wait = plan.wait;
  e.crossWait = wait;
  if (at) c.day.crossings.push({ from: c.clock + wait, at, a: lane.a, seconds: Math.max(0, plan.lane - wait) });
  // The lane part of the played move includes its stand for the gap.
  const seconds = hold ?? plan.lane;
  // Double-parked: the lane is blocked where it is drawn standing (a hidden stand-in), while the view shows this car.
  if (blockAt) { c.traffic.remove(uid); c.traffic.block(blockedAt(e, blockAt), Math.max(seconds, STEP), 4, e.kind); } else if (!c.traffic.park(uid, Math.max(seconds, STEP))) { c.traffic.remove(uid); return; }
  // A car stopped on the road comes to rest and stands there (its lane blocked `hold`); one crossing waits for its gap first.
  const stand = 0;
  // The view draws the car's last step first (it was still driving in it), then the move: no step skipped.
  const played = drawn && !stand ? withPrefix(drawn, plan.played) : plan.played;
  const move = Math.max(stand + played.seconds, e.spot.kind === 'double' ? seconds : 0);
  e.stood = endOf(plan.played);
  e.readyAt = c.clock + move;
  tell(c, 'in', e, lane, seconds, move, { a: played, fade: plan.fade }, stand);
}

/** The drawn car's speed and acceleration at the end of its last step, measured on the frames the view drew. */
function withMotion(lane: LanePose | null, f: Float64Array | null): LanePose | null {
  if (!lane || !f || f.length < 9) return lane;
  const n = f.length / 3, dt = 1 / 60;
  const sp = (k: number): number => Math.hypot(f[k * 3]! - f[(k - 1) * 3]!, f[k * 3 + 1]! - f[(k - 1) * 3 + 1]!) / dt;
  const v = sp(n - 1), acc = (v - sp(n - 2)) / dt;
  return { ...lane, v, acc };
}

/** A car stopped on the road blocks its lane where it is drawn standing, not where it stopped. */
function blockedAt(e: Standing, at: Access): Access {
  return e.spot.kind === 'double' && e.lat !== undefined && e.s !== undefined && 'road' in at ? { ...at, s: e.s } : at;
}

/** A car already off the road (the traffic let it go) is shown stopping at `lane`, standing `hold`, then onto the shoulder. */
export function shoulderFrom(c: City, e: Standing, lane: LanePose, hold: number): void {
  const plan = planIn(c, e, lane);
  if (!plan) return;
  const move = hold + plan.played.seconds;
  e.stood = endOf(plan.played);
  e.readyAt = c.clock + move;
  tell(c, 'in', e, lane, hold, move, { a: plan.played }, hold);
}

/** The place a leg's car pulls out of, when it stood in one (a double-parked car pulls off the shoulder too). */
export const pullingOut = (leg: Leg): Standing | null => {
  const e = leg.leaving;
  return e && e.spot.cars.includes(e) ? e : null;
};

/**
 * Before a car pulls into the lane it drives off its slot to the lane edge (the first part of its played move out).
 * True: it is at the edge, ready to look for a gap. False: not yet (still turning in, or on its way to the edge: the
 * 'out' is told when it sets off). `req` is where the sim would put it; the move may join the lane further on, and
 * the spawn is moved there (`edge.from`).
 */
export function readyAtEdge(c: City, e: Standing, req: SpawnRequest): boolean {
  if (e.edge) return c.clock >= e.edge.goAt - STEP / 2;
  if (e.readyAt !== undefined && c.clock < e.readyAt - STEP / 2) return false;
  // A neighbour turning in or driving off: wait for it, never sweep over it.
  if (!clearToLeave(c, e)) return false;
  const pose = c.traffic.entryPose(req);
  if (!pose) return true;
  const plan = joinable(c, e, req, pose);
  if (!plan) {
    // On its lane line already (a car stopped on the road): it simply drives off from where it stands.
    const here = e.stood ?? spaceOf(c, e, pose)?.pose ?? pose;
    e.edge = { goAt: c.clock, lane: { x: here.x, y: here.y, a: here.a }, hold: STEP };
    tell(c, 'out', e, pose, STEP, STEP, { a: standStill(here), b: standStill(here) });
    e.spot.ver += 1;
    c.day.parkingDirty = true;
    return true;
  }
  // No way out fits now (a car in the way, a body standing in the lane): wait and look again, a while at most.
  if (!(plan.plan.toEdge.fits && plan.plan.join.fits) && (e.blocked ?? 0) < BLOCKED_TRIES) {
    e.blocked = (e.blocked ?? 0) + 1;
    e.readyAt = c.clock + BLOCKED_RETRY;
    return false;
  }
  e.blocked = undefined;
  const seconds = Math.max(STEP, plan.plan.lane);
  const move = plan.plan.toEdge.seconds + seconds;
  const end = lastPose(plan.plan.join);
  const lane = { x: end.x, y: end.y, a: end.th };
  const both = plan.turn;
  const start = lastPose(plan.plan.toEdge);
  const back = Math.max(0, (end.x - start.x) * Math.cos(end.th) + (end.y - start.y) * Math.sin(end.th)) + OWN_BACK;
  e.edge = { goAt: c.clock + plan.plan.toEdge.seconds, lane, hold: seconds, from: plan.from, back, ...(plan.plan.cross ? { cross: plan.plan.cross } : {}), ...(both ? { both } : {}) };
  e.spot.ver += 1;
  c.day.parkingDirty = true;
  tell(c, 'out', e, lane, seconds, move, { a: plan.plan.toEdge, b: plan.plan.join, fade: plan.plan.fade });
  return plan.plan.toEdge.seconds <= STEP / 2;
}

/** A car whose way out does not fit looks again every BLOCKED_RETRY s, BLOCKED_TRIES times, then goes the best way there is. */
const BLOCKED_RETRY = 1, BLOCKED_TRIES = 12;

/** A played move of nothing: the car stands where it is. */
const standStill = (q: { readonly x: number; readonly y: number; readonly a: number }): MovePlay['a'] => ({ frames: new Float64Array([q.x, q.y, q.a]), n: 1, seconds: 0, end: { x: q.x, y: q.y, th: q.a, u: 0, dir: 1, delta: 0, a: 0 }, fits: true, word: '' });

/** Px the sim's spawn pose may lie off the planned move's end before the move is planned again for it alone. */
const SPAWN_MISS = 1.5;

/** The move out, and the access the sim's spawn must use so it starts where the move ends. */
function joinable(c: City, e: Standing, req: SpawnRequest, pose: LanePose): { plan: NonNullable<ReturnType<typeof planOut>>; from: Access; turn: boolean } | null {
  const plan = planOut(c, e, pose);
  if (!plan) return null;
  const here = e.stood ?? spaceOf(c, e, pose)?.pose;
  const turn = !!here && Math.cos(here.a - pose.a) < 0;
  const from = 'road' in req.from ? { ...req.from, s: plan.s } : req.from;
  const spawn = 'road' in req.from ? c.traffic.entryPose({ ...req, from }) : pose;
  const end = lastPose(plan.join);
  if (spawn && Math.hypot(spawn.x - end.x, spawn.y - end.y) < SPAWN_MISS) return { plan, from, turn };
  // The lane there is not where the sim would put it (another link, a bend): plan for the sim's own pose only.
  const only = planOut(c, e, pose, 0);
  return only ? { plan: only, from: req.from, turn } : null;
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
  const plan = planIn(c, e, lane);
  if (!plan) return;
  e.stood = endOf(plan.played);
  e.readyAt = c.clock + plan.played.seconds;
  tell(c, 'in', e, lane, 0, plan.played.seconds, { a: plan.played, fade: plan.fade });
}
