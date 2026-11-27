import { INK, RED } from '../../../src/art/palette';
import { Pen, type Pt } from '../../../src/art/pen';
import { clamp01, smooth } from '../short';

/**
 * Hand-inked marks over the picture: the pen ring that circles each thing
 * as it's named, a little heart, the tickle and boing lines, and sparkles.
 * Each boils with the line (`boil` picks its wobble).
 */

/** A loose ring in red pen round (x, y), drawn on as `u` goes 0 → 1, its end overlapping its start as a quick hand does. */
export function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, u: number, alpha: number, boil: number, seed: number): void {
  if (u <= 0 || alpha <= 0) return;
  const turns = 1.12;
  const n = Math.max(2, Math.round(64 * smooth(u)));
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = -2.2 + (i / 63) * Math.PI * 2 * turns;
    const k = 1 + 0.06 * Math.sin(a * 3 + seed) + (i / 63) * 0.08;
    return { x: x + Math.cos(a) * rx * k, y: y + Math.sin(a) * ry * k };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  new Pen(ctx, seed * 13 + boil, 1.6).stroke(pts, 6, RED, 0.9, false);
  ctx.restore();
}

/** A small ink heart, rising and swelling from (x, y) as `u` goes 0 → 1. */
export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, u: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  const grow = smooth(clamp01(u / 0.25));
  const fade = 1 - smooth(clamp01((u - 0.7) / 0.3));
  const s = size * (0.4 + 0.6 * grow);
  const cy = y - 90 * u;
  const heart: Pt[] = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return { x: x + 16 * Math.sin(a) ** 3 * (s / 16), y: cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * (s / 16) };
  });
  ctx.save();
  ctx.globalAlpha = fade;
  const pen = new Pen(ctx, 300 + boil, 1.2);
  pen.fill(heart, '#e0645a', 0.85);
  pen.stroke([...heart, heart[0]!], 4, RED, 0.95, false);
  ctx.restore();
}

/** Short ink flicks round a point: a tickle (or a boing), `alpha` 0..1. */
export function drawFlicks(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, count: number, alpha: number, boil: number, seed: number, from = -Math.PI, to = 0): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const pen = new Pen(ctx, seed * 7 + boil, 1.4);
  for (let i = 0; i < count; i++) {
    const a = from + ((i + 0.5) / count) * (to - from);
    pen.stroke([{ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }, { x: x + Math.cos(a) * r * 1.45, y: y + Math.sin(a) * r * 1.45 }], 5, INK, 0.85, false);
  }
  ctx.restore();
}

/** A four-point sparkle, popping in and out over `u` 0 → 1. */
export function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, u: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  const s = size * Math.sin(u * Math.PI);
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * 0.28;
    pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
  const pen = new Pen(ctx, 500 + boil, 0.8);
  pen.fill(pts, '#fff4b8', 0.95);
  pen.stroke([...pts, pts[0]!], 3, INK, 0.8, false);
}

/** A soft round sand-coloured shadow under something standing on the sand. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(160,130,80,${0.4 * alpha})`);
  g.addColorStop(1, 'rgba(160,130,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** A puff of kicked-up sand. */
export function drawPuff(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e9d6a6';
  for (const [dx, dy, k] of [[0, 0, 1], [-0.6, 0.2, 0.7], [0.55, 0.25, 0.75]] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, r * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
