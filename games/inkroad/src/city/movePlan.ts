/**
 * Every parking move planned with the vehicle model (docs/inkroad-vehicle-model.md "Phase B"): from where the car
 * really stands (its drawn pose in the lane, or its space) to where it goes, on the real ground of that place
 * (src/city/moveGround.ts), played once by the tracker (src/sim/vehicle/moves.ts). The city holds the lane for the
 * part of the played move the body is in it, the view draws the very same frames, and the car stands where the move
 * ended. Replaces the fixed hold times and the drawn-path timings of before.
 */
import { pointAt, project } from '../sim/geom';
import { LANE } from '../sim/constants';
import { halfWidth, laneOffset, lanesPerLink } from '../sim/roadGeom';
import { streetLoose } from '../sim/roadSlots';
import { bodyPose } from '../sim/slotGeometry';
import type { Access, LanePose } from '../sim/trafficTypes';
import type { Pt, Road, VehicleKind } from '../sim/types';
import { paramsOf, type VehicleParams } from '../sim/vehicle/params';
import { inBand, joinPlayed, lastPose, secondsUntilOut, type Band, type Played } from '../sim/vehicle/played';
import { laneOffers, playInto, playOutOf, type MiddlePose } from '../sim/vehicle/moves';
import type { Standing } from './day';
import { lotRect, polyLength, type Rect } from './geometry';
import { groundFor, nearestRoad, roadSide, type Ground } from './moveGround';
import { logMove } from '../sim/moveLog';
import { inPlan, type Aisle } from '../sim/slotGeometry';
import { aisleIn, aisleOut } from './aislePlan';
import { roadSlots, spanOf, standS } from './slots';
import type { City } from './state';

/** Kerb and street cars stand this far outside the paved width (the renderer's kerb stripe and half a car). */
export const KERB_OUT = 1.1 + 3.6;
/** Half a lane (px): a move holds its own lane while its body is in it. */
const LANE_HALF = LANE / 2;
/** Junction ends keep this clear (the renderer's JUNCTION_CLEAR); a mouth's point is this far inside. */
const JUNCTION_CLEAR = 36;
const GARAGE_CLEARANCE = 3;
/** Px of lane ahead of its access a car leaving a space may join at (goal offers). */
const JOIN_AHEAD = 72;

const roadOf = (c: City, id: number): Road | undefined => c.net.roads.find((r) => r.id === id);
const off = (p: { readonly x: number; readonly y: number; readonly heading: number }, d: number): Pt => ({ x: p.x - Math.sin(p.heading) * d, y: p.y + Math.cos(p.heading) * d });

function roadSlotPose(c: City, e: Standing): MiddlePose | null {
  const road = roadOf(c, e.spot.id);
  const slot = roadSlots(c, e.spot)[e.slot];
  const s = e.s ?? standS(c, e.spot, spanOf(e.spot, e.slot, e.kind));
  if (!road || !slot || s === undefined) return null;
  const p = pointAt(road.line, s);
  const loose = e.spot.kind === 'street' ? streetLoose(road.id, e.slot) : { turn: 0, shove: 0 };
  const q = off(p, slot.side * (halfWidth(road) + KERB_OUT + loose.shove));
  // On a one-way street both kerbs face the way it runs (src/render/cars/parkingSlots.ts standing).
  return { ...q, a: p.heading + (slot.side < 0 && !road.oneWay ? Math.PI : 0) + loose.turn };
}

/** A car stopped on the road stands where it stopped (lat), else in the middle of its outer lane (src/render/cars/parkingSlots.ts doubleSlots). */
function doublePose(c: City, e: Standing): MiddlePose | null {
  const road = roadOf(c, e.spot.id);
  if (!road || e.s === undefined) return null;
  const side = e.side ?? 1;
  const p = pointAt(road.line, e.lat !== undefined ? e.s : Math.min(polyLength(road.line) - JUNCTION_CLEAR, Math.max(JUNCTION_CLEAR, e.s)));
  const outer = lanesPerLink(road) - 1;
  const lat = e.lat ?? (side > 0 ? laneOffset(road, outer) : road.oneWay ? laneOffset(road, 0) : -laneOffset(road, outer));
  return { ...off(p, lat), a: p.heading + (side < 0 ? Math.PI : 0) };
}

