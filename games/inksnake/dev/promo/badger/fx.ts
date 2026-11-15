import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import type { Pt } from '../sprites';

/**
 * Small painted effects shared by the shots: a dust puff, the white star of
 * a hit, a "!" over a head, the colour draining out of a frame, and the
 * light running to evening.
 */

/** A puff of red dust at `at`, `k` 0 (just kicked up) .. 1 (spread and gone). */
export function dust(ctx: CanvasRenderingContext2D, at: Pt, k: number, size: number, seed: number): void {
  if (k <= 0 || k >= 1) return;
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + rng() * Math.PI;
    const d = size * (0.3 + rng() * 0.9) * (0.3 + 0.7 * Math.sqrt(k));
    const r = size * (0.18 + rng() * 0.2) * (0.6 + k);
    ctx.globalAlpha = 0.38 * (1 - k) ** 1.6;
    ctx.fillStyle = i % 3 === 0 ? '#f2c08a' : '#d98c56';
    ctx.beginPath();
    ctx.ellipse(at.x + Math.cos(a) * d * 1.4, at.y + Math.sin(a) * d * 0.5, r * 1.2, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The hit: a jagged white star with an ink edge and a few speed lines, `k` its strength. */
export function hitStar(ctx: CanvasRenderingContext2D, at: Pt, k: number, size: number): void {
  if (k <= 0) return;
  const n = 9;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.4);
  ctx.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + 0.2;
    const r = (i % 2 === 0 ? size : size * 0.45) * (0.7 + 0.3 * k);
    const x = at.x + Math.cos(a) * r;
    const y = at.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#fff6dc';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#1a110a';
  ctx.lineJoin = 'miter';
  ctx.stroke();
  ctx.restore();
}

/** A hand-lettered "!" over a head, popping in. */
export function bang(ctx: CanvasRenderingContext2D, at: Pt, k: number): void {
  if (k <= 0) return;
  const pop = 1 + 0.35 * Math.max(0, 1 - k * 3);
  drawTextLine(ctx, '!', at.x, at.y, 150 * pop, 700, Math.min(1, k * 4), { fill: '#ffd27a', halo: '#1a110a' });
}

/** Drains the colour out of what is drawn so far (0 none .. 1 grey), darkening it a little. */
export function drain(ctx: CanvasRenderingContext2D, k: number): void {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.globalAlpha = 0.85 * k;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.35 * k;
  ctx.fillStyle = '#6a6a78';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** Evening light over the animals (0 day .. 1 dusk): cooler, darker, a warm rim from the low sun. */
export function evening(ctx: CanvasRenderingContext2D, k: number): void {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.5 * k;
  ctx.fillStyle = '#7d6a8a';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** A red pulse round the edges for danger (0 .. 1). */
export function dangerVignette(ctx: CanvasRenderingContext2D, k: number): void {
  if (k <= 0) return;
  const v = ctx.createRadialGradient(VIDEO.width / 2, 1050, 380, VIDEO.width / 2, 1050, 1250);
  v.addColorStop(0, 'rgba(120,10,6,0)');
  v.addColorStop(1, `rgba(120,10,6,${0.55 * k})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** A soft dark vignette, as every shot has. */
export function vignette(ctx: CanvasRenderingContext2D, alpha = 0.45, cy = 1080): void {
  const v = ctx.createRadialGradient(VIDEO.width / 2, cy, 440, VIDEO.width / 2, cy, 1280);
  v.addColorStop(0, 'rgba(30,10,4,0)');
  v.addColorStop(1, `rgba(30,10,4,${alpha})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
