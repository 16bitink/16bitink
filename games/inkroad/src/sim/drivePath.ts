import { R_MIN } from './kinematics';

/**
 * Paths a car can drive (pure, plan px): straights and arcs of radius R_MIN or more, each driven forward or in
 * reverse, the car's heading always the path's tangent (or its opposite in reverse). Built from Dubins' CSC words and
 * the classic parking moves. `h` is the heading of travel; the car's own heading is `h` forward and `h + π` reversing.
 */
export interface Seg { readonly x: number; readonly y: number; readonly h: number; readonly k: number; readonly len: number; readonly dir: 1 | -1 }
export interface Pose { readonly x: number; readonly y: number; readonly a: number }
export interface DrivePath { readonly segs: readonly Seg[]; readonly len: number }

const TAU = Math.PI * 2;
const EPS = 1e-6;
/** A CSC word turning more than this is a loop, not a manoeuvre. */
export const LOOP = Math.PI * 1.35;

export const angleTo = (a: number, b: number): number => {
  const d = (b - a) % TAU;
  return d > Math.PI ? d - TAU : d < -Math.PI ? d + TAU : d;
};
const mod = (a: number): number => { const m = ((a % TAU) + TAU) % TAU; return m > TAU - EPS ? 0 : m; };

/** Where a segment ends, and its heading of travel there. */
export function segEnd(s: Seg): { x: number; y: number; h: number } {
  return segAt(s, s.len);
}

export function segAt(s: Seg, d: number): { x: number; y: number; h: number } {
  if (Math.abs(s.k) < EPS) return { x: s.x + Math.cos(s.h) * d, y: s.y + Math.sin(s.h) * d, h: s.h };
  const h = s.h + s.k * d;
  return { x: s.x + (Math.sin(h) - Math.sin(s.h)) / s.k, y: s.y - (Math.cos(h) - Math.cos(s.h)) / s.k, h };
}

export const pathOf = (segs: readonly Seg[]): DrivePath => {
  const kept = segs.filter((s) => s.len > EPS);
  return { segs: kept, len: kept.reduce((n, s) => n + s.len, 0) };
};

/** The pose `d` px along a path: car heading included. */
export function poseAlong(p: DrivePath, d: number, out: { x: number; y: number; a: number; dir: 1 | -1 }): void {
  let left = Math.max(0, Math.min(p.len, d));
  for (let i = 0; i < p.segs.length; i++) {
    const s = p.segs[i]!;
    if (left <= s.len || i === p.segs.length - 1) {
      const q = segAt(s, Math.min(left, s.len));
      out.x = q.x; out.y = q.y; out.a = s.dir > 0 ? q.h : q.h + Math.PI; out.dir = s.dir;
      return;
    }
    left -= s.len;
  }
}

/** The same path driven the other way (time backwards): every gear flips, the car's heading stays at each point. */
export function reversed(p: DrivePath): DrivePath {
  return pathOf([...p.segs].reverse().map((s) => {
    const e = segEnd(s);
    return { x: e.x, y: e.y, h: e.h + Math.PI, k: -s.k, len: s.len, dir: -s.dir as 1 | -1 };
  }));
}

/** Total heading change along a path (rad). */
export const turning = (segs: readonly Seg[]): number => segs.reduce((n, s) => n + Math.abs(s.k * s.len), 0);

/** A straight from a pose to the point on its own line nearest `to`, forward or in reverse. */
export function straight(x: number, y: number, a: number, to: { x: number; y: number }): Seg {
  const d = (to.x - x) * Math.cos(a) + (to.y - y) * Math.sin(a);
  return { x, y, h: d >= 0 ? a : a + Math.PI, k: 0, len: Math.abs(d), dir: d >= 0 ? 1 : -1 };
}

/** One arc of radius r from a point with heading of travel h, turning by `turn` (signed). */
export function arc(x: number, y: number, h: number, turn: number, r: number, dir: 1 | -1): Seg {
  return { x, y, h, k: turn >= 0 ? 1 / r : -1 / r, len: Math.abs(turn) * r, dir };
}

/**
 * The shortest Dubins CSC word (turn, straight, turn) between two poses of travel, radius r, all in gear `dir`.
 * `from.a`, `to.a` are car headings; in reverse the travel heading is the opposite.
 */
export function csc(from: Pose, to: Pose, r: number = R_MIN, dir: 1 | -1 = 1): Seg[] {
  const h0 = dir > 0 ? from.a : from.a + Math.PI, h1 = dir > 0 ? to.a : to.a + Math.PI;
  let best: Seg[] = [];
  let bestLen = Infinity;
  for (const s1 of [1, -1] as const) for (const s2 of [1, -1] as const) {
    const w = word(from, h0, to, h1, r, s1, s2, dir);
    if (!w) continue;
    const n = w.reduce((m, s) => m + s.len, 0);
    if (n < bestLen) { bestLen = n; best = w; }
  }
  return best;
}

function word(p: Pose, h0: number, q: Pose, h1: number, r: number, s1: 1 | -1, s2: 1 | -1, dir: 1 | -1): Seg[] | null {
  const c1x = p.x - s1 * r * Math.sin(h0), c1y = p.y + s1 * r * Math.cos(h0);
  const c2x = q.x - s2 * r * Math.sin(h1), c2y = q.y + s2 * r * Math.cos(h1);
  const dx = c2x - c1x, dy = c2y - c1y, d = Math.hypot(dx, dy);
  let th: number, run: number;
  if (s1 === s2) { th = Math.atan2(dy, dx); run = d; } else {
    if (d < 2 * r - EPS) return null;
    run = Math.sqrt(Math.max(0, d * d - 4 * r * r));
    th = Math.atan2(dy, dx) + Math.atan2(2 * s1 * r, run);
  }
  const t1 = s1 * mod(s1 * (th - h0)), t2 = s2 * mod(s2 * (h1 - th));
  const a = arc(p.x, p.y, h0, t1, r, dir);
  const m = segEnd(a);
  const b: Seg = { x: m.x, y: m.y, h: th, k: 0, len: run, dir };
  const e = segEnd(b);
  return [a, b, arc(e.x, e.y, th, t2, r, dir)];
}
