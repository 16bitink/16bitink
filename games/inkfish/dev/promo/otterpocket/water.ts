import { Pen, type Pt } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { dab, path, rngOf, taper, through } from './brush';

/**
 * Where the otter floats: the sea's surface over a kelp forest seen from a
 * little above (deep kelp green, light glancing off the ripples, kelp fronds
 * and their floats lying on the surface), the rings the body makes, bubbles,
 * and the sea floor where it finds the clam. Everything moves on cycles that
 * divide the loop, so the last frame flows into the first.
 */

const W = VIDEO.width;
const H = VIDEO.height;
const TAU = Math.PI * 2;

/** The deep green of the water, full frame (screen space). */
export function drawSeaBase(ctx: CanvasRenderingContext2D, dim = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2f5e50');
  g.addColorStop(0.5, '#214a40');
  g.addColorStop(1, '#122f2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (dim > 0) {
    ctx.fillStyle = `rgba(6,16,20,${(0.6 * dim).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

interface Glint { readonly x: number; readonly y: number; readonly len: number; readonly phase: number }
const GLINTS: readonly Glint[] = (() => {
  const rng = rngOf(1201);
  return Array.from({ length: 240 }, () => ({ x: -1300 + rng() * 2600, y: -1700 + rng() * 3400, len: 30 + rng() * 70, phase: rng() }));
})();

interface Frond { readonly x: number; readonly y: number; readonly a: number; readonly len: number; readonly phase: number }
const FRONDS: readonly Frond[] = [
  { x: -470, y: -700, a: 0.6, len: 520, phase: 0.1 }, { x: 520, y: -820, a: 2.3, len: 480, phase: 0.5 },
  { x: -560, y: 420, a: -0.4, len: 560, phase: 0.3 }, { x: 560, y: 300, a: 3.6, len: 520, phase: 0.8 },
  { x: -420, y: 1050, a: -0.9, len: 460, phase: 0.6 }, { x: 470, y: 980, a: 4.0, len: 480, phase: 0.2 },
  { x: 60, y: -1050, a: 1.4, len: 420, phase: 0.9 },
];

/** A kelp frond lying on the surface: a stipe with gas floats and long ruffled olive blades. */
function drawFrond(ctx: CanvasRenderingContext2D, pen: Pen, f: Frond, sway: number, lw: number): void {
  const a = f.a + 0.06 * sway;
  const end = { x: f.x + Math.cos(a) * f.len, y: f.y + Math.sin(a) * f.len };
  const mid = { x: (f.x + end.x) / 2 + Math.sin(a) * 40 * sway, y: (f.y + end.y) / 2 - Math.cos(a) * 40 * sway };
  const stipe = through(f, mid, end, 16);
  taper(ctx, stipe, 14, 7, '#5e4a1e', 0.95);
  stipe.forEach((p, i) => {
    if (i % 4 !== 2) return;
    const side = (i / 4) % 2 < 1 ? 1 : -1;
    const next = stipe[Math.min(i + 1, stipe.length - 1)]!;
    const n = Math.atan2(next.y - p.y, next.x - p.x);
    const ba = n + side * 0.45;
    const len = 250;
    // A long ruffled blade, wavy along both edges, a gas float at its root.
    const edge = (k: number): Pt[] => Array.from({ length: 13 }, (_, j) => {
      const u = j / 12;
      const w = 22 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 + 0.25 * Math.sin(u * 22 + sway));
      return { x: p.x + Math.cos(ba) * len * u + Math.cos(ba + 1.57) * w * k, y: p.y + Math.sin(ba) * len * u + Math.sin(ba + 1.57) * w * k };
    });
    const blade = [...edge(1), ...edge(-1).reverse()];
    const tip = { x: p.x + Math.cos(ba) * len, y: p.y + Math.sin(ba) * len };
    const g = ctx.createLinearGradient(p.x, p.y, tip.x, tip.y);
    g.addColorStop(0, 'rgba(104,84,34,0.92)');
    g.addColorStop(1, 'rgba(138,114,48,0.7)');
    path(ctx, blade);
    ctx.fillStyle = g;
    ctx.fill();
    pen.hair(edge(0.15), 1.2 * lw, '#3a2c10', 0.5);
    pen.stroke(blade, 1.8 * lw, '#241c0a', 0.75, false);
    ctx.fillStyle = '#7a6a2c';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 15, 11, ba, 0, TAU);
    ctx.fill();
    dab(ctx, p.x - 4, p.y - 4, 8, '230,220,160', 0.5);
    pen.closed(Array.from({ length: 12 }, (_, j) => ({ x: p.x + Math.cos(ba) * 15 * Math.cos(j * TAU / 12) - Math.sin(ba) * 11 * Math.sin(j * TAU / 12), y: p.y + Math.sin(ba) * 15 * Math.cos(j * TAU / 12) + Math.cos(ba) * 11 * Math.sin(j * TAU / 12) })), 1.6 * lw, '#241c0a');
  });
  pen.stroke(stipe, 2.4 * lw, '#22240c', 0.9, false);
}

/** The surface in world units under the current (camera) transform: glints and kelp, at loop time `t`. */
export function drawSurface(ctx: CanvasRenderingContext2D, t: number, loopS: number, boil: number, kelp = 1): void {
  const lw = 1 / Math.hypot(ctx.getTransform().a, ctx.getTransform().b);
  const pen = new Pen(ctx, 7000 + boil * 977, 0.8 * lw);
  ctx.save();
  ctx.lineCap = 'round';
  for (const g of GLINTS) {
    const ph = (t / (loopS / 3) + g.phase) * TAU;
    const a = 0.12 + 0.12 * Math.sin(ph);
    const dx = 14 * Math.sin(ph * 0.5 + g.x);
    ctx.strokeStyle = `rgba(190,230,214,${a.toFixed(3)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(g.x + dx, g.y);
    ctx.quadraticCurveTo(g.x + dx + g.len / 2, g.y - 9, g.x + dx + g.len, g.y);
    ctx.stroke();
  }
  ctx.restore();
  if (kelp > 0) {
    ctx.save();
    ctx.globalAlpha = kelp;
    for (const f of FRONDS) drawFrond(ctx, pen, f, Math.sin((t / (loopS / 2) + f.phase) * TAU), lw);
    ctx.restore();
  }
}

/** Rings in the water round the floating body (world units), and its soft shadow. */
export function drawRings(ctx: CanvasRenderingContext2D, t: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  dab(ctx, 0, 60, 430, '6,22,20', 0.35);
  for (let i = 0; i < 3; i++) {
    const u = (t / 3 + i / 3) % 1;
    ctx.strokeStyle = `rgba(200,236,222,${(0.35 * (1 - u)).toFixed(3)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 40, 300 + 120 * u, 450 + 120 * u, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** Bubbles rising from a point (screen or world), `k` 0..1 through, seeded. */
export function drawBubbles(ctx: CanvasRenderingContext2D, at: Pt, spread: number, k: number, seed: number, count = 14): void {
  const rng = rngOf(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const delay = rng() * 0.4;
    const u = Math.max(0, Math.min(1, (k - delay) / 0.6));
    const ox = (rng() - 0.5) * spread;
    const r = 6 + rng() * 16;
    if (u <= 0 || u >= 1) continue;
    const p = { x: at.x + ox + 12 * Math.sin(u * 9 + i), y: at.y - u * spread * 1.6 };
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = 'rgba(220,245,240,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.25, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The sea floor seen from above (screen space): sand all over, pebbles, a net of light, the blue-green of the water over it. */
export function drawSeaFloorFromAbove(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = new Pen(ctx, 8100 + boil * 977, 1);
  const g = ctx.createRadialGradient(W * 0.45, H * 0.5, 100, W * 0.45, H * 0.5, H * 0.75);
  g.addColorStop(0, '#9aa482');
  g.addColorStop(0.6, '#6f7c62');
  g.addColorStop(1, '#3e4c42');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const rng = rngOf(5150);
  // Ripples in the sand.
  for (let i = 0; i < 26; i++) {
    const y = 40 + i * 72 + rng() * 20;
    pen.hair(Array.from({ length: 12 }, (_, k) => ({ x: (W * k) / 11, y: y + 10 * Math.sin(k * 0.9 + i) })), 2, '#4f5a46', 0.35);
  }
  for (let i = 0; i < 140; i++) pen.dot(rng() * W, rng() * H, 2 + rng() * 6, rng() < 0.5 ? '#3a4436' : '#d4d6b8', 0.6);
  // A net of light from the waves above, drifting.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const x = (i * 211) % W + 30 * Math.sin(t * 1.4 + i);
    const y = ((i * 367) % H) + 30 * Math.cos(t * 1.1 + i);
    ctx.strokeStyle = 'rgba(200,240,200,0.045)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(x, y, 70 + (i % 3) * 20, 46, i, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // The water between us and the floor.
  ctx.fillStyle = 'rgba(20,70,66,0.38)';
  ctx.fillRect(0, 0, W, H);
}

/** The sea floor (screen space): blue-green light from above, rays, sand and pebbles, dark kelp stems behind. */
export function drawSeaFloor(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = new Pen(ctx, 8100 + boil * 977, 1);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2c6a66');
  g.addColorStop(0.55, '#1b4a4a');
  g.addColorStop(1, '#10302f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Rays slanting down.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 220 + 30 * Math.sin(t * 0.7 + i);
    const ray = ctx.createLinearGradient(x, 0, x + 200, 1300);
    ray.addColorStop(0, 'rgba(150,220,200,0.16)');
    ray.addColorStop(1, 'rgba(150,220,200,0)');
    ctx.fillStyle = ray;
    path(ctx, [{ x: x - 40, y: 0 }, { x: x + 60, y: 0 }, { x: x + 300, y: 1300 }, { x: x + 120, y: 1300 }]);
    ctx.fill();
  }
  ctx.restore();
  // Kelp stems behind, in the blue.
  for (const [x, w] of [[90, 30], [960, 36], [300, 18], [800, 22]] as const) {
    taper(ctx, through({ x, y: H }, { x: x + 40 * Math.sin(t + x), y: H / 2 }, { x: x - 20, y: -50 }, 14), w, w * 0.6, 'rgba(20,52,40,0.85)', 1);
  }
  // The sand.
  const sand: Pt[] = [{ x: 0, y: 960 }, ...Array.from({ length: 13 }, (_, i) => ({ x: (W * i) / 12, y: 950 + 30 * Math.sin(i * 1.3) })), { x: W, y: H }, { x: 0, y: H }];
  const sg = ctx.createLinearGradient(0, 930, 0, H);
  sg.addColorStop(0, '#8f9a78');
  sg.addColorStop(1, '#4e5a48');
  path(ctx, sand);
  ctx.fillStyle = sg;
  ctx.fill();
  pen.stroke(sand.slice(1, 14), 2.5, '#1d2a22', 0.8, false);
  const rng = rngOf(5150);
  for (let i = 0; i < 60; i++) pen.dot(rng() * W, 980 + rng() * 920, 2 + rng() * 5, rng() < 0.5 ? '#3a4436' : '#c4c8a8', 0.6);
  // Caustic light on the sand.
  for (let i = 0; i < 10; i++) dab(ctx, (i * 137 + 60 * Math.sin(t * 1.3 + i)) % W, 1040 + (i % 5) * 170, 80, '210,240,200', 0.12);
}
