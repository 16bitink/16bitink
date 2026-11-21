import { INK } from '../../../../src/art/pen';

/**
 * "You": a clean flat diver silhouette standing on the sand, 5 ft 9 in
 * (1.75 m) tall at every step, no face. Slate with a pale rim light so it
 * reads on deep blue; a mask strap and a tank as the only details. Placed by
 * the middle of its feet (x, y) and its height in px (head top to sole).
 */

const BODY = '#1f2a3d';
const RIM = '#bcd3ea';
const TANK = '#ffcf33';

/** Its width over its height (for the camera and the "= N YOU" ticks). */
export const YOU_WIDTH = 0.3;

function trace(ctx: CanvasRenderingContext2D, h: number, sway: number): void {
  const u = h / 100;
  ctx.beginPath();
  // Head.
  ctx.moveTo(6.2 * u, -92 * u);
  ctx.arc(0, -92 * u, 6.2 * u, 0, Math.PI * 2);
  // Torso, arms down at its sides, legs apart a little, fins at the feet.
  ctx.moveTo(-4 * u, -85 * u);
  ctx.lineTo(4 * u, -85 * u);
  ctx.quadraticCurveTo(11 * u, -84 * u, 12.5 * u, -78 * u);
  ctx.lineTo(14 * u + sway * u, -50 * u);
  ctx.lineTo(10.5 * u + sway * u, -49 * u);
  ctx.lineTo(9 * u, -70 * u);
  ctx.lineTo(8.5 * u, -46 * u);
  ctx.lineTo(7.5 * u, -6 * u);
  ctx.lineTo(13 * u, 0);
  ctx.lineTo(3 * u, 0);
  ctx.lineTo(1.5 * u, -40 * u);
  ctx.lineTo(-1.5 * u, -40 * u);
  ctx.lineTo(-3 * u, 0);
  ctx.lineTo(-13 * u, 0);
  ctx.lineTo(-7.5 * u, -6 * u);
  ctx.lineTo(-8.5 * u, -46 * u);
  ctx.lineTo(-9 * u, -70 * u);
  ctx.lineTo(-10.5 * u - sway * u, -49 * u);
  ctx.lineTo(-14 * u - sway * u, -50 * u);
  ctx.lineTo(-12.5 * u, -78 * u);
  ctx.quadraticCurveTo(-11 * u, -84 * u, -4 * u, -85 * u);
  ctx.closePath();
}

export function drawYouFigure(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, t: number, alpha = 1): void {
  if (alpha <= 0 || h < 2) return;
  const sway = 0.8 * Math.sin(t * 1.3);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  // Rim light: the same shape, a hair bigger, pale.
  ctx.save();
  ctx.translate(0, -h * 0.004);
  ctx.scale(1.025, 1.012);
  trace(ctx, h, sway);
  ctx.fillStyle = RIM;
  ctx.fill();
  ctx.restore();
  trace(ctx, h, sway);
  ctx.fillStyle = BODY;
  ctx.fill();
  // The tank's yellow edge behind one shoulder, and the mask strap.
  const u = h / 100;
  ctx.fillStyle = TANK;
  ctx.fillRect(9.5 * u, -80 * u, 2.4 * u, 22 * u);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.beginPath();
  ctx.moveTo(-6 * u, -93 * u);
  ctx.lineTo(6 * u, -93 * u);
  ctx.stroke();
  ctx.restore();
}
