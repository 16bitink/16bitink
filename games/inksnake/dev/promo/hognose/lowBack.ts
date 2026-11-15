import { createRng } from '../../../src/logic/rng';
import { pt } from '../../../src/art/kit';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { mix, rgba } from '../../../src/art/wash';
import { VIDEO } from '../short';

/**
 * The Pine Barrens from the ground, at a snake's eye level: a pale hazy sky
 * through pitch pines, their trunks soft and far, the scrub oak and
 * huckleberry in low washes along the horizon, then the white sand running
 * up to it, rusty pine needles lying on it (big and sharp near, small and
 * faint far), a cone or two. Painted once for the whole short.
 */
export const HORIZON = 820;

/** How near a ground point at screen y is: 0 at the horizon, 1 at the bottom of the frame. */
export const nearness = (y: number): number => Math.max(0, Math.min(1, (y - HORIZON) / (VIDEO.height - HORIZON)));

function sky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#d3d8c6');
  g.addColorStop(0.55, '#e7e3cb');
  g.addColorStop(1, '#efe5c8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, HORIZON + 20);
}

interface Pine {
  readonly x: number;
  readonly w: number;
  /** 0 far (pale, hazy) .. 1 near (dark, crisp). */
  readonly near: number;
  readonly lean: number;
}

const PINES: readonly Pine[] = [
  { x: 210, w: 16, near: 0, lean: 6 }, { x: 560, w: 14, near: 0, lean: -4 }, { x: 760, w: 18, near: 0.1, lean: 8 },
  { x: 380, w: 26, near: 0.35, lean: -10 }, { x: 900, w: 30, near: 0.4, lean: 12 },
  { x: 40, w: 64, near: 0.85, lean: 18 }, { x: 1050, w: 72, near: 0.9, lean: -14 },
];

/** A pitch pine: the trunk's plated bark, a few dead branch stubs, its crown of needle tufts high up. */
function pine(ctx: CanvasRenderingContext2D, p: Pine, seed: number): void {
  const rng = createRng(seed);
  const pen = new Pen(ctx, seed, 1);
  const bark = mix('#b3aa98', '#4e4236', p.near);
  const a = 0.45 + 0.5 * p.near;
  const bot = HORIZON - 40 + 30 * p.near;
  const shape = [pt(p.x - p.w / 2 - p.lean, -20), pt(p.x + p.w / 2 - p.lean, -20), pt(p.x + p.w / 2 + 4, bot), pt(p.x - p.w / 2 - 4, bot)];
  pen.fill(shape, bark, a);
  pen.clipped(shape, () => {
    // Bark plates: short broken ridges, darker furrows between, warm where the light catches them.
    for (let y = -10; y < bot; y += 10 + rng() * 14) {
      const x = p.x - p.lean * (1 - y / bot) + (rng() - 0.5) * p.w * 0.8;
      pen.hair([pt(x - p.w * 0.3, y), pt(x + p.w * 0.25, y + 3)], 1 + p.near * 2, mix('#857a68', '#2a221b', p.near), a * 0.6);
      if (rng() < 0.4) glaze(ctx, x, y + 6, p.w * 0.25, 5, 0, '#9a6a44', 0.2 * p.near);
    }
    glaze(ctx, p.x - p.w * 0.25, bot * 0.5, p.w * 0.3, bot * 0.5, 0, '#f2ead6', 0.16);
  });
  for (let i = 0; i < 3; i++) {
    const y = 120 + rng() * (HORIZON - 380);
    const side = rng() < 0.5 ? -1 : 1;
    const x = p.x - p.lean * (1 - y / bot) + side * p.w * 0.45;
    pen.hair([pt(x, y), pt(x + side * (14 + 30 * p.near), y - 10 - rng() * 12)], 2 + 3 * p.near, bark, a * 0.9);
  }
}

/** The pines' crowns: dark olive clumps of needle tufts, hazier further off. */
function crowns(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(70001);
  const pen = new Pen(ctx, 70002, 0.8);
  for (let i = 0; i < 70; i++) {
    const cx = rng() * VIDEO.width;
    const cy = rng() * 230 - 30;
    const near = rng();
    glaze(ctx, cx, cy, 60 + 40 * near, 34 + 20 * near, 0, mix('#7d876a', '#3f4a2e', near), 0.35);
    for (let j = 0; j < 14; j++) {
      const a = rng() * Math.PI * 2;
      const l = 20 + rng() * 26;
      const x = cx + (rng() - 0.5) * 90;
      const y = cy + (rng() - 0.5) * 50;
      pen.hair([pt(x, y), pt(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.7)], 1.6, mix('#6f7a5c', '#33402a', near), 0.5);
    }
  }
}

function trunks(ctx: CanvasRenderingContext2D): void {
  PINES.filter((p) => p.near < 0.5).forEach((p, i) => pine(ctx, p, 70011 + i * 13));
}

function nearTrunks(ctx: CanvasRenderingContext2D): void {
  PINES.filter((p) => p.near >= 0.5).forEach((p, i) => pine(ctx, p, 70111 + i * 13));
}

