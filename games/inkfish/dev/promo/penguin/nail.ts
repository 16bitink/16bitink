import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';

/**
 * "Spines, made like your fingernails": close on the tongue, one spine big,
 * raking back, pale keratin with fine lengthwise ridges like a nail's, a
 * sheen sweeping over it on "fingernails". Painted flat in screen px; no labels.
 */

const W = VIDEO.width;
const H = VIDEO.height;

interface P { readonly x: number; readonly y: number }

function path(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** A cone from a base (centre, half-width, along the surface) to a tip, slightly curved back. */
function coneShape(base: P, half: number, tip: P, bend: number): P[] {
  const n = 18;
  const left: P[] = [];
  const right: P[] = [];
  const ax = { x: tip.x - base.x, y: tip.y - base.y };
  const len = Math.hypot(ax.x, ax.y);
  const nx = -ax.y / len;
  const ny = ax.x / len;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const w = half * Math.pow(1 - s, 0.85);
    const curve = bend * Math.sin(Math.PI * s * 0.9) * len;
    const c = { x: base.x + ax.x * s + nx * curve, y: base.y + ax.y * s + ny * curve };
    left.push({ x: c.x + nx * w, y: c.y + ny * w });
    right.push({ x: c.x - nx * w, y: c.y - ny * w });
  }
  return [...left, ...right.reverse()];
}

/** The flesh of the tongue: warm pink, out of focus at the back, a wet shine, small spines blurred behind. */
function drawTongue(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0b12');
  g.addColorStop(0.35, '#7a2c3a');
  g.addColorStop(0.62, '#c46c78');
  g.addColorStop(1, '#8c3a48');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Blurred rows of spines further back.
  const rng = createRng(31);
  ctx.save();
  ctx.filter = 'blur(9px)';
  for (let row = 0; row < 3; row++) {
    const y = 560 + row * 170;
    const k = 0.45 + row * 0.25;
    for (let i = 0; i < 7; i++) {
      const x = -60 + i * 190 + (row % 2) * 90 + rng() * 40;
      const base = { x, y: y + 120 * k };
      const tip = { x: x - 110 * k, y: y - 120 * k };
      path(ctx, coneShape(base, 34 * k, tip, 0.05));
      ctx.fillStyle = `rgba(236,214,200,${(0.35 + 0.2 * row).toFixed(2)})`;
      ctx.fill();
    }
  }
  ctx.restore();
  // The near surface of the tongue: a mound across the bottom.
  const mound: P[] = [{ x: -40, y: 1180 }, { x: 300, y: 1090 }, { x: 700, y: 1100 }, { x: W + 40, y: 1170 }, { x: W + 40, y: H }, { x: -40, y: H }];
  ctx.beginPath();
  ctx.moveTo(mound[0]!.x, mound[0]!.y);
  ctx.bezierCurveTo(260, 1060, 760, 1060, W + 40, 1170);
  ctx.lineTo(W + 40, H);
  ctx.lineTo(-40, H);
  ctx.closePath();
  const t = ctx.createLinearGradient(0, 1060, 0, 1500);
  t.addColorStop(0, '#e19aa2');
  t.addColorStop(0.4, '#c86f7c');
  t.addColorStop(1, '#6e2532');
  ctx.fillStyle = t;
  ctx.fill();
  ctx.strokeStyle = 'rgba(27,26,31,0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Wet highlights.
  ctx.fillStyle = 'rgba(255,240,240,0.5)';
  for (const [x, y, r] of [[180, 1112, 26], [610, 1092, 18], [860, 1120, 22]] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 2.2, r * 0.45, -0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The hero spine rising from the tongue, raked back (to the left), pale keratin with fine lengthwise lines. */
function drawSpine(ctx: CanvasRenderingContext2D, rise: number, sheen: number): P[] {
  const base = { x: 400, y: 1115 };
  const tip = { x: base.x - 300 * rise, y: base.y - 640 * rise };
  const shape = coneShape(base, 120, tip, 0.06);
  // Its shadow on the tongue, falling back.
  ctx.save();
  ctx.filter = 'blur(12px)';
  ctx.fillStyle = 'rgba(70,14,26,0.45)';
  ctx.beginPath();
  ctx.ellipse(base.x - 120, base.y + 18, 200, 34, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  path(ctx, shape);
  const g = ctx.createLinearGradient(base.x - 130, base.y - 60, base.x + 130, base.y + 20);
  g.addColorStop(0, '#fff8ec');
  g.addColorStop(0.35, '#f1e1cf');
  g.addColorStop(0.75, '#c9a596');
  g.addColorStop(1, '#8f6262');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Fine growth lines along it, like a nail's ridges.
  const rng = createRng(5);
  ctx.strokeStyle = 'rgba(150,110,96,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const f = -0.8 + (i / 8) * 1.6 + (rng() - 0.5) * 0.08;
    ctx.beginPath();
    ctx.moveTo(base.x + f * 110, base.y + 10);
    ctx.quadraticCurveTo(base.x + f * 60 - 150 * rise, base.y - 330 * rise, tip.x, tip.y);
    ctx.stroke();
  }
  // Pink where it grows out of the flesh.
  const root = ctx.createLinearGradient(0, base.y + 10, 0, base.y - 150);
  root.addColorStop(0, 'rgba(206,120,128,0.9)');
  root.addColorStop(1, 'rgba(206,120,128,0)');
  ctx.fillStyle = root;
  ctx.fillRect(base.x - 200, base.y - 160, 400, 200);
  drawSheen(ctx, sheen, 0);
  ctx.restore();
  // The lit edge.
  ctx.strokeStyle = 'rgba(255,253,246,0.85)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(shape[2]!.x + 6, shape[2]!.y);
  ctx.quadraticCurveTo(shape[9]!.x + 6, shape[9]!.y, tip.x + 4, tip.y + 10);
  ctx.stroke();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  return shape;
}

/** A diagonal band of light sweeping left to right across the frame (`u` 0 .. 1), inside the current clip. */
function drawSheen(ctx: CanvasRenderingContext2D, u: number, delay: number): void {
  const k = (u - delay) / (1 - delay);
  if (k <= 0 || k >= 1) return;
  const x = -300 + (W + 600) * k;
  const g = ctx.createLinearGradient(x - 160, 0, x + 160, -140);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,250,${(0.75 * Math.sin(Math.PI * k)).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The whole beat: `rise` the spine coming up (0 .. 1), `sheen` the light running over its keratin. */
export function drawNailBeat(ctx: CanvasRenderingContext2D, rise: number, sheen: number): void {
  drawTongue(ctx);
  drawSpine(ctx, 0.55 + 0.45 * rise, sheen);
}
