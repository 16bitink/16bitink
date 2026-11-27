/**
 * The ground a manoeuvre is planned on (docs/inkroad-vehicle-model.md "Phase B: the ground"), built from the city's
 * real geometry for one move: the paved roads near it (with the kerb's parking band where a road has kerb places),
 * the junction discs, and only the place the car is going to or coming from: its spaces and the front yard between
 * them and their road (a driveway, a forecourt), a car park's own ground and its gate, the sand of a beach lot, a
 * building's mouth. Never another lot, a building or a verge elsewhere. The bodies are the cars standing near.
 * Reversing (the owner, phase B) is allowed off the road and in the lanes on one side of the move's road only up to
 * the inner edge of the outermost lane: nobody backs across a lane of traffic.
 */
import { LANE, VEHICLES } from '../sim/constants';
/** Px/s under which a car on the road counts as standing (a body the move must clear). */
const STANDING_V = 3;
import { pointAt, project } from '../sim/geom';
import { halfWidth } from '../sim/roadGeom';
import type { World } from '../sim/vehicle/planner';
import type { Pt, Road, VehicleKind } from '../sim/types';
import { bodyAt, type Body } from '../sim/vehicleSize';
import { lotRect, type Rect } from './geometry';
import type { Spot, Standing } from './day';
import type { City } from './state';

/** Px of kerb a body corner may touch (a wheel on the line, a nose over the kerb edge). */
const KERB = 1.5;
/** The parking band of streets and kerb-bay roads (street cars stand askew and shoved out a little). */
const PARK_BAND = 13;
/** Px around the move the ground and the bodies are gathered from. */
const REACH = 70;
/** A front yard reaches this far past its spaces along the road, and past them away from it. */
const YARD_SIDE = 24, YARD_BACK = 6;
/** An apron (a car park's gate, a building's mouth) is this wide. */
const APRON_WID = 30;
/** A car park's gate is flared wider (a car swings into it from either lane). */
const GATE_WID = 56;
/** Px a reversing body may reach past the inner edge of its lane (paint, a wheel on the line). */
const REVERSE_SLACK = 2;

interface Seg { readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number; readonly hw: number; readonly road: Road }

export interface Ground extends World {
  /** The boxes of the place (yards, aprons, spaces): for the lab's drawing. */
  readonly area: readonly Body[];
}

const inBox = (b: Body, x: number, y: number, pad = 0): boolean => {
  const c = Math.cos(b.a), s = Math.sin(b.a);
  const f = (x - b.x) * c + (y - b.y) * s, r = -(x - b.x) * s + (y - b.y) * c;
  return Math.abs(f) <= b.len / 2 + pad && Math.abs(r) <= b.wid / 2 + pad;
};

const inRect = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Signed distance of a point off a segment's line (+ to the right of a to b in screen axes: y down), and its share along it. */
function offSeg(s: Seg, x: number, y: number): { lat: number; t: number; d: number } {
  const dx = s.bx - s.ax, dy = s.by - s.ay, l2 = Math.max(1e-9, dx * dx + dy * dy);
  const t = ((x - s.ax) * dx + (y - s.ay) * dy) / l2;
  const tc = Math.max(0, Math.min(1, t));
  const px = s.ax + dx * tc, py = s.ay + dy * tc;
  const l = Math.sqrt(l2);
  return { lat: (-(x - s.ax) * dy + (y - s.ay) * dx) / l, t, d: Math.hypot(px - x, py - y) };
}

interface Box { x0: number; y0: number; x1: number; y1: number }
const near = (b: Box, x: number, y: number, pad: number): boolean => x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;

function segsNear(c: City, b: Box): Seg[] {
  const out: Seg[] = [];
  for (const r of c.net.roads) {
    if (r.level !== 0 || r.flyover) continue;
    const hw = halfWidth(r) + KERB + (r.kerb || r.type === 'street' ? PARK_BAND : 0);
    for (let i = 1; i < r.line.length; i++) {
      const a = r.line[i - 1]!, e = r.line[i]!;
      if (Math.max(a.x, e.x) < b.x0 - REACH || Math.min(a.x, e.x) > b.x1 + REACH || Math.max(a.y, e.y) < b.y0 - REACH || Math.min(a.y, e.y) > b.y1 + REACH) continue;
      out.push({ ax: a.x, ay: a.y, bx: e.x, by: e.y, hw, road: r });
    }
  }
  return out;
}

/** An oriented box from point p to point q, `wid` wide. */
function apron(p: Pt, q: Pt, wid: number): Body {
  const len = Math.max(1, Math.hypot(q.x - p.x, q.y - p.y));
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, a: Math.atan2(q.y - p.y, q.x - p.x), len, wid };
}

