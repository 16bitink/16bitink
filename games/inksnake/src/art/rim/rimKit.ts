import { BOARD, type SolidDef } from '../../level/types';
import type { Rng } from '../../logic/rng';
import { blob, castShadow, softBand } from '../groundKit';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/**
 * The border round every board: a wall in its place's own style (a farm's
 * fence, the Barrens' fallen logs, a reef's crest…) along the four edges,
 * where the snake's head already stops. Its centre line runs RIM.line past
 * each edge, so the wall's inner face just meets the board's edge. It's
 * painted into four strips (see bakeRims), each RIM.out past the edge to
 * RIM.in inside it.
 */
export const RIM = { out: 34, in: 8, line: -9 } as const;
/** How much of the wall a whole-board view keeps on screen past each edge, board px. */
export const RIM_SHOW = 20;

export interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** One piece of a wall: where it paints (to skip it in strips it misses) and how; `snow` is where winter's snow lies on it. */
export interface RimPiece {
  readonly box: Box;
  readonly paint: (d: Draw) => void;
  readonly snow?: readonly SolidDef[];
}

/** A place's wall: its pieces round the whole board, laid out with `rng`. */
export type RimStyle = (rng: Rng) => RimPiece[];

/** One side of the wall's centre line, from corner a to corner b. */
export interface Side {
  readonly a: Pt;
  readonly b: Pt;
  readonly flat: boolean;
  /** Away from the board. */
  readonly out: Pt;
}

const L = RIM.line;

/** The four sides of the wall's centre line, clockwise from the top. */
export function rimSides(): Side[] {
  const { w, h } = BOARD;
  return [
    { a: pt(L, L), b: pt(w - L, L), flat: true, out: pt(0, -1) },
    { a: pt(w - L, L), b: pt(w - L, h - L), flat: false, out: pt(1, 0) },
    { a: pt(w - L, h - L), b: pt(L, h - L), flat: true, out: pt(0, 1) },
    { a: pt(L, h - L), b: pt(L, L), flat: false, out: pt(-1, 0) },
  ];
}

/** The four strips the wall is painted into, board px. */
export function rimStrips(): { readonly top: Box; readonly bottom: Box; readonly left: Box; readonly right: Box } {
  const { w, h } = BOARD;
  const { out, in: inner } = RIM;
  return {
    top: { x0: -out, y0: -out, x1: w + out, y1: inner },
    bottom: { x0: -out, y0: h - inner, x1: w + out, y1: h + out },
    left: { x0: -out, y0: inner, x1: inner, y1: h - inner },
    right: { x0: w - inner, y0: inner, x1: w + out, y1: h - inner },
  };
}

export const meets = (a: Box, b: Box): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
export const roundBox = (c: Pt, r: number, pad = 10): Box => ({ x0: c.x - r - pad, y0: c.y - r - pad, x1: c.x + r + pad * 2, y1: c.y + r + pad * 2 });
export const rectBox = (x: number, y: number, w: number, h: number, pad = 10): Box => ({ x0: x - pad, y0: y - pad, x1: x + w + pad * 2, y1: y + h + pad * 2 });

/** A point along a side, `t` 0..1, pushed `off` away from the board. */
export function along(s: Side, t: number, off = 0): Pt {
  return pt(s.a.x + (s.b.x - s.a.x) * t + s.out.x * off, s.a.y + (s.b.y - s.a.y) * t + s.out.y * off);
}

const sideLength = (s: Side): number => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);

/**
 * Stations along every side, about `step` apart (± jitter share), each side
 * from its first corner up to (not including) its last, so each corner gets
 * one station. `sway` pushes each a little in or out.
 */
export function stations(rng: Rng, step: number, jitter = 0.25, sway = 0): { p: Pt; side: Side }[] {
  const out: { p: Pt; side: Side }[] = [];
  for (const s of rimSides()) {
    const len = sideLength(s);
    for (let d = 0; d < len - step * 0.5; d += step * (1 + (rng() - 0.5) * 2 * jitter)) out.push({ p: along(s, d / len, (rng() - 0.5) * 2 * sway), side: s });
  }
  return out;
}

