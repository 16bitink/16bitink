import type { Access, LanePose, SpawnRequest } from '../sim/trafficTypes';
import type { MovePlay, Pt, Road } from '../sim/types';
import type { Leg, Spot, Standing } from './day';
import { centreOf } from './geometry';
import { accessExists } from './net';
import { bodyPose, inPlan } from '../sim/slotGeometry';
import { claim, clearToLeave, freeSlots, pickSlot, roadSlots, sAlong, sideHeading, spanOf, standS } from './slots';
import { legKind } from './vehicleKinds';
import { viewKind } from './stand';
import { emit, lotById, type City } from './state';
import { BAY_PX } from './tune';
import { STEP } from '../sim/constants';
import { pointAt } from '../sim/geom';
import { endOf, KERB_OUT, planIn, planOut, spaceOf } from './movePlan';
import { nearestRoad } from './moveGround';
import { doorIn } from './door';
import { unstand } from './stand';
import { carById } from './households';
import { halfWidth, laneOffset, lanesPerLink } from '../sim/roadGeom';
import { GAME_PACE, GAP_S, R_MIN } from '../sim/kinematics';
import { polyLength } from './geometry';
import { joinPlayed, lastPose, withPrefix, type Played } from '../sim/vehicle/played';
import { sizeOf } from '../sim/vehicleSize';
import { LANE } from '../sim/constants';
import { delayed } from '../sim/sweeps';

/**
 * Parking moves (docs/inkroad-vehicle-model.md "Phase B"): each is planned and played by the vehicle model on the
 * place's real ground (src/city/movePlan.ts). The lane is held while the body is in it, for the move's real seconds;
 * a turn across the road waits for a gap in the far lanes and holds them; off-road arrivals stop by their slot.
 */

/** The planned move's crossing: where it crosses the far lanes (null: it does not). */
export const across = (plan: { readonly cross: Access | null }): Access | null => plan.cross;

/** Seconds of clear far lanes a driver wants before turning across them (3 s real, at the game's pace). */
export const CROSS_GAP = GAP_S / GAME_PACE;
/**
 * A parking move crossing the far lanes is slow (it is in them for seconds, not a turn at speed): the gap it waits for
 * is that much longer, so the cars coming can still be stopped by its hold (src/sim/crossing.ts holdAcross).
 */
