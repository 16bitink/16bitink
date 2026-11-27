import { moveSeconds, planMove, roadSplit, type Mode } from '../sim/parkMove';
import { sizeOf } from '../sim/vehicleSize';
import { MOTION_SWITCHES } from '../sim/switches';
import { turning, type Pose } from '../sim/drivePath';
import { pointAt } from '../sim/geom';
import { halfWidth, laneOffset, lanesPerLink } from '../sim/roadGeom';
import { streetLoose } from '../sim/roadSlots';
import { lotRect, polyLength } from './geometry';
import { aisleRoute, bodyPose } from '../sim/slotGeometry';
import type { Access, LanePose } from '../sim/trafficTypes';
import type { Pt, Road } from '../sim/types';
import type { Standing } from './day';
import { roadSlots, sAlong, spanOf, standS } from './slots';
import type { City } from './state';

/**
 * How long a parking move takes (the owner, November 27: cars move like real cars): the city plans the same drivable
 * path the renderer draws (src/sim/parkMove.ts) from the lane pose to the car's slot, and holds the lane for its lane
 * part. Null where no slot is drawn (a door, a multi-storey's mouth, a double-parked car): the fixed times stay.
 */
export interface MoveTimes {
  /** Seconds the lane is held (the body is on the road), the whole move, and px along the path where that part ends. */
  readonly lane: number;
  readonly move: number;
  readonly split: number;
  /** The slot is across the road: the far lanes are crossed, at `at`. */
  readonly cross: boolean;
  readonly at: Access | null;
  /** The path's whole heading change (rad): over SWING it swings the car round, so it always takes its own time. */
  readonly turn: number;
}

/** A move that turns the car more than this (rad) swings it round (a U, a three-point turn): never squeezed into a fixed second. */
export const SWING = 2;

/** Kerb and street cars stand this far outside the paved width (the renderer's kerb stripe and half a car). */
export const KERB_OUT = 1.1 + 3.6;
/** Half a lane (px): a move holds its own lane while its body is in it. */
const LANE_HALF = 4.5;
/** Plans are drawn exactly; the city leaves this much more time so a slightly different slot never rushes. */
const SLACK = 1.05;

function roadSlotPose(c: City, e: Standing): Pose | null {
  const road = c.net.roads.find((r) => r.id === e.spot.id);
  const slot = roadSlots(c, e.spot)[e.slot];
  const s = e.s ?? standS(c, e.spot, spanOf(e.spot, e.slot, e.kind));
  if (!road || !slot || s === undefined) return null;
  const p = pointAt(road.line, s);
  const loose = e.spot.kind === 'street' ? streetLoose(road.id, e.slot) : { turn: 0, shove: 0 };
  const off = slot.side * (halfWidth(road) + KERB_OUT + loose.shove);
  // On a one-way street both kerbs face the way it runs (src/render/cars/parkingSlots.ts standing).
  return { x: p.x - Math.sin(p.heading) * off, y: p.y + Math.cos(p.heading) * off, a: p.heading + (slot.side < 0 && !(road.oneWay && MOTION_SWITCHES.ROAD_STOPS) ? Math.PI : 0) + loose.turn };
}

/** Junction ends keep this clear (the renderer's JUNCTION_CLEAR); a car park's mouth point is this far inside. */
const JUNCTION_CLEAR = 36;
const MOUTH_IN = 5;

/** A double-parked car stands in the outer lane on its side (src/render/cars/parkingSlots.ts doubleSlots). */
function doublePose(c: City, e: Standing): Pose | null {
  const road = c.net.roads.find((r) => r.id === e.spot.id);
  if (!road || e.s === undefined) return null;
  const side = e.side ?? 1;
  // Where it really stopped (lat): it stands there; else the middle of its outer lane, clear of the junctions.
  const p = pointAt(road.line, e.lat !== undefined ? e.s : Math.min(polyLength(road.line) - JUNCTION_CLEAR, Math.max(JUNCTION_CLEAR, e.s)));
  const outer = lanesPerLink(road) - 1;
  const off = e.lat ?? (side > 0 ? laneOffset(road, outer) : road.oneWay ? laneOffset(road, 0) : -laneOffset(road, outer));
  return { x: p.x - Math.sin(p.heading) * off, y: p.y + Math.cos(p.heading) * off, a: p.heading + (side < 0 ? Math.PI : 0) };
}

/** A multi-storey or underground car park's mouth, as the renderer aims at it (src/render/cars/manoeuvreCore.ts). */
function mouthPose(c: City, e: Standing, lane: LanePose): Pose | null {
  const park = c.parks.find((p) => p.id === e.spot.id);
  if (!park) return null;
  const r = lotRect(park);
  const ex = Math.min(r.x + r.w, Math.max(r.x, lane.x)), ey = Math.min(r.y + r.h, Math.max(r.y, lane.y));
  const a = Math.atan2(r.y + r.h / 2 - ey, r.x + r.w / 2 - ex);
  return { x: ex + Math.cos(a) * MOUTH_IN, y: ey + Math.sin(a) * MOUTH_IN, a };
}

