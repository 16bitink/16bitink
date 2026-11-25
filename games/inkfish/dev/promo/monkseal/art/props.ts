import { INK, PAPER } from '../../../../src/art/pen';
import { dab, path, smoothLoop, softLine } from '../../seal/art/paint';
import { CAPTION_FONT } from '../../captions';

/** Sunglasses dropping onto the seal's eyes, in head units: `on` 0 above its head .. 1 in place. */
export function glasses(ctx: CanvasRenderingContext2D, on: number, lw: number): void {
  if (on <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, on * 3);
  ctx.translate(0, -38 - (1 - on) * 260);
  ctx.rotate(-0.1 * (1 - on));
  ctx.lineJoin = 'round';
  // The arms round the head, the bridge, the two dark lenses.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(-152, -12);
  ctx.lineTo(-186, -6);
  ctx.moveTo(152, -12);
  ctx.lineTo(186, -6);
  ctx.moveTo(-50, -10);
  ctx.quadraticCurveTo(0, -30, 50, -10);
  ctx.stroke();
  ctx.strokeStyle = '#4a4e58';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-50, -13);
  ctx.quadraticCurveTo(0, -33, 50, -13);
  ctx.stroke();
  for (const s of [-1, 1]) {
    const lens = smoothLoop([{ x: s * 42, y: -30 }, { x: s * 100, y: -40 }, { x: s * 162, y: -30 }, { x: s * 162, y: 14 }, { x: s * 132, y: 48 }, { x: s * 80, y: 50 }, { x: s * 48, y: 20 }], 6);
    path(ctx, lens);
    const g = ctx.createLinearGradient(0, -40, 0, 52);
    g.addColorStop(0, '#0c0f16');
    g.addColorStop(0.6, '#1d2a3c');
    g.addColorStop(1, '#3c5d7c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    softLine(ctx, [{ x: s * 102 - 44, y: 16 }, { x: s * 102 - 8, y: -34 }], 15, '#cfe6f4', 0.8, 5);
    softLine(ctx, [{ x: s * 102 - 14, y: 22 }, { x: s * 102 + 18, y: -24 }], 6, '#cfe6f4', 0.6, 4);
    ctx.restore();
    path(ctx, lens);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(6, 4 * lw);
    ctx.stroke();
  }
  ctx.restore();
}

/** A wooden arrow sign on a nail: `dir` the way it points (radians); `hot` 0 .. 1 turns it red. */
export function sign(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, dir: -1 | 1, tilt: number, colour: string, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width + size * 0.8;
  const h = size * 1.2;
  ctx.lineJoin = 'round';
  // A soft shadow, then the board with a pointed end.
  const board = (dx: number, dy: number): void => {
    ctx.beginPath();
    ctx.moveTo(dx + (-dir * w) / 2, dy - h / 2);
    ctx.lineTo(dx + (dir * w) / 2, dy - h / 2);
    ctx.lineTo(dx + dir * (w / 2 + h * 0.62), dy);
    ctx.lineTo(dx + (dir * w) / 2, dy + h / 2);
    ctx.lineTo(dx + (-dir * w) / 2, dy + h / 2);
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(6,20,30,0.35)';
  board(8, 12);
  ctx.fill();
  board(0, 0);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#e2b878');
  g.addColorStop(0.5, '#c8955a');
  g.addColorStop(1, '#96643a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 7; i++) softLine(ctx, [{ x: -w, y: -h / 2 + i * h * 0.17 + 4 * Math.sin(i * 3) }, { x: 0, y: -h / 2 + i * h * 0.17 }, { x: w, y: -h / 2 + i * h * 0.17 + 5 * Math.sin(i * 5) }], 3, '#6a4020', 0.4, 2);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = colour;
  ctx.fillRect(-w, -h * 0.36, 2 * w, h * 0.72);
  ctx.globalAlpha = 1;
  dab(ctx, -w * 0.3, -h * 0.3, h * 0.6, '255,255,255', 0.25);
  ctx.restore();
  board(0, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = 'rgba(20,14,10,0.75)';
  ctx.lineWidth = size * 0.12;
  ctx.strokeText(text, 0, size * 0.3);
  ctx.fillText(text, 0, size * 0.3);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * (w / 2 - 12), -h * 0.36, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3a40';
    ctx.fill();
  }
  ctx.restore();
}
