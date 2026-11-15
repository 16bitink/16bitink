import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { add, type Camera, NEAR, project, scale, v3, type V3 } from './geo';

/**
 * Everything round the penguin: the sunny ice and sky (its horizon follows
 * the camera), the dark ground of the horror beats, the bird's shadow, the
 * silver fish, fluff, a glint along the bill's smooth edges, and the grade.
 */

const W = VIDEO.width;
const H = VIDEO.height;

export interface Pt { readonly x: number; readonly y: number }

/** Where the horizon sits on screen for a camera (the far ice at eye height, straight ahead). */
function horizonY(cam: Camera): number {
  const flat = v3(cam.fwd.x, 0, cam.fwd.z);
  const l = Math.hypot(flat.x, flat.z) || 1;
  const far = add(cam.eye, scale(v3(flat.x / l, 0, flat.z / l), 1e5));
  const p = project(cam, far);
  return p.z > NEAR ? p.y : -1e4;
}

const ICE_RNG_SEED = 2207;
const BERGS = (() => {
  const rng = createRng(ICE_RNG_SEED);
  return Array.from({ length: 7 }, (_, i) => ({ x: i / 6 + (rng() - 0.5) * 0.1, w: 0.18 + rng() * 0.22, h: 0.02 + rng() * 0.05, tone: rng() }));
})();

