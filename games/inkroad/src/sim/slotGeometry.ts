import { CELL } from './constants';
import { gardenPlan, GATE_W, isGarden, type GardenLot } from './gardenLayout';
import { pointAt, project } from './geom';
import { hash01 } from './rng';
import { halfWidth } from './roadGeom';
import type { CarParkKind, Pt, Road, VehicleKind } from './types';
import { BIGGEST, PITCH_BODY, reach, sizeOf, spansTwo } from './vehicleSize';

/**
 * One source of truth for off-road spaces (homes, forecourts, car parks, sand): the city counts exactly these slots
 * and the renderer draws exactly these. Pure, no Phaser. Each place's slots come in the order drivers prefer them
 * (nearest the way in first), each with its neighbours along its row. Pitches hold a car with a visible gap; a van or
 * a lorry covers its slot and a neighbour (`spanSlots`) and stands between the two (`bodyPose`).
 */
export interface SlotPose { readonly x: number; readonly y: number; /** Plan heading, radians. */ readonly a: number }

/**
 * A car park's way round (the owner, rule 22): the gate on its edge, the gate lane from it to the aisle (`join`), and
 * the aisle between the rows' bay mouths, `half` each side of its line `y`, from `x0` to `x1`. Bays open onto the
 * aisle; `lane` is the gate lane's half width.
 */
export interface Aisle {
  readonly gate: SlotPose;
  readonly join: Pt;
  readonly y: number;
  readonly half: number;
  readonly x0: number;
  readonly x1: number;
  readonly lane: number;
  /** Depth of a bay from its mouth on the aisle to its back line. */
  readonly depth: number;
  /**
   * The aisle runs along plan y (a beach's track away from its road): every field above is in the aisle's own frame,
   * plan x and y swapped (`inPlan` turns a point or pose back). Absent: the frame is the plan's.
   */
  readonly swap?: boolean;
}

/** A point or pose of an aisle's frame in plan, or back (the swap is its own inverse); headings mirror with it. */
export function inPlan<T extends { readonly x: number; readonly y: number; readonly a?: number }>(a: Aisle, p: T): T {
  if (!a.swap) return p;
  return { ...p, x: p.y, y: p.x, ...(p.a === undefined ? {} : { a: Math.PI / 2 - p.a }) };
}

export interface SlotLayout {
  readonly poses: readonly SlotPose[];
  /** The slot beside each one along its row, after and before it (-1: the row ends there, or a gate parts them). */
  readonly next: readonly number[];
  readonly prev: readonly number[];
  /** Px along its row, the row, and which way along the row the body faces (+1 / -1). */
  readonly u: readonly number[];
  readonly row: readonly number[];
  readonly dir: readonly number[];
  /** Bays: bodies stand across their row, tails on one line. Otherwise along it (forecourts, sand). */
  readonly across: boolean;
  readonly aisle?: Aisle;
  /** Longest body that may stand here (a car park's aisle has no room for a lorry to turn). */
  readonly maxLen?: number;
}

export type PlaceShape =
  | { readonly kind: 'home' | 'private'; readonly lot: GardenLot; readonly from: Pt | null }
  | { readonly kind: 'park'; readonly park: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number; readonly kind: CarParkKind }; readonly from: Pt | null }
  | { readonly kind: 'sand'; readonly rect: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }; readonly road: RoadPoint | null };

/** The nearest point of a road, its heading there, and the road's half paved width (px). */
export interface RoadPoint { readonly at: Pt; readonly a: number; readonly half?: number }

/** Clear paint between two parked bodies, side by side and nose to tail. */
export const GAP_ACROSS = 2.6;
export const GAP_ALONG = 3;
/** Lot edges (roads keep a cell off a lot, so the strip is wide). */
const LOT_INSET = 9;
/**
 * Spaces are counted and spread at the pitch they had when a car was drawn 8.3 px wide and the biggest parked body
 * 9.4 px (before real widths, the owner, November 28): the city's capacity is unchanged until phase C rebalances, and
 * the real, narrower bodies stand in them with more room (a home bay 3.1 m, a car-park bay 3.2 m).
 */
