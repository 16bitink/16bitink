/** Polyline geometry. All pure. Headings: 0 = east, clockwise on screen (y grows south). */
import { CELL } from './constants';
import type { Cell, Pt } from './types';

export const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);
export const cellPt = (c: Cell): Pt => ({ x: c.gx * CELL, y: c.gy * CELL });
export const sameCell = (a: Cell, b: Cell): boolean => a.gx === b.gx && a.gy === b.gy;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Smallest signed difference b - a, in -PI..PI. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function lineLength(line: readonly Pt[]): number {
  let sum = 0;
  for (let i = 1; i < line.length; i++) sum += dist(line[i - 1]!, line[i]!);
  return sum;
}

export interface LinePoint { readonly x: number; readonly y: number; readonly heading: number }

/** The point `s` along the line (clamped) and the heading there. */
export function pointAt(line: readonly Pt[], s: number): LinePoint {
  let left = Math.max(0, s);
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!;
    const d = dist(a, b);
    if (left <= d || i === line.length - 1) {
      const t = d > 0 ? Math.min(1, left / d) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= d;
  }
  const p = line[0] ?? { x: 0, y: 0 };
  return { x: p.x, y: p.y, heading: 0 };
}

export interface Projection { readonly s: number; readonly d: number; readonly x: number; readonly y: number }

/** Nearest point of the line to p: distance along (s) and distance away (d). */
export function project(line: readonly Pt[], p: Pt): Projection {
  let best: Projection = { s: 0, d: Infinity, x: 0, y: 0 };
  let sum = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!;
    const len = dist(a, b);
    const t = len > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len))) : 0;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < best.d) best = { s: sum + len * t, d, x, y };
    sum += len;
  }
  return best;
}

/** The part of the line between s0 and s1. */
export function sliceLine(line: readonly Pt[], s0: number, s1: number): Pt[] {
  const a = pointAt(line, s0), b = pointAt(line, s1);
  const out: Pt[] = [{ x: a.x, y: a.y }];
  let sum = 0;
  for (let i = 1; i < line.length; i++) {
    sum += dist(line[i - 1]!, line[i]!);
    if (sum > s0 + 0.01 && sum < s1 - 0.01) out.push(line[i]!);
  }
  out.push({ x: b.x, y: b.y });
  return out;
}

export function reverseLine(line: readonly Pt[]): Pt[] {
  return [...line].reverse();
}

const segHeading = (a: Pt, b: Pt): number => Math.atan2(b.y - a.y, b.x - a.x);

/** Heading at each vertex (mean of its two segments). */
export function vertexHeadings(line: readonly Pt[]): number[] {
  return line.map((_, i) => {
    const before = i > 0 ? segHeading(line[i - 1]!, line[i]!) : segHeading(line[0]!, line[1]!);
    const after = i < line.length - 1 ? segHeading(line[i]!, line[i + 1]!) : before;
    return before + angleDiff(before, after) / 2;
  });
}

/** Parallel line, `right` px to the right of the direction of travel (negative = left). */
export function offsetLine(line: readonly Pt[], right: number): Pt[] {
  const hs = vertexHeadings(line);
  return line.map((p, i) => {
    const h = hs[i]!;
    const prev = i > 0 ? segHeading(line[i - 1]!, p) : h;
    const mitre = 1 / Math.max(0.5, Math.cos(angleDiff(prev, h)));
    return { x: p.x - Math.sin(h) * right * mitre, y: p.y + Math.cos(h) * right * mitre };
  });
}

const CORNER = CELL * 0.8;
const CORNER_STEPS = 10;

/** A line through the vertices with every corner rounded. */
export function smoothLine(pts: readonly Pt[]): Pt[] {
  const corners = pts.filter((p, i) => {
    if (i === 0 || i === pts.length - 1) return true;
    return Math.abs(angleDiff(segHeading(pts[i - 1]!, p), segHeading(p, pts[i + 1]!))) > 0.01;
  });
  if (corners.length < 3) return [...corners];
  const out: Pt[] = [corners[0]!];
  for (let i = 1; i < corners.length - 1; i++) {
    const a = corners[i - 1]!, p = corners[i]!, b = corners[i + 1]!;
    const da = dist(a, p) * (i === 1 ? 0.9 : 0.5), db = dist(p, b) * (i === corners.length - 2 ? 0.9 : 0.5);
    const t = Math.min(CORNER, da, db);
    const p0 = lerpPt(p, a, t / dist(a, p)), p1 = lerpPt(p, b, t / dist(p, b));
    for (let k = 0; k <= CORNER_STEPS; k++) out.push(quad(p0, p, p1, k / CORNER_STEPS));
  }
  out.push(corners[corners.length - 1]!);
  return out;
}

function quad(a: Pt, b: Pt, c: Pt, t: number): Pt {
  return lerpPt(lerpPt(a, b, t), lerpPt(b, c, t), t);
}

/** Cubic curve from p0 (heading h0) to p1 (heading h1), n+1 points. */
export function curve(p0: Pt, h0: number, p1: Pt, h1: number, n: number, pull = 0): Pt[] {
  const d = dist(p0, p1);
  const turn = Math.abs(angleDiff(h0, h1));
  // Handle length for a circular arc of this turn, so quarter turns are round.
  const k = pull > 0 ? pull : turn < 0.05 ? d / 3 : (4 / 3) * Math.tan(Math.min(turn, 3.1) / 4) * (d / (2 * Math.sin(Math.min(turn, 3.1) / 2)));
  const a = { x: p0.x + Math.cos(h0) * k, y: p0.y + Math.sin(h0) * k };
  const b = { x: p1.x - Math.cos(h1) * k, y: p1.y - Math.sin(h1) * k };
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const c0 = u * u * u, c1 = 3 * u * u * t, c2 = 3 * u * t * t, c3 = t * t * t;
    out.push({ x: c0 * p0.x + c1 * a.x + c2 * b.x + c3 * p1.x, y: c0 * p0.y + c1 * a.y + c2 * b.y + c3 * p1.y });
  }
  return out;
}

/** Evenly spaced points (about `step` px apart), ends kept. */
export function resample(line: readonly Pt[], step: number): Pt[] {
  const len = lineLength(line);
  const n = Math.max(1, Math.round(len / step));
  const out: Pt[] = [];
  let seg = 1, start = 0;
  for (let i = 0; i <= n; i++) {
    const s = (len * i) / n;
    while (seg < line.length - 1 && start + dist(line[seg - 1]!, line[seg]!) < s) { start += dist(line[seg - 1]!, line[seg]!); seg++; }
    const a = line[seg - 1]!, b = line[Math.min(seg, line.length - 1)]!;
    const d = dist(a, b);
    out.push(lerpPt(a, b, d > 0 ? Math.max(0, Math.min(1, (s - start) / d)) : 0));
  }
  return out;
}

export const smoothstep = (t: number): number => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
