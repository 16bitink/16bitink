import { INK, type Pt } from '../../../../src/art/pen';
import { curve, path, softLine, taper } from '../../seal/art/paint';
import type { Body, EyeSpec, Spec } from './painted';

/**
 * The live parts of a painted.ts shark's head: the lower jaw's outline (the
 * part of the body's paint that swings open about the mouth's corner), the
 * open mouth under it, and the eye.
 */

// ---------------------------------------------------------------- the jaw

/** The lower jaw: under the mouth line, from its front back to the corner and down to the belly. */
export function jawShape(s: Spec, b: Body): Pt[] {
  const front = s.mouthLine[0]!;
  const corner = s.mouthLine[s.mouthLine.length - 1]!;
  const under = s.belly.filter((p) => p.x < front.x + 6 && p.x > corner.x).map((p) => ({ x: p.x, y: p.y + 2.5 }));
  return [...s.mouthLine, { x: corner.x, y: b.bottomAt(corner.x) + 2.5 }, ...[...under].reverse(), { x: front.x + 6, y: b.bottomAt(front.x + 6) + 2.5 }];
}

const rotAbout = (p: Pt, c: Pt, a: number): Pt => {
  const [co, si] = [Math.cos(a), Math.sin(a)];
  return { x: c.x + (p.x - c.x) * co - (p.y - c.y) * si, y: c.y + (p.x - c.x) * si + (p.y - c.y) * co };
};

function teethAlong(ctx: CanvasRenderingContext2D, from: readonly Pt[], to: readonly Pt[], s: Spec): void {
  const n = s.teeth.n;
  ctx.fillStyle = s.teeth.colour;
  for (let i = 1; i < n; i++) {
    const j = Math.round((i / n) * (from.length - 1));
    const p = from[j]!;
    const q = to[j]!;
    const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const u = { x: (q.x - p.x) / d, y: (q.y - p.y) / d };
    const h = s.teeth.size * (1 - 0.35 * (i / n));
    const w = h * 0.45;
    ctx.beginPath();
    ctx.moveTo(p.x - u.y * w, p.y + u.x * w);
    ctx.lineTo(p.x + u.x * h, p.y + u.y * h);
    ctx.lineTo(p.x + u.y * w, p.y - u.x * w);
    ctx.fill();
  }
}

/** The open mouth: dark inside, a gum along each jaw, small teeth, under the dropped jaw. */
export function drawGape(ctx: CanvasRenderingContext2D, s: Spec, open: number, lw: number): readonly Pt[] {
  const M = s.mouthLine;
  const corner = M[M.length - 1]!;
  const low = M.map((p) => rotAbout(p, corner, open));
  const fan = [...M, ...[...low].reverse().slice(1)];
  ctx.save();
  path(ctx, fan);
  const g = ctx.createLinearGradient(M[0]!.x, 0, corner.x, 0);
  g.addColorStop(0, '#5a2228');
  g.addColorStop(0.5, '#2c0e12');
  g.addColorStop(1, '#12060a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  softLine(ctx, M, 3, '#b0585c', 0.5);
  softLine(ctx, low, 3, '#b0585c', 0.5);
  teethAlong(ctx, M, low, s);
  teethAlong(ctx, low, M, s);
  ctx.restore();
  taper(ctx, low, 1.6 * lw, 1 * lw, INK, 0.8);
  return low;
}

// ---------------------------------------------------------------- the eye

export function drawEye(ctx: CanvasRenderingContext2D, e: EyeSpec, lw: number): void {
  const { x, y } = e.at;
  const r = e.r;
  const socket = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.1);
  socket.addColorStop(0, 'rgba(0,0,0,0.45)');
  socket.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.08, r, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.1, y + r * 0.35, r * 0.05, x, y, r);
  g.addColorStop(0, e.iris[0]);
  g.addColorStop(0.55, e.iris[1]);
  g.addColorStop(1, e.iris[2]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Fine radial threads in the iris, the pupil, the shade under the lid.
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 0.5 * lw;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.5);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.fillStyle = '#050608';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y, r * e.pupil[0], r * e.pupil[1], 0, 0, Math.PI * 2);
  ctx.fill();
  const lid = ctx.createLinearGradient(0, y - r, 0, y);
  lid.addColorStop(0, 'rgba(0,0,0,0.55)');
  lid.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lid;
  ctx.fillRect(x - r * 1.2, y - r, r * 2.4, r);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.34, y - r * 0.34, r * 0.2, r * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y + r * 0.36, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = e.lid;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.1, y - r * 1.62, r * 1.6, r * 0.9, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.08, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = e.rim;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.08 + 0.9 * lw, r + 0.9 * lw, 0, 0.35, Math.PI - 0.35);
  ctx.stroke();
  ctx.restore();
  const ridge = curve({ x: x - r * 1.7, y: y - r * 1.0 }, { x: x - r * 0.1, y: y - r * 1.5 }, { x: x + r * 1.5, y: y - r * 1.15 }, 10);
  taper(ctx, ridge, 1 * lw, 0.4 * lw, INK, 0.3);
}