const MOVE_GAP = CROSS_GAP + 2;
/** Seconds a driver waits at the edge for a full gap across before it goes into a smaller one (held for it). */
const CROSS_PATIENCE = 12;

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
  // A driver that has waited long at the edge takes what comes: the cars there are stopped by its hold.
  // A driver that has waited long at the edge takes what comes: the cars there are stopped by its hold.
  if (c.clock - e.edge.goAt > CROSS_PATIENCE) return true;
  const a = e.edge.lane.a;
  return c.traffic.gapAcross(at, a, MOVE_GAP) <= 0 && (!e.edge.both || c.traffic.gapAcross(at, a + Math.PI, MOVE_GAP) <= 0);
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
  // A car park or a beach track is entered by its gate: the driver stops by the gate, not by the bay.
  const by = l?.aisle ? inPlan(l.aisle, l.aisle.gate) : pose;
  const road = by && spot.kind === 'sand' ? nearestRoad(c, by) : 'road' in spot.access ? roadOf(c, spot.access.road) : undefined;
  if (!l || !road || !pose || !by) return spot.access;
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
  const gap = (at: Access, a: number): number => c.traffic.gapAcross(at, a, MOVE_GAP);
  let first = lane ? planIn(c, e, lane, uid, gap) : null;
  // The one collision rule: it waits in its lane until its body would touch no other move under way.
  let after = first ? clearDelay(c, first.played, e) : 0;
  // A stop on the road whose place a waiting car stands in: it stops past it instead (it cannot brake shorter), never on top of it.
  const s0 = e.s;
  for (let k = 1; lane && first && after >= SWEEP_MOST && e.spot.kind === 'double' && s0 !== undefined && k <= STOP_TRIES; k++) {
    e.s = s0 + Math.sign(Math.cos(lane.a - roadHeading(c, e))) * k * (sizeOf(e.kind).len + STOP_GAP);
    first = planIn(c, e, lane, uid, gap) ?? first;
    after = clearDelay(c, first.played, e);
  }
  let plan = lane && first && after > first.wait ? planIn(c, e, lane, uid, gap, after) ?? first : first;
  if (!lane || !plan) { c.traffic.remove(uid); return; }
  // No way into its space fits: another free space of the same place that a way fits into.
  if ((!plan.played.fits || after >= SWEEP_MOST) && e.spot.layout) { const other = otherSlot(c, e, lane, uid, gap); if (other) { plan = other; after = 0; } }
  // No way into its space fits (a body in the way, no ground for it): never left standing in the lane, it puts the
  // car inside the building instead (its space is kept, and it comes out of its space later).
  if ((!plan.played.fits || after >= SWEEP_MOST) && intoBuilding(c, uid, e, lane)) return;
  // A stop on the road: the traffic keeps out of where it will come to rest too.
  c.traffic.sweeps.put(e.uid, plan.played, 0, e.kind, false, undefined, e.spot.kind === 'double');
  const at = plan.cross;
  const wait = plan.wait;
  e.crossWait = wait;
  if (at) c.day.crossings.push({ from: c.clock + wait, at, a: lane.a, seconds: Math.max(0, plan.lane - wait) });
  // The lane part of the played move includes its stand for the gap.
  const seconds = hold ?? plan.lane;
  // Double-parked: the lane is blocked where it is drawn standing (a hidden stand-in), while the view shows this car.
  // A car stopped in the lane is a real obstacle there for as long as it stands (its stand-in goes when it pulls out).
  // The car itself stands in for its body where it stopped (a stand-in put elsewhere would let followers drive into it).
  if (blockAt && c.traffic.park(uid, STAND_HOLD)) e.blockUid = uid;
  else if (blockAt) { c.traffic.remove(uid); e.blockUid = c.traffic.block(blockedAt(e, blockAt), STAND_HOLD, 4, e.kind); } else if (!c.traffic.park(uid, Math.max(seconds, STEP))) { c.traffic.remove(uid); return; }
  // A car stopped on the road comes to rest and stands there (its lane blocked `hold`); one crossing waits for its gap first.
  const stand = 0;
  // The view draws the car's last step first (it was still driving in it), then the move: no step skipped.
  const played = drawn && !stand ? withPrefix(drawn, plan.played) : plan.played;
  const move = Math.max(stand + played.seconds, e.spot.kind === 'double' ? seconds : 0);
  e.stood = endOf(plan.played);
  e.readyAt = c.clock + move;
  tell(c, 'in', e, lane, seconds, move, { a: played, fade: plan.fade }, stand);
}

/** Free spaces tried at most when the car's own has no way in that fits. */
const OTHER_SLOTS = 6;

/** The plan into the nearest free space of the same place whose way in fits and touches no move under way (the car takes it). */
function otherSlot(c: City, e: Standing, lane: LanePose, uid: number, gap: (at: Access, a: number) => number): InPlanOf | null {
  const mine = e.slot;
  const free = freeSlots(c, e.spot, null, e.kind).filter((k) => k !== mine).slice(0, OTHER_SLOTS);
  for (const k of free) {
    e.slot = k;
    const p = planIn(c, e, lane, uid, gap);
    if (p && p.played.fits && c.traffic.sweeps.hit(p.played, 0, e.kind, e.uid, false, false) < 0) { e.spot.ver += 1; c.day.parkingDirty = true; c.day.parkingNow = true; return p; }
  }
  e.slot = mine;
  return null;
}
type InPlanOf = NonNullable<ReturnType<typeof planIn>>;

