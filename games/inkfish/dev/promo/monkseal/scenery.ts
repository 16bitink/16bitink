import { blob, hash } from '../alvin/art/draw';
import { VIDEO } from '../short';
import { LOOP_S } from './words';

/**
 * A pale sandy beach in the northwestern Hawaiian Islands: a soft sky, a hazy
 * volcanic ridge far off, turquoise shallows over a reef, a lapping line of
 * foam, warm sand with ripples and shells. Every moving thing repeats with
 * the loop.
 */

const W = VIDEO.width;
const H = VIDEO.height;
const TAU = Math.PI * 2;
/** A wave with a whole number of cycles in the loop. */
const cyc = (t: number, n: number, phase = 0): number => Math.sin((TAU * n * t) / LOOP_S + phase);

export interface Beach {
  /** Where the sky meets the sea, and where the sea meets the sand. */
  readonly horizon: number;
  readonly shore: number;
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, seed: number): void {
  for (let i = 0; i < 12; i++) {
    const a = hash(seed + i * 3.3);
    const b = hash(seed + i * 5.9);
    blob(ctx, x + (a - 0.5) * 340 * s, y - b * 60 * s * (1 - Math.abs(a - 0.5) * 1.7), (80 + 70 * b) * s, (34 + 26 * a) * s, 0, '255,253,246', 0.5);
  }
  blob(ctx, x, y + 26 * s, 220 * s, 22 * s, 0, '176,196,214', 0.35);
}

/** A far island: a soft volcanic profile fading down into the haze over the sea. */
function ridge(ctx: CanvasRenderingContext2D, horizon: number, h: number, rgb: string, x0: number, x1: number, peak: number, seed: number): void {
  const top = (x: number): number => {
    const u = (x - x0) / (x1 - x0);
    const rise = u < peak ? (u / peak) ** 1.7 : ((1 - u) / (1 - peak)) ** 1.35;
    return horizon - h * rise * (1 + 0.05 * Math.sin(u * 31 + seed) + 0.03 * Math.sin(u * 73 + seed * 2)) - 3;
  };
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, horizon + 2);
  for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, top(x));
  ctx.lineTo(x1, horizon + 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, horizon - h, 0, horizon);
  g.addColorStop(0, `rgba(${rgb},0.85)`);
  g.addColorStop(1, 'rgba(206,228,226,0.75)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Its slopes, lit from the left.
  for (let i = 0; i < 14; i++) {
    const u = (i + hash(seed + i)) / 14;
    const x = x0 + (x1 - x0) * u;
    blob(ctx, x, (top(x) + horizon) / 2, 26 + 20 * hash(i), h * 0.4, 0.5 * (u - peak), i % 2 ? '70,110,128' : '240,248,236', 0.22);
  }
  ctx.restore();
}

export function drawBeach(ctx: CanvasRenderingContext2D, t: number, b: Beach): void {
  const sky = ctx.createLinearGradient(0, 0, 0, b.horizon);
  sky.addColorStop(0, '#5fb0dd');
  sky.addColorStop(0.6, '#a6d8ea');
  sky.addColorStop(1, '#e8f3e4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, b.horizon + 2);
  const drift = 10 * cyc(t, 1);
  cloud(ctx, 210 + drift, b.horizon - 250, 1.1, 3);
  cloud(ctx, 890 + drift * 0.7, b.horizon - 180, 0.9, 17);
  cloud(ctx, 560 + drift * 0.5, b.horizon - 430, 1.2, 29);
  ridge(ctx, b.horizon, 150, '128,166,186', 420, 1500, 0.52, 2.2);
  ridge(ctx, b.horizon, 84, '112,154,164', -420, 460, 0.45, 5.1);

  const sea = ctx.createLinearGradient(0, b.horizon, 0, b.shore + 20);
  sea.addColorStop(0, '#1f7fae');
  sea.addColorStop(0.25, '#2aa3c0');
  sea.addColorStop(0.62, '#4fcac8');
  sea.addColorStop(1, '#b9ecd8');
  ctx.fillStyle = sea;
  ctx.fillRect(0, b.horizon, W, b.shore - b.horizon + 40);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, b.horizon, W, b.shore - b.horizon + 40);
  ctx.clip();
  // The reef under it: darker patches; the glitter over it.
  for (let i = 0; i < 16; i++) {
    const u = hash(i * 3.7);
    const y = b.horizon + (b.shore - b.horizon) * (0.15 + 0.6 * u);
    blob(ctx, hash(i * 9.1) * W, y, 120 + 160 * hash(i), 6 + 16 * u, 0, '18,96,122', 0.3);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 80; i++) {
    const u = hash(i * 5.3);
    const y = b.horizon + (b.shore - b.horizon) * u * u;
    const a = 0.16 + 0.34 * (0.5 + 0.5 * cyc(t, 7 + (i % 5), i));
    const len = (16 + 70 * hash(i * 2.2)) * (0.35 + u);
    const x = hash(i * 8.8) * W + 10 * cyc(t, 3, i);
    ctx.strokeStyle = `rgba(246,255,250,${a})`;
    ctx.lineWidth = 1.4 + 3.2 * u;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x, y - 2 - 3 * u, x + len / 2, y);
    ctx.stroke();
  }
  ctx.restore();
  sand(ctx, t, b);
}

