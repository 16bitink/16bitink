import type { Id, ParkedCar, ParkingView, VehicleKind } from '../sim/types';
import type { Spot, Standing } from './day';
import { distPt, polyLength } from './geometry';
import { freeSlots, hasRoom, slotCount, spanOf, standS } from './slots';
import type { City } from './state';

/** Where cars stand: who is in which place, and what the view draws. */
export interface Parkable { readonly uid: number; readonly tint: number; readonly kind: VehicleKind; readonly household?: Id }

const ROAD_KINDS: ReadonlySet<Spot['kind']> = new Set(['kerb', 'street', 'double']);
/** px between two cars left in the lane one after another. */
const DOUBLE_GAP = 22;

/**
 * The first free slot: cars put somewhere without driving there (home at dawn, a place that went). A place with no
 * slot left for it gives one past its last (not drawn): callers check `hasRoom` first.
 */
function firstFree(c: City, spot: Spot, kind: VehicleKind = 'car'): number {
  const k = freeSlots(c, spot, null, kind)[0];
  return k ?? Math.max(slotCount(spot), ...spot.cars.map((e) => e.slot + 2));
}

/** A kerb or street car stands in its own slot's place. A car left in the lane stands where its driver stopped. */
function placeOnRoad(c: City, e: Standing, at: number | undefined): void {
  const spot = e.spot;
  e.s = undefined;
  e.side = undefined;
  e.lat = undefined;
  e.shoulder = undefined;
  if (!ROAD_KINDS.has(spot.kind)) return;
  const road = c.net.roads.find((r) => r.id === spot.id);
  if (!road) return;
  const len = polyLength(road.line);
  if (spot.kind === 'double') {
    const s = at ?? ('road' in spot.access ? spot.access.s : len / 2);
    e.s = Math.max(0, Math.min(len, s + (e.slot % 2) * DOUBLE_GAP));
    e.side = 1;
    return;
  }
  e.s = standS(c, spot, spanOf(spot, e.slot, e.kind)) ?? len / 2;
  e.side = e.slot % 2 === 0 ? 1 : -1;
}

/** A car stops in a place, in `slot` (the first free one when not given). Counted cars take one of its spaces. */
export function stand(c: City, spot: Spot, car: Parkable, counted: boolean, at?: number, slot?: number): Standing {
  const e: Standing = { uid: car.uid, tint: car.tint, kind: car.kind, slot: slot !== undefined && slot >= 0 ? slot : firstFree(c, spot, car.kind), counted, spot, ...(car.household !== undefined ? { household: car.household } : {}) };
  placeOnRoad(c, e, at);
  spot.cars.push(e);
  spot.ver += 1;
  if (counted) spot.used += 1;
  c.day.parkingDirty = true;
  return e;
}

/** It drives off. Harmless twice. */
export function unstand(c: City, e: Standing): void {
  const spot = e.spot;
  const i = spot.cars.indexOf(e);
  if (i < 0) return;
  spot.cars.splice(i, 1);
  spot.ver += 1;
  if (e.counted) spot.used = Math.max(0, spot.used - 1);
  c.day.parkingDirty = true;
}

/** A place went (a road removed, kerbs taken away): its cars move to the nearest place that is left. */
export function rehome(c: City, gone: Spot): void {
  const all = [...c.day.spots.values()].filter((s) => s.kind !== 'double');
  if (all.length === 0) return;
  for (const e of [...gone.cars]) {
    const room = all.filter((s) => hasRoom(c, s, null, e.kind));
    const pool = room.length > 0 ? room : all;
    const near = pool.reduce((a, b) => (distPt(a.at, gone.at) <= distPt(b.at, gone.at) ? a : b));
    e.spot = near;
    e.slot = firstFree(c, near, e.kind);
    placeOnRoad(c, e, undefined);
    near.cars.push(e);
    near.ver += 1;
    if (e.counted) near.used += 1;
  }
  gone.cars.length = 0;
  c.day.parkingDirty = true;
}

/** Night: nobody is out, nothing stands anywhere but what `keep` keeps (household cars already home stay in their slots). */
export function clearStanding(c: City, keep: (e: Standing) => boolean = () => false): void {
  for (const s of c.day.spots.values()) {
    if (s.cars.length === 0 && s.used === 0) continue;
    s.cars = s.cars.filter(keep);
    for (const e of s.cars) { e.edge = undefined; e.readyAt = undefined; }
    s.used = s.cars.filter((e) => e.counted).length;
    s.ver += 1;
  }
  c.day.parkingDirty = true;
}

// ---------------------------------------------------------------- the view

const shown = new WeakMap<Spot, { readonly ver: number; readonly view: ParkingView }>();
const VIEW_KINDS: ReadonlySet<string> = new Set(['car', 'van', 'taxi', 'truck']);
export const viewKind = (k: VehicleKind): ParkedCar['kind'] => (VIEW_KINDS.has(k) ? k : 'car') as ParkedCar['kind'];

function parkedOf(e: Standing): ParkedCar {
  const span = spanOf(e.spot, e.slot, e.kind);
  return { uid: e.uid, tint: e.tint, kind: viewKind(e.kind), slot: e.slot, ...(span.length > 1 ? { span } : {}), ...(e.household !== undefined ? { household: e.household } : {}), ...(e.s !== undefined ? { s: e.s, side: e.side ?? 1 } : {}), ...(e.lat !== undefined ? { lat: e.lat } : {}) };
}

function viewOf(s: Spot): ParkingView {
  const have = shown.get(s);
  if (have && have.ver === s.ver) return have.view;
  const where = s.kind === 'home' || s.kind === 'private' ? { lot: s.id } : s.kind === 'park' ? { park: s.id } : s.kind === 'sand' ? { beach: s.key.slice('sand:'.length) } : { road: s.id };
  const view: ParkingView = { key: s.key, kind: s.kind, ...where, spaces: Math.max(s.spaces, s.cars.length), slots: slotCount(s), cars: s.cars.filter((e) => !e.edge).map(parkedOf) };
  shown.set(s, { ver: s.ver, view });
  return view;
}

/** Every place with a car in it, oldest first within each. Cars waiting at the lane edge to leave are not shown. */
export const parkingView = (c: City): readonly ParkingView[] => [...c.day.spots.values()].filter((s) => s.cars.length > 0).map(viewOf);
