import { MOTION_SWITCHES } from '../../sim/switches';
import type { CityView, Id, Junction, Link, Pt, Road } from '../../sim/types';
import { halfWidth, lanesPerLink, MEDIAN } from '../../sim/roadGeom';
import { CELL, LANE } from '../../sim/constants';
import { groundParts } from '../deckHeight';
import { boxOf, lineLength, offsetLine, pointAt, subLine, type Box } from '../geom';
import { linePath } from '../pen';
import { APRON, fieldAt } from './terrain';
import { splitTunnel } from './tunnels';
import { bucket } from './wornRoads';

/**
 * Roads and junctions as shapes to paint, worked out from the network alone.
 * A road is a ribbon along its line; a junction is a polygon whose corners
 * are rounded kerbs, so any number of arms at any angle meets cleanly.
 */
export const KERB_W = 5.5;
/** Kerb corners (15 with ROOMY_CORNERS in src/sim/netCore.ts, so a R_MIN right turn keeps its body off the kerb). */
const fillet = (): number => (MOTION_SWITCHES.ROOMY_CORNERS ? 15 : 11);
const MAX_CORNER = 3.2; // of the wider half width: sharper corners are cut off there
const PARALLEL = 0.12;
const FLARE = 17;
const FLARE_TURN = 0.42;
const END_PAD = 2;
const END_ROUND = 12;

export interface Arm {
  readonly road: Road;
  /** The road's line leading out of the junction. */
  readonly out: readonly Pt[];
  readonly a: number;
  readonly half: number;
  readonly len: number;
}

export type JoinKind = 'plain' | 'ring' | 'bend' | 'end' | 'gate' | 'ramp';

export interface JunctionShape {
  readonly j: Junction;
  readonly kind: JoinKind;
  readonly arms: readonly Arm[];
  readonly path: Path2D;
  readonly box: Box;
  readonly sig: string;
}

export interface RoadShape {
  readonly road: Road;
  readonly links: readonly Link[];
  readonly half: number;
  readonly median: number;
  /** The road's line, carried on past a map gate. */
  readonly line: readonly Pt[];
  readonly len: number;
  /** How much of `line` comes before the road's own start. */
  readonly lead: number;
  /** What lies on the ground (a flyover: only the feet of its ramps). */
  readonly path: Path2D;
  /** The line without the stretches inside its junctions, for markings. */
  readonly inner: readonly Pt[];
  readonly cut: readonly [number, number];
  /** A way in from the map's edge that joins nothing yet: drawn as a plan. */
  readonly waits: boolean;
  /** A bridge's stretches over water, as parts of `line`. */
  readonly wet: readonly (readonly Pt[])[];
  readonly box: Box;
  readonly sig: string;
  /** A tunnel's dry end: which end of this piece goes down to a portal. */
  readonly mouth?: 'start' | 'end';
  /** The hidden stretch of a tunnel, on its first piece only. */
  readonly shut?: readonly Pt[];
}

export interface RoadScene { readonly roads: readonly RoadShape[]; readonly joins: readonly JunctionShape[] }

const PAVED: readonly Road['type'][] = ['street', 'avenue', 'boulevard'];
/** Width of the walk beside the asphalt. */
export const kerbOf = (road: Road): number => (road.flyover ? 1.5 : PAVED.includes(road.type) ? KERB_W : 2.5);

const at = (c: Pt, a: number, along: number, side: number): Pt => ({
  x: c.x + Math.cos(a) * along - Math.sin(a) * side,
  y: c.y + Math.sin(a) * along + Math.cos(a) * side,
});

export function armOf(road: Road, node: Id): Arm {
  const out = road.a === node ? road.line : [...road.line].reverse();
  const p = out[0]!;
  const q = pointAt(out, Math.min(6, lineLength(out)));
  return { road, out, a: Math.atan2(q.y - p.y, q.x - p.x), half: halfWidth(road), len: lineLength(out) };
}

const norm = (a: number): number => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/** Where the facing edges of two arms cross, as distances along each, or null when they are in line. */
export function cornerOf(p: { a: number; half: number }, q: { a: number; half: number }): { readonly tp: number; readonly tq: number } | null {
  const gap = norm(q.a - p.a);
  const s = Math.sin(gap);
  if (Math.abs(s) < PARALLEL) return null;
  const c = Math.cos(gap);
  return { tp: (q.half + p.half * c) / s, tq: (p.half + q.half * c) / s };
}

interface Corner { readonly from: Pt; readonly ctrl: Pt; readonly to: Pt; readonly tp: number; readonly tq: number }