const COUNT_WID = 8.3;
const COUNT_BIG: typeof BIGGEST = { len: BIGGEST.len, wid: 9.4 };
const COUNT_PITCH: typeof PITCH_BODY = { len: PITCH_BODY.len, wid: COUNT_WID };
/** Home bays stand nose to the road, a body across apart; forecourt spaces (square to the edge too) keep a body length apart. */
export const NOSE_PITCH = COUNT_WID + GAP_ACROSS;
export const SIDE_PITCH = PITCH_BODY.len + GAP_ALONG;
const NOSE_GAP = 9;
/** Car park bays: rows along the long edges, nose in (away from the aisle), left by backing out into the aisle. */
const PARK_EDGE = 12;
export const PARK_PITCH = COUNT_WID + GAP_ALONG;
const PARK_ROW_IN = 18;
/** Drivers take the far row's bays first: a near-row bay is a turn back off the gate lane (px of aisle it is worth). */
const TURN_BACK = 40;
/** A bay is painted this deep, its mouth this far from its row's line toward the aisle. */
const BAY_DEPTH = 20, BAY_MOUTH = 10;
/** The aisle stops this far short of the park's side edges. */
const AISLE_END = 3;
/** Kinds of car park with bays on the ground (the others take cars inside). */
const SURFACE: ReadonlySet<CarParkKind> = new Set<CarParkKind>(['lot', 'ride']);
/** The gate lane keeps this far from a bay's middle. */
/** Room each side of the gate lane past the near row: a car leaving a bay by the gate swings round into the gate lane there (the owner, phase B). */
const GATE_ROOM = 14;
const GATE_CLEAR = COUNT_WID + 1.5 + GATE_ROOM;
/** Car parks take cars and vans; lorries stand in front strips and at the kerb. */
const PARK_MAX_LEN = sizeOf('van').len;
/** Sand: lengthwise along the road, a little askew, each jittered a little; pitches hold the worst case of a car. */
const SAND_COLS = 5;
const SAND_ROWS_MAX = 12;
const SAND_INSET = 8;
export const SAND_LOOSE = 0.3;
const SAND_JIT_U = 1;
const SAND_JIT_D = 1;
const SAND_ANCHOR = SAND_INSET + SAND_JIT_D + 0.5;
/** Px from a road's paved edge to the middle of a car on the sand (half the biggest body across, and a gap). */
const SAND_ROAD_CLEAR = 8;
const SAND_REACH = reach(COUNT_PITCH, SAND_LOOSE);
const SAND_BIG = reach(COUNT_BIG, SAND_LOOSE);
export const SAND_PITCH = SAND_REACH.x * 2 + SAND_JIT_U * 2 + GAP_ALONG;
export const SAND_ROW = SAND_BIG.y * 2 + SAND_JIT_D * 2 + GAP_ACROSS;
/** Neighbours in a row stand within this many pitches of each other. */
const NEIGHBOUR_REACH = 1.5;
const SALT = { sand: 17, turn: 23, along: 19 } as const;

const EMPTY: SlotLayout = { poses: [], next: [], prev: [], u: [], row: [], dir: [], across: false };

export function layoutOf(p: PlaceShape): SlotLayout {
  if (p.kind === 'park') return SURFACE.has(p.park.kind) ? parkLayout(p.park, p.from) : EMPTY;
  if (p.kind === 'sand') return sandLayout(p.rect, p.road);
  return lotLayout(p.lot, p.kind === 'home', p.from);
}

// ---------------------------------------------------------------- rows to a layout

interface RowSlot { readonly pose: SlotPose; readonly u: number; readonly rank: number; readonly dir: number }

/** Slots of every row, numbered by rank (nearest the way in first); neighbours are next to each other in a row. */
function fromRows(rows: readonly (readonly RowSlot[])[], across: boolean, pitch: number, aisle?: Aisle): SlotLayout {
  const flat = rows.flatMap((r, ri) => [...r].sort((a, b) => a.u - b.u).map((s) => ({ ...s, ri })));
  const order = flat.map((_, i) => i).sort((a, b) => flat[a]!.rank - flat[b]!.rank || a - b);
  const number = new Map(order.map((f, k) => [f, k] as const));
  const link = (f: number, d: 1 | -1): number => {
    const me = flat[f]!, o = flat[f + d];
    return o && o.ri === me.ri && Math.abs(o.u - me.u) <= pitch * NEIGHBOUR_REACH ? number.get(f + d)! : -1;
  };
  return {
    poses: order.map((f) => flat[f]!.pose), u: order.map((f) => flat[f]!.u), row: order.map((f) => flat[f]!.ri), dir: order.map((f) => flat[f]!.dir),
    next: order.map((f) => link(f, 1)), prev: order.map((f) => link(f, -1)), across, ...(aisle ? { aisle } : {}),
  };
}

