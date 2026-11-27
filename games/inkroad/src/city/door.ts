import { STEP } from '../sim/constants';
import type { LanePose, SpawnRequest } from '../sim/trafficTypes';
import type { VehicleKind } from '../sim/types';
import type { Leg, Place } from './day';
import { lotRect } from './geometry';
import { viewKind } from './stand';
import { emit, type City } from './state';
import { DRIVEWAY } from '../sim/tune';
import { TURN_IN_MOVE, TURN_OUT, TURN_OUT_MOVE } from './tune';

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

function tell(c: City, dir: 'in' | 'out', car: number, key: string, lane: LanePose, seconds: number, move: number, look: Look): void {
  emit(c, { t: 'park', dir, car, key, slot: -1, lane, seconds, move, tint: look.tint, kind: viewKind(look.kind) });
}

/** The car turns in at the building's entrance, holding its lane for the turn, then is gone inside. False: no door here. */
export function doorIn(c: City, uid: number, leg: Leg, look: Look, at: string | null = doorKey(leg, true), pose: LanePose | null = null): boolean {
  const key = at;
  const lane = key ? pose ?? c.traffic.poseOf(uid) : null;
  if (!key || !lane) return false;
  // The lane is free at once, as when such cars simply left the road: the view plays the turn in.
  c.traffic.remove(uid);
  tell(c, 'in', uid, key, lane, 0, TURN_IN_MOVE, look);
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
  if (!key || !lane) return true;
  // It joins the lane moving, as such cars always did: the move ends where the car's kerb slide begins.
  leg.door = { uid: DOOR_UID + leg.tag, goAt: c.clock + TURN_OUT_MOVE - TURN_OUT, lane: kerbStart(lane), key };
  tell(c, 'out', leg.door.uid, key, leg.door.lane, 0, TURN_OUT_MOVE - TURN_OUT, look);
  return TURN_OUT_MOVE - TURN_OUT <= STEP / 2;
}

/** It found its gap: the view hands it to the lane. */
export function doorGone(c: City, leg: Leg, uid: number): void {
  const d = leg.door;
  if (!d) return;
  emit(c, { t: 'parkGo', car: d.uid, key: d.key, lane: c.traffic.poseOf(uid) ?? d.lane, seconds: 0, uid });
  leg.door = undefined;
}

/** It gave up waiting at the edge: back inside. */
export function doorBack(c: City, leg: Leg, look: Look): void {
  const d = leg.door;
  if (!d) return;
  tell(c, 'in', d.uid, d.key, d.lane, 0, TURN_IN_MOVE, look);
  leg.door = undefined;
}

/** Where a car joining the lane moving is first drawn: beside its lane pose, toward the kerb (the sim's driveway slide). */
export function kerbStart(lane: LanePose): LanePose {
  return { x: lane.x - Math.sin(lane.a) * DRIVEWAY.slide, y: lane.y + Math.cos(lane.a) * DRIVEWAY.slide, a: lane.a };
}