/** The kerb from arm p (its clockwise edge) round to arm q (its other edge). */
function cornerCurve(c: Pt, p: Arm, q: Arm): Corner {
  const wide = Math.max(p.half, q.half);
  const limit = wide * MAX_CORNER;
  const x = cornerOf(p, q);
  const tp = x ? Math.min(limit, Math.max(0, x.tp)) : wide;
  const tq = x ? Math.min(limit, Math.max(0, x.tq)) : wide;
  const sharp = x !== null && Math.abs(x.tp) <= limit && Math.abs(x.tq) <= limit;
  // An outer corner (the edges meet behind the middle): round it through the true corner, not a flat bevel.
  const outer = sharp && x.tp < 0 && x.tq < 0;
  const from = at(c, p.a, outer ? Math.min(p.len, Math.max(0, x.tp + fillet())) : Math.min(p.len, tp + fillet()), p.half);
  const to = at(c, q.a, outer ? Math.min(q.len, Math.max(0, x.tq + fillet())) : Math.min(q.len, tq + fillet()), -q.half);
  const ctrl = sharp ? at(c, p.a, x.tp, p.half) : { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return { from, ctrl, to, tp, tq };
}

function plainPath(c: Pt, arms: readonly Arm[]): { path: Path2D; pts: Pt[] } {
  const path = new Path2D();
  const pts: Pt[] = [];
  arms.forEach((p, i) => {
    const k = cornerCurve(c, p, arms[(i + 1) % arms.length]!);
    if (i === 0) path.moveTo(k.from.x, k.from.y);
    else path.lineTo(k.from.x, k.from.y);
    path.quadraticCurveTo(k.ctrl.x, k.ctrl.y, k.to.x, k.to.y);
    pts.push(k.from, k.ctrl, k.to);
  });
  path.closePath();
  return { path, pts };
}

/** A disc with a flared mouth at each arm. */
function ringPath(c: Pt, r: number, arms: readonly Arm[]): Path2D {
  const path = new Path2D();
  path.arc(c.x, c.y, r, 0, Math.PI * 2);
  for (const arm of arms) {
    const h = Math.min(arm.half, r * 0.95);
    const turn = Math.asin(h / r) + FLARE_TURN;
    const foot = Math.sqrt(r * r - h * h);
    const end = Math.min(arm.len, r + FLARE);
    const p = new Path2D();
    const start = at(c, arm.a - turn, r, 0);
    p.moveTo(c.x, c.y);
    p.lineTo(start.x, start.y);
    for (const side of [-1, 1]) {
      const ctrl = at(c, arm.a, foot + 2, h * side);
      const edge = at(c, arm.a, end, h * side);
      const disc = at(c, arm.a + turn * side, r, 0);
      if (side < 0) p.quadraticCurveTo(ctrl.x, ctrl.y, edge.x, edge.y);
      else { p.lineTo(edge.x, edge.y); p.quadraticCurveTo(ctrl.x, ctrl.y, disc.x, disc.y); }
    }
    p.closePath();
    path.addPath(p);
  }
  return path;
}

/** A dead end: round for a street, squarer for a wide road. */
function endPath(c: Pt, arm: Arm): Path2D {
  const p = new Path2D();
  const r = Math.min(arm.half, END_ROUND);
  const pts = [at(c, arm.a, 0, arm.half), at(c, arm.a, -r, arm.half), at(c, arm.a, -r, -arm.half), at(c, arm.a, 0, -arm.half)];
  p.moveTo(pts[0]!.x, pts[0]!.y);
  p.arcTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y, r);
  p.arcTo(pts[2]!.x, pts[2]!.y, pts[3]!.x, pts[3]!.y, r);
  p.lineTo(pts[3]!.x, pts[3]!.y);
  p.closePath();
  return p;
}

/** A road that narrows: from the wide arm's edges to the narrow arm's. */
function taperPath(c: Pt, p: Arm, q: Arm): { path: Path2D; pts: Pt[] } {
  const [wide, slim] = p.half >= q.half ? [p, q] : [q, p];
  const t = taperOf(wide.half, slim.half, wide.len);
  const pts = [at(c, wide.a, t, wide.half), at(c, wide.a, t * 0.5, wide.half), at(c, wide.a, t * 0.5, slim.half), at(c, slim.a, 2, -slim.half), at(c, slim.a, 2, slim.half), at(c, wide.a, t * 0.5, -slim.half), at(c, wide.a, t * 0.5, -wide.half), at(c, wide.a, t, -wide.half)];
  const path = new Path2D();
  path.moveTo(pts[0]!.x, pts[0]!.y);
  path.bezierCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y, pts[3]!.x, pts[3]!.y);
  path.lineTo(pts[4]!.x, pts[4]!.y);
  path.bezierCurveTo(pts[5]!.x, pts[5]!.y, pts[6]!.x, pts[6]!.y, pts[7]!.x, pts[7]!.y);
  path.closePath();
  return { path, pts };
}

