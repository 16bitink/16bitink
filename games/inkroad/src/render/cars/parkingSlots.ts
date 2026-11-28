import { lotLayout, parkLayout, sandLayout } from '../../city/spotShapes';
import { halfWidth, laneOffset, lanesPerLink } from '../../sim/roadGeom';
import { aisleRoute, bodyPose, type SlotLayout } from '../../sim/slotGeometry';

export { facingEdge } from '../../sim/slotGeometry';
import type { BeachView, CarPark, CityView, Id, Lot, ParkedCar, ParkingView, Pt, Road } from '../../sim/types';
import { lineLength, pointAt } from '../geom';
import { BAY } from '../ground/roadExtras';

/**
 * Where each parked car of a place stands, in plan (world units, y not yet projected).
 * Pure: the same view and city give the same slots. A car that does not fit gets null.
 */
export interface Slot {
  readonly x: number; readonly y: number; /** Plan heading, radians. */ readonly a: number;
  /** A two-row car park's bay: the way from the lane through the gate and along the aisle to the bay's column. */
  readonly via?: readonly Pt[];
}
export type Slots = readonly (Slot | null)[];

export interface ParkingGeo {
  readonly roads: ReadonlyMap<Id, Road>;
  readonly lots: ReadonlyMap<Id, Lot>;
  readonly parks: ReadonlyMap<Id, CarPark>;
  readonly beaches: ReadonlyMap<string, BeachView>;
  readonly ground: readonly Road[];
  /** Off-road layouts already made for this geometry, by place key. */
  readonly made: Map<string, SlotLayout>;
}

/** Half the width of a car, the painted kerb stripe, and the clear stretch kept at junction corners. */
export const CAR_HALF_W = 3.6;
export const KERB_STRIPE = 1.1;
export const JUNCTION_CLEAR = 36;
export function makeGeo(city: Pick<CityView, 'roads' | 'lots' | 'carParks' | 'beaches'>): ParkingGeo {
  return {
    roads: new Map(city.roads.map((r) => [r.id, r])),
    lots: new Map(city.lots.map((l) => [l.id, l])),
    parks: new Map(city.carParks.map((p) => [p.id, p])),
    beaches: new Map((city.beaches ?? []).map((b) => [b.id, b])),
    ground: city.roads.filter((r) => r.level === 0 && !r.flyover && r.line.length > 1),
    made: new Map(),
  };
}

const none = (n: number): Slots => new Array<null>(n).fill(null);

/** A car's own space: the city's, or (an old save, a fake city) its place in the list. */
export const slotOf = (c: ParkedCar, i: number): number => c.slot ?? i;

/** The slots for every car of one place; a car whose move in ended a hair off its slot stands just where it ended (src/city/movePlan.ts). */
export function layoutPlace(v: ParkingView, geo: ParkingGeo): Slots {
  const slots = slotsOfPlace(v, geo);
  return v.cars.some((c) => c.pose) ? slots.map((s, i) => { const c = v.cars[i]; return c?.pose && !c.indoor ? { ...s, ...c.pose } : s; }) : slots;
}

function slotsOfPlace(v: ParkingView, geo: ParkingGeo): Slots {
  switch (v.kind) {
    case 'home':
    case 'private':
    case 'park':
    case 'sand': return offRoadSlots(v, geo);
    case 'kerb':
    case 'street': return roadSlots(v, geo);
    case 'double': return doubleSlots(v, geo);
    default: return none(v.cars.length);
  }
}

const at = (p: { readonly x: number; readonly y: number; readonly a: number }, off: number): Pt => ({ x: p.x - Math.sin(p.a) * off, y: p.y + Math.cos(p.a) * off });

// ---------------------------------------------------------------- off-road places (the city's own slots)

/** The shared layout of an off-road place (the same slots the city counts), made once per geometry. */
export function placeLayout(v: ParkingView, geo: ParkingGeo): SlotLayout | null {
  const key = `${v.kind}:${v.lot ?? v.park ?? v.beach ?? ''}`;
  const have = geo.made.get(key);
  if (have) return have;
  const roads = [...geo.roads.values()];
  const lot = v.lot === undefined ? undefined : geo.lots.get(v.lot);
  const park = v.park === undefined ? undefined : geo.parks.get(v.park);
  const beach = v.beach === undefined ? undefined : geo.beaches.get(v.beach);
  const made = (v.kind === 'home' || v.kind === 'private') && lot ? lotLayout(roads, lot)
    : v.kind === 'park' && park ? parkLayout(roads, park)
      : v.kind === 'sand' && beach ? sandLayout(roads, beach.rect) : null;
  if (made) geo.made.set(key, made);
  return made;
}