// ---------------------------------------------------------------- homes and forecourts

export interface Edge { readonly x: number; readonly y: number; readonly tx: number; readonly ty: number; readonly nx: number; readonly ny: number; readonly len: number }
interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
const boxOf = (b: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }): Box => ({ x: b.gx * CELL, y: b.gy * CELL, w: b.w * CELL, h: b.h * CELL });

/** The edge of a box that faces a point (the one the point is furthest beyond); the south edge without one. */
export function facingEdge(r: Box, p: Pt | null): Edge {
  const south: Edge = { x: r.x, y: r.y + r.h, tx: 1, ty: 0, nx: 0, ny: 1, len: r.w };
  if (!p) return south;
  const d = [p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y];
  const k = d.indexOf(Math.min(...d));
  if (k === 0) return { x: r.x, y: r.y, tx: 0, ty: 1, nx: -1, ny: 0, len: r.h };
  if (k === 1) return { x: r.x + r.w, y: r.y, tx: 0, ty: 1, nx: 1, ny: 0, len: r.h };
  if (k === 2) return { x: r.x, y: r.y, tx: 1, ty: 0, nx: 0, ny: -1, len: r.w };
  return south;
}

/** The lot edge its cars stand along: the one facing its road (a garden's villas are north: its strip is south). */
export function lotEdge(lot: GardenLot, from: Pt | null): Edge {
  const garden = isGarden(lot);
  const rect = garden ? gardenPlan(lot).lawn : boxOf(lot);
  const faced = facingEdge(rect, from);
  return garden && faced.ny < 0 ? facingEdge(rect, null) : faced;
}

/**
 * A lot's spaces, square to its edge in front of it (the owner, phase B: forecourt spaces are square to the kerb). Home
 * bays face out to the road (backed in, left forward); forecourt spaces face the building (entered nose first from
 * either lane, left by backing into the near lane). A forecourt keeps the count it had when its cars stood along the
 * edge (SIDE_PITCH apart), so the city's capacity is unchanged.
 */
function lotLayout(lot: GardenLot, home: boolean, from: Pt | null): SlotLayout {
  const e = lotEdge(lot, from);
  const n = Math.max(0, Math.floor((e.len - LOT_INSET * 2) / (home ? NOSE_PITCH : SIDE_PITCH)));
  const u0 = from ? (from.x - e.x) * e.tx + (from.y - e.y) * e.ty : e.len / 2;
  const gates = isGarden(lot) && e.ny > 0 ? gardenPlan(lot).gates.map((g) => g.x - e.x) : [];
  const a = home ? Math.atan2(e.ny, e.nx) : Math.atan2(-e.ny, -e.nx);
  const row: RowSlot[] = [];
  for (let j = 0; j < n; j++) {
    const u = LOT_INSET + (j + 0.5) * ((e.len - LOT_INSET * 2) / n);
    if (gates.some((g) => Math.abs(u - g) <= GATE_W / 2 + COUNT_WID / 2)) continue;
    row.push({ pose: { x: e.x + e.tx * u + e.nx * NOSE_GAP, y: e.y + e.ty * u + e.ny * NOSE_GAP, a }, u, rank: Math.abs(u - u0), dir: 1 });
  }
  return fromRows([row], true, (e.len - LOT_INSET * 2) / Math.max(1, n));
}

// ---------------------------------------------------------------- car parks

/** The gate of a car park: on the edge facing its road, in line with the aisle on a side edge. */
function gateOf(r: Box, from: Pt | null, aisleY: number): SlotPose {
  const e = facingEdge(r, from);
  const inward = Math.atan2(-e.ny, -e.nx);
  if (e.nx !== 0) return { x: e.x, y: aisleY, a: inward };
  const u = from ? Math.min(e.len - PARK_EDGE, Math.max(PARK_EDGE, from.x - e.x)) : e.len / 2;
  return { x: e.x + u, y: e.y, a: inward };
}

