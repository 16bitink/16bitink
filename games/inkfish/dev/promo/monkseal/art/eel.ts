import { INK, type Pt } from '../../../../src/art/pen';
import { dab, path, smoothLoop, softLine } from '../../seal/art/paint';

/**
 * A spotted eel: pale cream with round brown spots, a soft fin fringe, as
 * thick along its length as `width`, tapering to the tail over its last
 * third. Drawn along any spine (the first point is the head end, usually up a
 * nose; the last is the tail's tip), painted live: a wash laid across the
 * body, spots that ride its surface, a thin ink outline.
 */

export interface EelOpts {
  /** Full width of the body, in the spine's units. */
  readonly width: number;
  /** Draw the head at the first point (otherwise it is cut square: hidden in a nostril). */
  readonly head?: boolean;
  /** The far end is out of sight (in a mouth or a nostril): no taper to a tail. */
  readonly cut?: boolean;
  /** 0 calm .. 1 alarmed: the eye's size and the mouth. */
  readonly alarm?: number;
  /** Ink width in the spine's units. */
  readonly ink: number;
  /** Where the spots start along the body (so a body sliding out of a nose carries its spots along). */
  readonly slide?: number;
}

const CREAM = '#f6ecd0';
const CREAM_DARK = '#bfa878';
const SPOT = '#5a3416';

interface Along { readonly p: Pt; readonly n: Pt; readonly s: number }

/** The spine resampled evenly, with normals and arc length. */
export function resample(spine: readonly Pt[], n: number): Along[] {
  const len: number[] = [0];
  for (let i = 1; i < spine.length; i++) len.push(len[i - 1]! + Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y));
  const total = len[len.length - 1]!;
  const at = (s: number): Pt => {
    let i = 1;
    while (i < len.length - 1 && len[i]! < s) i++;
    const u = (s - len[i - 1]!) / (len[i]! - len[i - 1]! || 1);
    return { x: spine[i - 1]!.x + (spine[i]!.x - spine[i - 1]!.x) * u, y: spine[i - 1]!.y + (spine[i]!.y - spine[i - 1]!.y) * u };
  };
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = (total * i) / n;
    const e = total / n;
    const [a, b] = [at(Math.max(0, s - e)), at(Math.min(total, s + e))];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { p: at(s), n: { x: -(b.y - a.y) / l, y: (b.x - a.x) / l }, s };
  });
}

/** Half the width at distance `s` from the head end of a body `total` long. */
function half(s: number, total: number, w: number, head: boolean, cut: boolean): number {
  const tail = cut ? 1 : Math.min(1, (total - s) / Math.min(total * 0.6, w * 5));
  const body = (w / 2) * (0.05 + 0.95 * Math.sin((Math.PI / 2) * Math.max(0, tail)) ** 0.8);
  if (!head) return body;
  // The head: a blunt rounded snout, a slight neck behind the jaw.
  const u = s / w;
  const snout = u < 0.42 ? Math.sqrt(Math.max(0, 1 - ((0.42 - u) / 0.42) ** 2)) * 0.86 : 1;
  const neck = 1 - 0.08 * Math.exp(-(((u - 1.5) / 0.45) ** 2));
  return body * snout * neck * (u < 1.2 ? 1.04 : 1);
}

const off = (a: Along, d: number): Pt => ({ x: a.p.x + a.n.x * d, y: a.p.y + a.n.y * d });

