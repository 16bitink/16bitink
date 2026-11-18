/**
 * Board geometry for the generator: mirroring a board in x and y, overlap
 * tests, and the shapes patterns are laid out on (docs/inksnake-daily.md
 * "Layouts"). Pure functions of their inputs and the seeded rng.
 */
import type { Rng } from '../logic/rng';
import type { Pt } from '../logic/vec';
import { BOARD, type CoverDef, type SolidDef, type ZoneDef } from '../level/types';

export type Transform = 'none' | 'x' | 'y' | 'xy';
export const TRANSFORMS: readonly Transform[] = ['none', 'x', 'y', 'xy'];

export const SHAPES = ['ring', 'lanes', 'scatter', 'rooms', 'islands', 'spiral'] as const;
export type Shape = (typeof SHAPES)[number];

const flipX = (t: Transform): boolean => t === 'x' || t === 'xy';
const flipY = (t: Transform): boolean => t === 'y' || t === 'xy';

export function mirrorPt(p: Pt, t: Transform): Pt {
  return { x: flipX(t) ? BOARD.w - p.x : p.x, y: flipY(t) ? BOARD.h - p.y : p.y };
}

/** A heading mirrored with the board. */
export function mirrorHeading(h: number, t: Transform): number {
  let a = h;
  if (flipX(t)) a = Math.PI - a;
  if (flipY(t)) a = -a;
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function mirrorSolid(s: SolidDef, t: Transform): SolidDef {
  if (s.kind === 'circle') return { ...s, ...mirrorPt(s, t) };
  return { ...s, x: flipX(t) ? BOARD.w - s.x - s.w : s.x, y: flipY(t) ? BOARD.h - s.y - s.h : s.y };
}

export function mirrorCover(c: CoverDef, t: Transform): CoverDef {
  return { ...c, ...mirrorPt(c, t) };
}

export function mirrorZone(z: ZoneDef, t: Transform): ZoneDef {
  if (z.shape === 'circle') return { ...z, ...mirrorPt(z, t) };
  if (z.shape === 'rect') return { ...z, x: flipX(t) ? BOARD.w - z.x - z.w : z.x, y: flipY(t) ? BOARD.h - z.y - z.h : z.y };
  return { ...z, points: z.points.map((p) => mirrorPt(p, t)) };
}

export const round = (v: number): number => Math.round(v);
export const between = (rng: Rng, lo: number, hi: number): number => lo + (hi - lo) * rng();
export const pickOne = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length) % list.length]!;
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** A solid's centre and the radius of a circle round it. */
export function solidCircle(s: SolidDef): { x: number; y: number; r: number } {
  if (s.kind === 'circle') return { x: s.x, y: s.y, r: s.r };
  return { x: s.x + s.w / 2, y: s.y + s.h / 2, r: Math.hypot(s.w, s.h) / 2 };
}

/** Distance from `p` to the solid's edge (negative inside). */
export function solidGap(p: Pt, s: SolidDef): number {
  if (s.kind === 'circle') return Math.hypot(p.x - s.x, p.y - s.y) - s.r;
  const dx = Math.max(s.x - p.x, 0, p.x - (s.x + s.w));
  const dy = Math.max(s.y - p.y, 0, p.y - (s.y + s.h));
  if (dx === 0 && dy === 0) return -Math.min(p.x - s.x, s.x + s.w - p.x, p.y - s.y, s.y + s.h - p.y);
  return Math.hypot(dx, dy);
}

/** Whether two solids come within `gap` px of each other (rects as boxes, circles as circles). */
export function solidsMeet(a: SolidDef, b: SolidDef, gap = 0): boolean {
  if (a.kind === 'circle') return solidGap(a, b) < a.r + gap;
  if (b.kind === 'circle') return solidGap(b, a) < b.r + gap;
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

export function inBoard(p: Pt, margin: number): boolean {
  return p.x >= margin && p.y >= margin && p.x <= BOARD.w - margin && p.y <= BOARD.h - margin;
}

/** Points at least `min` apart, `margin` in from the edges (dart throwing). */
export function spread(rng: Rng, n: number, min: number, margin: number, avoid: readonly Pt[] = []): Pt[] {
  const out: Pt[] = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const p = { x: round(between(rng, margin, BOARD.w - margin)), y: round(between(rng, margin, BOARD.h - margin)) };
    if ([...out, ...avoid].every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= min)) out.push(p);
  }
  return out;
}