/** Every car on its own slots, a van or lorry between its two; a car park's far bay is reached by the aisle. */
function offRoadSlots(v: ParkingView, geo: ParkingGeo): Slots {
  const l = placeLayout(v, geo);
  if (!l) return none(v.cars.length);
  return v.cars.map((c, i) => {
    const p = bodyPose(l, c.span ?? [slotOf(c, i)], c.kind);
    if (!p) return null;
    const via = aisleRoute(l, p);
    return via ? { ...p, via } : p;
  });
}

// ---------------------------------------------------------------- kerbs and small streets

/** Distance from a road's centre line to the middle of a parked car, outside the paved width. */
export const kerbOffset = (road: Road): number => halfWidth(road) + KERB_STRIPE + CAR_HALF_W;

/** How many bays fit along a road between its junction corners. */
export const bayCount = (len: number): number => Math.max(0, Math.floor((len - JUNCTION_CLEAR * 2) / BAY));

/** Along the road where slot k stands when the city gave no `s`: bay by bay from the first corner. */
const fallbackAlong = (k: number): number => JUNCTION_CLEAR + (Math.floor(k / 2) + 0.5) * BAY;

/**
 * Each car stands where the city put its slot (`s`, `side`): neighbours never matter, so a car that
 * leaves leaves a gap. Street cars stand askew and a little off the kerb line, so they look like they took room.
 */
function roadSlots(v: ParkingView, geo: ParkingGeo): Slots {
  const road = v.road === undefined ? undefined : geo.roads.get(v.road);
  if (!road || road.line.length < 2 || road.level !== 0 || road.flyover) return none(v.cars.length);
  const len = lineLength(road.line);
  return v.cars.map((c, i) => {
    const k = slotOf(c, i);
    const side = c.side ?? (k % 2 === 0 ? 1 : -1);
    const along = c.s ?? fallbackAlong(k);
    if (along < 0 || along > len) return null;
    return standing(road, along, side, k, v.kind === 'street');
  });
}

export { streetLoose } from '../../sim/roadSlots';
import { streetLoose } from '../../sim/roadSlots';

function standing(road: Road, along: number, side: number, slot: number, street: boolean): Slot {
  const p = pointAt(road.line, along);
  const loose = street ? streetLoose(road.id, slot) : { turn: 0, shove: 0 };
  const q = at(p, side * (kerbOffset(road) + loose.shove));
  // A one-way street's cars on both kerbs face the way it runs.
  return { x: q.x, y: q.y, a: p.a + (side < 0 && !road.oneWay ? Math.PI : 0) + loose.turn };
}

function doubleSlots(v: ParkingView, geo: ParkingGeo): Slots {
  const road = v.road === undefined ? undefined : geo.roads.get(v.road);
  if (!road || road.line.length < 2 || road.level !== 0) return none(v.cars.length);
  const len = lineLength(road.line);
  const outer = lanesPerLink(road) - 1;
  return v.cars.map((c) => {
    const side = c.side ?? 1;
    const s = c.s ?? len / 2;
    // Where it really stopped (lat, src/city/moveTimes.ts doublePose): it stands there; else its outer lane's middle.
    const p = pointAt(road.line, c.lat !== undefined ? Math.min(len, Math.max(0, s)) : Math.min(len - JUNCTION_CLEAR, Math.max(JUNCTION_CLEAR, s)));
    const off = c.lat ?? (side > 0 ? laneOffset(road, outer) : road.oneWay ? laneOffset(road, 0) : -laneOffset(road, outer));
    const q = at(p, off);
    return { x: q.x, y: q.y, a: p.a + (side < 0 ? Math.PI : 0) };
  });
}

// ---------------------------------------------------------------- car parks

export interface Bay { readonly x: number; readonly y: number; readonly up: boolean }

/** Bays of a surface car park (as the city counts them), for the ground painter. Pure. */
export function baysOf(p: Pick<CarPark, 'gx' | 'gy' | 'w' | 'h'> & Partial<Pick<CarPark, 'kind' | 'access'>>, roads: readonly Road[] = []): Bay[] {
  const l = parkLayout(roads, { id: 0, kind: 'lot', spaces: 0, used: 0, access: null, ...p } as CarPark);
  return l.poses.map((b) => ({ x: b.x, y: b.y, up: b.a < 0 }));
}
