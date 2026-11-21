import { type Pen, type Pt } from '../../../src/art/pen';
import { smoothLoop } from '../seal/art/paint';
import { dab, path, radialFill, rngOf, rot } from './brush';

/**
 * The things the otter handles, painted like it: the round grey stone, the
 * clam it brings up, mussel shells, and the splash and flying shell chips of
 * the smash (shell only, nothing inside).
 */

const lwOf = (ctx: CanvasRenderingContext2D): number => 1 / Math.hypot(ctx.getTransform().a, ctx.getTransform().b);

/** A smooth round beach stone, grey-blue, speckled, lit from the upper left. */
export function drawStone(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, r: number, angle: number, alpha = 1, seed = 5): void {
  if (alpha <= 0.01) return;
  const lw = lwOf(ctx);
  const rng = rngOf(seed);
  const shape = smoothLoop(Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(a * 2 + seed) + 0.04 * Math.cos(a * 3 + seed);
    return rot({ x: c.x + Math.cos(a) * r * 1.12 * k, y: c.y + Math.sin(a) * r * 0.92 * k }, c, angle);
  }), 5);
  ctx.save();
  ctx.globalAlpha *= alpha;
  radialFill(ctx, shape, { x: c.x - r * 0.35, y: c.y - r * 0.4 }, r * 1.5, [[0, '#d9dcd8'], [0.35, '#9ea4a4'], [0.75, '#666d70'], [1, '#3c4246']]);
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    pen.dot(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.9, (0.6 + rng() * 1.4) * r / 40, rng() < 0.5 ? '#2f3438' : '#e9ebe6', 0.55);
  }
  dab(ctx, c.x + r * 0.2, c.y + r * 0.55, r * 0.7, '20,26,30', 0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(c.x - r * 0.4, c.y - r * 0.45, r * 0.28, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  pen.closed(shape, 3 * lw);
  ctx.restore();
}

/** A clam: a ridged oval shell, tan and cream with growth rings; `crack` splits it into two halves, nudged apart. */
export function drawClam(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, w: number, angle: number, crack = 0): void {
  const lw = lwOf(ctx);
  const h = w * 0.72;
  const half = (side: number): void => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(angle + side * 0.25 * crack);
    ctx.translate(side * w * 0.12 * crack, 0);
    const shell = smoothLoop([
      { x: 0, y: -h * 0.52 }, { x: w * 0.3, y: -h * 0.42 }, { x: w * 0.5, y: -h * 0.05 }, { x: w * 0.42, y: h * 0.3 }, { x: w * 0.15, y: h * 0.48 },
      { x: -w * 0.15, y: h * 0.48 }, { x: -w * 0.42, y: h * 0.3 }, { x: -w * 0.5, y: -h * 0.05 }, { x: -w * 0.3, y: -h * 0.42 },
    ], 6);
    const shape = shell;
    if (crack > 0) {
      // One half: the shell clipped along a jagged crack down its middle.
      const crackLine = Array.from({ length: 7 }, (_, i) => ({ x: (i % 2 ? 6 : -6), y: -h * 0.6 + (h * 1.2 * i) / 6 }));
      const far = side * w;
      path(ctx, [...crackLine, { x: far, y: h * 0.6 }, { x: far, y: -h * 0.6 }]);
      ctx.clip();
    }
    radialFill(ctx, shape, { x: -w * 0.1, y: -h * 0.25 }, w * 0.7, [[0, '#f3e6c8'], [0.5, '#d7bb8e'], [1, '#8f6f4b']]);
    ctx.save();
    path(ctx, shape);
    ctx.clip();
    // Growth rings round the hinge, and fine ribs fanning from it.
    for (let i = 1; i <= 5; i++) {
      const k = i / 5.5;
      ctx.strokeStyle = `rgba(110,80,50,${0.35 + 0.08 * i})`;
      ctx.lineWidth = 2.2 * lw;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.5, w * 0.55 * k, h * 1.0 * k, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    for (let i = -6; i <= 6; i++) pen.hair([{ x: 0, y: -h * 0.5 }, { x: Math.sin(i * 0.2) * w * 0.6, y: -h * 0.5 + Math.cos(i * 0.2) * h * 1.05 }], 1 * lw, '#7b5a3a', 0.25);
    dab(ctx, w * 0.15, h * 0.3, w * 0.4, '70,45,25', 0.25);
    ctx.restore();
    pen.closed(shape, 3 * lw);
    ctx.restore();
  };
  if (crack > 0) {
    // The pale inside showing in the gap: clean shell, no meat.
    dab(ctx, c.x, c.y, w * 0.3 * crack, '250,240,220', 0.8);
    half(-1);
    half(1);
  } else half(0);
}

/** A mussel shell: long, blue-black, with a violet sheen. */
export function drawMussel(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, len: number, angle: number): void {
  const lw = lwOf(ctx);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(angle);
  const w = len * 0.46;
  const shell = smoothLoop([{ x: -len * 0.5, y: 0 }, { x: -len * 0.3, y: -w * 0.42 }, { x: len * 0.2, y: -w * 0.55 }, { x: len * 0.5, y: -w * 0.1 }, { x: len * 0.42, y: w * 0.35 }, { x: 0, y: w * 0.45 }, { x: -len * 0.38, y: w * 0.22 }], 5);
  radialFill(ctx, shell, { x: len * 0.05, y: -w * 0.2 }, len * 0.6, [[0, '#6c6a8e'], [0.4, '#2c2c44'], [1, '#0d0d16']]);
  ctx.save();
  path(ctx, shell);
  ctx.clip();
  for (let i = 1; i <= 3; i++) {
    ctx.strokeStyle = 'rgba(160,160,200,0.25)';
    ctx.lineWidth = 1.6 * lw;
    ctx.beginPath();
    ctx.ellipse(-len * 0.5, 0, len * 0.3 * i, w * 0.22 * i, 0, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.restore();
  pen.closed(shell, 2.4 * lw);
  ctx.restore();
}

/** The smash: water thrown up in a ring of drops and a white burst, `k` 0..1 through it. */
export function drawSplash(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, size: number, k: number): void {
  if (k <= 0 || k >= 1) return;
  const lw = lwOf(ctx);
  const rng = rngOf(303);
  const fade = 1 - k;
  dab(ctx, c.x, c.y, size * (0.3 + 0.6 * k), '255,255,250', 0.5 * fade);
  for (let i = 0; i < 22; i++) {
    const a = rng() * Math.PI * 2;
    const v = 0.5 + rng() * 0.7;
    const d = size * v * (0.2 + 1.2 * k);
    const p = { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d - size * 0.3 * Math.sin(Math.PI * k) * v };
    const r = (5 + rng() * 9) * (1 - 0.5 * k);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#dff3ee';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.3, r, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    pen.circle(p.x, p.y, r, 1.4 * lw, `rgba(20,40,40,${(0.6 * fade).toFixed(3)})`);
  }
}

/** Chips of clam shell flying off the stone, `k` 0..1 through the flight. */
export function drawShellBits(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, size: number, k: number): void {
  if (k <= 0 || k >= 1) return;
  const lw = lwOf(ctx);
  const rng = rngOf(404);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const v = 0.6 + rng() * 0.6;
    const d = size * v * k;
    const p = { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d + size * 0.5 * k * k };
    const r = 8 + rng() * 10;
    const spin = rng() * 6 + k * 8;
    const chip: Pt[] = [0, 2.1, 4.2].map((t) => ({ x: p.x + Math.cos(t + spin) * r, y: p.y + Math.sin(t + spin) * r * 0.8 }));
    ctx.save();
    ctx.globalAlpha = 1 - k * k;
    ctx.fillStyle = rng() < 0.5 ? '#e9d4ac' : '#c7a679';
    path(ctx, chip);
    ctx.fill();
    pen.closed(chip, 1.6 * lw);
    ctx.restore();
  }
}
