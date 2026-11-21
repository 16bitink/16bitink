import { type Pt } from '../../../src/art/pen';
import { createRng, type Rng } from '../../../src/logic/rng';
import { path, screenScale, taper } from '../seal/art/paint';

/**
 * Brushwork for the painted sea otter and its props: soft dabs of light and
 * shade, fur laid in short tapered strokes that follow the body, and limbs
 * built as tapered outlines round a curved spine. Everything is drawn in the
 * otter's local units; ink weights are set in screen px (`lw`).
 */

export { path, taper };

/** Local units per screen px under the current transform. */
export const lwOf = (ctx: CanvasRenderingContext2D): number => 1 / Math.max(1e-6, screenScale(ctx));

/** A seeded random stream, the same every frame (the line boil comes from the pen, not the fur). */
export const rngOf = (seed: number): Rng => createRng(seed);

/** A soft round dab of colour (`rgb` as "r,g,b"). */
export function dab(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

export interface FurOpts {
  readonly count: number;
  /** Stroke direction (radians) at a point. */
  readonly dir: (p: Pt) => number;
  readonly len: readonly [number, number];
  readonly width: number;
  /** Colours picked at random, each with its alpha. */
  readonly inks: readonly (readonly [string, number])[];
  /** Where strokes go (0..1); defaults to everywhere. */
  readonly density?: (p: Pt) => number;
  /** Clip to this instead of `shape` (which then only bounds where strokes start). */
  readonly clip?: () => void;
}

/** Fur: short tapered strokes inside `shape` (clipped to it), following `dir`. */
export function fur(ctx: CanvasRenderingContext2D, rng: Rng, shape: readonly Pt[], o: FurOpts): void {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  ctx.save();
  if (o.clip) o.clip();
  else {
    path(ctx, shape);
    ctx.clip();
  }
  for (let i = 0; i < o.count; i++) {
    const p = { x: x0 + rng() * (x1 - x0), y: y0 + rng() * (y1 - y0) };
    const pick = rng();
    const keep = rng();
    const lenU = rng();
    const bend = (rng() - 0.5) * 0.5;
    if (o.density && keep > o.density(p)) continue;
    const [ink, alpha] = o.inks[Math.floor(pick * o.inks.length)]!;
    const a = o.dir(p);
    const len = o.len[0] + (o.len[1] - o.len[0]) * lenU;
    const mid = { x: p.x + Math.cos(a) * len * 0.5 + Math.cos(a + Math.PI / 2) * len * bend * 0.3, y: p.y + Math.sin(a) * len * 0.5 + Math.sin(a + Math.PI / 2) * len * bend * 0.3 };
    const end = { x: p.x + Math.cos(a + bend * 0.3) * len, y: p.y + Math.sin(a + bend * 0.3) * len };
    taper(ctx, [p, mid, end], o.width, o.width * 0.15, ink, alpha);
  }
  ctx.restore();
}

/** Fills `shape` with a radial gradient (stops 0..1) centred at `c`, radius `r`. */
export function radialFill(ctx: CanvasRenderingContext2D, shape: readonly Pt[], c: Pt, r: number, stops: readonly (readonly [number, string])[]): void {
  ctx.save();
  path(ctx, shape);
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** Points along a curve from `a` through (near) `m` to `b`. */
export function through(a: Pt, m: Pt, b: Pt, n = 14): Pt[] {
  const c = { x: 2 * m.x - (a.x + b.x) / 2, y: 2 * m.y - (a.y + b.y) / 2 };
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y };
  });
}

/** The outline of a limb round `spine`, `w0` wide at its root to `w1` at its end, rounded at both ends. */
export function limb(spine: readonly Pt[], w0: number, w1: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  spine.forEach((p, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(spine.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    const w = (w0 + (w1 - w0) * (i / (spine.length - 1))) / 2;
    left.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    right.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  });
  const cap = (c: Pt, from: Pt, to: Pt, steps = 6): Pt[] => {
    const a0 = Math.atan2(from.y - c.y, from.x - c.x);
    let a1 = Math.atan2(to.y - c.y, to.x - c.x);
    if (a1 > a0) a1 -= 2 * Math.PI;
    const r = Math.hypot(from.x - c.x, from.y - c.y);
    return Array.from({ length: steps - 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * (i + 1)) / steps;
      return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
    });
  };
  const end = spine[spine.length - 1]!;
  const start = spine[0]!;
  return [...left, ...cap(end, left[left.length - 1]!, right[right.length - 1]!), ...right.reverse(), ...cap(start, right[right.length - 1]!, left[0]!)];
}

/** Linear blend of two points. */
export const mixPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** Rotates `p` by `a` about `c`. */
export function rot(p: Pt, c: Pt, a: number): Pt {
  const [cs, sn] = [Math.cos(a), Math.sin(a)];
  return { x: c.x + (p.x - c.x) * cs - (p.y - c.y) * sn, y: c.y + (p.x - c.x) * sn + (p.y - c.y) * cs };
}
