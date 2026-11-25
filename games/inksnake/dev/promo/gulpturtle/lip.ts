import { INK } from '../../../src/art/palette';
import type { Pt } from '../sprites';

/**
 * The corner of the mouth round the meal: a concave lip from the lower jaw's
 * line to the upper's, the skin whole behind it, a pink gum edge along it and
 * its shade on the shell going in.
 */

/** A quadratic curve from `a` to `b`, pulled to `c`. */
export function lipCurve(a: Pt, c: Pt, b: Pt, n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  });
}

function stroke(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string, dx = 0, dy = 0): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + dx, p.y + dy) : ctx.lineTo(p.x + dx, p.y + dy)));
  ctx.stroke();
}

/** The shade the lip throws on what goes in past it: drawn before the skin, which covers its back half. */
export function drawLipShade(ctx: CanvasRenderingContext2D, curve: readonly Pt[], zoom: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  for (const w of [130, 100, 74, 50]) stroke(ctx, curve, w * zoom, 'rgba(40,14,12,0.2)');
  ctx.restore();
}

/** The lip itself, over the skin's edge; `fwd` is the unit way out of the mouth. */
export function drawLip(ctx: CanvasRenderingContext2D, curve: readonly Pt[], fwd: Pt, zoom: number, alpha: number): void {
  if (alpha <= 0) return;
  const at = (k: number): readonly [number, number] => [fwd.x * k * zoom, fwd.y * k * zoom];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  // The skin rolls over into the lip: a crease and a lit fold behind it.
  stroke(ctx, curve, 34 * zoom, 'rgba(40,44,12,0.3)', ...at(-16));
  stroke(ctx, curve, 9 * zoom, 'rgba(232,232,170,0.55)', ...at(-20));
  stroke(ctx, curve, 26 * zoom, INK, ...at(0));
  stroke(ctx, curve, 17 * zoom, '#d68f93', ...at(0));
  stroke(ctx, curve, 8 * zoom, '#f0c2b8', ...at(-3));
  ctx.restore();
}