const roadOf = (c: City, id: number): Road | undefined => c.net.roads.find((r) => r.id === id);
/** The road a place is reached from: its own (kerb, street, double), else the road nearest its spaces (a beach's sand may lie by another road than its lot's access). */
function accessRoad(c: City, spot: Spot): Road | undefined {
  if (spot.kind === 'kerb' || spot.kind === 'street' || spot.kind === 'double') return roadOf(c, spot.id);
  const poses = spot.layout?.poses ?? [];
  if (spot.kind === 'sand' && poses.length) return nearestRoad(c, poses[0]!);
  return roadOf(c, 'road' in spot.access ? spot.access.road : -1);
}

/** The front yard of a place with drawn spaces: from its road's line out past every space, as wide as they spread along it (and a little). */
function yardOf(road: Road, poses: readonly { readonly x: number; readonly y: number; readonly a: number }[], front: Rect | null): Body | null {
  if (poses.length === 0) return null;
  const mid = poses.reduce((m, p) => ({ x: m.x + p.x / poses.length, y: m.y + p.y / poses.length }), { x: 0, y: 0 });
  const n = project(road.line, mid);
  const h = pointAt(road.line, n.s).heading;
  const tx = Math.cos(h), ty = Math.sin(h);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const p of poses) for (const [f, r] of [[8, 4.2], [8, -4.2], [-8, 4.2], [-8, -4.2]] as const) {
    const x = p.x + f * Math.cos(p.a) - r * Math.sin(p.a) - n.x, y = p.y + f * Math.sin(p.a) + r * Math.cos(p.a) - n.y;
    const u = x * tx + y * ty, v = -x * ty + y * tx;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  // A lot's whole frontage is its own (a forecourt, a driveway's flared mouth).
  if (front) for (const [x, y] of [[front.x, front.y], [front.x + front.w, front.y], [front.x, front.y + front.h], [front.x + front.w, front.y + front.h]] as const) {
    const u = (x - n.x) * tx + (y - n.y) * ty;
    u0 = Math.min(u0, u + YARD_SIDE); u1 = Math.max(u1, u - YARD_SIDE);
  }
  // From the road's line (v = 0) to beyond the spaces, on their side.
  const lo = Math.min(0, v0 - YARD_BACK), hi = Math.max(0, v1 + YARD_BACK);
  const cu = (u0 + u1) / 2, cv = (lo + hi) / 2;
  return { x: n.x + cu * tx - cv * ty, y: n.y + cu * ty + cv * tx, a: h, len: u1 - u0 + 2 * YARD_SIDE, wid: hi - lo };
}

/** The nearest point of a road's line to p. */
const onLine = (road: Road, p: Pt): Pt => { const n = project(road.line, p); return { x: n.x, y: n.y }; };

/** The place's own ground: boxes (yards, aprons) and rects (a car park's ground, a building's mouth). */
function placeArea(c: City, spot: Spot | null, mouth: { readonly rect: Rect; readonly at: Pt } | null): { boxes: Body[]; rects: Rect[] } {
  const boxes: Body[] = [], rects: Rect[] = [];
  if (mouth) {
    rects.push(mouth.rect);
    const road = spot ? accessRoad(c, spot) : nearestRoad(c, mouth.at);
    if (road) boxes.push(apron(mouth.at, onLine(road, mouth.at), APRON_WID));
  }
  if (!spot) return { boxes, rects };
  const road = accessRoad(c, spot);
  const l = spot.layout;
  if (spot.kind === 'park') {
    const park = c.parks.find((p) => p.id === spot.id);
    if (park) rects.push(lotRect(park));
    const gate = l?.aisle?.gate;
    if (gate && road) boxes.push(apron(gate, onLine(road, gate), GATE_WID));
    else if (park && road) { const r = lotRect(park); const m = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; boxes.push(apron(m, onLine(road, m), APRON_WID)); }
    return { boxes, rects };
  }
  if (l && road) {
    const lot = spot.kind === 'home' || spot.kind === 'private' ? c.lots.find((q) => q.id === spot.id) : undefined;
    const yard = yardOf(road, l.poses, lot ? lotRect(lot) : null);
    if (yard) boxes.push(yard);
  }
  return { boxes, rects };
}

export function nearestRoad(c: City, p: Pt): Road | undefined {
  let best: Road | undefined, d = Infinity;
  for (const r of c.net.roads) { if (r.level !== 0) continue; const n = project(r.line, p); if (n.d < d) { d = n.d; best = r; } }
  return best;
}