function parkLayout(p: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }, from: Pt | null): SlotLayout {
  const r = boxOf(p);
  const n = Math.max(0, Math.floor((r.w - PARK_EDGE * 2) / PARK_PITCH));
  const twoRows = r.h - PARK_ROW_IN * 2 >= BIGGEST.len + GAP_ALONG;
  const aisleY = r.y + r.h / 2;
  const gate = gateOf(r, from, aisleY);
  const ys = twoRows ? [r.y + PARK_ROW_IN, r.y + r.h - PARK_ROW_IN] : [r.y + PARK_ROW_IN];
  const rows = ys.map((y) => {
    const up = y > aisleY;
    const near = twoRows && Math.abs(gate.y - y) < Math.abs(gate.y - aisleY);
    const out: RowSlot[] = [];
    for (let i = 0; i < n; i++) {
      const x = r.x + PARK_EDGE + (i + 0.5) * ((r.w - PARK_EDGE * 2) / n);
      // The gate lane runs through the near row: no bay stands in it.
      if (near && Math.abs(x - gate.x) < GATE_CLEAR) continue;
      // Nose in: a bay above the aisle faces up (north), one below it faces down.
      out.push({ pose: { x, y, a: up ? Math.PI / 2 : -Math.PI / 2 }, u: x, rank: Math.abs(x - gate.x) + (near ? TURN_BACK : 0), dir: 1 });
    }
    return out;
  });
  const aisle = twoRows ? aisleOf(r, gate, aisleY) : undefined;
  return { ...fromRows(rows, true, PARK_PITCH, aisle), maxLen: PARK_MAX_LEN };
}

/** The aisle of a two-row car park: between the rows' bay mouths, the full width bar its ends; the gate lane as wide as the gap in the near row. */
function aisleOf(r: Box, gate: SlotPose, y: number): Aisle {
  const half = y - (r.y + PARK_ROW_IN + BAY_MOUTH);
  return { gate, join: { x: gate.x, y }, y, half, x0: r.x + AISLE_END, x1: r.x + r.w - AISLE_END, lane: GATE_CLEAR - PARK_PITCH / 2 - 0.5, depth: BAY_DEPTH };
}

/** Where a car drives to reach bay `k` of a two-row car park: through the gate, to the aisle, along it to the bay's column. */
export function aisleRoute(l: SlotLayout, to: SlotPose): readonly Pt[] | null {
  const a = l.aisle;
  if (!a) return null;
  const col = inPlan(a, to);
  return [inPlan(a, { x: a.gate.x, y: a.gate.y }), inPlan(a, a.join), inPlan(a, { x: col.x, y: a.y })];
}

// ---------------------------------------------------------------- sand

/** The ground road that comes closest to a point, and the point on it. */
export function nearestGround(roads: readonly Road[], c: Pt): RoadPoint | null {
  let best: { at: Pt; a: number; d: number; half: number } | null = null;
  for (const road of roads) {
    if (road.level !== 0 || road.flyover || road.line.length < 2) continue;
    const n = project(road.line, c);
    if (!best || n.d < best.d) best = { at: { x: n.x, y: n.y }, a: pointAt(road.line, n.s).heading, d: n.d, half: halfWidth(road) };
  }
  return best ? { at: best.at, a: best.a, half: best.half } : null;
}

function sandFrame(r: Box, road: RoadPoint | null): { readonly anchor: Pt; readonly away: number } {
  const mid = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const near = road?.at ?? mid;
  const anchor = { x: Math.min(r.x + r.w - SAND_ANCHOR, Math.max(r.x + SAND_ANCHOR, near.x)), y: Math.min(r.y + r.h - SAND_ANCHOR, Math.max(r.y + SAND_ANCHOR, near.y)) };
  const away = Math.hypot(anchor.x - near.x, anchor.y - near.y) > 1 ? Math.atan2(anchor.y - near.y, anchor.x - near.x) : Math.atan2(mid.y - near.y, mid.x - near.x);
  return { anchor, away };
}

/**
 * Sand with a track (the owner, rule 22: beach lots as car parks): bays nose in either side of a sand track that a car
 * reaches from the road through a gate, built like a car park in the track's own frame. The track runs along the road
 * (a short spur from the gate) or away from it (the gate at its end), whichever holds more cars. Loose: each car a
 * little askew and off its column. Null where the road meets the sand at a slant (the loose rows stay there).
 */
