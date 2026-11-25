import { makeCanvas } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { VIDEO } from '../../short';

/** Painted backdrops, each baked once. */
const [W, H] = [VIDEO.width, VIDEO.height];
const baked = new Map<string, HTMLCanvasElement>();

/** A backdrop painted once and kept. */
export function bake(name: string, paint: (ctx: CanvasRenderingContext2D) => void, w: number = W, h: number = H): HTMLCanvasElement {
  const have = baked.get(name);
  if (have) return have;
  const { canvas, ctx } = makeCanvas(w, h);
  paint(ctx);
  baked.set(name, canvas);
  return canvas;
}

export type Stop = readonly [number, string];
export function vertical(ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: readonly Stop[], x = 0, w: number = W): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [a, c] of stops) g.addColorStop(a, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y0, w, y1 - y0);
}

/** A soft round patch of colour. */
export function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rgba: (a: number) => string, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(a));
  g.addColorStop(0.5, rgba(a * 0.55));
  g.addColorStop(1, rgba(0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}
export const tone = (r: number, g: number, b: number) => (a: number): string => `rgba(${r},${g},${b},${a})`;

/** Brush marks: many faint long soft strokes, so a wash is never flat. */
export function strokes(ctx: CanvasRenderingContext2D, seed: number, n: number, box: readonly [number, number, number, number], colours: readonly string[], size: readonly [number, number], alpha: number, slant = 0): void {
  const rng = createRng(seed);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = box[0] + rng() * (box[2] - box[0]);
    const y = box[1] + rng() * (box[3] - box[1]);
    const l = size[0] * (0.4 + rng());
    ctx.globalAlpha = alpha * (0.3 + 0.7 * rng());
    ctx.strokeStyle = colours[Math.floor(rng() * colours.length)]!;
    ctx.lineWidth = size[1] * (0.4 + rng());
    ctx.beginPath();
    ctx.moveTo(x - l / 2, y - slant * l * 0.5);
    ctx.quadraticCurveTo(x, y + (rng() - 0.5) * size[1] * 2, x + l / 2, y + slant * l * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dusk over a road: the horizon at `hy`. */
export function drawDusk(ctx: CanvasRenderingContext2D, hy: number): void {
  const art = bake('dusk', (c) => {
    vertical(c, 0, 1000, [[0, '#0c0d1f'], [0.4, '#231a3c'], [0.68, '#5a2c4c'], [0.86, '#b4563f'], [0.98, '#f0a055'], [1, '#f6b465']]);
    strokes(c, 41, 90, [0, 640, W, 985], ['#f0a860', '#b8584a', '#6a3050', '#3a2046'], [520, 22], 0.1);
    strokes(c, 44, 40, [0, 880, W, 990], ['#ffc880', '#e08850'], [380, 8], 0.16);
    strokes(c, 42, 70, [0, 100, W, 600], ['#3a2850', '#161430'], [500, 26], 0.16);
    // Far woods along the horizon, three ranks: crowns and gaps, not a hedge.
    const rng = createRng(77);
    for (let layer = 0; layer < 3; layer++) {
      const col = ['#6a3448', '#43243f', '#24162e'][layer]!;
      const base = 1004 - (2 - layer) * 3;
      const top = 30 + (2 - layer) * 13;
      const g = c.createLinearGradient(0, base - top * 1.8, 0, base);
      g.addColorStop(0, col);
      g.addColorStop(1, ['#8a4a50', '#5c3448', '#352036'][layer]!);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-20, base + 6);
      for (let x = -20; x <= W + 20; x += 4) {
        const swell = 0.55 + 0.3 * Math.sin(x * 0.011 + layer * 2.1) + 0.2 * Math.sin(x * 0.031 + layer * 4.7);
        c.lineTo(x, base - top * Math.max(0.2, swell) - rng() * 5 - 5 * Math.abs(Math.sin(x * 0.09 + layer)));
      }
      c.lineTo(W + 20, base + 6);
      c.fill();
    }
    // The road.
    vertical(c, 1000, 1000 + H, [[0, '#80586a'], [0.06, '#665068'], [0.25, '#574a62'], [0.6, '#443a4e'], [1, '#2c2632']]);
    strokes(c, 43, 500, [0, 1004, W, 2400], ['#86687a', '#3a2a36', '#6a5060'], [160, 5], 0.16);
    blob(c, 620, 1030, 900, 120, tone(240, 150, 90), 0.28);
    const r2 = createRng(9);
    for (let i = 0; i < 1500; i++) {
      const y = 1010 + r2() ** 1.5 * 1100;
      c.fillStyle = r2() > 0.5 ? 'rgba(150,120,120,0.16)' : 'rgba(0,0,0,0.3)';
      const s = 1 + ((y - 1000) / 1000) * 4 * r2();
      c.fillRect(r2() * W, y, s * 1.6, s);
    }
  }, W, 2600);
  ctx.drawImage(art, 0, hy - 1000);
}

/** A dark frame round the picture. */
export function vignette(ctx: CanvasRenderingContext2D, a: number): void {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, 420, W / 2, H * 0.46, 1180);
  g.addColorStop(0, 'rgba(4,3,8,0)');
  g.addColorStop(1, `rgba(4,3,8,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
