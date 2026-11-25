import type { Pt } from '../sim/types';

/** Polyline sums used by the roads, decks, arrows and ghosts. All pure. */
const EPS = 1e-6;

export const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const smooth = (t: number): number => { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); };

export function lineLength(line: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < line.length; i++) n += dist(line[i - 1]!, line[i]!);
  return n;
}

export interface OnLine extends Pt { readonly a: number }

/** The point `s` along a line and the line's direction there (radians). */
export function pointAt(line: readonly Pt[], s: number): OnLine {
  let left = Math.max(0, s);
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const d = dist(a, b);
    if (d < EPS) continue;
    if (left <= d || i === line.length - 1) {
      const t = Math.min(1, left / d);
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), a: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= d;
  }
  const p = line[line.length - 1] ?? { x: 0, y: 0 };
  return { x: p.x, y: p.y, a: 0 };
}

/** The stretch of a line between s0 and s1. */
export function subLine(line: readonly Pt[], s0: number, s1: number): Pt[] {
  const len = lineLength(line);
  const from = clamp(s0, 0, len);
  const to = clamp(s1, 0, len);
  if (to - from < EPS) return [];
  const out: Pt[] = [pointAt(line, from)];
  let s = 0;
  for (let i = 1; i < line.length; i++) {
    s += dist(line[i - 1]!, line[i]!);
    if (s > from + EPS && s < to - EPS) out.push(line[i]!);
  }
  out.push(pointAt(line, to));
  return out.map(({ x, y }) => ({ x, y }));
}

/** Points every `step` px along a line, ends included. */
export function resample(line: readonly Pt[], step: number): OnLine[] {
  const len = lineLength(line);
  const n = Math.max(1, Math.round(len / step));
  return Array.from({ length: n + 1 }, (_, i) => pointAt(line, (len * i) / n));
}

/** The line moved sideways: positive is to the right of travel (screen y down). */
export function offsetLine(line: readonly Pt[], by: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < line.length; i++) {
    const n = normalAt(line, i);
    out.push({ x: line[i]!.x + n.x * by, y: line[i]!.y + n.y * by });
  }
  return out;
}

const MAX_MITRE = 2;

/** The mitred right-hand normal at a vertex. */
function normalAt(line: readonly Pt[], i: number): Pt {
  const p = line[i]!;
  const before = i > 0 ? unit(line[i - 1]!, p) : null;
  const after = i < line.length - 1 ? unit(p, line[i + 1]!) : null;
  const d1 = before ?? after ?? { x: 1, y: 0 };
  const d2 = after ?? before ?? { x: 1, y: 0 };
  const nx = -(d1.y + d2.y);
  const ny = d1.x + d2.x;
  const len = Math.hypot(nx, ny);
  if (len < EPS) return { x: -d1.y, y: d1.x };
  const cos = (nx * -d1.y + ny * d1.x) / len;
  const k = Math.min(MAX_MITRE, 1 / Math.max(EPS, cos));
  return { x: (nx / len) * k, y: (ny / len) * k };
}

export function unit(a: Pt, b: Pt): Pt {
  const d = dist(a, b);
  return d < EPS ? { x: 1, y: 0 } : { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

export interface Nearest { readonly d: number; readonly s: number; readonly at: Pt }

/** The nearest point of a line to p. */
export function nearestOnLine(line: readonly Pt[], p: Pt): Nearest {
  let best: Nearest = { d: Infinity, s: 0, at: line[0] ?? p };
  let s = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const len = dist(a, b);
    const t = len < EPS ? 0 : clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len), 0, 1);
    const at = lerpPt(a, b, t);
    const d = dist(at, p);
    if (d < best.d) best = { d, s: s + len * t, at };
    s += len;
  }
  return best;
}

/** A ribbon polygon (left edge out, right edge back). */
export function ribbon(line: readonly Pt[], half: number): Pt[] {
  return [...offsetLine(line, -half), ...offsetLine(line, half).reverse()];
}

export interface Box { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

export function boxOf(pts: readonly Pt[], pad = 0): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

export const boxesMeet = (a: Box, b: Box): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Chaikin corner cutting, ends kept. */
export function soften(line: readonly Pt[], times = 2): Pt[] {
  let pts = [...line];
  for (let k = 0; k < times && pts.length > 2; k++) {
    const next: Pt[] = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i++) {
      if (i > 0) next.push(lerpPt(pts[i]!, pts[i + 1]!, 0.25));
      if (i < pts.length - 2) next.push(lerpPt(pts[i]!, pts[i + 1]!, 0.75));
    }
    next.push(pts[pts.length - 1]!);
    pts = next;
  }
  return pts;
}
