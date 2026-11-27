import type { Pt, Road, VehicleKind } from '../sim/types';
import { roadSlotsOf, type RoadSlot } from '../sim/roadSlots';
import { roadSweep, spanSlots, sweepOf, sweepsClash, type SlotLayout, type Sweep } from '../sim/slotGeometry';
import { spansTwo } from '../sim/vehicleSize';
import type { Leg, Spot, Standing } from './day';
import { distPt, pointAlong, polyLength } from './geometry';
import { mixSeed } from './rng';
import type { City } from './state';
import { BAY_PX, CLAIM_SECONDS, SLOT_ANY } from './tune';

/**
 * Every place's own spaces. A parked car keeps its slot until it leaves: nobody moves up, gaps stay.
 * Road places (kerb, street) fix each slot's place along the road (src/sim/roadSlots.ts); every other place's
 * slots are the shared layout the renderer draws (src/sim/slotGeometry.ts, kept on the spot by buildSpots).
 */
export type { RoadSlot };
export { baysPerSide, kerbSlotCount, streetSlotCount } from '../sim/roadSlots';

/** Off-road places: a driver taking any free bay takes one of the first this many past the cars there. */
const OFF_ROAD_SPREAD = 4;
const onRoad = (spot: Spot): boolean => spot.kind === 'kerb' || spot.kind === 'street';

const layouts = new WeakMap<Spot, { readonly len: number; readonly spaces: number; readonly slots: readonly RoadSlot[] }>();

/** The slots of a road place, kept until the road or the count changes. Empty for other places. */
export function roadSlots(c: City, spot: Spot): readonly RoadSlot[] {
  if (spot.kind !== 'kerb' && spot.kind !== 'street') return [];
  const road = c.net.roads.find((r) => r.id === spot.id);
  if (!road) return [];
  const len = polyLength(road.line);
  const have = layouts.get(spot);
  if (have && have.len === len && have.spaces === spot.spaces) return have.slots;
  const slots = roadSlotsOf(spot.kind, len, spot.spaces, road.id);
  layouts.set(spot, { len, spaces: spot.spaces, slots });
  return slots;
}

/** The drawn slots of an off-road place (null for road places and double parking). */
export const layoutOf = (spot: Spot): SlotLayout | null => spot.layout ?? null;

/** Slots laid out in a place: the drawn ones off the road, its spaces on it (a lane holds what stops there). */
export function slotCount(spot: Spot): number {
  if (spot.layout) return spot.layout.poses.length;
  return Math.max(spot.spaces, ...spot.cars.map((e) => e.slot + 1), 0);
}

// ---------------------------------------------------------------- promises

/** A slot promised to a car on its way, while that leg still heads there. */
interface Claim { readonly leg: Leg; readonly at: number }
const claims = new WeakMap<Spot, Map<number, Claim>>();

function claimsOf(spot: Spot): Map<number, Claim> {
  const have = claims.get(spot);
  if (have) return have;
  const made = new Map<number, Claim>();
  claims.set(spot, made);
  return made;
}

const holds = (c: City, spot: Spot, k: number, cl: Claim): boolean =>
  !cl.leg.done && cl.leg.spot === spot && cl.leg.slot === k && c.clock - cl.at < CLAIM_SECONDS;

export function claim(c: City, spot: Spot, k: number, leg: Leg): void {
  leg.slot = k;
  claimsOf(spot).set(k, { leg, at: c.clock });
}

// ---------------------------------------------------------------- frontage and neighbours

export const isBig = (k: VehicleKind): boolean => spansTwo(k);

/** From a slot to the next one on the same side of a road: road places alternate sides. */
const ROAD_STEP = 2;

/** The slots of a road place a car at `k` covers: a big one also the next on its side (or the one before at the end). */
function roadSpan(spot: Spot, k: number, kind: VehicleKind): readonly number[] | null {
  if (!isBig(kind)) return [k];
  const cap = Math.max(1, spot.spaces);
  if (k + ROAD_STEP < cap) return [k, k + ROAD_STEP];
  return k - ROAD_STEP >= 0 ? [k, k - ROAD_STEP] : null;
}

/** The slots a car at `k` covers, or null where it does not fit (a lorry in a lone bay). */
export function fitOf(spot: Spot, k: number, kind: VehicleKind): readonly number[] | null {
  if (spot.layout) return spanSlots(spot.layout, k, kind);
  if (onRoad(spot)) return roadSpan(spot, k, kind);
  return [k];
}

/** The slots a standing car covers (its own slot when nothing else fits). */
export const spanOf = (spot: Spot, k: number, kind: VehicleKind): readonly number[] => fitOf(spot, k, kind) ?? [k];

/** Px along the road where a kerb or street car in `span` stands: between its slots. */
export function standS(c: City, spot: Spot, span: readonly number[]): number | undefined {
  const slots = roadSlots(c, spot);
  const have = span.map((k) => slots[k]).filter((x): x is RoadSlot => !!x);
  return have.length > 0 ? have.reduce((n, x) => n + x.s, 0) / have.length : undefined;
}

/** Turning in, or driving off its slot to the lane edge right now (not once it waits there for a gap). */
export const manoeuvring = (c: City, e: Standing): boolean =>
  (e.edge !== undefined && c.clock < e.edge.goAt) || (e.readyAt !== undefined && e.readyAt > c.clock);

