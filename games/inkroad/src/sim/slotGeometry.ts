import { CELL } from './constants';
import { gardenPlan, GATE_W, isGarden, type GardenLot } from './gardenLayout';
import { pointAt, project } from './geom';
import { hash01 } from './rng';
import type { CarParkKind, Pt, Road, VehicleKind } from './types';
import { BIGGEST, PITCH_BODY, reach, sizeOf, spansTwo } from './vehicleSize';

/**
 * One source of truth for off-road spaces (homes, forecourts, car parks, sand): the city counts exactly these slots
 * and the renderer draws exactly these. Pure, no Phaser. Each place's slots come in the order drivers prefer them
 * (nearest the way in first), each with its neighbours along its row. Pitches hold a car with a visible gap; a van or
 * a lorry covers its slot and a neighbour (`spanSlots`) and stands between the two (`bodyPose`).
 */
export interface SlotPose { readonly x: number; readonly y: number; /** Plan heading, radians. */ readonly a: number }

/** A car park with two rows: the gate on its edge, where the gate lane meets the aisle, and the aisle's line. */
export interface Aisle { readonly gate: SlotPose; readonly join: Pt; readonly y: number }

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

export interface RoadPoint { readonly at: Pt; readonly a: number }

/** Clear paint between two parked bodies, side by side and nose to tail. */
export const GAP_ACROSS = 2.6;
export const GAP_ALONG = 3;
/** Lot edges (roads keep a cell off a lot, so the strip is wide). */
const LOT_INSET = 9;
/** Home bays stand nose to the road: the pitch is across the body. Forecourts stand along the edge: along the body. */
export const NOSE_PITCH = PITCH_BODY.wid + GAP_ACROSS;
export const SIDE_PITCH = PITCH_BODY.len + GAP_ALONG;
const NOSE_GAP = 9;
const SIDE_GAP = 6.5;
/** Car park bays: nose to the aisle, rows facing each other. */
const PARK_EDGE = 12;
export const PARK_PITCH = PITCH_BODY.wid + GAP_ALONG;
const PARK_ROW_IN = 18;
/** Kinds of car park with bays on the ground (the others take cars inside). */
const SURFACE: ReadonlySet<CarParkKind> = new Set<CarParkKind>(['lot', 'ride']);
/** The gate lane keeps this far from a bay's middle. */
const GATE_CLEAR = PITCH_BODY.wid + 1.5;
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
const SAND_REACH = reach(PITCH_BODY, SAND_LOOSE);
const SAND_BIG = reach(BIGGEST, SAND_LOOSE);
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

function lotLayout(lot: GardenLot, nose: boolean, from: Pt | null): SlotLayout {
  const e = lotEdge(lot, from);
  const pitch = nose ? NOSE_PITCH : SIDE_PITCH;
  const n = Math.max(0, Math.floor((e.len - LOT_INSET * 2) / pitch));
  const u0 = from ? (from.x - e.x) * e.tx + (from.y - e.y) * e.ty : e.len / 2;
  const gates = isGarden(lot) && e.ny > 0 ? gardenPlan(lot).gates.map((g) => g.x - e.x) : [];
  const gap = nose ? NOSE_GAP : SIDE_GAP;
  const along = Math.atan2(e.ty, e.tx);
  const row: RowSlot[] = [];
  for (let j = 0; j < n; j++) {
    const u = LOT_INSET + (j + 0.5) * ((e.len - LOT_INSET * 2) / n);
    if (gates.some((g) => Math.abs(u - g) <= GATE_W / 2 + PITCH_BODY.wid / 2)) continue;
    // Along the edge cars face either way in turn: one from the lane that way backs in with an S, one from the other
    // swings round into it forward (or turns round first: src/sim/parkPaths.ts). Facing all one way tipped the bots.
    const dir = nose || j % 2 === 0 ? 1 : -1;
    const a = nose ? Math.atan2(e.ny, e.nx) : along + (dir > 0 ? 0 : Math.PI);
    row.push({ pose: { x: e.x + e.tx * u + e.nx * gap, y: e.y + e.ty * u + e.ny * gap, a }, u, rank: Math.abs(u - u0), dir });
  }
  return fromRows([row], nose, pitch);
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
      out.push({ pose: { x, y, a: up ? -Math.PI / 2 : Math.PI / 2 }, u: x, rank: Math.hypot(x - gate.x, y - gate.y), dir: 1 });
    }
    return out;
  });
  const aisle = twoRows ? { gate, join: { x: gate.x, y: aisleY }, y: aisleY } : undefined;
  return { ...fromRows(rows, true, PARK_PITCH, aisle), maxLen: PARK_MAX_LEN };
}

/** Where a car drives to reach bay `k` of a two-row car park: through the gate, to the aisle, along it to the bay's column. */
export function aisleRoute(l: SlotLayout, to: SlotPose): readonly Pt[] | null {
  const a = l.aisle;
  if (!a) return null;
  return [{ x: a.gate.x, y: a.gate.y }, a.join, { x: to.x, y: a.y }];
}

// ---------------------------------------------------------------- sand

/** The ground road that comes closest to a point, and the point on it. */
export function nearestGround(roads: readonly Road[], c: Pt): RoadPoint | null {
  let best: { at: Pt; a: number; d: number } | null = null;
  for (const road of roads) {
    if (road.level !== 0 || road.flyover || road.line.length < 2) continue;
    const n = project(road.line, c);
    if (!best || n.d < best.d) best = { at: { x: n.x, y: n.y }, a: pointAt(road.line, n.s).heading, d: n.d };
  }
  return best ? { at: best.at, a: best.a } : null;
}

function sandFrame(r: Box, road: RoadPoint | null): { readonly anchor: Pt; readonly away: number } {
  const mid = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const near = road?.at ?? mid;
  const anchor = { x: Math.min(r.x + r.w - SAND_ANCHOR, Math.max(r.x + SAND_ANCHOR, near.x)), y: Math.min(r.y + r.h - SAND_ANCHOR, Math.max(r.y + SAND_ANCHOR, near.y)) };
  const away = Math.hypot(anchor.x - near.x, anchor.y - near.y) > 1 ? Math.atan2(anchor.y - near.y, anchor.x - near.x) : Math.atan2(mid.y - near.y, mid.x - near.x);
  return { anchor, away };
}

/** Rows of cars on the sand by the road, from the middle column outward; a space off the sand is not one. */
function sandLayout(cells: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }, road: RoadPoint | null): SlotLayout {
  const r = boxOf(cells);
  const { anchor, away } = sandFrame(r, road);
  const along = away - Math.PI / 2;
  const inside = (x: number, y: number): boolean => x >= r.x + SAND_INSET && x <= r.x + r.w - SAND_INSET && y >= r.y + SAND_INSET && y <= r.y + r.h - SAND_INSET;
  const rows: RowSlot[][] = [];
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
      if (!inside(x, y)) continue;
      const flip = hash01(k * SALT.turn + cells.gx, cells.gy) < 0.5 ? 0 : Math.PI;
      out.push({ pose: { x, y, a: along + jig * 2 * SAND_LOOSE + flip }, u: col * SAND_PITCH, rank: k, dir: flip === 0 ? 1 : -1 });
    }
    if (out.length === 0) break;
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