/**
 * Lengths laid end to end along every side (logs, walls, rails): from
 * corner to corner, overrunning the corners by `over` so the ends cross.
 */
export function runs(rng: Rng, min: number, max: number, gap: number, over: number): { a: Pt; b: Pt; side: Side }[] {
  const out: { a: Pt; b: Pt; side: Side }[] = [];
  for (const s of rimSides()) {
    const len = sideLength(s);
    const u = pt((s.b.x - s.a.x) / len, (s.b.y - s.a.y) / len);
    const at = (d: number): Pt => pt(s.a.x + u.x * d, s.a.y + u.y * d);
    let d = -over;
    while (d < len + over - min * 0.4) {
      const run = Math.min(min + rng() * (max - min), len + over - d);
      out.push({ a: at(d), b: at(d + run), side: s });
      d += run + gap;
    }
  }
  return out;
}

/** The box a run of thickness `thick` covers, as a rect (x, y, w, h). */
export function runRect(r: { a: Pt; b: Pt }, thick: number): { x: number; y: number; w: number; h: number } {
  const x = Math.min(r.a.x, r.b.x);
  const y = Math.min(r.a.y, r.b.y);
  const flat = Math.abs(r.b.x - r.a.x) >= Math.abs(r.b.y - r.a.y);
  return flat ? { x, y: y - thick / 2, w: Math.abs(r.b.x - r.a.x), h: thick } : { x: x - thick / 2, y, w: thick, h: Math.abs(r.b.y - r.a.y) };
}

/** Round things (stones, coral, bamboo) shoulder to shoulder all round: a ridge. */
export function roundChain(rng: Rng, rMin: number, rMax: number, paint: (d: Draw, c: Pt, r: number) => void, sway = 2.5, pack = 1.45): RimPiece[] {
  const mid = (rMin + rMax) / 2;
  return stations(rng, mid * pack, 0.2, sway).map(({ p }) => {
    const r = rMin + rng() * (rMax - rMin);
    return { box: roundBox(p, r, 14), paint: (d: Draw) => paint(d, p, r), snow: [{ kind: 'circle', look: 'rim', x: p.x, y: p.y, r }] };
  });
}

/** A tangle of strokes and blobs (hedges, vines): a soft bed under them, cast to the lower right. */
export function bed(d: Draw, c: Pt, rx: number, ry: number, rng: Rng, colour: string, alpha: number): Pt[] {
  const shape = blob(c, rx, ry, rng, 0.28, 18, rng() * 6);
  castShadow(d, shape, 6, 0.16);
  d.pen.fill(shape, PAPER_FILL, 0.5);
  d.pen.fill(shape, colour, alpha);
  return shape;
}

/** A short ink line from p, `len` long at angle a. */
export function tick(d: Draw, p: Pt, a: number, len: number, w: number, colour: string, alpha: number): void {
  d.pen.hair([p, pt(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len)], w, colour, alpha);
}

export const ring = (pts: readonly Pt[]): Pt[] => closed(pts);

/**
 * The wall's footing: a soft band of shade along each side under the
 * pieces, cast a little to the lower right, so even a light wall (pale
 * stone, leaves) has weight against the ground. Paint it first.
 */
export function footing(width: number, colour?: string, alpha = 0.2): RimPiece[] {
  return rimSides().map((s) => {
    const n = 24;
    const pts = Array.from({ length: n + 1 }, (_, i) => pt(s.a.x + ((s.b.x - s.a.x) * i) / n + 3, s.a.y + ((s.b.y - s.a.y) * i) / n + 5));
    const box = { x0: Math.min(s.a.x, s.b.x) - width, y0: Math.min(s.a.y, s.b.y) - width, x1: Math.max(s.a.x, s.b.x) + width, y1: Math.max(s.a.y, s.b.y) + width };
    return { box, paint: (d: Draw) => softBand(d, pts, width, colour ?? d.ink, alpha) };
  });
}
