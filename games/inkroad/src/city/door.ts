import { pointAt } from '../sim/geom';
import { STEP } from '../sim/constants';
import type { Access, LanePose, SpawnRequest } from '../sim/trafficTypes';
import type { VehicleKind } from '../sim/types';
import { carById } from './households';
import type { Leg, Place } from './day';
import { lotRect } from './geometry';
import { endOf, fitsInside, planDoor, type TryMerge } from './movePlan';
import { hitsBody, rollingJoin } from './manoeuvre';
import { viewKind } from './stand';
import { emit, roadById, type City } from './state';
import type { MovePlay } from '../sim/types';
import { firstPose, lastPose, playedAt, standingAt } from '../sim/vehicle/played';
import { paramsOf } from '../sim/vehicle/params';
import type { Rect } from './geometry';

/**
 * Cars with no space of their own drawn (a lorry at its depot, a taxi at the door, a visitor who puts the car in the
 * garage) still never appear or vanish in the lane: they drive through the building's entrance, as cars
 * do at a multi-storey car park, and they come out of it the same way. Every such move is a `park` event with
 * `slot` -1 and the building's place key; the view draws it into (or out of) that place's mouth.
 */

/** Uids of door moves told before the car is on the road: above every traffic uid, below the fleet's (2^30 up). */
const DOOR_UID = 0x2000_0000;
/** Seconds between the looks of a car whose way out of a building is blocked by a parked car. */
const DOOR_LOOK = 3;
/** Allow the tracker a small settling error when it hands a car to the traffic lane. */
const DOOR_LANE_TOLERANCE = 5;

export const atDoorLane = (a: LanePose, b: LanePose): boolean =>
  Math.hypot(a.x - b.x, a.y - b.y) <= DOOR_LANE_TOLERANCE && Math.cos(a.a - b.a) >= 0.9;

export interface Look { readonly kind: VehicleKind; readonly tint: number }

/** The building a car turns into (arriving) or comes out of. Null: a gate, where cars come and go anyway. */
export function doorKey(leg: Leg, arriving: boolean): string | null {
  const spot = leg.spot;
  if (arriving && spot && (spot.kind === 'home' || spot.kind === 'private' || spot.kind === 'park')) return spot.key;
  const parked = leg.leaving?.spot;
  if (!arriving && parked && (parked.kind === 'home' || parked.kind === 'private' || parked.kind === 'park')) return parked.key;
  const p: Place = arriving ? leg.target : leg.out ? leg.tour.from : leg.tour.to;
  return 'lot' in p ? `lot:${p.lot}` : null;
}

function tell(c: City, dir: 'in' | 'out', car: number, key: string, lane: LanePose, seconds: number, move: number, look: Look, play: MovePlay): void {
  emit(c, { t: 'park', dir, car, key, slot: -1, lane, seconds, move, tint: look.tint, kind: viewKind(look.kind), play });
}

/** The building or car park a door key names. */
function siteOf(c: City, key: string) {
  const [k, id] = key.split(':');
  return k === 'lot' ? c.lots.find((l) => l.id === Number(id)) : k === 'park' ? c.parks.find((p) => p.id === Number(id)) : undefined;
}

export function garageAccess(c: City, key: string | undefined): Access | null {
  return key ? siteOf(c, key)?.access ?? null : null;
}

function rectOf(c: City, key: string): Rect | null {
  const site = siteOf(c, key);
  if (!site) return null;
  return lotRect(site);
}

/** Drive through the entrance only when the whole car reaches the indoor pose. */
export function doorIn(c: City, uid: number, key: string, look: Look, lane: LanePose, car = uid): LanePose | null {
  const rect = rectOf(c, key);
  if (!rect) return null;
  const m = planDoor(c, rect, lane, 'in', look.kind, uid);
  const end = endOf(m.played);
  if (!m.played.fits || !fitsInside(rect, end, look.kind)) return null;
  if (c.traffic.sweeps.hit(m.played, 0, look.kind, car) >= 0 || !c.traffic.park(uid, Math.max(STEP, m.lane))) return null;
  c.traffic.sweeps.put(car, m.played, 0, look.kind, false);
  tell(c, 'in', car, key, lane, m.lane, m.played.seconds, look, { a: m.played });
  return end;
}

/**
 * Before a car with no space of its own enters the lane, it drives out of the building's entrance to the lane edge.
 * True: it is at the edge (or needs no move), ready for a gap. False: the move is under way.
 */
