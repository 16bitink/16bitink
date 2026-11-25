import type { Pt } from '../sprites';

/** The shadow under the snake: the game's offset and tone, but soft, and following the body's own lower edge along the jaw. */
const OFFSET = { x: 0.23, y: 0.33 } as const;
const TONE = 'rgba(31,38,84,0.36)';
const FAR = 6000;

/** `outline` in screen px; `base` is the body's width there. Only the blurred shadow of the shape lands on screen: the shape itself is drawn far off it. */
export function drawSoftShadow(ctx: CanvasRenderingContext2D, outline: readonly Pt[], base: number): void {
  if (outline.length < 3) return;
  ctx.save();
  ctx.shadowColor = TONE;
  ctx.shadowBlur = base * 0.2;
  ctx.shadowOffsetX = FAR + OFFSET.x * base;
  ctx.shadowOffsetY = OFFSET.y * base;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x - FAR, p.y) : ctx.lineTo(p.x - FAR, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