/** Sunny Antarctic ice: a pale sky, far icebergs on the horizon, snow running up to it. `dim` 0 .. 1 drains the light. */
export function drawIce(ctx: CanvasRenderingContext2D, cam: Camera, dim: number): void {
  const hy = Math.max(-200, Math.min(H + 200, horizonY(cam)));
  const sky = ctx.createLinearGradient(0, hy - 1400, 0, hy);
  sky.addColorStop(0, '#7fb3dd');
  sky.addColorStop(0.65, '#bcdcf0');
  sky.addColorStop(1, '#eef6f8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, Math.max(0, hy + 2));
  // Far icebergs along the horizon, sliding a little with the camera's heading.
  const pan = (Math.atan2(cam.fwd.x, cam.fwd.z) / Math.PI) * W * 1.5;
  for (const b of BERGS) {
    const x0 = (((b.x * W * 1.6 - pan) % (W * 1.6)) + W * 1.6) % (W * 1.6) - W * 0.3;
    const bw = b.w * W;
    const bh = b.h * H;
    ctx.fillStyle = b.tone < 0.5 ? '#d7e8f1' : '#c4dbe9';
    ctx.beginPath();
    ctx.moveTo(x0, hy + 2);
    ctx.lineTo(x0 + bw * 0.12, hy - bh * 0.8);
    ctx.lineTo(x0 + bw * 0.3, hy - bh);
    ctx.lineTo(x0 + bw * 0.62, hy - bh * 0.92);
    ctx.lineTo(x0 + bw * 0.86, hy - bh * 0.55);
    ctx.lineTo(x0 + bw, hy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,104,132,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,160,190,0.35)';
    ctx.beginPath();
    ctx.moveTo(x0 + bw * 0.62, hy - bh * 0.92);
    ctx.lineTo(x0 + bw * 0.86, hy - bh * 0.55);
    ctx.lineTo(x0 + bw, hy + 2);
    ctx.lineTo(x0 + bw * 0.55, hy + 2);
    ctx.closePath();
    ctx.fill();
  }
  const snow = ctx.createLinearGradient(0, hy, 0, H);
  snow.addColorStop(0, '#e4eef3');
  snow.addColorStop(0.25, '#f7fafa');
  snow.addColorStop(1, '#dce8ef');
  ctx.fillStyle = snow;
  ctx.fillRect(0, Math.max(0, hy), W, H);
  // Soft drifts: long blue shadows across the snow.
  ctx.strokeStyle = 'rgba(130,165,195,0.22)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const y = hy + 30 + i * i * 14;
    if (y > H || y < 0) continue;
    ctx.lineWidth = 2 + i * 0.6;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(W * 0.3, y - 12, W * 0.6, y + 14, W + 20, y - 4);
    ctx.stroke();
  }
  if (dim > 0) {
    ctx.fillStyle = `rgba(6,10,22,${(0.82 * dim).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** The bird's soft blue shadow on the snow, round its feet. */
export function drawShadow(ctx: CanvasRenderingContext2D, cam: Camera, at: V3, alpha: number): void {
  const ring = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return project(cam, add(at, v3(Math.cos(a) * 24 + 8, 0.1, Math.sin(a) * 18 - 6)));
  });
  if (ring.some((p) => p.z < NEAR)) return;
  ctx.save();
  ctx.filter = 'blur(10px)';
  ctx.fillStyle = `rgba(80,115,150,${(0.4 * alpha).toFixed(3)})`;
  ctx.beginPath();
  ring.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The dark ground of the horror beats: a stormy blue lighter behind the bird (so its black shape reads), `red` tints it. */
export function drawDark(ctx: CanvasRenderingContext2D, red: number): void {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, red > 0 ? `rgb(${Math.round(60 + 60 * red)},${Math.round(76 - 40 * red)},${Math.round(98 - 50 * red)})` : '#4c6078');
  g.addColorStop(0.6, red > 0 ? '#1c1418' : '#25324a');
  g.addColorStop(1, '#070a12');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawVignette(ctx: CanvasRenderingContext2D, strength: number): void {
  const g = ctx.createRadialGradient(W / 2, H * 0.47, H * 0.28, W / 2, H * 0.47, H * 0.78);
  g.addColorStop(0, 'rgba(2,3,8,0)');
  g.addColorStop(1, `rgba(2,3,8,${strength.toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A red flash of shock over the frame. */
export function drawRed(ctx: CanvasRenderingContext2D, red: number): void {
  if (red <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(255,${Math.round(255 - 120 * red)},${Math.round(255 - 130 * red)},1)`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The sketchbook paper's grain over everything. */
export function drawGrain(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, alpha: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  ctx.drawImage(paper, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- the fish

/**
 * A small silver fish painted side on along a screen axis from `head` to
 * `tail`, `h` its depth in px: a blue-green back running into a silver flank
 * and a white belly, a lateral line, a forked tail, a dark eye with a
 * catchlight, a fine ink outline. `wriggle` bends it, `t` its phase.
 */
export function drawFish(ctx: CanvasRenderingContext2D, head: Pt, tail: Pt, h: number, wriggle: number, t: number, alpha = 1): void {
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy);
  if (len < 4 || alpha <= 0.01) return;
  const ax = { x: dx / len, y: dy / len };
  // The back faces screen-up.
  let nrm = { x: -ax.y, y: ax.x };
  if (nrm.y > 0) nrm = { x: -nrm.x, y: -nrm.y };
  const n = 22;
  const centre = (s: number): Pt => {
    const sway = wriggle * h * 0.55 * Math.pow(s, 1.6) * Math.sin(t * 22 - s * 5);
    return { x: head.x + dx * s + nrm.x * sway, y: head.y + dy * s + nrm.y * sway };
  };
  const half = (s: number): number => h * 0.5 * (s < 0.18 ? Math.sqrt(s / 0.18) * 0.92 + 0.08 * (s / 0.18) : 1 - 0.78 * Math.pow((s - 0.18) / 0.82, 1.3));
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * 0.88;
    const c = centre(s);
    const hh = half(s);
    top.push({ x: c.x + nrm.x * hh, y: c.y + nrm.y * hh });
    bot.push({ x: c.x - nrm.x * hh * 0.95, y: c.y - nrm.y * hh * 0.95 });
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1, h * 0.045);
  // The forked tail.
  const root = centre(0.86);
  const tip = centre(1);
  const fork = h * 0.42;
  const tailPath = [root, { x: tip.x + nrm.x * fork, y: tip.y + nrm.y * fork }, { x: (root.x + tip.x * 2) / 3, y: (root.y + tip.y * 2) / 3 }, { x: tip.x - nrm.x * fork, y: tip.y - nrm.y * fork }];
  ctx.fillStyle = '#8ea6b4';
  ctx.beginPath();
  tailPath.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  // A small dorsal fin.
  const d0 = centre(0.38);
  const d1 = centre(0.55);
  const dh = half(0.45);
  ctx.fillStyle = '#5f7f8c';
  ctx.beginPath();
  ctx.moveTo(d0.x + nrm.x * dh * 0.9, d0.y + nrm.y * dh * 0.9);
  ctx.lineTo(d0.x + nrm.x * dh * 1.55 + ax.x * h * 0.2, d0.y + nrm.y * dh * 1.55 + ax.y * h * 0.2);
  ctx.lineTo(d1.x + nrm.x * dh * 0.85, d1.y + nrm.y * dh * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The body.
  const body = [...top, ...bot.reverse()];
  ctx.beginPath();
  body.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const mid = centre(0.4);
  const g = ctx.createLinearGradient(mid.x + nrm.x * h * 0.5, mid.y + nrm.y * h * 0.5, mid.x - nrm.x * h * 0.5, mid.y - nrm.y * h * 0.5);
  g.addColorStop(0, '#2f5a6c');
  g.addColorStop(0.32, '#7fa5b5');
  g.addColorStop(0.5, '#dfeaee');
  g.addColorStop(0.75, '#f7fafa');
  g.addColorStop(1, '#c9d6dc');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // A bright silver streak and the lateral line.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = h * 0.08;
  ctx.beginPath();
  for (let i = 2; i <= 18; i++) {
    const c = centre((i / 22) * 0.88);
    const p = { x: c.x + nrm.x * h * 0.04, y: c.y + nrm.y * h * 0.04 };
    if (i === 2) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,70,85,0.45)';
  ctx.lineWidth = Math.max(0.8, h * 0.02);
  ctx.beginPath();
  for (let i = 4; i <= 19; i++) {
    const c = centre((i / 22) * 0.88);
    const p = { x: c.x + nrm.x * h * 0.12, y: c.y + nrm.y * h * 0.12 };
    if (i === 4) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  // The gill cover.
  const gc = centre(0.17);
  ctx.strokeStyle = 'rgba(40,60,70,0.55)';
  ctx.lineWidth = Math.max(0.8, h * 0.03);
  ctx.beginPath();
  ctx.moveTo(gc.x + nrm.x * h * 0.36, gc.y + nrm.y * h * 0.36);
  ctx.quadraticCurveTo(gc.x + ax.x * h * 0.12, gc.y + ax.y * h * 0.12, gc.x - nrm.x * h * 0.32, gc.y - nrm.y * h * 0.32);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 1.2;
  ctx.stroke();
  // The eye.
  const e = centre(0.08);
  const ex = e.x + nrm.x * h * 0.08;
  const ey = e.y + nrm.y * h * 0.08;
  const er = h * 0.11;
  ctx.fillStyle = '#e9eef0';
  ctx.beginPath();
  ctx.arc(ex, ey, er * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0c1014';
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(ex - er * 0.3, ey - er * 0.35, er * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- small effects

/** Soft white tufts of down shaken loose, drifting up round a point, `k` 0 .. 1 through the fluff. */
export function drawFluff(ctx: CanvasRenderingContext2D, at: Pt, size: number, k: number): void {
  if (k <= 0 || k >= 1) return;
  const rng = createRng(77);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const r = size * (0.45 + 0.35 * rng()) + size * 0.5 * k;
    const x = at.x + Math.cos(a) * r;
    const y = at.y + Math.sin(a) * r * 0.9 - size * 0.35 * k;
    const s = size * (0.05 + 0.04 * rng());
    ctx.globalAlpha = Math.sin(Math.PI * k) * 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, s * 0.25);
    for (let j = 0; j < 5; j++) {
      const b = (j / 5) * Math.PI * 2 + k * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(b + 0.6) * s * 0.6, y + Math.sin(b + 0.6) * s * 0.6, x + Math.cos(b) * s, y + Math.sin(b) * s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A bright glint sliding along an edge (screen points), at `u` 0 .. 1 along it, `a` its strength. */
export function drawGlint(ctx: CanvasRenderingContext2D, edge: readonly Pt[], u: number, a: number): void {
  if (a <= 0.01 || edge.length < 2) return;
  const at = Math.max(0, Math.min(edge.length - 1, u * (edge.length - 1)));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, al] of [[22, 0.12], [9, 0.35], [3.5, 0.9]] as const) {
    ctx.strokeStyle = `rgba(255,250,235,${(al * a).toFixed(3)})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    const from = Math.max(0, Math.floor(at - 2));
    const to = Math.min(edge.length - 1, Math.ceil(at + 2));
    for (let i = from; i <= to; i++) (i === from ? ctx.moveTo(edge[i]!.x, edge[i]!.y) : ctx.lineTo(edge[i]!.x, edge[i]!.y));
    ctx.stroke();
  }
  const p = edge[Math.round(at)]!;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70);
  g.addColorStop(0, `rgba(255,255,245,${(0.8 * a).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,255,245,0)');
  ctx.fillStyle = g;
  ctx.fillRect(p.x - 70, p.y - 70, 140, 140);
  ctx.restore();
}
