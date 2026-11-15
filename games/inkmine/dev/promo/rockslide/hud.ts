import { makeDraw, pt } from '../../../src/art/kit';
import { mix, rgba } from '../../../src/art/paint';
import { PAPER_FILL, RED } from '../../../src/art/palette';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { clamp01, ramp } from '../short';
import { BLOCK, BLOCKS_AT, noiseAt, SHAFT_X, SURFACE_Y } from './story';

/** The noise bar, hand-inked: a wobbly frame with seven notches, red climbing up it. It sits above the giant, left of the shaft. */
export const BAR = { x: 64, y: 330, w: 74, h: 380 } as const;

export function drawNoiseBar(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const noise = noiseAt(t);
  const hot = ramp(noise, 0.72, 0.98);
  const d = makeDraw(ctx, 7900 + boil, boil, 0, PAPER_FILL);
  const { x, y, w, h } = BAR;
  const inner = { x: x + 8, y: y + 8, w: w - 16, h: h - 16 };
  const shape = [pt(x, y), pt(x + w, y + 3), pt(x + w - 2, y + h), pt(x + 2, y + h - 2)];
  ctx.save();
  d.pen.fill(shape, '#160b0b', 0.88);
  const fill = inner.h * noise;
  const g = ctx.createLinearGradient(0, inner.y + inner.h, 0, inner.y);
  g.addColorStop(0, '#f3c64a');
  g.addColorStop(0.55, '#e8772e');
  g.addColorStop(1, RED);
  ctx.fillStyle = g;
  ctx.fillRect(inner.x, inner.y + inner.h - fill, inner.w, fill);
  if (hot > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 22);
    const r = 150 + 60 * pulse;
    const cy = inner.y + inner.h - fill;
    const glow = ctx.createRadialGradient(x + w / 2, cy, 0, x + w / 2, cy, r);
    glow.addColorStop(0, rgba('#ff5a3c', 0.5 * hot));
    glow.addColorStop(1, rgba('#ff5a3c', 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(x + w / 2 - r, cy - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = 1; i < 7; i++) {
    const ny = inner.y + (inner.h * i) / 7;
    d.pen.hair([pt(x + 2, ny), pt(x + w * 0.42, ny + 1)], 3, PAPER_FILL, 0.85);
  }
  for (let i = 0; i < 4; i++) d.pen.stroke([shape[i]!, shape[(i + 1) % 4]!], 6, PAPER_FILL, 1, false);
  ctx.restore();
  drawTextLine(ctx, 'NOISE', x + w / 2 + 8, y - 22, 66, 700, ctx.globalAlpha, hot > 0.5 ? { fill: '#ff8a6a', halo: '#0d1230' } : PAPER_ON_DARK);
}

/** Bits of the block flying off and falling down the shaft, for 1.4 s after it gives. */
export function drawCrumbs(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  BLOCKS_AT.forEach((at, row) => {
    const age = t - at;
    if (age < 0 || age > 1.4) return;
    const rng = createRng(8100 + row);
    const top = SURFACE_Y + row * BLOCK;
    for (let i = 0; i < 16; i++) {
      const vx = (rng() - 0.5) * 140;
      const vy = rng() * 90 + 60;
      const size = 6 + rng() * 14;
      const spin = (rng() - 0.5) * 8;
      ctx.save();
      ctx.translate(SHAFT_X + (rng() - 0.5) * BLOCK * 0.7 + (vx * (1 - Math.exp(-age * 3))) / 3, top + BLOCK * (0.3 + 0.5 * rng()) + vy * age + 700 * age * age);
      ctx.rotate(spin * age);
      ctx.globalAlpha = 1 - clamp01((age - 0.9) / 0.5);
      ctx.fillStyle = mix('#93533d', '#e8c8a8', 0.1 + rng() * 0.25);
      ctx.strokeStyle = '#2a120e';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.5);
      ctx.lineTo(size * 0.4, -size * 0.8);
      ctx.lineTo(size, size * 0.4);
      ctx.lineTo(-size * 0.3, size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
}

/** Each block's noise going out: inked arcs running out from the drill through the rock towards the sleeper. */
export function drawRings(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const d = makeDraw(ctx, 7950 + boil, boil, 0, PAPER_FILL);
  BLOCKS_AT.forEach((at, row) => {
    const age = t - at;
    if (age < 0 || age > 0.8) return;
    const u = age / 0.8;
    const cy = SURFACE_Y + row * BLOCK + BLOCK * 0.7;
    for (const lag of [0, 0.18, 0.36]) {
      const k = u - lag;
      if (k <= 0) continue;
      const r = 90 + 760 * k;
      const arc = Array.from({ length: 18 }, (_, i) => {
        const a = Math.PI * (0.55 + (0.9 * i) / 17);
        return pt(SHAFT_X + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7);
      });
      d.pen.stroke(arc, 8 - 4.5 * k, mix('#f5f0e1', '#ff7a55', (row + 2) / 4), (1 - k) * 0.7, false);
    }
  });
}

export function drawCracks(ctx: CanvasRenderingContext2D, row: number, work: number, boil: number): void {
  if (work <= 0) return;
  const d = makeDraw(ctx, 8000 + row * 11 + boil, boil, 0, '#1c0b0a');
  const rng = createRng(8050 + row);
  const top = SURFACE_Y + row * BLOCK;
  const shown = Math.ceil(work * 7);
  for (let i = 0; i < shown; i++) {
    const a = rng() * Math.PI * 2;
    const c = pt(SHAFT_X, top + 6);
    const b = pt(c.x + Math.cos(a) * 50, c.y + Math.abs(Math.sin(a)) * 100);
    const m = pt((c.x + b.x) / 2 + (rng() - 0.5) * 30, (c.y + b.y) / 2);
    const e = pt(b.x + (rng() - 0.5) * 26, b.y + (rng() - 0.5) * 16);
    d.pen.stroke([c, m, b, e], 3.4, '#1c0b0a', 0.9, false);
  }
}