const TAPER = 2.6; // px of length per px of width lost
export const taperOf = (wide: number, slim: number, len: number): number => Math.min(len * 0.7, (wide - slim) * TAPER);

/** Two arms in line but not as wide as each other. */
const narrows = (arms: readonly Arm[]): boolean => arms.length === 2 && Math.abs(arms[0]!.half - arms[1]!.half) > 1 && Math.cos(arms[0]!.a - arms[1]!.a) < -0.96;

function kindOf(j: Junction, arms: readonly Arm[]): JoinKind {
  if (j.ramp) return narrows(arms) ? 'bend' : 'ramp';
  if (arms.length === 1) return j.gate === undefined ? 'end' : 'gate';
  if (j.control === 'roundabout' && arms.length >= 3) return 'ring';
  return arms.length === 2 ? 'bend' : 'plain';
}

function joinShape(j: Junction, roads: ReadonlyMap<Id, Road>): JunctionShape | null {
  const arms = j.arms.map((id) => roads.get(id)).filter((r): r is Road => !!r && !r.flyover).map((r) => armOf(r, j.id)).sort((p, q) => norm(p.a) - norm(q.a));
  if (arms.length === 0) return null;
  const c = { x: j.x, y: j.y };
  const kind = kindOf(j, arms);
  let path: Path2D;
  let pts: Pt[] = [];
  if (kind === 'ring') path = ringPath(c, j.radius, arms);
  else if (kind === 'end') path = endPath(c, arms[0]!);
  else if (kind === 'gate') path = new Path2D();
  else if (narrows(arms)) ({ path, pts } = taperPath(c, arms[0]!, arms[1]!));
  else ({ path, pts } = plainPath(c, arms));
  const reach = j.radius + FLARE + fillet();
  const box = boxOf([c, ...pts, { x: c.x - reach, y: c.y - reach }, { x: c.x + reach, y: c.y + reach }], KERB_W + 4);
  const sig = `${j.id}:${j.control}:${j.radius.toFixed(1)}:${j.works}:${arms.map((a) => `${a.road.id},${a.road.type},${a.half},${a.a.toFixed(2)},${a.road.oneWay ? 1 : 0}`).join('/')}`;
  return { j, kind, arms, path, box, sig };
}

/** How far from a junction's middle its arms' markings start. */
export function setback(s: JunctionShape | undefined, road: Road): number {
  if (!s || s.kind === 'gate' || s.kind === 'ramp') return 0;
  if (s.kind === 'end') return END_PAD;
  if (s.kind === 'ring') return s.j.radius + FLARE * 0.5;
  if (s.kind === 'plain') return s.j.radius;
  const i = s.arms.findIndex((a) => a.road.id === road.id);
  if (i < 0) return 0;
  const me = s.arms[i]!;
  const other = s.arms[1 - i] ?? me;
  if (narrows(s.arms)) return me.half > other.half ? taperOf(me.half, other.half, me.len) : END_PAD;
  const a = cornerOf(me, other);
  const b = cornerOf(other, me);
  return Math.max(END_PAD, Math.min(me.half * MAX_CORNER, Math.max(a?.tp ?? 0, b?.tq ?? 0)));
}

/** The road's line, carried on out of the picture past a map gate. */
function drawnLine(road: Road, ja: JunctionShape | undefined, jb: JunctionShape | undefined): readonly Pt[] {
  const out = (s: JunctionShape | undefined): Pt[] => (s?.kind === 'gate' ? [at(s.j, s.arms[0]!.a + Math.PI, APRON * CELL, 0)] : []);
  const far = { a: out(ja), b: out(jb) };
  return far.a.length + far.b.length === 0 ? road.line : [...far.a, ...road.line, ...far.b];
}

const waits = (p: JunctionShape | undefined, q: JunctionShape | undefined): boolean => (p?.kind === 'gate' && q?.kind === 'end') || (p?.kind === 'end' && q?.kind === 'gate');

/** Where a wide road's ribbon gives way to its taper. */
const trim = (s: JunctionShape | undefined, road: Road): number => (s && s.kind === 'bend' && narrows(s.arms) ? setback(s, road) : 0);

const WET_STEP = 6;
const WET_PAD = 12;