/** The slot pose, the drawn mode and the car park route of a standing car, as the renderer lays them out. */
export function slotOfStanding(c: City, e: Standing, lane?: LanePose): { pose: Pose; mode: Mode; via?: readonly Pt[] } | null {
  const k = e.spot.kind;
  if (k === 'double') { const pose = doublePose(c, e); return pose ? { pose, mode: 'double' } : null; }
  if (k === 'park' && !e.spot.layout && lane) { const pose = mouthPose(c, e, lane); return pose ? { pose, mode: 'enter' } : null; }
  if (k === 'kerb' || k === 'street') { const pose = roadSlotPose(c, e); return pose ? { pose, mode: k === 'street' && MOTION_SWITCHES.ROAD_STOPS ? 'pullover' : 'parallel' } : null; }
  const l = e.spot.layout;
  if (!l || e.slot < 0) return null;
  const pose = bodyPose(l, spanOf(e.spot, e.slot, e.kind), e.kind);
  if (!pose) return null;
  if (l.aisle) return { pose, mode: 'aisle', via: aisleRoute(l, pose) ?? undefined };
  return { pose, mode: k === 'private' ? 'parallel' : 'bay' };
}

/** The road a move crosses and where: its own road for kerb places, else the place's access road. */
function roadAt(c: City, e: Standing, lane: LanePose): { road: Road; s: number } | null {
  const id = e.spot.kind === 'kerb' || e.spot.kind === 'street' ? e.spot.id : 'road' in e.spot.access ? e.spot.access.road : -1;
  const road = c.net.roads.find((r) => r.id === id);
  return road ? { road, s: sAlong(road, lane) } : null;
}

/** The move swings the car round and the HONEST_SWINGS switch asks for its own time. */
export const swingsRound = (t: MoveTimes): boolean => MOTION_SWITCHES.HONEST_SWINGS && t.turn > SWING;

/** The planned times when the switch asks for them, or when the move swings the car round (SWING): null keeps the fixed seconds. */
export function honestTimes(c: City, e: Standing, lane: LanePose | null, dir: 'in' | 'out', planned: boolean): MoveTimes | null {
  const t = lane ? moveTimes(c, e, lane, dir) : null;
  return t && (planned || swingsRound(t)) ? t : null;
}

export function moveTimes(c: City, e: Standing, lane: LanePose, dir: 'in' | 'out'): MoveTimes | null {
  const slot = slotOfStanding(c, e, lane);
  const on = e.spot.kind === 'double' ? null : roadAt(c, e, lane);
  if (!slot || (!on && e.spot.kind !== 'double')) return null;
  const plan = planMove(slot.mode, lane, slot.pose, dir, slot.via);
  const p = on ? pointAt(on.road.line, on.s) : null;
  // A double-parked car is on the road throughout: its plan's own split (it stands, then eases over) is the timing.
  const left = (slot.pose.x - lane.x) * -Math.sin(lane.a) + (slot.pose.y - lane.y) * Math.cos(lane.a) < 0;
  const cross = !!on && left && !on.road.oneWay;
  // The lane is held while the body is in it: its own lane, or (turning across) the whole road it crosses.
  const band = cross && p ? { centre: { x: p.x, y: p.y, a: p.heading }, half: halfWidth(on!.road) } : { centre: lane, half: LANE_HALF };
  const split = on ? roadSplit(plan, dir, band.centre, band.half, sizeOf(e.kind)) : plan.split;
  const t = moveSeconds(plan, dir, split);
  const laneS = t.lane * SLACK;
  return { lane: laneS, move: laneS + t.off * SLACK, split, cross, at: on ? { road: on.road.id, s: on.s } : null, turn: turning(plan.path.segs) };
}


/** A move into (or out of) a building's mouth, with no space drawn (src/city/door.ts): its lane part and its whole time. */
export function doorTimes(c: City, key: string, lane: LanePose, dir: 'in' | 'out', kind: Standing['kind']): MoveTimes | null {
  const [k, id] = key.split(':');
  const where = k === 'lot' ? c.lots.find((l) => l.id === Number(id)) : k === 'park' ? c.parks.find((p) => p.id === Number(id)) : undefined;
  if (!where) return null;
  const r = lotRect(where);
  const ex = Math.min(r.x + r.w, Math.max(r.x, lane.x)), ey = Math.min(r.y + r.h, Math.max(r.y, lane.y));
  const a = Math.atan2(r.y + r.h / 2 - ey, r.x + r.w / 2 - ex);
  const plan = planMove('enter', lane, { x: ex + Math.cos(a) * MOUTH_IN, y: ey + Math.sin(a) * MOUTH_IN, a }, dir);
  const split = roadSplit(plan, dir, lane, LANE_HALF, sizeOf(kind));
  const t = moveSeconds(plan, dir, split);
  return { lane: t.lane * SLACK, move: (t.lane + t.off) * SLACK, split, cross: false, at: null, turn: turning(plan.path.segs) };
}
