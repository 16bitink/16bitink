import { INK } from '../../../src/art/palette';
import type { Pt } from '../sprites';
import { toScreen, type View } from './camera';

/** Where the two jaws sit in the world: their hinges and tips, along the lips. */
export interface JawPlace {
  readonly hingeU: Pt;
  readonly hingeL: Pt;
  readonly tipU: Pt;
  readonly tipL: Pt;
}

/** How far along each jaw from its hinge the lips' corner starts, and how far back it sweeps, as a share of its gap. */
const START = 0.14;
const SWEEP = 0.46;
const SWEEP_MAX = 150;

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/**
 * The stretched corner of the mouth, world points from the upper jaw to the
 * lower: starting on each jaw's lip and sweeping back between them in a
 * concave curve. The toad goes in behind it; the cheek's skin ends at it.
 */
export function lipCorner(q: JawPlace): readonly Pt[] {
  const a = lerpPt(q.hingeU, q.tipU, START);
  const d = lerpPt(q.hingeL, q.tipL, START);
  const mid = lerpPt(a, d, 0.5);
  const tip = lerpPt(q.tipU, q.tipL, 0.5);
  const len = Math.hypot(tip.x - mid.x, tip.y - mid.y) || 1;
  const back = Math.min(SWEEP_MAX, SWEEP * Math.hypot(a.x - d.x, a.y - d.y));
  const off = { x: ((mid.x - tip.x) / len) * back, y: ((mid.y - tip.y) / len) * back };
  const [b, c] = [lerpPt(a, d, 0.18), lerpPt(a, d, 0.82)].map((p) => ({ x: p.x + off.x * 1.3, y: p.y + off.y * 1.3 })) as [Pt, Pt];
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
  });
}

/** The lip itself along the corner: a fleshy pink rim, inked both sides, its shade falling on the meal going in. */
export function drawLipCorner(ctx: CanvasRenderingContext2D, view: View, q: JawPlace, alpha: number): void {
  const line = lipCorner(q);
  const [a, d] = [line[0]!, line[line.length - 1]!];
  const gap = Math.hypot(a.x - d.x, a.y - d.y);
  const size = Math.min(1, Math.max(0, (gap - 40) / 200));
  if (size <= 0) return;
  const pts = line.map((p) => toScreen(view, p));
  const trace = (): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  };
  const z = view.zoom * (0.45 + 0.55 * size);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Its shade, on the meal inside the mouth only.
  ctx.save();
  ctx.beginPath();
  [toScreen(view, q.tipU), ...pts, toScreen(view, q.tipL)].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = '#3a1218';
  for (const w of [150, 118, 88, 62]) {
    ctx.globalAlpha = 0.13 * alpha;
    ctx.lineWidth = w * z;
    trace();
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = alpha;
  for (const [w, colour] of [[37, INK], [28, '#c9747c'], [21, '#e59aa0'], [8, '#f6c6c4']] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w * z;
    trace();
    ctx.stroke();
  }
  ctx.restore();
}