function sand(ctx: CanvasRenderingContext2D, t: number, b: Beach): void {
  const lap = 9 * cyc(t, 6);
  const edge = (x: number, k: number): number => b.shore + lap * k + 10 * Math.sin(x * 0.006 + 1) + 6 * Math.sin(x * 0.017 + 2) + 3 * Math.sin(x * 0.041);
  const fillFrom = (k: number, dy: number, style: string | CanvasGradient): void => {
    ctx.beginPath();
    ctx.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 14) ctx.lineTo(x, edge(x, k) + dy);
    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  };
  const g = ctx.createLinearGradient(0, b.shore, 0, H);
  g.addColorStop(0, '#d8bd8a');
  g.addColorStop(0.08, '#ecd9ab');
  g.addColorStop(0.4, '#f3e4bd');
  g.addColorStop(1, '#d9bd84');
  fillFrom(0, 0, g);
  // Wet sand, then the lapping foam.
  const wet = ctx.createLinearGradient(0, b.shore, 0, b.shore + 70);
  wet.addColorStop(0, 'rgba(150,140,110,0.55)');
  wet.addColorStop(1, 'rgba(150,140,110,0)');
  fillFrom(0, -2, wet);
  ctx.lineCap = 'round';
  for (const [dy, w, a] of [[-4, 16, 0.4], [-2, 7, 0.95], [-26, 5, 0.45]] as const) {
    ctx.strokeStyle = `rgba(255,255,252,${a})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 10) ctx.lineTo(x, edge(x, 1) + dy + 3 * Math.sin(x * 0.09 + dy));
    ctx.stroke();
  }
  // Ripples in the sand, grains, a few shells and a coral twig.
  for (let i = 0; i < 46; i++) {
    const u = hash(i * 4.4);
    const y = b.shore + 60 + (H - b.shore - 60) * u;
    const x = hash(i * 7.1) * W;
    const len = 60 + 170 * u;
    for (const [dy, c, a] of [[0, '120,86,40', 0.16], [6, '255,250,226', 0.4]] as const) {
      ctx.strokeStyle = `rgba(${c},${a})`;
      ctx.lineWidth = 4 + 4 * u;
      ctx.beginPath();
      ctx.moveTo(x - len, y + dy);
      ctx.quadraticCurveTo(x - len / 3, y + dy - 12, x, y + dy);
      ctx.quadraticCurveTo(x + len / 3, y + dy + 10, x + len, y + dy - 2);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 360; i++) {
    const u = hash(i * 1.9 + 40);
    ctx.fillStyle = hash(i * 3.1) < 0.55 ? 'rgba(112,80,40,0.3)' : 'rgba(255,252,236,0.6)';
    ctx.fillRect(hash(i * 2.3 + 9) * W, b.shore + 30 + (H - b.shore) * u, 2 + 2.6 * u, 2 + 2 * u);
  }
  for (const [x, dy, s, r] of [[120, 250, 1, 0.3], [980, 180, 0.8, -0.5], [930, 830, 1.5, 0.7], [90, 900, 1.3, -0.2]] as const) shell(ctx, x, b.shore + dy, s, r);
}

function shell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number): void {
  blob(ctx, x + 6, y + 12 * s, 34 * s, 9 * s, 0, '80,54,20', 0.4);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.bezierCurveTo(-34, 8, -30, -20, 0, -22);
  ctx.bezierCurveTo(30, -20, 34, 8, 0, 14);
  ctx.closePath();
  const g = ctx.createRadialGradient(-6, -12, 2, 0, -2, 30);
  g.addColorStop(0, '#fff6ea');
  g.addColorStop(0.7, '#eab79a');
  g.addColorStop(1, '#b87f66');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,34,24,0.8)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.quadraticCurveTo(i * 5, -2, i * 7, -18 + Math.abs(i) * 2.4);
    ctx.globalAlpha = 0.4;
    ctx.stroke();
  }
  ctx.restore();
}