/** A building's or a multi-storey's mouth as seen from a lane pose: the point of its rect nearest the lane, a little inside. */
export function mouthOf(r: Rect, lane: Pt, kind: VehicleKind): MiddlePose {
  const ex = Math.min(r.x + r.w, Math.max(r.x, lane.x)), ey = Math.min(r.y + r.h, Math.max(r.y, lane.y));
  const a = Math.atan2(r.y + r.h / 2 - ey, r.x + r.w / 2 - ex);
  // The whole car clears the façade before it stops indoors.
  const depth = paramsOf(kind).len / 2 + GARAGE_CLEARANCE;
  const x = r.x + r.w / 2, y = r.y + r.h / 2;
  const extra = Math.min(Math.hypot(x - ex, y - ey), depth);
  return { x: ex + Math.cos(a) * extra, y: ey + Math.sin(a) * extra, a };
}

export function fitsInside(r: Rect, q: MiddlePose, kind: VehicleKind): boolean {
  const { len, wid } = paramsOf(kind);
  const x = (Math.abs(Math.cos(q.a)) * len + Math.abs(Math.sin(q.a)) * wid) / 2;
  const y = (Math.abs(Math.sin(q.a)) * len + Math.abs(Math.cos(q.a)) * wid) / 2;
  return q.x - x >= r.x && q.x + x <= r.x + r.w && q.y - y >= r.y && q.y + y <= r.y + r.h;
}

/** Where a standing car's space is (its body's middle) and whether it is indoors. Null: no space drawn. */
export function spaceOf(c: City, e: Standing, lane?: LanePose | null): { pose: MiddlePose; indoor: boolean } | null {
  const k = e.spot.kind;
  if (k === 'double') { const pose = doublePose(c, e); return pose ? { pose, indoor: false } : null; }
  if (k === 'park' && !e.spot.layout) {
    const park = c.parks.find((p) => p.id === e.spot.id);
    return park && lane ? { pose: mouthOf(lotRect(park), lane, e.kind), indoor: true } : null;
  }
  if (k === 'kerb' || k === 'street') { const pose = roadSlotPose(c, e); return pose ? { pose, indoor: false } : null; }
  const l = e.spot.layout;
  if (!l || e.slot < 0) return null;
  const pose = bodyPose(l, spanOf(e.spot, e.slot, e.kind), e.kind);
  return pose ? { pose, indoor: false } : null;
}

/** Where a standing car is drawn: where its move in ended, else its space. */
export function standPose(c: City, e: Standing): MiddlePose | null {
  return e.stood ?? spaceOf(c, e)?.pose ?? null;
}

/** The road a move is on or crosses: its own road for road places, else the place's access road. */
function moveRoad(c: City, e: Standing): Road | undefined {
  const k = e.spot.kind;
  const poses = e.spot.layout?.poses ?? [];
  const a = e.spot.layout?.aisle;
  if (k === 'sand' && a) return nearestRoad(c, inPlan(a, a.gate));
  if (k === 'sand' && poses.length) return nearestRoad(c, poses[0]!);
  return roadOf(c, k === 'kerb' || k === 'street' || k === 'double' ? e.spot.id : 'road' in e.spot.access ? e.spot.access.road : -1);
}

/** The band a move holds: its own lane, or (turning across a two-way road) the whole road. */
function bandOf(road: Road | undefined, lane: LanePose, cross: boolean): Band {
  if (cross && road) { const n = project(road.line, lane); const h = pointAt(road.line, n.s).heading; return { x: n.x, y: n.y, a: h, half: halfWidth(road) }; }
  return { x: lane.x, y: lane.y, a: lane.a, half: LANE_HALF };
}

/**
 * Does the played move put any of the body over the far half of a two-way road (the oncoming lanes, as seen from
 * `side`)? A nose swinging over the line while backing into a kerb space does: the driver waits for the oncoming
 * lanes to be clear and holds them while it is there.
 */
function reachesFar(m: Played, road: Road | undefined, at: Pt, side: 1 | -1, len: number, wid: number): boolean {
  if (!road || road.oneWay) return false;
  const n = project(road.line, at);
  const h = pointAt(road.line, n.s).heading;
  const hw = halfWidth(road);
  // The far half: centred hw/2 to the other side of the line (screen axes: side +1 is the line's right, -sin/cos).
  const off = -side * hw / 2;
  const far: Band = { x: n.x - Math.sin(h) * off, y: n.y + Math.cos(h) * off, a: h, half: hw / 2 - 0.3 };
  for (let i = 0; i < m.n; i += 3) {
    const o = i * 3;
    if (inBand(far, m.frames[o]!, m.frames[o + 1]!, m.frames[o + 2]!, len, wid)) return true;
  }
  return false;
}

