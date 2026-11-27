import { closedForWorks } from '../../sim/roadGeom';
import { lineLength, offsetLine, pointAt, subLine } from '../geom';
import { linePath } from '../pen';
import { INK, KERB_BLUE, PAINT } from '../style';
import type { Brush } from './roadPaint';
import type { RoadShape } from './roadShape';

/** Kerb bays and road works, painted on the road. */
export const BAY = 17;
export const BAY_DEPTH = 5;
const HATCH = 9;

/** Paid bays: turquoise and white kerb stones and a comb of bay lines. */
export function paintKerbBays(g: CanvasRenderingContext2D, r: RoadShape): void {
  if (r.inner.length < 2) return;
  for (const side of [-1, 1]) {
    const edge = offsetLine(r.inner, side * (r.half + 1.1));
    const path = linePath(edge);
    g.strokeStyle = '#f6f2e6';
    g.lineWidth = 2;
    g.stroke(path);
    g.strokeStyle = KERB_BLUE;
    g.setLineDash([6, 6]);
    g.stroke(path);
    g.setLineDash([]);
    comb(g, offsetLine(r.inner, side * r.half), side);
  }
}

function comb(g: CanvasRenderingContext2D, edge: readonly { readonly x: number; readonly y: number }[], side: number): void {
  const len = lineLength(edge);
  g.strokeStyle = PAINT;
  g.globalAlpha = 0.6;
  g.lineWidth = 0.7;
  g.beginPath();
  for (let s = BAY / 2; s < len; s += BAY) {
    const p = pointAt(edge, s);
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + Math.sin(p.a) * BAY_DEPTH * side, p.y - Math.cos(p.a) * BAY_DEPTH * side);
  }
  g.stroke();
  g.globalAlpha = 1;
}

/** Works: the right half dug up, hatched tape round it. Cones stand on it (worksProps). */
export function paintWorks(b: Brush, r: RoadShape): void {
  const { g } = b;
  const len = lineLength(r.inner);
  if (len < 20) return;
  const dug = subLine(r.inner, len * 0.16, len * 0.84);
  const half = r.half / 2;
  const lane = linePath(offsetLine(dug, half));
  g.globalAlpha = 0.95;
  g.strokeStyle = INK;
  g.lineWidth = half * 1.7 + 1.2;
  g.stroke(lane);
  g.strokeStyle = b.pattern('works');
  g.lineWidth = half * 1.7;
  g.stroke(lane);
  g.globalAlpha = 1;
  tape(g, offsetLine(dug, half * 0.12), half);
}

function tape(g: CanvasRenderingContext2D, line: readonly { readonly x: number; readonly y: number }[], half: number): void {
  const len = lineLength(line);
  g.strokeStyle = 'rgba(224,160,74,0.75)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let s = 0; s < len; s += HATCH) {
    const p = pointAt(line, s);
    const q = pointAt(line, Math.min(len, s + 5));
    g.moveTo(p.x, p.y);
    g.lineTo(q.x - Math.sin(q.a) * half * 0.5, q.y + Math.cos(q.a) * half * 0.5);
  }
  g.stroke();
}

/** Where a road's cones stand: along both edges of the dug half. */
export function coneSpots(r: RoadShape): { readonly x: number; readonly y: number }[] {
  if (!closedForWorks(r.road)) return [];
  const len = lineLength(r.inner);
  if (len < 20) return [];
  const dug = subLine(r.inner, len * 0.14, len * 0.86);
  const n = Math.max(2, Math.round(lineLength(dug) / 16));
  return Array.from({ length: n + 1 }, (_, i) => {
    const p = pointAt(offsetLine(dug, 0.8), (lineLength(dug) * i) / n);
    return { x: p.x, y: p.y };
  });
}

const TOLL_BARS = [-9, -5, 5, 9] as const;

/** Under a toll gantry: bars across the lanes. */
export function paintToll(g: CanvasRenderingContext2D, r: RoadShape): void {
  const p = pointAt(r.road.line, lineLength(r.road.line) / 2);
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.a);
  g.globalAlpha = 0.85;
  for (const x of TOLL_BARS) {
    g.fillStyle = Math.abs(x) > 6 ? PAINT : KERB_BLUE;
    g.fillRect(x - 0.9, -r.half + 1, 1.8, r.half * 2 - 2);
  }
  g.restore();
}