/** An off-road place's building: the car turns in at its mouth and fades inside (src/city/door.ts). False: none, or no way in fits either. */
function intoBuilding(c: City, uid: number, e: Standing, lane: LanePose): boolean {
  const lot = e.spot.kind === 'home' || e.spot.kind === 'private' ? c.lots.find((l) => l.id === e.spot.id) : undefined;
  const park = e.spot.kind === 'park' ? c.parks.find((p) => p.id === e.spot.id) : undefined;
  const key = lot ? `lot:${lot.id}` : park ? `park:${park.id}` : null;
  if (!key || !doorIn(c, uid, null, { kind: e.kind, tint: e.tint }, key, lane, false, e.uid)) return false;
  // It is inside now, not in its space (a household car is off the map until next driven, as any car put in a garage).
  unstand(c, e);
  const car = carById(c, e.uid);
  if (car) { car.where = null; car.away = true; }
  c.day.parkingNow = true;
  return true;
}

/** A stop on the road moved back this many times at most, by a body and this many px each time. */
const STOP_TRIES = 3, STOP_GAP = 4;

/** The heading of a road place's road where a standing car is. */
function roadHeading(c: City, e: Standing): number {
  const road = c.net.roads.find((r) => r.id === e.spot.id);
  return road && e.s !== undefined ? pointAt(road.line, e.s).heading : 0;
}

/** Seconds between the looks of a move waiting for another move's body to pass, and the longest it waits. */
const SWEEP_STEP = 0.5, SWEEP_MOST = 40;

/** Seconds a move from here waits before its body touches no other move under way (src/sim/sweeps.ts). */
function clearDelay(c: City, m: Played, e: Standing): number {
  // A move in only passes the ways waiting cars will take (they are checked against it when they go).
  for (let d = 0; d < SWEEP_MOST; d += SWEEP_STEP) if (c.traffic.sweeps.hit(m, d, e.kind, e.uid, false, false) < 0) return d;
  return SWEEP_MOST;
}

/** The drawn car's speed at the end of its last step, measured on the frames the view drew, and its acceleration. */
function withMotion(lane: LanePose | null, f: Float64Array | null): LanePose | null {
  if (!lane || !f || f.length < 9) return lane;
  const n = f.length / 3, dt = 1 / 60;
  const sp = (k: number): number => Math.hypot(f[k * 3]! - f[(k - 1) * 3]!, f[k * 3 + 1]! - f[(k - 1) * 3 + 1]!) / dt;
  // Speed from the frames drawn; acceleration the drawn car's own (a finite difference of two frames is noise).
  const v = sp(n - 1);
  return { ...lane, v, acc: v > 0.5 ? lane.acc ?? 0 : 0 };
}

/** A car stopped on the road blocks its lane where it is drawn standing, not where it stopped. */
function blockedAt(e: Standing, at: Access): Access {
  // In the lanes it faces (its side), never the other way's.
  return e.spot.kind === 'double' && e.lat !== undefined && e.s !== undefined && 'road' in at ? { ...at, s: e.s, ...(e.side ? { dir: e.side } : {}) } : at;
}