function sandAisles(r: Box, road: RoadPoint, k: { readonly gx: number; readonly gy: number }): SlotLayout | null {
  const { away } = sandFrame(r, road);
  const q = Math.round(away / (Math.PI / 2));
  if (Math.abs(away - q * (Math.PI / 2)) > SAND_SQUARE) return null;
  const roadAlongX = q % 2 !== 0;
  const tries = [sandTrack(r, road, roadAlongX ? false : true, false, k), sandTrack(r, road, roadAlongX ? true : false, true, k)];
  return tries.reduce<SlotLayout | null>((b, l) => (l && (!b || l.poses.length > b.poses.length) ? l : b), null);
}
/** The sand's track and bays start this far past the road's paved edge (clear of a kerb car's body). */
const SAND_EDGE = 9;
/** Px of track inside the gate before the first bays. */
const SAND_GATE_ROOM = 8;
/** Rad within which the sand's way from its road counts as square to the plan. */
const SAND_SQUARE = 0.15;
/** Sand bays: a little wider than a car park's (cars stand loose), as deep. */
const SAND_BAY_PITCH = PARK_PITCH + 1.2;
/** The track between the bay mouths: a car park aisle's width. */
const SAND_AISLE_HALF = 12;
/** Px a sand car stands askew (rad) and off its column (px) at most. */
const SAND_SKEW = 0.08, SAND_SHIFT = 0.8;

/** A box in the swapped frame. */
const swapBox = (b: Box, swap: boolean): Box => (swap ? { x: b.y, y: b.x, w: b.h, h: b.w } : b);

/**
 * One track on the sand in its own frame (x along the track): `away` true runs it away from the road (gate at its
 * road end), false along the road (gate on the sand's road edge, a spur to the track). Null: no room for it.
 */
function sandTrack(plan: Box, road: RoadPoint, swap: boolean, away: boolean, k: { readonly gx: number; readonly gy: number }): SlotLayout | null {
  const r = swapBox(plan, swap);
  const at = swap ? { x: road.at.y, y: road.at.x } : road.at;
  const half = road.half ?? 0;
  const deep = BAY_DEPTH;
  if (away) {
    // The track runs along x away from the road: the sand starts past the road's edge.
    const su = r.x + r.w / 2 >= at.x ? 1 : -1;
    const near = su > 0 ? Math.max(r.x + SAND_INSET, at.x + half + SAND_EDGE) : Math.min(r.x + r.w - SAND_INSET, at.x - half - SAND_EDGE);
    const far = su > 0 ? r.x + r.w - SAND_INSET : r.x + SAND_INSET;
    const both = r.h - 2 * SAND_INSET >= 2 * (deep + SAND_AISLE_HALF);
    if (r.h - 2 * SAND_INSET < deep + 2 * SAND_AISLE_HALF || su * (far - near) < 40) return null;
    const lo = r.y + SAND_INSET + (both ? deep : 0) + SAND_AISLE_HALF, hi = r.y + r.h - SAND_INSET - deep - SAND_AISLE_HALF;
    const y = Math.min(hi, Math.max(lo, at.y));
    const gate = { x: near, y, a: su > 0 ? 0 : Math.PI };
    const aisle: Aisle = { gate, join: { x: near, y }, y, half: SAND_AISLE_HALF, x0: Math.min(near, far) + (su > 0 ? 1 : 0), x1: Math.max(near, far) - (su < 0 ? 1 : 0), lane: SAND_AISLE_HALF, depth: deep, ...(swap ? { swap } : {}) };
    const rows = [both || y - SAND_AISLE_HALF - deep >= r.y + SAND_INSET ? y - SAND_AISLE_HALF - BAY_MOUTH : null, y + SAND_AISLE_HALF + deep <= r.y + r.h - SAND_INSET + 0.01 ? y + SAND_AISLE_HALF + BAY_MOUTH : null];
    // The first bays keep a little room from the gate (a car turns into them off the track).
    return sandRows(aisle, rows, Math.min(near, far) + (su > 0 ? SAND_GATE_ROOM : 0), Math.max(near, far) - (su < 0 ? SAND_GATE_ROOM : 0), null, k);
  }
  // The track runs along x by the road, the road on one side (y): one row beyond it, a row between if there is room.
  const sv = r.y + r.h / 2 >= at.y ? 1 : -1;
  const near = sv > 0 ? Math.max(r.y + SAND_INSET, at.y + half + SAND_EDGE) : Math.min(r.y + r.h - SAND_INSET, at.y - half - SAND_EDGE);
  const far = sv > 0 ? r.y + r.h - SAND_INSET : r.y + SAND_INSET;
  const depth = sv * (far - near);
  if (depth < deep + 2 * SAND_AISLE_HALF) return null;
  const two = depth >= 2 * (deep + SAND_AISLE_HALF);
  const y = near + sv * ((two ? deep : 0) + SAND_AISLE_HALF);
  const gx = Math.min(r.x + r.w - PARK_EDGE - SAND_AISLE_HALF, Math.max(r.x + PARK_EDGE + SAND_AISLE_HALF, at.x));
  const gate = { x: gx, y: near, a: sv > 0 ? Math.PI / 2 : -Math.PI / 2 };
  const aisle: Aisle = { gate, join: { x: gx, y }, y, half: SAND_AISLE_HALF, x0: r.x + SAND_INSET, x1: r.x + r.w - SAND_INSET, lane: GATE_CLEAR - SAND_BAY_PITCH / 2 - 0.5, depth: deep, ...(swap ? { swap } : {}) };
  const rows = [two ? y - sv * (SAND_AISLE_HALF + BAY_MOUTH) : null, y + sv * (SAND_AISLE_HALF + BAY_MOUTH)];
  return sandRows(aisle, rows, r.x + SAND_INSET, r.x + r.w - SAND_INSET, gx, k);
}