/** Is the space across the road from the lane (on its left, on a two-way road)? */
const isAcross = (road: Road | undefined, lane: LanePose, at: Pt): boolean =>
  !!road && !road.oneWay && (at.x - lane.x) * -Math.sin(lane.a) + (at.y - lane.y) * Math.cos(lane.a) < -LANE_HALF;

export interface InPlan {
  readonly played: Played;
  readonly indoor: boolean;
  /** Seconds from the start the body is in the lane it holds (or the road it crosses). */
  readonly lane: number;
  readonly cross: Access | null;
  /** Seconds of it standing in its lane first, for a gap across the road. */
  readonly wait: number;
}

/** Reserve the joining pose in traffic before committing to a continuous pull-out. */
export type TryMerge = (from: Access, lane: LanePose, merge: Played) => boolean;

export interface OutPlan {
  readonly roll: () => Played;
  readonly toEdge: Played;
  readonly join: Played;
  /** Seconds the lane is held: the part from the edge into the lane. */
  readonly lane: number;
  /** Where on its road the car joins the lane (the goal chosen). */
  readonly s: number;
  readonly cross: Access | null;
}

/** A turn round on the road (a car stopped facing away from its way on): reversing may cross the road, so it waits for both ways clear. */
const turnsRound = (from: MiddlePose, to: MiddlePose): boolean => Math.cos(from.a - to.a) < 0;

/** Px and rad within which a standing car is on its lane line already. */
const ON_LINE = 3, ON_HEADING = 0.15;
function nearLine(q: MiddlePose, lane: LanePose): boolean {
  const lat = (q.x - lane.x) * -Math.sin(lane.a) + (q.y - lane.y) * Math.cos(lane.a);
  return Math.abs(lat) < ON_LINE && Math.abs(Math.sin(q.a - lane.a)) < ON_HEADING && Math.cos(q.a - lane.a) > 0;
}

/** The move into a space from the drawn pose in the lane. Null: no space drawn (the old door path). */
export function planIn(c: City, e: Standing, lane: LanePose, uid = -1, gap: (at: Access, a: number) => number = () => 0, after = 0): InPlan | null {
  const t0 = performance.now();
  const p = paramsOf(e.kind);
  restAhead(c, e, lane, p);
  const space = spaceOf(c, e, lane);
  if (!space) return null;
  const road = moveRoad(c, e);
  const cross = e.spot.kind !== 'double' && isAcross(road, lane, space.pose);
  const turn = turnsRound(lane, space.pose);
  const ask = { spot: e.spot, from: lane, to: space.pose, self: e.uid, road: uid, poseOf: (o: Standing) => standPose(c, o), mouth: space.indoor ? mouthArea(c, e) : null, ...(road && !turn ? { reverseOn: { road: road.id, side: roadSide(road, lane) } } : {}) };
  const w = groundFor(c, ask);
  const aisle = aisleOf(e);
  // A car park bay is reached by its aisle, on the aisle's ground only (falling back to the whole park where that does not fit).
  const wa = aisle && road ? groundFor(c, { ...ask, bay: space.pose, reverseOn: { road: road.id, side: roadSide(road, lane) } }) : null;
  const backIn = e.spot.kind === 'home';
  // Across the road it stops in its lane and waits for its gap first (the wait is part of the move it plays).
  const at0 = road ? { road: road.id, s: project(road.line, lane).s } : null;
  // A multi-storey's or underground mouth is driven into nose first.
  const play = (pause: number): Played => (aisle && wa ? aisleIn(p, lane, space.pose, aisle, wa, pause) : null) ?? playInto(p, lane, space.pose, w, !space.indoor, { turnaround: turn, backIn: backIn && !cross, forwardOnly: (cross && !turn) || e.spot.kind === 'double' || space.indoor, onRoad: e.spot.kind === 'double', pause }, lane.v ?? 0, lane.acc ?? 0, lane.delta ?? 0);
  // `after`: it stands that long first in any case (another move's body is in its way until then).
  let wait = Math.max(after, cross && at0 ? gap(at0, lane.a) : 0);
  let played = play(wait);
  const side = road ? roadSide(road, lane) : 1;
  const over = !cross && e.spot.kind !== 'double' && reachesFar(played, road, lane, side, p.len, p.wid);
  // Its nose swings over the line (backing into a kerb space): it waits for a gap in the far lanes too.
  const late = over && at0 ? gap(at0, lane.a) : 0;
  if (late > wait) { wait = late; played = play(late); }
  const building = space.indoor ? mouthArea(c, e) : null;
  if (building && !fitsInside(building.rect, endOf(played), e.kind)) played = { ...played, fits: false };
  const band = bandOf(road, lane, cross);
  const laneS = secondsUntilOut(played, band, p.len, p.wid);
  logMove({ what: 'in', kind: e.spot.kind, seconds: played.seconds, lane: laneS, fits: played.fits, ms: performance.now() - t0, word: played.word, from: lane, to: space.pose });
  const at = road ? { road: road.id, s: project(road.line, lane).s } : null;
  return { played, indoor: space.indoor, lane: e.spot.kind === 'double' ? played.seconds : laneS, cross: (cross || over) && at ? at : null, wait };
}