/** A car already off the road (the traffic let it go) is shown stopping at `lane`, standing `hold`, then onto the shoulder. */
export function shoulderFrom(c: City, e: Standing, lane: LanePose, hold: number): void {
  const plan = planIn(c, e, lane);
  if (!plan) return;
  c.traffic.sweeps.put(e.uid, delayed(plan.played, hold), 0, e.kind, false);
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
  if (e.edge) return c.clock >= e.edge.goAt - STEP / 2 + 1e-9;
  if (e.readyAt !== undefined && c.clock < e.readyAt - STEP / 2) return false;
  // A neighbour turning in or driving off: wait for it, never sweep over it.
  if (!clearToLeave(c, e)) return false;
  const pose = c.traffic.entryPose(req);
  if (!pose) return true;
  const plan = joinable(c, e, req, pose);
  if (!plan) {
    // On its lane line already (a car stopped on the road): it simply drives off from where it stands.
    const here = e.stood ?? spaceOf(c, e, pose)?.pose ?? pose;
    // Standing there in the lane until it can drive off: a body the traffic stops for.
    c.traffic.sweeps.put(e.uid, standStill(here), 0, e.kind, true);
    e.edge = { goAt: c.clock, lane: { x: here.x, y: here.y, a: here.a }, hold: STEP, at: { x: here.x, y: here.y, a: here.a } };
    tell(c, 'out', e, pose, STEP, STEP, { a: standStill(here), b: standStill(here) });
    e.spot.ver += 1;
    c.day.parkingDirty = true;
    return true;
  }
  // No way out fits now (a car in the way, a body standing in the lane): wait and look again, a while at most.
  // A turn round never goes through anything: it waits as long as it takes.
  // A way through a body is never taken: it waits as long as it takes, looking less often the longer it waits.
  const unfit = !(plan.plan.toEdge.fits && plan.plan.join.fits);
  if (unfit && ((e.blocked ?? 0) < BLOCKED_TRIES || plan.turn || hitsBody(plan.plan.toEdge) || hitsBody(plan.plan.join))) {
    e.blocked = (e.blocked ?? 0) + 1;
    e.readyAt = c.clock + Math.min(BLOCKED_MOST, BLOCKED_RETRY * Math.max(1, e.blocked - BLOCKED_TRIES));
    return false;
  }
  // The one collision rule: never off its slot while its way out (or its wait at the edge) would touch another move.
  const sw = c.traffic.sweeps;
  if (sw.hit(plan.plan.toEdge, 0, e.kind, e.uid, true) >= 0 || sw.hit(plan.plan.join, plan.plan.toEdge.seconds, e.kind, e.uid) >= 0) {
    e.swept = (e.swept ?? 0) + 1;
    e.readyAt = c.clock + Math.min(BLOCKED_MOST / 2, BLOCKED_RETRY * e.swept);
    return false;
  }
  e.swept = undefined;
  const end = lastPose(plan.plan.join);
  const lane = { x: end.x, y: end.y, a: end.th };
  const both = plan.turn;
  const start = lastPose(plan.plan.toEdge);
  const back = Math.max(0, (end.x - start.x) * Math.cos(end.th) + (end.y - start.y) * Math.sin(end.th)) + OWN_BACK;
  // Its edge already in its lane (a space by the lane, a corner): it never waits there in the traffic's way, it goes
  // only with the lane clear now, in one piece, the lane held from the start.
  const deep = inLane(endOf(plan.plan.toEdge), lane, e.kind);
  const seconds = Math.max(STEP, plan.plan.lane + (deep ? plan.plan.toEdge.seconds : 0));
  const move = plan.plan.toEdge.seconds + Math.max(STEP, plan.plan.lane);
  e.edge = { goAt: c.clock + (deep ? 0 : plan.plan.toEdge.seconds), lane, hold: seconds, from: plan.from, back, at: endOf(plan.plan.toEdge), join: deep ? joinPlayed(plan.plan.toEdge, plan.plan.join) : plan.plan.join, ...(plan.plan.cross ? { cross: plan.plan.cross } : {}), ...(both ? { both } : {}) };
  if (deep && (!crossClear(c, e) || !sw.coming(e.edge.join!, e.kind))) { e.edge = undefined; e.readyAt = c.clock + COMING_RETRY; return false; }
  e.blocked = undefined;
  // Off a stop on the road (or turning round on it): the traffic keeps out of where it will still pass.
  sw.put(e.uid, deep ? e.edge.join! : plan.plan.toEdge, 0, e.kind, !deep, deep ? undefined : plan.plan.join, true);
  e.spot.ver += 1;
  c.day.parkingDirty = true;
  tell(c, 'out', e, lane, seconds, move, { a: plan.plan.toEdge, b: plan.plan.join, fade: plan.plan.fade });
  return plan.plan.toEdge.seconds <= STEP / 2;
}

/** Px a body at the lane edge may reach into its lane's band before it stands in the traffic's way. */
const EDGE_IN = 1;

/** Does a body (its middle) reach into the lane band of `lane` by more than EDGE_IN px? */
function inLane(q: { readonly x: number; readonly y: number; readonly a: number }, lane: { readonly x: number; readonly y: number; readonly a: number }, kind: Standing['kind']): boolean {
  const z = sizeOf(kind);
  const lat = Math.abs((q.x - lane.x) * -Math.sin(lane.a) + (q.y - lane.y) * Math.cos(lane.a));
  const ext = (z.len * Math.abs(Math.sin(q.a - lane.a)) + z.wid * Math.abs(Math.cos(q.a - lane.a))) / 2;
  return LANE / 2 - (lat - ext) > EDGE_IN;
}