/** Bays along each row line given (in the track's frame), nose in, loose; none within the gate lane of `gate` (x). */
function sandRows(a: Aisle, rowYs: readonly (number | null)[], x0: number, x1: number, gate: number | null, k: { readonly gx: number; readonly gy: number }): SlotLayout | null {
  const n = Math.floor((x1 - x0) / SAND_BAY_PITCH);
  if (n <= 0) return null;
  const step = (x1 - x0) / n;
  const rows = rowYs.filter((y): y is number => y !== null).map((y, ri) => {
    const up = y > a.y;
    const out: RowSlot[] = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * step;
      const nearGate = gate !== null && Math.sign(y - a.y) === Math.sign(a.gate.y - a.y);
      if (nearGate && Math.abs(x - gate) < GATE_CLEAR) continue;
      const j = hash01(i * SALT.sand + k.gx + ri * 31, k.gy) - 0.5, t = hash01(i * SALT.turn + k.gy + ri * 17, k.gx) - 0.5;
      const pose = { x: x + j * 2 * SAND_SHIFT, y, a: (up ? Math.PI / 2 : -Math.PI / 2) + t * 2 * SAND_SKEW };
      out.push({ pose: inPlan(a, pose), u: x, rank: Math.abs(x - a.join.x) + (nearGate ? TURN_BACK : 0), dir: 1 });
    }
    return out;
  });
  if (rows.every((r) => r.length === 0)) return null;
  return { ...fromRows(rows.filter((r) => r.length > 0), true, step, a), maxLen: PARK_MAX_LEN };
}

/** The sand's cars: by a track where the road meets the sand square, else loose rows by the road. */
function sandLayout(cells: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }, road: RoadPoint | null): SlotLayout {
  const tracked = road ? sandAisles(boxOf(cells), road, cells) : null;
  return tracked ?? looseSand(cells, road);
}

/** Rows of cars on the sand by the road, from the middle column outward; a space off the sand is not one. */
function looseSand(cells: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }, road: RoadPoint | null): SlotLayout {
  const r = boxOf(cells);
  const { anchor, away } = sandFrame(r, road);
  const along = away - Math.PI / 2;
  // On the sand and clear of the road's paved width (a body there would stand in the lane).
  const clear = (x: number, y: number): boolean => !road || (x - road.at.x) * Math.cos(away) + (y - road.at.y) * Math.sin(away) >= (road.half ?? 0) + SAND_ROAD_CLEAR;
  const inside = (x: number, y: number): boolean => x >= r.x + SAND_INSET && x <= r.x + r.w - SAND_INSET && y >= r.y + SAND_INSET && y <= r.y + r.h - SAND_INSET && clear(x, y);
  const rows: RowSlot[][] = [];
  let nearRoad = false;
  for (let row = 0; row < SAND_ROWS_MAX; row++) {
    const out: RowSlot[] = [];
    for (let j = 0; j < SAND_COLS; j++) {
      const col = j === 0 ? 0 : Math.ceil(j / 2) * (j % 2 === 1 ? 1 : -1);
      const k = row * SAND_COLS + j;
      const jig = hash01(k * SALT.sand + cells.gx, cells.gy) - 0.5;
      const d = row * SAND_ROW + jig * 2 * SAND_JIT_D;
      const u = col * SAND_PITCH + (hash01(k * SALT.along + cells.gy, cells.gx) - 0.5) * 2 * SAND_JIT_U;
      const x = anchor.x + Math.cos(away) * d + Math.cos(along) * u;
      const y = anchor.y + Math.sin(away) * d + Math.sin(along) * u;
      if (!inside(x, y)) { if (!clear(x, y)) nearRoad = true; continue; }
      const flip = hash01(k * SALT.turn + cells.gx, cells.gy) < 0.5 ? 0 : Math.PI;
      out.push({ pose: { x, y, a: along + jig * 2 * SAND_LOOSE + flip }, u: col * SAND_PITCH, rank: k, dir: flip === 0 ? 1 : -1 });
    }
    // A row too near the road is skipped; past the sand, the rows end.
    if (out.length === 0 && !nearRoad) break;
    nearRoad = false;
    if (out.length === 0) continue;
    rows.push(out);
  }
  return fromRows(rows, false, SAND_PITCH);
}

