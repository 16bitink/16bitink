import type { Pt } from '../sim/types';
import { hash2 } from './noise';

/** Ink lines by hand: canvas paths with a slight wobble, the same every time. */

export function trace(g: CanvasRenderingContext2D | Path2D, pts: readonly Pt[], close = false): void {
  pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
  if (close) g.closePath();
}

/** The same line, nudged by up to `by` px every `step` px. */
export function wobble(pts: readonly Pt[], by = 0.5, step = 14, seed = 1): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[i + 1];
    out.push(shift(p, by, seed));
    if (!q) break;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    const n = Math.floor(d / step);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      out.push(shift({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }, by, seed));
    }
  }
  return out;
}

function shift(p: Pt, by: number, seed: number): Pt {
  const kx = Math.round(p.x * 2);
  const ky = Math.round(p.y * 2);
  return { x: p.x + (hash2(kx, ky, seed) - 0.5) * 2 * by, y: p.y + (hash2(ky, kx, seed + 7) - 0.5) * 2 * by };
}

export function polyPath(pts: readonly Pt[]): Path2D {
  const p = new Path2D();
  trace(p, pts, true);
  return p;
}

export function linePath(pts: readonly Pt[]): Path2D {
  const p = new Path2D();
  trace(p, pts);
  return p;
}