/** Seconds a stopped car's stand-in holds its lane at most (it is taken away when the car pulls out). */
const STAND_HOLD = 3600;

/** A car whose way out does not fit looks again every BLOCKED_RETRY s, BLOCKED_TRIES times, then goes the best way there is. */
const BLOCKED_RETRY = 1, BLOCKED_TRIES = 12, BLOCKED_MOST = 10;
/** Seconds a car whose lane is not clear enough to go in one piece looks again (often: the gap is short). */
const COMING_RETRY = 1;

/** A played move that does not fit because a body is in its way (not the ground's shape). */
export const hitsBody = (m: Played): boolean => !m.fits && m.word.includes('hits the body');

/** A played move of nothing: the car stands where it is. */
const standStill = (q: { readonly x: number; readonly y: number; readonly a: number }): MovePlay['a'] => ({ frames: new Float64Array([q.x, q.y, q.a]), n: 1, seconds: 0, end: { x: q.x, y: q.y, th: q.a, u: 0, dir: 1, delta: 0, a: 0 }, fits: true, word: '' });

/** Px the sim's spawn pose may lie off the planned move's end before the move is planned again for it alone. */
const SPAWN_MISS = 4;

/** The move out, and the access the sim's spawn must use so it starts where the move ends. */
function joinable(c: City, e: Standing, req: SpawnRequest, pose: LanePose): { plan: NonNullable<ReturnType<typeof planOut>>; from: Access; turn: boolean } | null {
  const plan = planOut(c, e, pose);
  if (!plan) return null;
  const here = e.stood ?? spaceOf(c, e, pose)?.pose;
  const turn = !!here && Math.cos(here.a - pose.a) < 0;
  // The sim's car appears where the played move really ended (along its road).
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
  const at = e.edge.at ?? lane;
  e.edge = undefined;
  e.spot.ver += 1;
  c.day.parkingDirty = true;
  // The view is always told: a move left waiting at the edge would be drawn there for ever.
  if (!e.spot.cars.includes(e)) { goneAtNight(c, { ...e, edge: { goAt: 0, lane, at } }); return; }
  const plan = planIn(c, e, at);
  if (!plan) { c.traffic.sweeps.drop(e.uid); standBack(c, { ...e, edge: { goAt: 0, lane, at } } as Standing); return; }
  c.traffic.sweeps.put(e.uid, plan.played, 0, e.kind, false);
  e.stood = endOf(plan.played);
  e.readyAt = c.clock + plan.played.seconds;
  tell(c, 'in', e, lane, 0, plan.played.seconds, { a: plan.played, fade: plan.fade });
}

/**
 * The small hours: a car still waiting at the lane edge (or on its way there) is back in its space, at once, and the
 * view is told (it would draw it waiting there all night otherwise). Its move leaves the sweeps.
 */
export function standBack(c: City, e: Standing): void {
  if (!e.edge && (e.readyAt === undefined || e.readyAt <= c.clock)) return;
  c.traffic.sweeps.drop(e.uid);
  const was = e.edge?.at;
  e.edge = undefined;
  e.readyAt = undefined;
  e.stood = undefined;
  const here = spaceOf(c, e)?.pose;
  if (!here || !was) return;
  tell(c, 'in', e, { x: here.x, y: here.y, a: here.a }, 0, 0, { a: standStill(here) });
  c.day.parkingDirty = true;
  c.day.parkingNow = true;
}

/** The small hours: a visitor's car still waiting at the lane edge is gone (faded where it waits), its move out of the sweeps. */
export function goneAtNight(c: City, e: Standing): void {
  c.traffic.sweeps.drop(e.uid);
  const at = e.edge?.at;
  if (!at) return;
  // Not listed in any place any more: told as a move into no space (slot -1).
  tell(c, 'in', { ...e, slot: -1 }, { x: at.x, y: at.y, a: at.a }, 0, 0, { a: standStill(at), fade: true });
}
