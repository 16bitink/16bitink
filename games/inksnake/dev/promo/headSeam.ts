import type { Pt } from './sprites';

/**
 * Joins a side-on head to the neck behind it. The jaw sprites fade out at
 * their backs; the neck has to fill exactly that faded part, its top edge on
 * the line of the skull's top and its bottom on the line of the chin, or the
 * head reads as a separate piece stuck on (a gap of ground above the nape, or
 * a step where the neck's outline starts). The body builders call these to
 * shape the first stretch of neck.
 */

/** A jaw's outer edge as a straight world line. */
export interface JawEdge {
  readonly a: Pt;
  readonly u: Pt;
}

/**
 * The outer edge of a jaw drawn from `hinge` to `tip`: `rise` art units off
 * its hinge line (the art is `artLen` units hinge to tip), on the side `away`
 * points to (the skull's side for the upper jaw, the chin's for the lower).
 */
export function jawEdge(hinge: Pt, tip: Pt, artLen: number, rise: number, away: Pt): JawEdge {
  const dx = tip.x - hinge.x;
  const dy = tip.y - hinge.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len };
  const n0 = { x: -u.y, y: u.x };
  const n = n0.x * away.x + n0.y * away.y >= 0 ? n0 : { x: -n0.x, y: -n0.y };
  const off = (rise * len) / artLen;
  return { a: { x: hinge.x + n.x * off, y: hinge.y + n.y * off }, u };
}

/** How far from `p` along `n` the edge's line lies; null where they run nearly parallel. */
export function edgeDistance(p: Pt, n: Pt, edge: JawEdge): number | null {
  const den = n.x * edge.u.y - n.y * edge.u.x;
  if (Math.abs(den) < 0.2) return null;
  const wx = edge.a.x - p.x;
  const wy = edge.a.y - p.y;
  return (wx * edge.u.y - wy * edge.u.x) / den;
}

/**
 * How much the neck `d` behind the tip keeps to the head's edges: all of it
 * up to `hold` behind the tip (where the jaw art has faded out), then easing
 * off over `ease` to the body's own outline.
 */
export function seamWeight(d: number, hold: number, ease: number): number {
  const w = Math.min(1, Math.max(0, (d - hold) / ease));
  return 1 - w * w * (3 - 2 * w);
}

function halfPlane(ctx: CanvasRenderingContext2D, at: Pt, u: Pt, sign: number): void {
  const big = 6000;
  const n = { x: -u.y * big, y: u.x * big };
  const f = { x: u.x * big * sign, y: u.y * big * sign };
  ctx.beginPath();
  ctx.moveTo(at.x + n.x, at.y + n.y);
  ctx.lineTo(at.x + n.x + f.x, at.y + n.y + f.y);
  ctx.lineTo(at.x - n.x + f.x, at.y - n.y + f.y);
  ctx.lineTo(at.x - n.x, at.y - n.y);
  ctx.closePath();
  ctx.clip();
}

/**
 * Draws a jaw (screen space, hinge to tip) so that its faded back, behind
 * the hinge, only shows inside the neck's outline `neck`: a wide-open jaw
 * otherwise pokes its back out under the throat.
 */
export function drawJawInNeck(ctx: CanvasRenderingContext2D, hinge: Pt, tip: Pt, neck: readonly Pt[], draw: () => void): void {
  const len = Math.hypot(tip.x - hinge.x, tip.y - hinge.y);
  if (len < 1e-6 || neck.length < 3) {
    draw();
    return;
  }
  const u = { x: (tip.x - hinge.x) / len, y: (tip.y - hinge.y) / len };
  // A hair of overlap at the hinge so the two halves meet without a seam.
  const front = { x: hinge.x - u.x * 0.75, y: hinge.y - u.y * 0.75 };
  ctx.save();
  halfPlane(ctx, front, u, 1);
  draw();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  neck.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  halfPlane(ctx, hinge, u, -1);
  draw();
  ctx.restore();
}
