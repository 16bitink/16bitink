import { createRng, type Rng } from '../../../src/logic/rng';
import { RR } from '../../../src/art/chapters/dunesBossPaint';
import { inside } from '../../../src/art/critters/birdKit';
import { normals, pt } from '../../../src/art/kit';
import { pathOf, type Pt } from '../../../src/art/pen';
import { rgba } from '../../../src/art/wash';
import { spineOf } from '../pythonbear/python';

/**
 * Painting helpers for the roadrunner short: gradient-filled shapes whose
 * feathers (dark centre, pale edge), fur and scales are laid stroke by
 * stroke, and one ink outline round a union of shapes (every shape stroked
 * dark first, then filled over), so no seam shows between a head and a neck.
 * The colours are the game boss's (chapter 3's Roadrunner), with the tones
 * only a side view and a close-up need.
 */
export const BIRD = {
  ...RR,
  ink: '#1a1512',
  core: '#3a2e25', coreSoft: '#5d4a39', edge: '#e6d2a6', edgeLit: '#f6ead0',
  brown: '#8f7752', brownDeep: '#564632', face: '#d3bd92', throat: '#f1e6cc', belly: '#f6f0e2', bellyShade: '#b9ab96',
  crestLit: '#6a5743', crestTip: '#a58660',
  billLit: '#8f8982', billMid: '#59544f', billDeep: '#262321', billPale: '#b5aa9a',
  mouth: '#3a1216', mouthLit: '#a14a48',
  iris: '#ecd98f', irisLit: '#fbf2c4', irisDeep: '#a9822f', pupil: '#0b0807',
  skinBlue: '#5f93c9', skinPale: '#cfe0ea', skinRed: '#e2592b', skinDeep: '#8c2a14',
  gloss: '#5d7d58', bronze2: '#7a6a3e', tailDeep: '#26231b',
  legLit: '#b6c3cf', legMid: '#8393a3', legDark: '#4a5664', claw: '#2b2a2c',
} as const;

/** A smooth open curve through knots. */
export const curve = (knots: readonly Pt[], per = 8): Pt[] => spineOf(knots, per).map((p) => pt(p.x, p.y));

/** A smooth closed curve through knots. */
export function loop(knots: readonly Pt[], per = 8): Pt[] {
  const n = knots.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [knots[(i + n - 1) % n]!, knots[i]!, knots[(i + 1) % n]!, knots[(i + 2) % n]!];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
      out.push(pt(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y)));
    }
  }
  return out;
}

export function fillShape(ctx: CanvasRenderingContext2D, shape: readonly Pt[], style: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = style;
  pathOf(ctx, shape);
  ctx.fill();
  ctx.restore();
}

/** The dark underlay of a shape in a union: its outline, `w` beyond its edge. */
export function underlay(ctx: CanvasRenderingContext2D, shape: readonly Pt[], w: number, ink: string): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = w * 2;
  ctx.strokeStyle = ink;
  pathOf(ctx, shape);
  ctx.stroke();
  ctx.restore();
}

export function clipTo(ctx: CanvasRenderingContext2D, shape: readonly Pt[], draw: () => void): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  draw();
  ctx.restore();
}

/** A soft round glaze. */
export function soft(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(colour, alpha));
  g.addColorStop(0.5, rgba(colour, alpha * 0.75));
  g.addColorStop(1, rgba(colour, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

export function linear(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, stops: readonly (readonly [number, string])[]): CanvasGradient {
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}

/** A feather-shaped lens: narrow at its root, fullest 0.6 of the way, its tip bluntly pointed. */
export function lens(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, bend = 0): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const at = (l: number, n: number): [number, number] => {
    const m = n + bend * l * l / len;
    return [x + c * l - s * m, y + s * l + c * m];
  };
  ctx.beginPath();
  ctx.moveTo(...at(0, 0));
  ctx.bezierCurveTo(...at(len * 0.3, -w * 0.42), ...at(len * 0.78, -w * 0.68), ...at(len, 0));
  ctx.bezierCurveTo(...at(len * 0.78, w * 0.68), ...at(len * 0.3, w * 0.42), ...at(0, 0));
  ctx.closePath();
}

export interface Tone {
  readonly edge: string;
  readonly core: string;
  /** The dark centre's share of the width. */
  readonly k: number;
}

/** One streaky feather: a pale edge round a dark centre, a fine shaft. */
export function feather(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, t: Tone, alpha = 1, bend = 0): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = t.edge;
  lens(ctx, x, y, ang, len, w, bend);
  ctx.fill();
  if (t.k > 0) {
    ctx.fillStyle = t.core;
    lens(ctx, x, y, ang, len * 0.86, w * t.k, bend);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly r2: number;
}

export interface Plume {
  readonly x: number;
  readonly y: number;
  readonly ang: number;
  readonly len: number;
  readonly w: number;
  readonly tone: Tone;
  readonly bend?: number;
  readonly alpha?: number;
  /** On the contour. */
  readonly edge?: boolean;
  /** Kept inside the body's outline. */
  readonly inner?: boolean;
}

/** A coat of feathers with one ink edge round the lot (`ink` px beyond the outermost), so a feathered contour still has a firm line. */
export function coatOf(ctx: CanvasRenderingContext2D, plumes: readonly Plume[], ink: number): void {
  if (ink > 0) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = BIRD.ink;
    ctx.lineWidth = ink * 2;
    ctx.beginPath();
    for (const p of plumes) {
      lens(ctx, p.x, p.y, p.ang, p.len, p.w, p.bend);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const p of plumes) feather(ctx, p.x, p.y, p.ang, p.len, p.w, p.tone, p.alpha ?? 0.95, p.bend ?? 0);
}

/** Feather roots scattered over a shape (a jittered grid), back ones first along `ang`, so front ones overlap them. */
export function scatter(shape: readonly Pt[], step: number, seed: number, ang: number, squash = 0.62): Spot[] {
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const spots: Spot[] = [];
  for (let y = y0; y <= y1; y += step * squash) {
    for (let x = x0; x <= x1; x += step) {
      const p = pt(x + (rng() - 0.5) * step * 1.1, y + (rng() - 0.5) * step * 0.9);
      const r = rng();
      const r2 = rng();
      if (inside(shape, p)) spots.push({ ...p, r, r2 });
    }
  }
  const [c, s] = [Math.cos(ang), Math.sin(ang)];
  return spots.sort((a, b) => b.x * c + b.y * s - (a.x * c + a.y * s));
}

/** Short tapering hairs (fur, rictal bristles, down). */
export function hair(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, colour: string, alpha: number, bend = 0.15): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  lens(ctx, x, y, ang, len, w, bend);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The point at u (0..1) along a spine and v (−1..1) across it, `half(u)` its half width. */
export function across(spine: readonly Pt[], half: (u: number) => number): (u: number, v: number) => Pt {
  const n = normals(spine);
  return (u, v) => {
    const f = Math.max(0, Math.min(1, u)) * (spine.length - 1);
    const i = Math.min(spine.length - 2, Math.floor(f));
    const k = f - i;
    const [a, b, na, nb] = [spine[i]!, spine[i + 1]!, n[i]!, n[i + 1]!];
    const h = half(u) * v;
    return pt(a.x + (b.x - a.x) * k + (na.x + (nb.x - na.x) * k) * h, a.y + (b.y - a.y) * k + (na.y + (nb.y - na.y) * k) * h);
  };
}

export const rngOf = (seed: number): Rng => createRng(seed);
export { normals, pt, pathOf };
export type { Pt };
