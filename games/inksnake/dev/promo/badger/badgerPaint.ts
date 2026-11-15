import { createRng } from '../../../src/logic/rng';
import { closed, type Draw, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { rgba } from '../../../src/art/wash';

/**
 * Paint for the honey badger (Mellivora capensis), side on: jet-black fur
 * modelled with a cool blue-grey sheen where the light catches the round
 * of a form, and the silver-white mantle (crown, nape, back, to the tail's
 * root) painted in its own greys, its border crisp but fraying in hairs.
 */
export const B = {
  black: '#1a1819', coal: '#2a2729', deep: '#0d0c0d', sheen: '#5d5e66', sheenLit: '#8a8c96',
  mantle: '#d9d5cb', mantleLit: '#f3f0e8', mantleMid: '#b9b4a8', mantleDeep: '#86817a', grizzle: '#6a6660',
  claw: '#d9cdb0', clawLit: '#f1e8d0', clawDeep: '#8c7e62', pad: '#3a3233',
  iris: '#5a3a22', irisDeep: '#22140c', nose: '#151314', mouth: '#9e3b45', mouthDeep: '#4e161e', tongue: '#d77682', tooth: '#f4eedf',
  line: '#070607',
} as const;

const bounds = (shape: readonly Pt[]): { x0: number; x1: number; y0: number; y1: number } => {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

/** Black fur over a shape: the base, darker low down, a sheen glaze where the light (`lit`) catches its round. */
export function blackWash(d: Draw, shape: readonly Pt[], lit: Pt, sheen = 0.5): void {
  const { pen } = d;
  const { ctx } = pen;
  const b = bounds(shape);
  pen.fill(shape, B.black, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, rgba(B.coal, 0.9));
    g.addColorStop(0.5, rgba(B.black, 0));
    g.addColorStop(1, rgba(B.deep, 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4);
    glaze(ctx, lit.x, lit.y, Math.max(6, (b.x1 - b.x0) * 0.32), Math.max(4, (b.y1 - b.y0) * 0.24), 0, B.sheen, sheen);
  });
}

/**
 * Hairs over a shape, combed along `angle(x, y)` (radians), `len` long:
 * mostly dark with lighter tips picking up the sheen (or the mantle's greys).
 */
export function hairs(
  d: Draw, shape: readonly Pt[], n: number, seed: number, len: number, angle: (x: number, y: number) => number,
  tones: readonly (readonly [string, number])[], width = 0.45,
): void {
  const { pen } = d;
  const rng = createRng(seed);
  const b = bounds(shape);
  const total = tones.reduce((s, [, w]) => s + w, 0);
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = b.x0 + rng() * (b.x1 - b.x0);
      const y = b.y0 + rng() * (b.y1 - b.y0);
      const a = angle(x, y) + (rng() - 0.5) * 0.3;
      const l = len * (0.6 + rng() * 0.7);
      let r = rng() * total;
      const tone = tones.find(([, w]) => (r -= w) < 0)?.[0] ?? tones[0]![0];
      const mid = pt(x + Math.cos(a) * l * 0.5 + Math.sin(a) * l * 0.08, y + Math.sin(a) * l * 0.5 - Math.cos(a) * l * 0.08);
      pen.hair([pt(x, y), mid, pt(x + Math.cos(a) * l, y + Math.sin(a) * l)], width, tone, 0.55);
    }
  });
}

/** Black fur hairs, combed back and a little down. */
export const BLACK_TONES: readonly (readonly [string, number])[] = [[B.deep, 4], [B.coal, 3], [B.sheen, 1.4], [B.sheenLit, 0.3]];
export const MANTLE_TONES: readonly (readonly [string, number])[] = [[B.mantleLit, 3], [B.mantle, 3], [B.mantleMid, 2], [B.mantleDeep, 1.2], [B.grizzle, 0.6]];

/**
 * The silver mantle over `shape` (its top edge first, the border along its
 * bottom): bright along the top, greying to the border, the border inked
 * with frayed black hairs crossing up into it and pale ones down out of it.
 */
export function paintMantle(d: Draw, shape: readonly Pt[], border: readonly Pt[], seed: number, combed: (x: number, y: number) => number, hairN: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const b = bounds(shape);
  pen.fill(shape, B.mantle, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, B.mantleLit);
    g.addColorStop(0.35, B.mantle);
    g.addColorStop(0.75, B.mantleMid);
    g.addColorStop(1, B.mantleDeep);
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4);
    // The grizzle: darker hairs mixed in, thicker near the border.
    const rng = createRng(seed + 1);
    for (let i = 0; i < hairN * 0.35; i++) {
      const p = border[Math.floor(rng() * border.length)]!;
      glaze(ctx, p.x + (rng() - 0.5) * 8, p.y - 2 - rng() * 10, 6 + rng() * 6, 2 + rng() * 2, 0, B.grizzle, 0.18);
    }
  });
  hairs(d, shape, hairN, seed, 7, combed, MANTLE_TONES, 0.5);
  // The fray: black hairs up into the silver, silver ones down into the black.
  const rng = createRng(seed + 2);
  for (let i = 1; i < border.length - 1; i++) {
    const p = border[i]!;
    const q = border[i + 1]!;
    const along = Math.atan2(q.y - p.y, q.x - p.x);
    for (let k = 0; k < 3; k++) {
      const u = rng();
      const x = p.x + (q.x - p.x) * u;
      const y = p.y + (q.y - p.y) * u;
      const up = rng() < 0.55;
      const a = along + Math.PI + (up ? -0.5 : 0.5) + (rng() - 0.5) * 0.4;
      const l = 3 + rng() * 5;
      pen.hair([pt(x, y), pt(x + Math.cos(a) * l, y + Math.sin(a) * l)], 0.55, up ? B.black : B.mantleMid, 0.8);
    }
  }
  pen.hair(border, 0.5, B.grizzle, 0.35);
}