/**
 * A car stopping on the road (double parking, a taxi, a pump queue) still rolling comes to rest where its comfortable
 * braking takes it, never past its stop and back: its stop moves on along the road to there.
 */
function restAhead(c: City, e: Standing, lane: LanePose, p: VehicleParams): void {
  if (e.spot.kind !== 'double' || e.s === undefined) return;
  const road = roadOf(c, e.spot.id);
  const goal = spaceOf(c, e, lane)?.pose;
  const v = lane.v ?? 0;
  if (!road || !goal || v < 0.5) return;
  const stop = (v * v) / (2 * p.planBrake * REST_SHARE) + 1;
  const along = (goal.x - lane.x) * Math.cos(lane.a) + (goal.y - lane.y) * Math.sin(lane.a);
  if (along >= stop) return;
  const way = Math.cos(lane.a - pointAt(road.line, e.s).heading) >= 0 ? 1 : -1;
  e.s = Math.min(polyLength(road.line) - JUNCTION_CLEAR / 2, Math.max(JUNCTION_CLEAR / 2, e.s + way * (stop - along)));
}
/** As src/sim/vehicle/moves.ts: braking gentler than the planned most. */
const REST_SHARE = 0.7;

/** The aisle of a two-row car park the standing car's place has (none elsewhere). */
const aisleOf = (e: Standing): Aisle | undefined => (e.spot.kind === 'park' || e.spot.kind === 'sand' ? e.spot.layout?.aisle : undefined);

function mouthArea(c: City, e: Standing): { rect: Rect; at: Pt } | null {
  const park = c.parks.find((q) => q.id === e.spot.id);
  if (!park) return null;
  const r = lotRect(park);
  return { rect: r, at: { x: r.x + r.w / 2, y: r.y + r.h / 2 } };
}

/** Lane poses along a road at its outer lane, the way `base` faces, for goal offers. */
function laneAlong(road: Road, base: LanePose): { at: (s: number) => MiddlePose | null; s0: number; way: 1 | -1 } {
  const n = project(road.line, base);
  const h = pointAt(road.line, n.s).heading;
  const way: 1 | -1 = Math.cos(base.a - h) >= 0 ? 1 : -1;
  const lat = (base.x - n.x) * -Math.sin(h) + (base.y - n.y) * Math.cos(h);
  const len = polyLength(road.line);
  const at = (s: number): MiddlePose | null => {
    if (s < JUNCTION_CLEAR / 2 || s > len - JUNCTION_CLEAR / 2) return null;
    const q = pointAt(road.line, s);
    return { ...off(q, lat), a: q.heading + (way < 0 ? Math.PI : 0) };
  };
  return { at, s0: n.s, way };
}

/**
 * The move out of a space to the lane, starting at the spawn pose `lane` the sim would give (its access) and
 * offering the lane ahead of it too: the cheapest that fits wins, and the car joins there.
 */