export function doorReady(c: City, leg: Leg, req: SpawnRequest, look: Look, tryMerge: TryMerge): boolean {
  if (leg.door) return c.clock >= leg.door.goAt - STEP / 2;
  if (leg.doorLook !== undefined && c.clock < leg.doorLook) return false;
  const car = carById(c, leg.car);
  const key = car?.garage ?? doorKey(leg, false);
  const lane = key ? c.traffic.entryPose(req) : null;
  const rect = key ? rectOf(c, key) : null;
  if (!key || !lane || !rect) return false;
  // Out of the mouth to the lane edge (it waits there for its gap), then into the lane, where its spawn stands that long.
  const uid = DOOR_UID + leg.tag;
  const road = 'road' in req.from ? roadById(c, req.from.road) : undefined;
  let from = road && 'road' in req.from
    ? { ...req.from, dir: Math.cos(lane.a - pointAt(road.line, req.from.s).heading) > 0 ? 1 as const : -1 as const }
    : req.from;
  let m = planDoor(c, rect, lane, 'out', look.kind, uid, car?.garagePose ? { parked: car.garagePose } : undefined);
  if ((!m || !m.toEdge.fits || !m.played.fits) && 'road' in from && from.dir) {
    // Keep the garage mouth fixed. A nearby bay can block the original turn onto the road.
    const start = from;
    const offers = [-12, 12, 24, 36, 48].flatMap((d) => {
      const access = { ...start, s: start.s + d * start.dir! };
      const pose = c.traffic.entryPose({ ...req, from: access });
      return pose && Math.cos(lane.a - pose.a) >= 0.9 ? [{ access, pose, cost: Math.abs(d) / 4 }] : [];
    });
    const other = offers.length ? planDoor(c, rect, lane, 'out', look.kind, uid, { goals: offers, ...(car?.garagePose ? { parked: car.garagePose } : {}) }) : null;
    if (other?.toEdge.fits && other.played.fits) { m = other; from = offers[other.goal]!.access; }
  }
  if (!m || hitsBody(m.toEdge) || hitsBody(m.played)) { leg.doorLook = c.clock + DOOR_LOOK; return false; }
  const end = lastPose(m.played);
  const goal = { x: end.x, y: end.y, a: end.th };
  const target = c.traffic.entryPose({ ...req, from });
  if (!target || !atDoorLane(target, goal)) { leg.doorLook = c.clock + DOOR_LOOK; return false; }
  const sw = c.traffic.sweeps;
  if (sw.hit(m.toEdge, 0, look.kind, uid, true) >= 0 || sw.hit(m.played, m.toEdge.seconds, look.kind, uid) >= 0) return false;
  if (m.toEdge.fits && m.played.fits) {
    const rolling = m.roll();
    const into = rollingJoin(c, req, from, rolling, look.kind, uid);
    if (into && tryMerge(from, into, rolling)) {
      const first = firstPose(rolling);
      const approach = standingAt(paramsOf(look.kind), { x: first.x, y: first.y, a: first.th });
      const hold = Math.max(STEP, rolling.seconds);
      leg.door = { uid, from, approach, goAt: c.clock, lane: into, key, hold, join: rolling };
      tell(c, 'out', uid, key, into, hold, hold, look, { a: approach, b: rolling });
      return true;
    }
  }
  sw.put(uid, m.toEdge, 0, look.kind, true, m.played);
  leg.door = { uid, from, approach: m.toEdge, goAt: c.clock + m.toEdge.seconds, lane: goal, key, hold: Math.max(STEP, m.lane), join: m.played };
  tell(c, 'out', leg.door.uid, key, leg.door.lane, leg.door.hold, m.toEdge.seconds + leg.door.hold, look, { a: m.toEdge, b: m.played });
  return m.toEdge.seconds <= STEP / 2;
}

/** It found its gap: the view hands it to the lane. */
export function doorGone(c: City, leg: Leg, uid: number, look: Look): void {
  const d = leg.door;
  if (!d) return;
  emit(c, { t: 'parkGo', car: d.uid, key: d.key, lane: c.traffic.poseOf(uid) ?? d.lane, seconds: d.hold, uid });
  c.traffic.sweeps.drop(d.uid);
  // Under its traffic uid: the car it becomes never takes its own way in for a body in its way.
  if (d.join) c.traffic.sweeps.put(-uid, d.join, 0, look.kind, false, undefined, true);
  leg.door = undefined;
}

/** It gave up waiting at the edge: back inside. */
export function doorBack(c: City, leg: Leg, look: Look): boolean {
  const d = leg.door;
  if (!d) return true;
  const rect = rectOf(c, d.key);
  if (!rect) return false;
  const at = playedAt(d.approach, Math.max(0, d.approach.seconds + c.clock - d.goAt), { x: 0, y: 0, a: 0 });
  const parked = carById(c, leg.car)?.garagePose;
  const m = planDoor(c, rect, at, 'in', look.kind, d.uid, parked ? { parked } : undefined);
  if (!m.played.fits || !fitsInside(rect, endOf(m.played), look.kind)
    || c.traffic.sweeps.hit(m.played, 0, look.kind, d.uid) >= 0) return false;
  leg.door = undefined;
  c.traffic.sweeps.put(d.uid, m.played, 0, look.kind, false);
  tell(c, 'in', d.uid, d.key, at, 0, m.played.seconds, look, { a: m.played });
  return true;
}