function scrub(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(70021);
  for (let i = 0; i < 40; i++) {
    const x = rng() * VIDEO.width;
    const y = HORIZON - 40 - rng() * 140;
    const r = 70 + rng() * 110;
    glaze(ctx, x, y, r, r * 0.45, 0, rng() < 0.5 ? '#7f8a58' : '#99a06a', 0.3 + rng() * 0.25);
  }
  for (let i = 0; i < 30; i++) glaze(ctx, rng() * VIDEO.width, HORIZON - 70 - rng() * 80, 40 + rng() * 40, 18, 0, '#c4c79a', 0.25);
  // A band of haze where the far sand meets the scrub.
  const h = ctx.createLinearGradient(0, HORIZON - 60, 0, HORIZON + 40);
  h.addColorStop(0, rgba('#efe6cb', 0));
  h.addColorStop(0.6, rgba('#efe6cb', 0.7));
  h.addColorStop(1, rgba('#efe6cb', 0));
  ctx.fillStyle = h;
  ctx.fillRect(0, HORIZON - 60, VIDEO.width, 100);
}

function sand(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, HORIZON, 0, VIDEO.height);
  g.addColorStop(0, '#ebdfbd');
  g.addColorStop(0.35, '#e2d0a2');
  g.addColorStop(1, '#cfb682');
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON - 4, VIDEO.width, VIDEO.height - HORIZON + 4);
  const rng = createRng(70031);
  // Soft dips and drifts, wide and flat with distance.
  for (let i = 0; i < 30; i++) {
    const y = HORIZON + Math.pow(rng(), 1.4) * (VIDEO.height - HORIZON);
    const k = nearness(y);
    glaze(ctx, rng() * VIDEO.width, y, 120 + 260 * k, (12 + 60 * k) * 0.6, 0, rng() < 0.5 ? '#b99d68' : '#f6edd4', 0.18 + 0.12 * rng());
  }
  // The grain: specks of quartz and dark mineral, bigger nearer.
  for (let i = 0; i < 5200; i++) {
    const y = HORIZON + Math.pow(rng(), 0.8) * (VIDEO.height - HORIZON);
    const k = nearness(y);
    ctx.fillStyle = rng() < 0.55 ? rgba('#fffaf0', 0.5) : rgba('#7a6440', 0.35);
    ctx.beginPath();
    ctx.ellipse(rng() * VIDEO.width, y, 0.6 + 2.6 * k * rng(), (0.4 + 1.6 * k * rng()) * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A pair of pitch-pine needles lying on the sand, foreshortened by distance. */
function needle(pen: Pen, x: number, y: number, a: number, k: number, col: string, alpha: number, rng: () => number): void {
  const len = 30 + 150 * k;
  const fy = 0.25 + 0.6 * k;
  const end = (da: number, l: number) => pt(x + Math.cos(a + da) * l, y + Math.sin(a + da) * l * fy);
  const w = 0.8 + 3.2 * k;
  pen.hair([pt(x, y), end(0.02, len * 0.5), end(0.04, len)], w, col, alpha);
  pen.hair([pt(x, y), end(0.12, len * 0.5), end(0.2 + rng() * 0.1, len * 0.94)], w, col, alpha * 0.9);
  if (k > 0.35) pen.hair([pt(x, y + w * 0.5), end(0.03, len)], w * 0.4, '#f4dcb4', alpha * 0.35);
}

function needles(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(70041);
  const pen = new Pen(ctx, 70042, 0.6);
  const cols = ['#9c5228', '#86461f', '#b06a36', '#b58a5a', '#73401f'];
  for (let i = 0; i < 380; i++) {
    const y = HORIZON + 10 + Math.pow(rng(), 0.9) * (VIDEO.height - HORIZON - 10);
    const k = nearness(y);
    const x = rng() * (VIDEO.width + 200) - 100;
    // Each needle's shadow on the sand, then the needle.
    const a = rng() * Math.PI * 2;
    if (k > 0.3) needle(pen, x + 3 * k, y + 4 * k, a, k, '#6e5a3a', 0.18, () => 0.5);
    needle(pen, x, y, a, k, cols[Math.floor(rng() * cols.length)]!, 0.55 + 0.4 * k, rng);
  }
  // A couple of cones, far and middle distance.
  for (const [x, y] of [[180, 960], [900, 900]] as const) {
    const k = nearness(y);
    const r = 14 + 40 * k;
    pen.fill([pt(x - r, y), pt(x - r * 0.6, y - r * 0.8), pt(x + r * 0.8, y - r * 0.7), pt(x + r * 1.3, y - r * 0.1), pt(x + r, y + r * 0.3), pt(x - r * 0.8, y + r * 0.3)], '#7a4a26', 0.85);
    for (let j = 0; j < 6; j++) pen.hair([pt(x - r * 0.8 + j * r * 0.35, y - r * 0.6), pt(x - r * 0.6 + j * r * 0.35, y + r * 0.2)], 1.6, '#3b2414', 0.6);
    glaze(ctx, x + r * 0.3, y + r * 0.45, r * 1.3, r * 0.25, 0, '#5e4a2e', 0.3);
  }
}

export function paintLowBack(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  sky(ctx);
  trunks(ctx);
  crowns(ctx);
  scrub(ctx);
  nearTrunks(ctx);
  sand(ctx);
  needles(ctx);
  return canvas;
}
