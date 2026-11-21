import { SNAKE_W } from '../../../src/art/types';
import type { BodyPose, Pt, Strip } from '../sprites';

/**
 * The cobra's body over the swallowed python, adapted from the eel short's
 * (gulpmoray/body.ts): laid as the game lays it (sprites.ts drawBody, the
 * strip in thin slices along the spine), but where the python stretches the
 * skin, the pale chevron bands keep their length and the olive skin between
 * them stretches, paler, so the chevrons spread apart over the lump.
 */

/** The game's cobra bands (jungleSnakeCobra.ts): four a period of 120, each chevron from about 12 to 26 into its 30. */
const STEP = 30;
const BAND = [11, 27] as const;
const inBand = (u: number): boolean => {
  const p = ((u % STEP) + STEP) % STEP;
  return p > BAND[0] && p < BAND[1];
};

const EDGE_INSET = 0.3 / SNAKE_W;
/** The stretched skin's pale olive-cream. */
const STRETCHED = '#d8cf9c';

function outline(b: BodyPose): Pt[] {
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

/** `stretch[i]` ≥ 1: how much the skin between the bands is stretched at spine point i. */
export function drawStretchedBody(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, b: BodyPose, stretch: readonly number[]): void {
  const n = b.spine.length;
  if (n < 2) return;
  const tex = strip.frames[((boil % strip.frames.length) + strip.frames.length) % strip.frames.length]!;
  const res = strip.res;
  ctx.save();
  ctx.beginPath();
  outline(b).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
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
    // The bands keep their length; the skin between them takes the stretch.
    const rate = gap ? s * s : 1 + (s - 1) * 0.15;
    const du = len / b.along / rate;
    const [bx, by] = [(c.x - a.x) / len, (c.y - a.y) / len];
    const across = (b.widths[i]! + b.widths[i + 1]!) / 2 / SNAKE_W;
    const u0 = ((u % strip.period) + strip.period) % strip.period;
    const along = len / du;
    const over = 0.9 / b.along;
    ctx.setTransform(base);
    ctx.transform(bx * along, by * along, by * across, -bx * across, a.x, a.y);
    ctx.drawImage(tex, u0 * res, 0, (du + over) * res, SNAKE_W * res, 0, -SNAKE_W / 2, du + over, SNAKE_W);
    if (gap && s > 1.02) {
      // Stretched thin, the skin shows paler between the scales.
      ctx.globalAlpha = Math.min(0.5, 1.1 * (s - 1));
      ctx.fillStyle = STRETCHED;
      ctx.fillRect(0, -SNAKE_W / 2 + 2.5, du + over, SNAKE_W - 5);
      ctx.globalAlpha = 1;
    }
    u += du;
  }
  ctx.restore();
}
