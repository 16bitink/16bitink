/**
 * The ground a lab city offers a car (docs/inkroad-vehicle-model.md "Parking, driveways, turning round"): road
 * ribbons, junction discs, blocks and car parks, and every parking slot. Built once per scene; the RS planner asks
 * it whether a body corner is on drivable ground.
 */
import { lotRect, type Rect } from '../../src/city/geometry';
import type { City } from '../../src/city/state';
import { halfWidth } from '../../src/sim/roadGeom';
import type { Body } from '../../src/sim/vehicleSize';

interface Seg { readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number; readonly hw: number }

/** Px of kerb a body corner may touch (a wheel on the line, a nose over the kerb edge). */
const KERB = 1.5;
/** The parking band of streets and kerb-bay roads, px (as test/motion/checks.ts PARK_BAND). */
const PARK_BAND = 11;

export interface Ground {
  readonly drivable: (x: number, y: number) => boolean;
  readonly rects: readonly Rect[];
}

const inRect = (r: Rect, x: number, y: number, pad: number): boolean => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

function nearSeg(s: Seg, x: number, y: number): boolean {
  const dx = s.bx - s.ax, dy = s.by - s.ay;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
  return Math.hypot(s.ax + dx * t - x, s.ay + dy * t - y) <= s.hw + KERB;
}

/** Inside a slot's box (a slot pose with the car's size, a little larger). */
function inSlot(b: Body, x: number, y: number): boolean {
  const c = Math.cos(b.a), s = Math.sin(b.a);
  const f = (x - b.x) * c + (y - b.y) * s, r = -(x - b.x) * s + (y - b.y) * c;
  return Math.abs(f) <= b.len / 2 + 2 && Math.abs(r) <= b.wid / 2 + 1.5;
}

/** Px either side of a slot's apron beyond the body's length (a car swings a little wider than it is long). */
const APRON = 12;

/**
 * The apron from a slot to the road it is reached from: a box along the road's normal, from the slot's middle to
 * the nearest road's middle, as wide as the body is long plus APRON each side (a driveway's flared mouth).
 */
function apronOf(b: Body, segs: readonly Seg[]): Body | null {
  let best: { x: number; y: number; d: number } | null = null;
  for (const s of segs) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
    const x = s.ax + dx * t, y = s.ay + dy * t, d = Math.hypot(x - b.x, y - b.y);
    if (!best || d < best.d) best = { x, y, d };
  }
  if (!best || best.d < 1) return null;
  return { x: (b.x + best.x) / 2, y: (b.y + best.y) / 2, a: Math.atan2(best.y - b.y, best.x - b.x), len: best.d, wid: b.len + 2 * APRON };
}

/** `stands`: bodies seen parked in the run (kerb bays and bare kerbs have no layout poses): their boxes are ground too, with an apron to the road. */
export function groundOf(c: City, stands: readonly Body[] = []): Ground {
  const segs: Seg[] = [];
  for (const r of c.net.roads) for (let i = 1; i < r.line.length; i++) segs.push({ ax: r.line[i - 1]!.x, ay: r.line[i - 1]!.y, bx: r.line[i]!.x, by: r.line[i]!.y, hw: halfWidth(r) + (r.kerb || r.type === 'street' ? PARK_BAND : 0) });
  const discs = c.net.junctions.map((j) => ({ x: j.x, y: j.y, r: j.radius + KERB }));
  const rects = [...c.lots.map(lotRect), ...c.parks.map(lotRect)];
  const slots: Body[] = [];
  for (const s of c.day.spots.values()) for (const p of s.layout?.poses ?? []) slots.push({ x: p.x, y: p.y, a: p.a, len: 16, wid: 8.3 });
  slots.push(...stands);
  const aprons = slots.map((b) => apronOf(b, segs)).filter((b): b is Body => b !== null);
  const drivable = (x: number, y: number): boolean =>
    segs.some((s) => nearSeg(s, x, y)) || discs.some((d) => Math.hypot(d.x - x, d.y - y) <= d.r) || rects.some((r) => inRect(r, x, y, 0)) || slots.some((b) => inSlot(b, x, y)) || aprons.some((b) => inSlot(b, x, y));
  return { drivable, rects };
}
