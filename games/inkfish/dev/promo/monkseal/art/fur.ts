import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';

/** The seal's fur and a plain inked line, shared by its face and muzzle. */

export const line = (ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string = INK, alpha = 1): void => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
};

/** The coat's hairs: short, following the fur's lie out from the nose and back over the crown. */
export interface Hair { readonly a: Pt; readonly b: Pt; readonly light: boolean; readonly w: number }
export const HAIRS: readonly Hair[] = (() => {
  const rng = createRng(311);
  return Array.from({ length: 1500 }, () => {
    const t = rng() * Math.PI * 2;
    const r = 0.3 + 0.7 * Math.sqrt(rng());
    const a = { x: Math.cos(t) * 196 * r, y: 12 + Math.sin(t) * 164 * r };
    const dir = Math.atan2(a.y - 30, a.x) + (rng() - 0.5) * 0.4;
    const len = 7 + rng() * 10;
    return { a, b: { x: a.x + Math.cos(dir) * len, y: a.y + Math.sin(dir) * len }, light: rng() < 0.52, w: 0.55 + rng() * 0.75 };
  });
})();