// ---------------------------------------------------------------- vehicles in slots

/** The slots a vehicle in slot `k` covers: its own, and for a van or lorry the next one along its row (or the one before). Null: it does not fit there. */
export function spanSlots(l: SlotLayout, k: number, kind: VehicleKind): readonly number[] | null {
  if (k < 0 || k >= l.poses.length) return null;
  if (l.maxLen !== undefined && sizeOf(kind).len > l.maxLen + 0.01) return null;
  if (!spansTwo(kind)) return [k];
  const n = l.next[k]!;
  if (n >= 0) return [k, n];
  const p = l.prev[k]!;
  return p >= 0 ? [k, p] : null;
}

/** Where a vehicle covering `span` stands: between its slots, heading as its own; in bays, its tail on the row's line. */
export function bodyPose(l: SlotLayout, span: readonly number[], kind: VehicleKind): SlotPose | null {
  const a = l.poses[span[0] ?? -1];
  if (!a) return null;
  const b = span.length > 1 ? l.poses[span[1]!] : a;
  if (!b) return null;
  const push = l.across ? (sizeOf(kind).len - PITCH_BODY.len) / 2 : 0;
  return { x: (a.x + b.x) / 2 + Math.cos(a.a) * push, y: (a.y + b.y) / 2 + Math.sin(a.a) * push, a: a.a };
}

/** A parallel parker pulls this far past its space before it reverses in (src/render/cars/manoeuvrePath.ts draws it). */
export const PARALLEL_OVERSHOOT = 9;

export interface Sweep { readonly row: number; readonly lo: number; readonly hi: number }
/** Car parks: every move runs along the one aisle. */
export const AISLE_ROW = -1;

/**
 * The stretch of its row a car covers while it moves off the lane: a bay car keeps its column, a forecourt car its
 * length and the swing past it, a car park's car the aisle from the gate to its column. Two moves clash only when
 * their sweeps share a row and overlap.
 */
export function sweepOf(l: SlotLayout, span: readonly number[], kind: VehicleKind): Sweep {
  const u = span.reduce((n, k) => n + l.u[k]!, 0) / span.length;
  const s = sizeOf(kind);
  if (l.aisle) {
    const x = l.aisle.join.x;
    return { row: AISLE_ROW, lo: Math.min(x, u) - s.len / 2, hi: Math.max(x, u) + s.len / 2 };
  }
  const half = l.across ? s.wid / 2 : s.len / 2;
  const dir = l.dir[span[0]!] ?? 1;
  const ahead = l.across ? 0 : PARALLEL_OVERSHOOT;
  return { row: l.row[span[0]!] ?? 0, lo: u - half - (dir < 0 ? ahead : 0), hi: u + half + (dir > 0 ? ahead : 0) };
}

/** A kerb or street car's sweep: its side is its row, and it faces along the road on side 1, against it on -1. */
export function roadSweep(s: number, side: -1 | 1, kind: VehicleKind): Sweep {
  const half = sizeOf(kind).len / 2;
  const u = s * side;
  return { row: side, lo: u - half, hi: u + half + PARALLEL_OVERSHOOT };
}

export const sweepsClash = (a: Sweep, b: Sweep): boolean => a.row === b.row && a.lo < b.hi && b.lo < a.hi;

/** Px of a car park move off the lane: gate, aisle, column (none elsewhere: the move is short). */
export function routeLength(l: SlotLayout, to: SlotPose): number {
  const r = aisleRoute(l, to);
  if (!r) return 0;
  let n = 0;
  const pts = [...r, to];
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return n;
}