export interface GroundAsk {
  /** The place (null: a turn on the road, a building's mouth). */
  readonly spot: Spot | null;
  /** The poses the move runs between (its ground and bodies are gathered around them). */
  readonly from: Pt;
  readonly to: Pt;
  /** The car itself (never one of the bodies), its uid on the road if it has one, and a building's mouth it drives into or out of. */
  readonly self: number;
  readonly road?: number;
  readonly mouth?: { readonly rect: Rect; readonly at: Pt } | null;
  /**
   * Reversing is allowed only on this road on this side of its line (sign of the segment's lat), up to the inner edge
   * of its outermost lane; absent: anywhere drivable (a turn on a clear road).
   */
  readonly reverseOn?: { readonly road: number; readonly side: 1 | -1 };
  /** Where each standing car is drawn (src/city/movePlan.ts). */
  readonly poseOf: (e: Standing) => { readonly x: number; readonly y: number; readonly a: number } | null;
}

/** The ground and the bodies for one move. */
export function groundFor(c: City, q: GroundAsk): Ground {
  const box: Box = { x0: Math.min(q.from.x, q.to.x), y0: Math.min(q.from.y, q.to.y), x1: Math.max(q.from.x, q.to.x), y1: Math.max(q.from.y, q.to.y) };
  const segs = segsNear(c, box);
  const discs = c.net.junctions.filter((j) => near(box, j.x, j.y, REACH + j.radius)).map((j) => ({ x: j.x, y: j.y, r: j.radius + KERB }));
  const { boxes, rects } = placeArea(c, q.spot, q.mouth ?? null);
  const onRoad = (x: number, y: number): boolean => segs.some((s) => offSeg(s, x, y).d <= s.hw) || discs.some((d) => Math.hypot(d.x - x, d.y - y) <= d.r);
  const inPlace = (x: number, y: number): boolean => boxes.some((b) => inBox(b, x, y)) || rects.some((r) => inRect(r, x, y));
  const drivable = (x: number, y: number): boolean => inPlace(x, y) || onRoad(x, y);
  const rev = q.reverseOn;
  const own = rev ? segs.filter((s) => s.road.id === rev.road) : [];
  const edge = rev ? halfWidth(own[0]?.road ?? roadOf(c, rev.road)!) - LANE - REVERSE_SLACK : 0;
  // In a car park a car backs only within the park (out of its bay into the aisle), never out through its gate.
  const backable = q.spot?.kind === 'park' && rects.length ? (x: number, y: number): boolean => rects.some((r) => inRect(r, x, y)) : inPlace;
  const reverse = rev ? (x: number, y: number): boolean => backable(x, y) || own.some((s) => { const o = offSeg(s, x, y); return o.t >= -0.05 && o.t <= 1.05 && o.d <= s.hw && o.lat * rev.side >= edge; }) : undefined;
  return { drivable, bodies: bodiesNear(c, q, box), area: boxes, ...(reverse ? { reverse } : {}) };
}

/** The bodies of the cars standing near the move (not the car itself). */
function bodiesNear(c: City, q: GroundAsk, b: Box): Body[] {
  const out: Body[] = [];
  // Cars standing or creeping on the road near it (a queue behind, a car waiting at the line): moving ones are held off by the lane hold and the gap.
  const t = c.traffic.cars;
  for (let i = 0; i < t.count; i++) {
    if (t.alive[i] !== 1 || t.state[i] === 4 || t.uid[i] === q.self || t.uid[i] === q.road || t.speed[i]! > STANDING_V || t.z[i] !== 0) continue;
    if (near(b, t.x[i]!, t.y[i]!, REACH)) out.push(bodyAt(VEHICLES[t.kind[i]!] as VehicleKind, t.x[i]!, t.y[i]!, t.heading[i]!));
  }
  for (const s of c.day.spots.values()) {
    if (!near(b, s.at.x, s.at.y, REACH + 400)) continue;
    for (const e of s.cars) {
      if (e.uid === q.self || e.edge) continue;
      const p = q.poseOf(e);
      if (p && near(b, p.x, p.y, REACH)) out.push(bodyAt(e.kind, p.x, p.y, p.a));
    }
  }
  return out;
}

/** Which side of a road's line a point is on (the sign groundFor's reverse rule uses). */
export function roadSide(road: Road, p: Pt): 1 | -1 {
  let best: { lat: number; d: number } | null = null;
  for (let i = 1; i < road.line.length; i++) {
    const a = road.line[i - 1]!, b = road.line[i]!;
    const o = offSeg({ ax: a.x, ay: a.y, bx: b.x, by: b.y, hw: 0, road }, p.x, p.y);
    if (!best || o.d < best.d) best = o;
  }
  return (best?.lat ?? 1) >= 0 ? 1 : -1;
}