export function planOut(c: City, e: Standing, lane: LanePose, ahead = JOIN_AHEAD): OutPlan | null {
  const t0 = performance.now();
  const space = spaceOf(c, e, lane);
  const stood = e.stood ?? space?.pose;
  if (!stood || !space) return null;
  // Inside a multi-storey or underground the car has turned round: it comes out of the mouth nose first.
  const roadside = (e.blockUid ?? -1) >= 0;
  const indoor = space.indoor && !roadside;
  const from = indoor ? { ...stood, a: stood.a + Math.PI } : stood;
  const p = paramsOf(e.kind);
  const road = moveRoad(c, e);
  const turn = turnsRound(from, lane);
  const along = road ? laneAlong(road, lane) : null;
  const goals = along ? laneOffers((d) => along.at(along.s0 + along.way * (d - along.s0)), along.s0, ahead) : [];
  const offers = goals.length ? goals : [{ s: 0, pose: lane, cost: 0 }];
  const cross = e.spot.kind !== 'double' && isAcross(road, lane, from);
  const ask = { spot: e.spot, from, to: lane, self: e.uid, poseOf: (o: Standing) => standPose(c, o), mouth: indoor ? mouthArea(c, e) : null, ...(road && !turn ? { reverseOn: { road: road.id, side: roadSide(road, from) } } : {}) };
  const w = groundFor(c, ask);
  // A car a few px off its lane line facing its way (double-parked, a taxi at the kerb) is no manoeuvre: it drives off and steers back (the moving car's own slide).
  if ((roadside || e.spot.kind === 'double') && !turn && nearLine(from, lane)) return null;
  const band = bandOf(road, lane, cross || turn);
  const aisle = aisleOf(e);
  // A car park bay is left by its aisle: back out into it, then forward out of the gate.
  const viaAisle = aisle && road ? aisleOut(p, from, aisle, offers, groundFor(c, { ...ask, bay: space.pose, reverseOn: { road: road.id, side: roadSide(road, lane) } }), band) : null;
  const plain = viaAisle ? null : playOutOf(p, from, offers, w, band, { turnaround: turn, forwardOnly: indoor });
  const m = viaAisle ? {
    ...viaAisle.out, toEdge: joinPlayed(viaAisle.back, viaAisle.out.toEdge),
    roll: () => joinPlayed(viaAisle.back, viaAisle.out.roll()),
  } : plain;
  if (!m) return null;
  const over = !!road && !cross && !turn && e.spot.kind !== 'double' && (reachesFar(m.toEdge, road, lane, roadSide(road, lane), p.len, p.wid) || reachesFar(m.join, road, lane, roadSide(road, lane), p.len, p.wid));
  const s = along ? along.s0 + along.way * (offers[m.goal]!.s - along.s0) : 0;
  logMove({ what: 'out', kind: e.spot.kind, seconds: m.toEdge.seconds + m.join.seconds, lane: m.join.seconds, fits: m.fits, ms: performance.now() - t0, word: m.word, from, to: lane });
  return { toEdge: m.toEdge, join: m.join, roll: m.roll, lane: m.join.seconds, s, cross: (cross || turn || over) && road ? { road: road.id, s: project(road.line, lane).s } : null };
}

interface DoorMove { readonly played: Played; readonly lane: number; readonly toEdge: Played }
interface DoorExit extends DoorMove { readonly roll: () => Played; readonly goal: number }
type DoorGoal = { readonly pose: LanePose; readonly cost: number };
interface DoorPath { readonly parked?: MiddlePose; readonly goals?: readonly DoorGoal[] }

export function planDoor(c: City, rect: Rect, lane: LanePose, dir: 'in', kind: VehicleKind, uid: number, path?: DoorPath): DoorMove;
export function planDoor(c: City, rect: Rect, lane: LanePose, dir: 'out', kind: VehicleKind, uid: number, path?: DoorPath): DoorExit | null;
/** A move into (or out of) a building's mouth, with no space drawn (src/city/door.ts). */
export function planDoor(c: City, rect: Rect, lane: LanePose, dir: 'in' | 'out', kind: VehicleKind, uid: number, path: DoorPath = {}): DoorMove | DoorExit | null {
  const p = paramsOf(kind);
  const t0 = performance.now();
  const mouth = path.parked ?? mouthOf(rect, lane, kind);
  const w = groundFor(c, { spot: null, from: lane, to: mouth, self: uid, poseOf: (o) => standPose(c, o), mouth: { rect, at: mouth } });
  const band = bandOf(undefined, lane, false);
  if (dir === 'in') {
    const played = playInto(p, lane, mouth, w, false);
    const laneS = secondsUntilOut(played, band, p.len, p.wid);
    logMove({ what: 'door', kind: 'in', seconds: played.seconds, lane: laneS, fits: played.fits, ms: performance.now() - t0, word: played.word });
    return { played, lane: laneS, toEdge: played };
  }
  const m = playOutOf(p, { ...mouth, a: mouth.a + Math.PI }, path.goals ?? [{ pose: lane, cost: 0 }], w, band);
  if (!m) return null;
  logMove({ what: 'door', kind: 'out', seconds: m.toEdge.seconds + m.join.seconds, lane: m.join.seconds, fits: m.fits, ms: performance.now() - t0, word: m.word });
  return { played: m.join, lane: m.join.seconds, toEdge: m.toEdge, roll: m.roll, goal: m.goal };
}

/** Where a played move into a space left the car standing (its middle). */
export const endOf = (m: Played): MiddlePose => { const q = lastPose(m); return { x: q.x, y: q.y, a: q.th }; };

export type { VehicleParams };