/** The stretch of its row a car in `span` covers while it moves (null: a car left in the lane). */
function sweepAt(c: City, spot: Spot, span: readonly number[], kind: VehicleKind): Sweep | null {
  if (spot.layout) return spot.layout.poses.length > 0 ? sweepOf(spot.layout, span, kind) : null;
  if (!onRoad(spot)) return null;
  const s = standS(c, spot, span);
  const side = roadSlots(c, spot)[span[0]!]?.side;
  return s === undefined || side === undefined ? null : roadSweep(s, side, kind);
}

/** The sweeps of the cars moving in a place now (other than `self`). */
function movers(c: City, spot: Spot, self: Standing | null): Sweep[] {
  const out: Sweep[] = [];
  for (const e of spot.cars) {
    if (e === self || !manoeuvring(c, e)) continue;
    const w = sweepAt(c, spot, spanOf(spot, e.slot, e.kind), e.kind);
    if (w) out.push(w);
  }
  return out;
}

/**
 * A car may leave its slot now: no neighbour on its row is moving where it would move (only a touching neighbour
 * can, and only while their paths overlap; a car park's cars share the aisle).
 */
export function clearToLeave(c: City, e: Standing): boolean {
  if (!spotHasMovers(c, e.spot, e)) return true;
  const me = sweepAt(c, e.spot, spanOf(e.spot, e.slot, e.kind), e.kind);
  return !me || !movers(c, e.spot, e).some((m) => sweepsClash(me, m));
}

const spotHasMovers = (c: City, spot: Spot, self: Standing | null): boolean => spot.cars.some((e) => e !== self && manoeuvring(c, e));

/** Slots nobody stands in and nobody else is driving to, where this kind fits. Those beside a move come last. */
export function freeSlots(c: City, spot: Spot, self: Leg | null, kind: VehicleKind = 'car'): number[] {
  const taken = new Set(spot.cars.flatMap((e) => spanOf(spot, e.slot, e.kind)));
  const promised = claims.get(spot);
  const moving = spotHasMovers(c, spot, null) ? movers(c, spot, null) : [];
  const cap = spot.layout ? spot.layout.poses.length : Math.max(1, spot.spaces);
  const open = (k: number): boolean => {
    if (taken.has(k)) return false;
    const cl = promised?.get(k);
    return !(cl && cl.leg !== self && holds(c, spot, k, cl));
  };
  const out: number[] = [];
  const later: number[] = [];
  for (let k = 0; k < cap; k++) {
    const span = fitOf(spot, k, kind);
    if (!span || !span.every(open)) continue;
    const w = moving.length > 0 ? sweepAt(c, spot, span, kind) : null;
    (w && moving.some((m) => sweepsClash(w, m)) ? later : out).push(k);
  }
  if (out.length > 0) return out;
  if (later.length > 0) return later;
  if (spot.kind !== 'double') return [];
  let k = cap;
  while (taken.has(k)) k += 1;
  return [k];
}

/** Is there a slot for this kind (a counted space, and a drawn slot it fits)? */
export const hasRoom = (c: City, spot: Spot, self: Leg | null, kind: VehicleKind): boolean =>
  spot.used < spot.spaces && freeSlots(c, spot, self, kind).length > 0;

// ---------------------------------------------------------------- choosing one

/** The nearest free slot to `near` (px along the road, or slot order off the road), or now and then any free one. */
export function pickSlot(c: City, spot: Spot, near: number, self: Leg | null, roll: number, kind: VehicleKind = 'car'): number {
  const free = freeSlots(c, spot, self, kind);
  if (free.length <= 1) return free[0] ?? -1;
  const r = (mixSeed(c.seed, roll, Math.round(c.clock * 10)) % 10007) / 10007;
  const slots = roadSlots(c, spot);
  // Off the road, drivers keep to the first few bays: a forecourt fills from its gate, with gaps.
  const pool = slots.length > 0 ? free : free.filter((k) => k < spot.cars.length + OFF_ROAD_SPREAD);
  const from = pool.length > 0 ? pool : free;
  if (r < SLOT_ANY) return from[Math.floor((r / SLOT_ANY) * from.length) % from.length]!;
  const away = (k: number): number => (slots[k] ? Math.abs(slots[k]!.s - near) : Math.abs(k - near));
  return free.reduce((a, b) => (away(b) < away(a) ? b : a));
}

/** Px along a road nearest to a point. */
export function sAlong(road: Road, p: Pt): number {
  const len = polyLength(road.line);
  let best = len / 2;
  let bestD = Infinity;
  for (let s = 0; s <= len; s += BAY_PX / 2) {
    const d = distPt(pointAlong(road.line, s), p);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

/** Which side of the road a car heading `a` drives on: 1 with the line's direction. */
export function sideHeading(road: Road, s: number, a: number): -1 | 1 {
  const p = pointAlong(road.line, Math.max(0, s - 1));
  const q = pointAlong(road.line, s + 1);
  return (q.x - p.x) * Math.cos(a) + (q.y - p.y) * Math.sin(a) >= 0 ? 1 : -1;
}
