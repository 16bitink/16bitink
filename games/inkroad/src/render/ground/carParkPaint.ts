import { inPlan, PARK_PITCH, type SlotLayout } from '../../sim/slotGeometry';
import type { Rect } from '../../city/geometry';
import { linePath, wobble } from '../pen';
import { PAINT } from '../style';

/**
 * A surface car park's paint, from the very slots the city counts and the cars use (src/sim/slotGeometry.ts): each
 * bay's side lines and its back line, a dashed line down the aisle the cars drive (the owner, rule 22: gate, aisle,
 * bay), and the gate's opening left clear. Plan px, before projection.
 */

/** Px of a bay's width its side lines are drawn at (the pitch the slots are spread at). */
const LINE_W = 0.9;
/** The aisle's centre dashes, px. */
const DASH = [5, 4] as const;
/** Px the dashes stop short of the aisle's ends and the gate lane. */
const DASH_END = 8;

const seg = (x0: number, y0: number, x1: number, y1: number, seed: number): Path2D =>
  linePath(wobble([{ x: x0, y: y0 }, { x: x1, y: y1 }], 0.25, 12, seed));

/** Each bay's two side lines from its mouth to its back line, and the back line of its row. */
function bays(g: CanvasRenderingContext2D, l: SlotLayout, pitch: number, depth: number, aisleY: number): void {
  for (let k = 0; k < l.poses.length; k++) {
    const p = l.poses[k]!;
    const up = p.y < aisleY ? -1 : 1;
    const mouth = p.y - up * (depth / 2), back = p.y + up * (depth / 2);
    for (const side of [-1, 1]) g.stroke(seg(p.x + side * pitch / 2, mouth, p.x + side * pitch / 2, back, k * 7 + side));
    g.stroke(seg(p.x - pitch / 2, back, p.x + pitch / 2, back, k * 13));
  }
}

/** The spacing of a row's bays (from two neighbours; a lone bay gets the counting pitch). */
function pitchOf(l: SlotLayout): number {
  const k = l.next.findIndex((n) => n >= 0);
  return k >= 0 ? Math.abs(l.poses[l.next[k]!]!.x - l.poses[k]!.x) : PARK_PITCH;
}

/** The dashed line along the aisle, broken where the gate lane meets it. */
function aisleLine(g: CanvasRenderingContext2D, l: SlotLayout): void {
  const a = l.aisle!;
  const side = Math.abs(a.gate.y - a.y) < 1;
  const gap = side ? null : [a.join.x - a.lane, a.join.x + a.lane];
  const spans = gap ? [[a.x0 + DASH_END, gap[0]! - 2], [gap[1]! + 2, a.x1 - DASH_END]] : [[a.x0 + DASH_END, a.x1 - DASH_END]];
  g.setLineDash([...DASH]);
  for (const [x0, x1] of spans) if (x1! - x0! > DASH[0]) g.stroke(seg(x0!, a.y, x1!, a.y, Math.round(x0!)));
  g.setLineDash([]);
}

/** Paint for a car park with an aisle; false when it has none (the caller draws its picture instead). */
export function paintCarPark(g: CanvasRenderingContext2D, l: SlotLayout): boolean {
  const a = l.aisle;
  if (!a || l.poses.length === 0) return false;
  const pitch = pitchOf(l);
  g.save();
  g.strokeStyle = PAINT;
  g.globalAlpha = 0.9;
  g.lineWidth = LINE_W;
  g.lineCap = 'round';
  bays(g, l, pitch, a.depth, a.y);
  aisleLine(g, l);
  g.restore();
  return true;
}

/** Half the gate's opening, px (the planner's gate apron is 26 wide). */
export const GATE_HALF = 12;

/** The gate: the park's edge left open as wide as the gate lane, paved like the park. */
export function gateOpening(g: CanvasRenderingContext2D, l: SlotLayout, r: Rect, paving: CanvasPattern | string): void {
  const a = l.aisle;
  if (!a) return;
  const along = Math.abs(Math.sin(a.gate.a)) > 0.5;
  // As wide as the apron the cars turn in by (src/city/moveGround.ts), never wider than the gate lane.
  const half = Math.min(a.lane, a.half, GATE_HALF);
  const w = along ? 2 * half : 9, h = along ? 9 : 2 * half;
  const x = along ? a.gate.x - half : a.gate.x - 4.5, y = along ? a.gate.y - 4.5 : a.y - half;
  g.save();
  g.fillStyle = paving;
  g.fillRect(Math.max(r.x - 4.5, x), y, w, h);
  g.restore();
}

/** The worn track of a beach's sand: the aisle and the spur from the gate, darker sand with wheel ruts. */
export function paintSandTrack(g: CanvasRenderingContext2D, l: SlotLayout): void {
  const a = l.aisle;
  if (!a) return;
  const toPlan = (x: number, y: number): { x: number; y: number } => inPlan(a, { x, y });
  const side = Math.abs(a.gate.y - a.y) < 1;
  const legs: [number, number, number, number][] = [[a.x0, a.y, a.x1, a.y], side ? [a.gate.x, a.y, a.gate.x < a.x0 ? a.x0 : a.x1, a.y] : [a.gate.x, a.gate.y, a.join.x, a.join.y]];
  g.save();
  g.lineCap = 'round';
  for (const [width, style] of [[2 * a.half, 'rgba(150,106,60,0.13)'], [2 * a.half - 6, 'rgba(150,106,60,0.1)']] as const) {
    g.strokeStyle = style;
    g.lineWidth = width;
    for (const [x0, y0, x1, y1] of legs) g.stroke(linePath([toPlan(x0, y0), toPlan(x1, y1)]));
  }
  // Two wheel ruts along the track.
  g.strokeStyle = 'rgba(120,84,48,0.22)';
  g.lineWidth = 0.8;
  for (const off of [-RUT, RUT]) g.stroke(seg(toPlan(a.x0 + 4, a.y + off).x, toPlan(a.x0 + 4, a.y + off).y, toPlan(a.x1 - 4, a.y + off).x, toPlan(a.x1 - 4, a.y + off).y, Math.round(a.y + off)));
  g.restore();
}
/** Half the spacing of a car's wheel ruts, px. */
const RUT = 2.6;
