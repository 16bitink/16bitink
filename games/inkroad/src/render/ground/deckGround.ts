import { halfWidth } from '../../sim/roadGeom';
import type { Pt, Road } from '../../sim/types';
import { deckPoints, ON_DECK, raisedSpan, UNDER } from '../deckHeight';
import { lineLength, offsetLine, pointAt, subLine } from '../geom';
import { linePath } from '../pen';
import { INK, PAINT } from '../style';
import type { Brush } from './roadPaint';
import type { RoadShape } from './roadShape';

/** What a flyover does to the ground: its shadow; and an underpass: the cut that leads down to its portal. */
const SHADOW_X = 0.5;
const SHADOW_Y = 0.62;
const LIP = 2;
const STEP = 6;

export function paintDeckShadow(g: CanvasRenderingContext2D, road: Road): void {
  const pts = deckPoints(road, STEP).map((p) => ({ x: p.x + p.z * SHADOW_X, y: p.y + p.z * SHADOW_Y }));
  if (pts.length < 2) return;
  const path = linePath(pts);
  g.save();
  g.lineCap = 'butt';
  for (const [w, a] of [[4.2, 0.08], [2.6, 0.2]] as const) {
    g.strokeStyle = `rgba(52,40,48,${a})`;
    g.lineWidth = (halfWidth(road) + w) * 2;
    g.stroke(path);
  }
  g.restore();
}

/** The open cut from the ramp's foot down to the portal, at both ends. */
export function paintTrench(b: Brush, r: RoadShape): void {
  const open = raisedSpan(r.road, ON_DECK);
  const shut = raisedSpan(r.road, -UNDER);
  if (!open || !shut) return;
  tunnelLine(b.g, r, subLine(r.line, shut[0], shut[1]));
  cut(b, r, subLine(r.line, open[0], shut[0]), false);
  cut(b, r, subLine(r.line, shut[1], open[1]), true);
}

/** Where the tunnel runs, in faint pen dashes. */
function tunnelLine(g: CanvasRenderingContext2D, r: RoadShape, line: readonly Pt[]): void {
  if (line.length < 2) return;
  g.save();
  g.strokeStyle = INK;
  g.globalAlpha = 0.38;
  g.lineWidth = 1;
  g.setLineDash([4, 4]);
  for (const side of [-1, 1]) g.stroke(linePath(offsetLine(line, side * (r.half + 1))));
  g.restore();
}

export function cut(b: Brush, r: RoadShape, line: readonly Pt[], rising: boolean): void {
  if (line.length < 2) return;
  const { g } = b;
  const path = linePath(line);
  const layers: readonly (readonly [number, string | CanvasPattern])[] = [
    [r.half + LIP + 0.9, INK], [r.half + LIP, b.pattern('concrete')], [r.half + 0.8, INK], [r.half, b.pattern('asphalt')],
  ];
  for (const [half, style] of layers) {
    g.strokeStyle = style;
    g.lineWidth = half * 2;
    g.stroke(path);
  }
  shade(g, r, line, rising);
  portal(b, r, line, rising);
}

/** Darker towards the portal, and the north-west wall's shadow across the road. */
function shade(g: CanvasRenderingContext2D, r: RoadShape, line: readonly Pt[], rising: boolean): void {
  const n = lineLength(line);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const from = n * (0.35 + (0.65 * i) / steps);
    const part = linePath(subLine(line, from, n));
    const back = linePath(subLine(line, 0, n - from));
    g.strokeStyle = 'rgba(30,24,34,0.11)';
    g.lineWidth = r.half * 2;
    g.stroke(rising ? back : part);
  }
  chevrons(g, r, line, rising);
  g.strokeStyle = 'rgba(30,24,34,0.28)';
  g.lineWidth = 3;
  g.stroke(linePath(offsetLine(line, northSide(line) * (r.half - 1.4))));
}

/** White edge lines and arrows, so the cut reads as a lane that dives. */
function chevrons(g: CanvasRenderingContext2D, r: RoadShape, line: readonly Pt[], rising: boolean): void {
  g.save();
  g.strokeStyle = PAINT;
  g.globalAlpha = 0.75;
  g.lineWidth = 0.7;
  for (const side of [-1, 1]) g.stroke(linePath(offsetLine(line, side * (r.half - 0.9))));
  const n = lineLength(line);
  g.globalAlpha = 0.6;
  g.lineWidth = 1;
  g.beginPath();
  for (const k of rising ? [0.6, 0.85] : [0.15, 0.4]) {
    const p = pointAt(line, n * k);
    const at = (f: number, s: number): Pt => ({ x: p.x + Math.cos(p.a) * f - Math.sin(p.a) * s, y: p.y + Math.sin(p.a) * f + Math.cos(p.a) * s });
    const [a, b, c] = [at(-2, -2.2), at(1.4, 0), at(-2, 2.2)];
    g.moveTo(a!.x, a!.y);
    g.lineTo(b!.x, b!.y);
    g.lineTo(c!.x, c!.y);
  }
  g.stroke();
  g.restore();
}

/** Which side of the line faces the light (north-west). */
function northSide(line: readonly Pt[]): 1 | -1 {
  const p = pointAt(line, lineLength(line) / 2);
  return Math.cos(p.a) - Math.sin(p.a) * 0.6 > 0 ? -1 : 1;
}

const LID = 4;

/** The tunnel's mouth: a dark opening under a concrete lintel. */
function portal(b: Brush, r: RoadShape, line: readonly Pt[], rising: boolean): void {
  const { g } = b;
  const p = pointAt(line, rising ? 0 : lineLength(line));
  const half = r.half + LIP;
  g.save();
  g.translate(p.x, p.y);
  g.rotate(rising ? p.a + Math.PI : p.a);
  g.fillStyle = 'rgba(24,18,28,0.9)';
  g.fillRect(-2, -r.half, 3, r.half * 2);
  g.fillStyle = b.pattern('concrete');
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.beginPath();
  g.roundRect(0.5, -half - 2.5, LID, (half + 2.5) * 2, 1);
  g.fill();
  g.fillStyle = 'rgba(52,42,40,0.28)';
  g.fill();
  g.stroke();
  for (let y = -half; y <= half; y += 3) { g.moveTo(0.5, y); g.lineTo(0.5 + LID, y); }
  g.globalAlpha = 0.4;
  g.stroke();
  g.restore();
}
