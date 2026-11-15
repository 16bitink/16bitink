import { createRng } from '../../../src/logic/rng';
import { closed, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pen, Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { rgba } from '../../../src/art/wash';

/**
 * The eastern hognose's paint box for the low, ground-level shots, and the
 * few brush helpers its head and body share: tan-olive back with umber
 * blotches, a cream and grey-mottled belly, the pink-white mouth lining.
 */
export const HOG = {
  line: '#1e150d',
  crown: '#6e5a33',
  back: '#a38750',
  flank: '#c2a46c',
  low: '#d8c28e',
  lip: '#ece0bc',
  olive: '#8f8a58',
  ochre: '#d3a456',
  blotch: '#3d2614',
  blotchLit: '#68482a',
  blotchDeep: '#1f1209',
  shadow: '#3b2715',
  belly: '#e9e2ca',
  bellyLit: '#f5f0de',
  bellyCool: '#c6c1b1',
  mottle: '#6f6b66',
  throat: '#e6dbbc',
  mouth: '#f6e2dc',
  mouthMid: '#eab9b6',
  mouthDeep: '#b9737c',
  iris: '#8a5a2a',
  irisLit: '#d2a058',
  irisDeep: '#2a190b',
  pupil: '#0b0705',
  tongue: '#3b2b3a',
  tongueLit: '#7a6274',
} as const;

/** Paper under a shape, then a vertical wash over it from `stops` (y, colour) pairs. */
export function washV(pen: Pen, shape: readonly Pt[], stops: readonly (readonly [number, string])[]): void {
  const { ctx } = pen;
  pen.fill(shape, PAPER_FILL, 1);
  const ys = stops.map(([y]) => y);
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [y, c] of stops) g.addColorStop((y - y0) / (y1 - y0 || 1), c);
    ctx.fillStyle = g;
    ctx.fillRect(-2000, -2000, 4000, 4000);
  });
}

/** An umber blotch: laid in, its heart lifted a little, the pigment pooled darker at its drying edge, a soft halo. */
export function blotch(pen: Pen, shape: readonly Pt[], alpha = 1): void {
  const { ctx } = pen;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const c = pt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(HOG.blotch, 0.25);
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  pen.fill(shape, HOG.blotch, 0.92);
  pen.clipped(shape, () => {
    glaze(ctx, c.x - r * 0.1, c.y - r * 0.15, r * 0.7, r * 0.55, 0, HOG.blotchLit, 0.45);
    ctx.strokeStyle = rgba(HOG.blotchDeep, 0.7);
    ctx.lineWidth = r * 0.16;
    ctx.stroke();
  });
  ctx.restore();
}

/** Pigment speckle over a shape: fine dark and pale flecks. */
export function fleck(pen: Pen, shape: readonly Pt[], n: number, seed: number, r: number, dark: string, alpha: number): void {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const rng = createRng(seed);
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = Math.min(...xs) + rng() * (Math.max(...xs) - Math.min(...xs));
      const y = Math.min(...ys) + rng() * (Math.max(...ys) - Math.min(...ys));
      pen.dot(x, y, r * (0.5 + rng()), rng() < 0.7 ? dark : PAPER_FILL, alpha * (0.4 + 0.6 * rng()));
    }
  });
}

/** A realistic snake eye: socket shadow, a radial iris with fine grain, a round pupil, the brow's shadow, a firm rim and a catchlight. */
export function snakeEye(pen: Pen, c: Pt, r: number, oval: (x: number, y: number, rx: number, ry: number, n?: number) => Pt[]): void {
  const { ctx } = pen;
  const ball = oval(c.x, c.y, r, r * 0.95, 30);
  pen.fill(oval(c.x, c.y + r * 0.08, r * 1.3, r * 1.22, 30), HOG.shadow, 0.5);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - r * 0.15, c.y + r * 0.2, r * 0.1, c.x, c.y, r * 1.05);
    g.addColorStop(0, HOG.irisLit);
    g.addColorStop(0.5, HOG.iris);
    g.addColorStop(1, HOG.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.45), pt(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95)], r * 0.035, HOG.irisDeep, 0.45);
    }
    pen.fill(oval(c.x + r * 0.04, c.y + r * 0.02, r * 0.42, r * 0.42, 22), HOG.pupil, 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.45)), HOG.shadow, 0.55);
  });
  pen.stroke(closed(ball), r * 0.13, HOG.line, 1, false);
  pen.dot(c.x - r * 0.34, c.y - r * 0.3, r * 0.17, PAPER_FILL, 1);
  pen.dot(c.x + r * 0.32, c.y + r * 0.38, r * 0.07, PAPER_FILL, 0.6);
}