/** A tapered limb through its joints as a closed outline. */
export function limbShape(pts: readonly Pt[], w0: number, w1: number, bulge = 0): Pt[] {
  return ribbon(pts, (u) => w0 + (w1 - w0) * u + bulge * Math.sin(u * Math.PI)).shape;
}

/** A firm contour round a closed shape. */
export function contour(d: Draw, shape: readonly Pt[], w: number, alpha = 1): void {
  d.pen.stroke(closed(shape), w, B.line, alpha, false);
}

/**
 * A forefoot's long digging claws (or a hind foot's short ones): from the
 * toes at `base`, along `dir`, each curving down to its tip; pale horn,
 * lit along the top, a dark underside.
 */
export function claws(d: Draw, base: Pt, dir: number, n: number, len: number, w: number, spread: number): void {
  const { pen } = d;
  const c = Math.cos(dir);
  const s = Math.sin(dir);
  const to = (x: number, y: number): Pt => pt(base.x + x * c - y * s, base.y + x * s + y * c);
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * spread;
    const l = len * (1 - Math.abs(i - (n - 1) / 2) * 0.12);
    const root = [to(-1, off - w / 2), to(-1, off + w / 2)];
    const claw = [
      root[0]!, to(l * 0.45, off - w * 0.42 + l * 0.04), to(l * 0.85, off + l * 0.18), to(l, off + l * 0.34),
      to(l * 0.8, off + l * 0.26 + w * 0.2), to(l * 0.42, off + w * 0.4 + l * 0.12), root[1]!,
    ];
    pen.fill(claw, B.claw, 1);
    pen.fill([to(l * 0.2, off + w * 0.1), to(l * 0.6, off + l * 0.12 + w * 0.15), to(l * 0.9, off + l * 0.3), to(l * 0.42, off + w * 0.42 + l * 0.1)], B.clawDeep, 0.7);
    pen.hair([to(l * 0.1, off - w * 0.25), to(l * 0.5, off - w * 0.15 + l * 0.05), to(l * 0.82, off + l * 0.18)], w * 0.16, B.clawLit, 0.9);
    pen.stroke(closed(claw), Math.max(0.5, w * 0.13), B.line, 0.9, false);
  }
}

/** A soft pale glint, as on wet black fur or a nose. */
export function glint(d: Draw, at: Pt, rx: number, ry: number, rot: number, alpha = 0.5): void {
  glaze(d.pen.ctx, at.x, at.y, rx, ry, rot, PAPER_FILL, alpha);
}

/** A smooth limb through its joints, `widths` the full width at each joint (interpolated between), as a closed outline. */
export function jointedLimb(joints: readonly Pt[], widths: readonly number[]): Pt[] {
  const spine: Pt[] = [];
  const w: number[] = [];
  for (let i = 0; i + 1 < joints.length; i++) {
    const a = joints[Math.max(0, i - 1)]!;
    const b = joints[i]!;
    const c = joints[i + 1]!;
    const e = joints[Math.min(joints.length - 1, i + 2)]!;
    for (let k = 0; k < 8; k++) {
      const s = k / 8;
      const s2 = s * s;
      const s3 = s2 * s;
      // Catmull-Rom through the joints.
      const cr = (p0: number, p1: number, p2: number, p3: number): number =>
        0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (-p0 + 3 * p1 - 3 * p2 + p3) * s3);
      spine.push(pt(cr(a.x, b.x, c.x, e.x), cr(a.y, b.y, c.y, e.y)));
      w.push(widths[i]! + (widths[i + 1]! - widths[i]!) * (s * s * (3 - 2 * s)));
    }
  }
  spine.push(joints[joints.length - 1]!);
  w.push(widths[widths.length - 1]!);
  return ribbon(spine, (u) => w[Math.min(w.length - 1, Math.round(u * (w.length - 1)))]!).shape;
}

/**
 * The fur's soft broken edge: short tufts crossing the outline, leaning
 * back (−x) and outwards, so the silhouette reads as fur, not a cut-out.
 * `from`..`to` limit them to part of the outline (shares of its points).
 */
export function furEdge(d: Draw, shape: readonly Pt[], n: number, len: number, seed: number, tone: string = B.black, from = 0, to = 1): void {
  const { pen } = d;
  const rng = createRng(seed);
  const m = shape.length;
  // Which way is outside: the outline's winding.
  let area = 0;
  for (let i = 0; i < m; i++) {
    const a = shape[i]!;
    const b = shape[(i + 1) % m]!;
    area += a.x * b.y - b.x * a.y;
  }
  const out = area > 0 ? -1 : 1;
  for (let k = 0; k < n; k++) {
    const i = Math.floor((from + rng() * (to - from)) * (m - 1));
    const a = shape[i]!;
    const b = shape[(i + 1) % m]!;
    const u = rng();
    const p = pt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
    const tl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / tl) * out;
    const ny = ((b.x - a.x) / tl) * out;
    const l = len * (0.5 + rng() * 0.8);
    const dir = Math.atan2(ny, nx) + (Math.cos(Math.atan2(ny, nx)) > 0 ? 0.9 : -0.9) * 0.6 + (rng() - 0.5) * 0.5;
    const start = pt(p.x - nx * l * 0.5, p.y - ny * l * 0.5);
    const end = pt(start.x + Math.cos(dir) * l, start.y + Math.sin(dir) * l);
    pen.hair([start, pt((start.x + end.x) / 2 + nx * 0.6, (start.y + end.y) / 2 + ny * 0.6), end], 0.7 + rng() * 0.5, tone, 0.85);
  }
}