/** The parts of a bridge that are over water, a little more at each end. */
function wetParts(road: Road, rows: readonly string[]): Pt[][] {
  if (!road.bridge) return [];
  const len = lineLength(road.line);
  const out: Pt[][] = [];
  let from = -1;
  for (let s = 0; s <= len + WET_STEP; s += WET_STEP) {
    const p = pointAt(road.line, Math.min(s, len));
    const wet = s <= len && fieldAt(rows, '~', p.x, p.y) > 0.5;
    if (wet && from < 0) from = s;
    if (!wet && from >= 0) { out.push(subLine(road.line, from - WET_PAD, s + WET_PAD)); from = -1; }
  }
  return out;
}

function roadShape(road: Road, links: ReadonlyMap<Id, Link>, joins: ReadonlyMap<Id, JunctionShape>, rows: readonly string[]): RoadShape {
  const ja = joins.get(road.a);
  const jb = joins.get(road.b);
  const line = drawnLine(road, ja, jb);
  const len = lineLength(line);
  const cut: [number, number] = [Math.min(len / 2, setback(ja, road)), Math.max(len / 2, len - setback(jb, road))];
  const own = road.links.map((id) => links.get(id)).filter((l): l is Link => !!l);
  const ends = `${fmt(road.line[0]!)}${fmt(road.line[road.line.length - 1]!)}${len.toFixed(1)}`;
  const flags = [road.oneWay, road.busLane, road.kerb, road.toll, road.truckBan, road.bridge, road.nightWorks].map((f) => (f ? 1 : 0)).join('');
  return {
    road, links: own, half: halfWidth(road), median: road.oneWay || road.flyover ? 0 : MEDIAN[road.type],
    line, len, lead: ja?.kind === 'gate' ? APRON * CELL : 0, path: road.flyover ? groundPath(road) : linePath(subLine(line, trim(ja, road), len - trim(jb, road))), inner: subLine(line, cut[0], cut[1]), cut, wet: wetParts(road, rows), waits: waits(ja, jb),
    box: boxOf(line, halfWidth(road) + KERB_W + 6),
    sig: `${road.id}:${road.type}:${road.level}:${road.dir ?? 1}:${flags}:${road.works}:${bucket(road.condition)}:${waits(ja, jb) ? 1 : 0}:${ends}:${cut.map((v) => v.toFixed(0)).join(',')}`,
  };
}

/** A flyover's feet. */
function groundPath(road: Road): Path2D {
  const p = new Path2D();
  for (const part of groundParts(road)) p.addPath(linePath(part));
  return p;
}

const fmt = (p: Pt): string => `${Math.round(p.x)},${Math.round(p.y)};`;

export function roadScene(city: Pick<CityView, 'roads' | 'links' | 'junctions' | 'def'>): RoadScene {
  const roads = new Map(city.roads.map((r) => [r.id, r]));
  const links = new Map(city.links.map((l) => [l.id, l]));
  const joins = city.junctions.map((j) => joinShape(j, roads)).filter((s): s is JunctionShape => s !== null);
  const byNode = new Map(joins.map((s) => [s.j.id, s]));
  return { roads: city.roads.flatMap((r) => shapesOf(r, links, byNode, city.def.map)), joins };
}

/** A road's shape; a tunnel is two (its dry ends) with the hidden stretch noted on the first. */
function shapesOf(road: Road, links: ReadonlyMap<Id, Link>, joins: ReadonlyMap<Id, JunctionShape>, rows: readonly string[]): RoadShape[] {
  const t = splitTunnel(road, rows);
  if (!t) return [roadShape(road, links, joins, rows)];
  const head = roadShape(t.head, links, joins, rows);
  const tail = roadShape(t.tail, links, joins, rows);
  const box = boxOf(road.line, head.half + KERB_W + 6);
  return [{ ...head, mouth: 'end', shut: t.shut, box, sig: `${head.sig}:tunnel` }, { ...tail, mouth: 'start', sig: `${tail.sig}:tunnel` }];
}

/** Distances from the road's centre line to each line between two lanes of one direction. Pure. */
export function laneMarks(road: Road): number[] {
  const n = lanesPerLink(road);
  const at0 = road.oneWay || road.flyover ? (-n / 2) * LANE : MEDIAN[road.type] / 2;
  const marks = Array.from({ length: Math.max(0, n - 1) }, (_, i) => at0 + (i + 1) * LANE);
  return road.oneWay || road.flyover ? marks : [...marks, ...marks.map((m) => -m)];
}

/** The middle of lane i of a link (0 is next to the centre), plan px. */
export function laneLine(s: RoadShape, link: Link, i: number, from = 0, to = Infinity): Pt[] {
  const base = offsetLine(link.line, (i - (link.lanes - 1) / 2) * LANE);
  return subLine(base, from, Math.min(to, lineLength(base)));
}