export interface Line { readonly a: Pt; readonly b: Pt }
/** A shape's skeleton: single spots for things, and lines to fill with rows of them. */
export interface Skeleton { readonly dots: readonly Pt[]; readonly lines: readonly Line[] }

const CX = BOARD.w / 2;
const CY = BOARD.h / 2;

function ring(rng: Rng): Skeleton {
  const rx = between(rng, 250, 320);
  const ry = between(rng, 145, 180);
  const n = 9 + Math.floor(rng() * 4);
  const turn = rng() * Math.PI * 2;
  const gaps = new Set([Math.floor(rng() * n), Math.floor(rng() * n), Math.floor(rng() * n)]);
  const dots = Array.from({ length: n }, (_, i) => i).filter((i) => !gaps.has(i)).map((i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return { x: round(CX + Math.cos(a) * rx), y: round(CY + Math.sin(a) * ry) };
  });
  return { dots, lines: [] };
}

function lanes(rng: Rng): Skeleton {
  const rows = rng() < 0.6 ? 3 : 2;
  const across = rng() < 0.72;
  const lines: Line[] = [];
  for (let i = 0; i < rows; i++) {
    const f = (i + 1) / (rows + 1);
    const wob = between(rng, -25, 25);
    if (across) {
      const y = round(BOARD.h * f + wob);
      lines.push({ a: { x: round(between(rng, 60, 160)), y }, b: { x: round(between(rng, 800, 900)), y } });
    } else {
      const x = round(BOARD.w * f + wob);
      lines.push({ a: { x, y: round(between(rng, 40, 100)) }, b: { x, y: round(between(rng, 440, 500)) } });
    }
  }
  return { dots: [], lines };
}

function scatter(rng: Rng): Skeleton {
  return { dots: spread(rng, 7 + Math.floor(rng() * 4), 130, 70), lines: [] };
}

function rooms(rng: Rng): Skeleton {
  const x = round(CX + between(rng, -60, 60));
  const y = round(CY + between(rng, -40, 40));
  const arms: Line[] = [
    { a: { x, y: 30 }, b: { x, y: y - 40 } }, { a: { x, y: y + 40 }, b: { x, y: BOARD.h - 30 } },
    { a: { x: 30, y }, b: { x: x - 40, y } }, { a: { x: x + 40, y }, b: { x: BOARD.w - 30, y } },
  ];
  // Three or four pens: one arm may be left out.
  const drop = rng() < 0.4 ? Math.floor(rng() * 4) : -1;
  return { dots: [], lines: arms.filter((_, i) => i !== drop) };
}

function islands(rng: Rng): Skeleton {
  const centres = spread(rng, 3 + Math.floor(rng() * 2), 230, 120);
  const dots = centres.flatMap((c) => Array.from({ length: 2 + Math.floor(rng() * 2) }, (_, i) => {
    const a = rng() * Math.PI * 2;
    const r = i === 0 ? 0 : between(rng, 40, 60);
    return { x: round(c.x + Math.cos(a) * r), y: round(c.y + Math.sin(a) * r) };
  }));
  return { dots, lines: [] };
}

function spiral(rng: Rng): Skeleton {
  const dir = rng() < 0.5 ? 1 : -1;
  const turn = rng() * Math.PI * 2;
  const dots: Pt[] = [];
  let last: Pt | null = null;
  for (let th = 0.8; th < 3.3 * Math.PI; th += 0.05) {
    const r = 35 + 23 * th;
    const p = { x: round(CX + Math.cos(turn + dir * th) * r * 1.45), y: round(CY + Math.sin(turn + dir * th) * r * 0.82) };
    if (!inBoard(p, 50)) continue;
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 92) {
      dots.push(p);
      last = p;
    }
  }
  return { dots, lines: [] };
}

export function skeleton(shape: Shape, rng: Rng): Skeleton {
  switch (shape) {
    case 'ring': return ring(rng);
    case 'lanes': return lanes(rng);
    case 'scatter': return scatter(rng);
    case 'rooms': return rooms(rng);
    case 'islands': return islands(rng);
    case 'spiral': return spiral(rng);
  }
}
