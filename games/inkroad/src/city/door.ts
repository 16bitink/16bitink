import { STEP } from '../sim/constants';
import type { LanePose, SpawnRequest } from '../sim/trafficTypes';
import type { VehicleKind } from '../sim/types';
import type { Leg, Place } from './day';
import { lotRect } from './geometry';
import { planDoor } from './movePlan';
import { viewKind } from './stand';
import { emit, type City } from './state';
import type { MovePlay } from '../sim/types';
import { lastPose } from '../sim/vehicle/played';
import type { Rect } from './geometry';

/**
 * Cars with no space of their own drawn (a lorry at its depot, a taxi at the door, a visitor who puts the car in the
 * garage) still never appear or vanish in the lane: they turn in at the building's entrance and fade inside, as cars
 * do at a multi-storey car park, and they come out of it the same way. Every such move is a `park` event with
 * `slot` -1 and the building's place key; the view draws it into (or out of) that place's mouth.
 */

/** Uids of door moves told before the car is on the road: above every traffic uid, below the fleet's (2^30 up). */
const DOOR_UID = 0x2000_0000;

export interface Look { readonly kind: VehicleKind; readonly tint: number }

/** The building a car turns into (arriving) or comes out of. Null: a gate, where cars come and go anyway. */
export function doorKey(leg: Leg, arriving: boolean): string | null {
  const spot = leg.spot;
  if (arriving && spot && (spot.kind === 'home' || spot.kind === 'private' || spot.kind === 'park')) return spot.key;
  const p: Place = arriving ? leg.target : leg.out ? leg.tour.from : leg.tour.to;
  return 'lot' in p ? `lot:${p.lot}` : null;
}

function tell(c: City, dir: 'in' | 'out', car: number, key: string, lane: LanePose, seconds: number, move: number, look: Look, play: MovePlay): void {
  emit(c, { t: 'park', dir, car, key, slot: -1, lane, seconds, move, tint: look.tint, kind: viewKind(look.kind), play });
}

/** The rect of the building (or car park) a door key names. */
function rectOf(c: City, key: string): Rect | null {
  const [k, id] = key.split(':');
  const where = k === 'lot' ? c.lots.find((l) => l.id === Number(id)) : k === 'park' ? c.parks.find((p) => p.id === Number(id)) : undefined;
  return where ? lotRect(where) : null;
}

/** The car turns in at the building's entrance along its played move, holding its lane while its body is in it. False: no door here. */
export function doorIn(c: City, uid: number, leg: Leg, look: Look, at: string | null = doorKey(leg, true), pose: LanePose | null = null): boolean {
  const key = at;
  const lane = key ? pose ?? c.traffic.poseOf(uid) : null;
  const rect = key ? rectOf(c, key) : null;
  if (!key || !lane || !rect) return false;
  const m = planDoor(c, rect, lane, 'in', look.kind, uid);
  if (!c.traffic.park(uid, Math.max(STEP, m.lane))) c.traffic.remove(uid);
  tell(c, 'in', uid, key, lane, m.lane, m.played.seconds, look, { a: m.played, fade: true });
  return true;
}

/** Px from a car to a building's edge it may turn in at for the night. */
const NIGHT_REACH = 48;

/** The nearest building to a car on the road, within reach: where a car still stuck out at night pulls in. */
export function nearestDoor(c: City, p: { readonly x: number; readonly y: number } | null): string | null {
  if (!p) return null;
  let best: string | null = null;
  let d = NIGHT_REACH;
  for (const l of c.lots) {
    if (l.level <= 0) continue;
    const r = lotRect(l);
    const k = Math.hypot(Math.max(r.x - p.x, 0, p.x - r.x - r.w), Math.max(r.y - p.y, 0, p.y - r.y - r.h));
    if (k < d) { d = k; best = `lot:${l.id}`; }
  }
  return best;
}

/** Does this leg come out of a building (no space of its own to pull out of, not a gate)? */
export const needsDoor = (req: SpawnRequest): boolean => !('gate' in req.from);

/**
 * Before a car with no space of its own enters the lane, it drives out of the building's entrance to the lane edge.
 * True: it is at the edge (or needs no move), ready for a gap. False: the move is under way.
 */
export function doorReady(c: City, leg: Leg, req: SpawnRequest, look: Look): boolean {
  if (leg.door) return c.clock >= leg.door.goAt - STEP / 2;
  const key = doorKey(leg, false);
  const lane = key ? c.traffic.entryPose(req) : null;
  const rect = key ? rectOf(c, key) : null;
  if (!key || !lane || !rect) return true;
  // Out of the mouth to the lane edge (it waits there for its gap), then into the lane, where its spawn stands that long.
  const m = planDoor(c, rect, lane, 'out', look.kind, DOOR_UID + leg.tag);
  const end = lastPose(m.played);
  leg.door = { uid: DOOR_UID + leg.tag, goAt: c.clock + m.toEdge.seconds, lane: { x: end.x, y: end.y, a: end.th }, key, hold: Math.max(STEP, m.lane) };
  tell(c, 'out', leg.door.uid, key, leg.door.lane, leg.door.hold, m.toEdge.seconds + leg.door.hold, look, { a: m.toEdge, b: m.played, fade: true });
  return m.toEdge.seconds <= STEP / 2;
}

/** It found its gap: the view hands it to the lane. */
export function doorGone(c: City, leg: Leg, uid: number): void {
  const d = leg.door;
  if (!d) return;
  emit(c, { t: 'parkGo', car: d.uid, key: d.key, lane: c.traffic.poseOf(uid) ?? d.lane, seconds: d.hold, uid });
  leg.door = undefined;
}

/** It gave up waiting at the edge: back inside. */
export function doorBack(c: City, leg: Leg, look: Look): void {
  const d = leg.door;
  if (!d) return;
  const rect = rectOf(c, d.key);
  leg.door = undefined;
  if (!rect) return;
  const m = planDoor(c, rect, d.lane, 'in', look.kind, d.uid);
  tell(c, 'in', d.uid, d.key, d.lane, 0, m.played.seconds, look, { a: m.played, fade: true });
}
