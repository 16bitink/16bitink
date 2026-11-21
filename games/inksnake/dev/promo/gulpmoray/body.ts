import { KRAIT_PAINT } from '../../../src/art/chapters/reefSnakePaint';
import { SNAKE_W } from '../../../src/art/types';
import type { BodyPose, Pt, Strip } from '../sprites';

/**
 * The krait's body laid as the game lays it (sprites.ts drawBody: the strip
 * in thin slices along the spine, stretched across to the width there), but
 * where a meal stretches the skin the black rings keep their length and
 * the silver skin between them stretches, paler, so the rings spread apart
 * over the lump, the way a real snake's skin does over a big meal.
 */

/** Where the rings sit in the strip: band i is centred at i·24 + 12, about 11 strip units wide. */
const STEP = 24;
const BAND = [6.2, 17.8] as const;
const inBand = (u: number): boolean => {
  const p = ((u % STEP) + STEP) % STEP;
  return p > BAND[0] && p < BAND[1];
};

const EDGE_INSET = 0.3 / SNAKE_W;

function edges(b: BodyPose): Pt[] {
  const n = b.spine.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = b.spine[Math.max(0, i - 1)]!;
    const c = b.spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const [nx, ny] = [-(a.y - c.y) / len, (a.x - c.x) / len];
    const half = (b.widths[i]! / 2) * (1 - 2 * EDGE_INSET);
    const p = b.spine[i]!;
    left.push({ x: p.x + nx * half, y: p.y + ny * half });
    right.push({ x: p.x - nx * half, y: p.y - ny * half });
  }
  return [...left, ...right.reverse()];
}

/** `stretch[i]` ≥ 1: how much the skin between the rings is stretched at spine point i. */
export function drawStretchedBody(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, b: BodyPose, stretch: readonly number[]): void {
  const n = b.spine.length;
  if (n < 2) return;
  const tex = strip.frames[((boil % strip.frames.length) + strip.frames.length) % strip.frames.length]!;
  const res = strip.res;
  ctx.save();
  ctx.beginPath();
  edges(b).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const base = ctx.getTransform();
  let u = b.offset ?? 0;
  for (let i = 0; i + 1 < n; i++) {
    const a = b.spine[i]!;
    const c = b.spine[i + 1]!;
    const len = Math.hypot(c.x - a.x, c.y - a.y);
    if (len < 1e-6) continue;
    const s = Math.max(1, (stretch[i]! + stretch[i + 1]!) / 2);
    const gap = !inBand(u);
    // Rings keep their length; the skin between them takes the stretch.
    const rate = gap ? s : 1 + (s - 1) * 0.15;
    const du = len / b.along / rate;
    const [bx, by] = [(c.x - a.x) / len, (c.y - a.y) / len];
    const across = (b.widths[i]! + b.widths[i + 1]!) / 2 / SNAKE_W;
    const u0 = ((u % strip.period) + strip.period) % strip.period;
    const along = len / du;
    ctx.setTransform(base);
    ctx.transform(bx * along, by * along, by * across, -bx * across, a.x, a.y);
    ctx.drawImage(tex, u0 * res, 0, (du + 0.9 / b.along) * res, SNAKE_W * res, 0, -SNAKE_W / 2, du + 0.9 / b.along, SNAKE_W);
    if (gap && s > 1.02) {
      // Stretched thin, the skin shows paler between the scales.
      ctx.globalAlpha = Math.min(0.55, 0.45 * (s - 1));
      ctx.fillStyle = KRAIT_PAINT.silver;
      ctx.fillRect(0, -SNAKE_W / 2 + 2, du + 0.9 / b.along, SNAKE_W - 4);
      ctx.globalAlpha = 1;
    }
    u += du;
  }
  ctx.restore();
}
