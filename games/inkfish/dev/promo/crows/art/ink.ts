import { type Pt } from '../../../../src/art/pen';
import { screenScale, turn } from '../../seal/art/paint';

/**
 * Brushwork shared by the crow, the cars and the street: gradient washes
 * clipped to shapes, and thin ink whose weight is set in screen pixels (so it
 * holds up at every zoom), wobbling a little with the line-boil frame.
 */
export const INK_LINE = '#15151f';

export const unitPx = (ctx: CanvasRenderingContext2D): number => 1 / Math.max(1e-6, screenScale(ctx));

export function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], closed = true): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (closed) ctx.closePath();
}

/** Points along a smooth curve through `pts` (Catmull-Rom), `n` per span. */
export function spline(pts: readonly Pt[], n = 6, closed = false): Pt[] {
  const last = pts.length - 1;
  const at = (i: number): Pt => (closed ? pts[(i + pts.length) % pts.length]! : pts[Math.max(0, Math.min(last, i))]!);
  const spans = closed ? pts.length : last;
  const out: Pt[] = [];
  for (let i = 0; i < spans; i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < n; k++) {
      const s = k / n;
      const f = (p: number, q: number, r: number, t: number): number =>
        0.5 * (2 * q + (r - p) * s + (2 * p - 5 * q + 4 * r - t) * s * s + (3 * q - p - 3 * r + t) * s * s * s);
      out.push({ x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) });
    }
  }
  if (!closed) out.push(pts[last]!);
  return out;
}

export const P = (...xy: readonly number[]): Pt[] => Array.from({ length: xy.length / 2 }, (_, i) => ({ x: xy[i * 2]!, y: xy[i * 2 + 1]! }));

export type Stops = readonly (readonly [number, string])[];
export function linear(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}
export function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: Stops): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}

export function fillShape(ctx: CanvasRenderingContext2D, shape: readonly Pt[], fill: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = fill;
  trace(ctx, shape);
  ctx.fill();
  ctx.restore();
}

/** Runs `paint` clipped to a shape. */
export function within(ctx: CanvasRenderingContext2D, shape: readonly Pt[], paint: () => void): void {
  ctx.save();
  trace(ctx, shape);
  ctx.clip();
  paint();
  ctx.restore();
}

/** An ink line through `pts`, `w` screen px wide. */
export function inkLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, alpha: number, boil: number, closed = false, colour = INK_LINE): void {
  if (pts.length < 2 || alpha <= 0) return;
  const px = unitPx(ctx);
  const s = boil * 2.37 + 0.6;
  const amp = 0.55 * px;
  const line = pts.map((p, i) => ({
    x: p.x + amp * (0.6 * Math.sin(i * 0.41 + s * 3.1) + 0.4 * Math.sin(i * 0.17 + s * 5.3)),
    y: p.y + amp * (0.6 * Math.cos(i * 0.37 + s * 2.3) + 0.4 * Math.sin(i * 0.23 + s * 4.1)),
  }));
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = w * px;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  trace(ctx, line, closed);
  ctx.stroke();
  ctx.restore();
}

/** The outline of a limb round `spine` whose full width at u (0..1) is `width(u)`, with round ends. */
export function band(spine: readonly Pt[], width: (u: number) => number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = spine.length - 1;
  const dirAt = (i: number): Pt => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(n, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  };
  spine.forEach((p, i) => {
    const d = dirAt(i);
    const w = width(i / n) / 2;
    left.push({ x: p.x - d.y * w, y: p.y + d.x * w });
    right.push({ x: p.x + d.y * w, y: p.y - d.x * w });
  });
  const cap = (c: Pt, from: Pt): Pt[] => [1, 2, 3, 4].map((k) => turn(from, c, (-Math.PI * k) / 5));
  return [...left, ...cap(spine[n]!, left[n]!), ...right.reverse(), ...cap(spine[0]!, right[right.length - 1]!)];
}

export const ring = (cx: number, cy: number, rx: number, ry = rx, n = 48, a0 = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => ({ x: cx + rx * Math.cos(a0 + (i / n) * Math.PI * 2), y: cy + ry * Math.sin(a0 + (i / n) * Math.PI * 2) }));

/** Points on an arc (radians). */
export const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 16): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos(a0 + ((a1 - a0) * i) / n), y: cy + r * Math.sin(a0 + ((a1 - a0) * i) / n) }));

/** A soft shadow lying on the ground. */
export function groundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = radial(ctx, 0, 0, rx, [[0, `rgba(24,22,34,${alpha})`], [0.55, `rgba(24,22,34,${alpha * 0.6})`], [1, 'rgba(24,22,34,0)']]);
  ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  ctx.restore();
}
