import { CELL } from '../../sim/constants';
import type { Pt, Terrain } from '../../sim/types';
import { fbm, hash2 } from '../noise';

/**
 * The map's letters as smooth shapes: a soft field per letter, and its outline
 * as loops, so a coast drawn on a 40 px grid reads as a hand-drawn shore.
 * Past the map's edge the land carries on (APRON), then fades to paper.
 */
export const APRON = 13; // cells of scenery outside the map
const STEP = 8; // outline resolution, plan px
const WARP = 11; // how far the noise pushes an outline, plan px
const WARP_SCALE = 1 / 70;
const LEVEL = 0.5;

export interface Extent { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

/** The playable rectangle, plan px (a cell is centred on its vertex). */
export function mapExtent(rows: readonly string[]): Extent {
  const w = rows[0]?.length ?? 1;
  return { x0: -CELL / 2, y0: -CELL / 2, x1: (w - 0.5) * CELL, y1: (rows.length - 0.5) * CELL };
}

export function fullExtent(rows: readonly string[]): Extent {
  const m = mapExtent(rows);
  const a = APRON * CELL;
  return { x0: m.x0 - a, y0: m.y0 - a, x1: m.x1 + a, y1: m.y1 + a };
}

/** Water and rock carry on past the edge; parks and old streets don't. */
const CARRIES: ReadonlySet<string> = new Set(['~', '#']);

export function letterAt(rows: readonly string[], gx: number, gy: number): Terrain {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const inside = gx >= 0 && gy >= 0 && gx < w && gy < h;
  const x = Math.min(w - 1, Math.max(0, gx));
  const y = Math.min(h - 1, Math.max(0, gy));
  const c = (rows[y]?.[x] ?? '.') as Terrain;
  return inside || CARRIES.has(c) ? c : '.';
}

/** Quadratic B-spline weights over three samples. */
function weights(f: number): readonly [number, number, number] {
  return [0.5 * (0.5 - f) ** 2, 0.75 - f * f, 0.5 * (0.5 + f) ** 2];
}

/** How much of a letter there is at a plan point, 0..1, smoothed and warped. */
export function fieldAt(rows: readonly string[], letter: Terrain, x: number, y: number): number {
  const wx = x + (fbm(x * WARP_SCALE, y * WARP_SCALE, 2, 11) - 0.5) * 2 * WARP;
  const wy = y + (fbm(x * WARP_SCALE, y * WARP_SCALE, 2, 47) - 0.5) * 2 * WARP;
  const gx = Math.round(wx / CELL);
  const gy = Math.round(wy / CELL);
  const ax = weights(wx / CELL - gx);
  const ay = weights(wy / CELL - gy);
  let sum = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      if (letterAt(rows, gx + i, gy + j) === letter) sum += ax[(i + 1) as 0 | 1 | 2]! * ay[(j + 1) as 0 | 1 | 2]!;
    }
  }
  return sum;
}

export const hasLetter = (rows: readonly string[], letter: Terrain): boolean => rows.some((r) => r.includes(letter));

/** Closed outlines of a letter's area (fill them with the even-odd rule). */
export function outlines(rows: readonly string[], letter: Terrain): Pt[][] {
  if (!hasLetter(rows, letter)) return [];
  const e = fullExtent(rows);
  const nx = Math.ceil((e.x1 - e.x0) / STEP) + 1;
  const ny = Math.ceil((e.y1 - e.y0) / STEP) + 1;
  const f = new Float32Array(nx * ny);
  for (let j = 1; j < ny - 1; j++) {
    for (let i = 1; i < nx - 1; i++) f[j * nx + i] = fieldAt(rows, letter, e.x0 + i * STEP, e.y0 + j * STEP);
  }
  return joinSegments(marchSquares(f, nx, ny)).map((loop) => loop.map((p) => ({ x: e.x0 + p.x * STEP, y: e.y0 + p.y * STEP })));
}

interface Seg { readonly from: string; readonly to: string; readonly a: Pt; readonly b: Pt }

/** Which cell edges each of the 16 corner cases joins (inside kept on the left). Edges: 0 top, 1 right, 2 bottom, 3 left. */
const CASES: readonly (readonly (readonly [number, number])[])[] = [
  [], [[3, 2]], [[2, 1]], [[3, 1]], [[1, 0]], [[3, 0], [1, 2]], [[2, 0]], [[3, 0]],
  [[0, 3]], [[0, 2]], [[0, 1], [2, 3]], [[0, 1]], [[1, 3]], [[1, 2]], [[2, 3]], [],
];

function marchSquares(f: Float32Array, nx: number, ny: number): Seg[] {
  const segs: Seg[] = [];
  const at = (i: number, j: number): number => f[j * nx + i]!;
  const cut = (a: number, b: number): number => (LEVEL - a) / (b - a || 1);
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const tl = at(i, j), tr = at(i + 1, j), br = at(i + 1, j + 1), bl = at(i, j + 1);
      const code = (tl > LEVEL ? 8 : 0) | (tr > LEVEL ? 4 : 0) | (br > LEVEL ? 2 : 0) | (bl > LEVEL ? 1 : 0);
      for (const [p, q] of CASES[code]!) {
        const edge = (e: number): { key: string; pt: Pt } => {
          if (e === 0) return { key: `h${i},${j}`, pt: { x: i + cut(tl, tr), y: j } };
          if (e === 2) return { key: `h${i},${j + 1}`, pt: { x: i + cut(bl, br), y: j + 1 } };
          if (e === 1) return { key: `v${i + 1},${j}`, pt: { x: i + 1, y: j + cut(tr, br) } };
          return { key: `v${i},${j}`, pt: { x: i, y: j + cut(tl, bl) } };
        };
        const a = edge(p);
        const b = edge(q);
        segs.push({ from: a.key, to: b.key, a: a.pt, b: b.pt });
      }
    }
  }
  return segs;
}

function joinSegments(segs: readonly Seg[]): Pt[][] {
  const byStart = new Map(segs.map((s) => [s.from, s]));
  const loops: Pt[][] = [];
  for (const first of segs) {
    if (!byStart.has(first.from)) continue;
    const loop: Pt[] = [];
    let s: Seg | undefined = first;
    while (s && byStart.delete(s.from)) {
      loop.push(s.a);
      s = byStart.get(s.to);
    }
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

/** Scenery spots: a jittered grid, kept where `keep` says so. */
export function scatter(e: Extent, step: number, seed: number, keep: (p: Pt, roll: number) => boolean): Pt[] {
  const out: Pt[] = [];
  for (let j = 0; e.y0 + j * step < e.y1; j++) {
    for (let i = 0; e.x0 + i * step < e.x1; i++) {
      const p = { x: e.x0 + (i + 0.15 + 0.7 * hash2(i, j, seed)) * step, y: e.y0 + (j + 0.15 + 0.7 * hash2(i, j, seed + 1)) * step };
      if (keep(p, hash2(i, j, seed + 2))) out.push(p);
    }
  }
  return out;
}