function headDetails(ctx: CanvasRenderingContext2D, pts: readonly Along[], w: number, alarm: number, ink: number): void {
  const near = (s: number): Along => pts.reduce((b, a) => (Math.abs(a.s - s) < Math.abs(b.s - s) ? a : b));
  // The mouth's line along one side, the eye above it.
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [i, s] of [0.1, 0.3, 0.55, 0.8].entries()) {
    const q = off(near(w * s), w * (0.1 + 0.06 * i));
    if (i) ctx.lineTo(q.x, q.y);
    else ctx.moveTo(q.x, q.y);
  }
  ctx.stroke();
  const e = off(near(w * 0.5), -w * 0.17);
  const r = w * (0.13 + 0.05 * alarm);
  ctx.fillStyle = '#e9c66a';
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = ink * 0.9;
  ctx.stroke();
  ctx.fillStyle = '#0c0806';
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(e.x - r * 0.22, e.y - r * 0.25, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEel(ctx: CanvasRenderingContext2D, spine: readonly Pt[], o: EelOpts): void {
  const rough = resample(spine, 60);
  const total = rough[rough.length - 1]!.s;
  const pts = resample(spine, Math.max(24, Math.min(140, Math.round(total / (o.width * 0.12)))));
  const h = pts.map((a) => half(a.s, total, o.width, !!o.head, !!o.cut));
  const left = pts.map((a, i) => off(a, -h[i]!));
  const right = pts.map((a, i) => off(a, h[i]!));
  const shape = [...left, ...[...right].reverse()];
  ctx.save();
  ctx.lineJoin = 'round';
  // The fin fringe, a thin translucent frill down one side.
  const frill = pts.map((a, i) => off(a, -h[i]! - o.width * 0.12 * Math.min(1, a.s / (o.width * 1.6)) * (0.8 + 0.2 * Math.sin(a.s / (o.width * 0.12)))));
  path(ctx, [...left, ...[...frill].reverse()]);
  ctx.fillStyle = '#dcc794';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = o.ink * 0.6;
  ctx.stroke();
  // The body, lit from the left edge, shaded to the right.
  path(ctx, shape);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.save();
  ctx.clip();
  softLine(ctx, pts.map((a, i) => off(a, h[i]! * 0.95)), o.width * 0.7, CREAM_DARK, 0.75);
  softLine(ctx, pts.map((a, i) => off(a, h[i]! * 1.02)), o.width * 0.3, '#6e532c', 0.5);
  softLine(ctx, pts.map((a, i) => off(a, -h[i]! * 0.42)), o.width * 0.26, '#fffdf2', 0.9);
  // The spots: two staggered rows of big ones and scattered small ones, riding the surface.
  const step = o.width * 0.62;
  const slide = o.slide ?? 0;
  for (let k = Math.floor(-slide / step) - 1; k * step + slide < total; k++) {
    for (const [du, v, r] of [[0, -0.52, 0.155], [0.5, 0.2, 0.175], [0.15, 0.78, 0.12], [0.62, -0.95, 0.1], [0.28, -0.1, 0.06]] as const) {
      const s = (k + du) * step + slide;
      if (s < (o.head ? o.width * 0.75 : 0) || s > total * 0.985) continue;
      const i = Math.min(pts.length - 1, Math.round((s / total) * (pts.length - 1)));
      const a = pts[i]!;
      const c = off(a, h[i]! * v);
      const size = o.width * r * Math.min(1, (h[i]! * 2) / o.width + 0.15) * (0.85 + 0.3 * Math.abs(Math.sin(k * 7.3 + du * 11)));
      // Round on the flat of the body, squeezed at its edges.
      const ang = Math.atan2(a.n.y, a.n.x);
      ctx.fillStyle = SPOT;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, size * Math.sqrt(1 - 0.75 * v * v), size, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#8a5a30';
      ctx.beginPath();
      ctx.ellipse(c.x - size * 0.2, c.y - size * 0.2, size * 0.45, size * 0.5, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = o.ink;
  ctx.stroke();
  if (o.head) headDetails(ctx, pts, o.width, o.alarm ?? 0, o.ink);
  ctx.restore();
}

/** A soft cast shadow of the eel on whatever is behind it. */
export function eelShadow(ctx: CanvasRenderingContext2D, spine: readonly Pt[], width: number, dx: number, dy: number, alpha: number): void {
  softLine(ctx, spine.map((p) => ({ x: p.x + dx, y: p.y + dy })), width * 1.15, '#1b130d', alpha, 16);
}

/** A drop of water (a sneeze, a splash), pointing along `a`. */
export function drop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalAlpha = alpha;
  path(ctx, smoothLoop([{ x: -r * 1.9, y: 0 }, { x: 0, y: -r * 0.8 }, { x: r, y: 0 }, { x: 0, y: r * 0.8 }], 5));
  ctx.fillStyle = '#d8f1fa';
  ctx.fill();
  ctx.strokeStyle = '#3d86a8';
  ctx.lineWidth = Math.max(1.4, r * 0.14);
  ctx.stroke();
  dab(ctx, r * 0.2, -r * 0.25, r * 0.4, '255,255,255', 0.9);
  ctx.restore();
}
