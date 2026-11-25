import { VIDEO } from '../short';
import { pt, type Pt, rngOf, soft } from './paint';

/** Dust, impact stars, speed streaks, the dashed measure, light: small painted effects shared by the shots. */

/** A ring of dust thrown out along the ground at `at`, `k` 0 just hit .. 1 gone. */
export function dustRing(ctx: CanvasRenderingContext2D, at: Pt, k: number, size: number, seed: number): void {
  if (k <= 0 || k >= 1) return;
  const rng = rngOf(seed);
  const spread = Math.sqrt(k);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.3;
    const d = size * (0.35 + 0.85 * spread) * (0.8 + rng() * 0.4);
    const r = size * (0.13 + rng() * 0.15) * (0.5 + 0.9 * k);
    const x = at.x + Math.cos(a) * d * 1.25;
    const y = at.y + Math.sin(a) * d * 0.24 - r * 0.6 - size * 0.25 * k * rng();
    soft(ctx, x, y, r * 1.3, r, 0, i % 3 ? '#e6b27c' : '#fff0cf', 0.62 * (1 - k) ** 1.3);
    soft(ctx, x + r * 0.2, y + r * 0.35, r, r * 0.6, 0, '#9a5f38', 0.28 * (1 - k) ** 1.3);
  }
  // Pebbles flung up.
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * (0.1 + rng() * 0.8);
    const v = size * (0.8 + rng() * 1.3);
    const x = at.x + Math.cos(a) * v * spread;
    const y = at.y + Math.sin(a) * v * spread + size * 1.5 * k * k;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = i % 2 ? '#7c5238' : '#c99566';
    ctx.beginPath();
    ctx.ellipse(x, y, 7 + rng() * 6, 5 + rng() * 4, rng() * 3, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The hit: spiked burst and little stars thrown out, `k` its strength. */
export function impact(ctx: CanvasRenderingContext2D, at: Pt, k: number, size: number): void {
  if (k <= 0) return;
  const star = (x: number, y: number, r: number, n: number, inner: number, turn: number, fill: string): void => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 + turn;
      const q = i % 2 ? r * inner : r * (n > 6 ? 0.82 + 0.18 * Math.sin(i * 2.3) : 1);
      ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.86);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = Math.max(4, r * 0.05);
    ctx.strokeStyle = '#1a120c';
    ctx.lineJoin = 'miter';
    ctx.stroke();
  };
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.5);
  star(at.x, at.y, size * (0.75 + 0.25 * k), 11, 0.5, 0.2, '#fff4d2');
  star(at.x, at.y, size * 0.5 * (0.75 + 0.25 * k), 11, 0.5, 0.5, '#ffc95a');
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * (0.08 + 0.21 * i);
    const d = size * (1.1 + 0.7 * (1 - k));
    star(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.8, size * 0.2, 5, 0.42, a + (1 - k) * 2, '#ffd773');
  }
  ctx.restore();
}

/** Speed streaks across the frame, `k` their strength, `t` running them. */
export function streaks(ctx: CanvasRenderingContext2D, k: number, t: number, y0: number, y1: number): void {
  if (k <= 0) return;
  const rng = rngOf(77);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const y = y0 + (y1 - y0) * rng();
    const len = 180 + rng() * 420;
    const span = VIDEO.width + len * 2;
    const x = VIDEO.width + len - ((rng() * span + t * (2600 + rng() * 900)) % span);
    const g = ctx.createLinearGradient(x, 0, x + len, 0);
    g.addColorStop(0, 'rgba(255,248,228,0.95)');
    g.addColorStop(1, 'rgba(255,248,228,0)');
    ctx.strokeStyle = g;
    ctx.globalAlpha = k * (0.25 + rng() * 0.5);
    ctx.lineWidth = 3 + rng() * 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** A dashed double-headed ink arrow from a to b, `k` of it drawn. */
export function measure(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, k: number): void {
  if (k <= 0.02) return;
  const e = pt(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
  const dir = Math.atan2(b.y - a.y, b.x - a.x);
  const barb = (p: Pt, d: number): Pt[] => [pt(p.x + Math.cos(d + 2.55) * 44, p.y + Math.sin(d + 2.55) * 44), p, pt(p.x + Math.cos(d - 2.55) * 44, p.y + Math.sin(d - 2.55) * 44)];
  const line = (pts: readonly Pt[]): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, c] of [[22, '#fff6e4'], [10, '#b3322b']] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.setLineDash([30, 24]);
    line([a, e]);
    ctx.setLineDash([]);
    line(barb(a, dir + Math.PI));
    line(barb(e, dir));
  }
  ctx.restore();
}

/** A light laid over the whole frame (soft light). */
export function wash(ctx: CanvasRenderingContext2D, colour: string, alpha: number, mode: GlobalCompositeOperation = 'soft-light'): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function vignette(ctx: CanvasRenderingContext2D, alpha: number): void {
  const v = ctx.createRadialGradient(VIDEO.width / 2, 1000, 480, VIDEO.width / 2, 1000, 1260);
  v.addColorStop(0, 'rgba(40,14,4,0)');
  v.addColorStop(1, `rgba(40,14,4,${alpha})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
