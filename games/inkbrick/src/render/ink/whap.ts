import { INK, Pen } from '../pen';

/**
 * Skip's "whap": three quick pen flicks fanning up from where his paw meets
 * the stone, and a short impact arc under them. Drawn once (both art sets use
 * it); the play scene flips it for a swat on the left.
 */
export const WHAP_W = 96;
export const WHAP_H = 64;

export function whapCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WHAP_W;
  canvas.height = WHAP_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const p = new Pen(ctx, 77, 0.5);
  const cx = WHAP_W * 0.42;
  const cy = WHAP_H * 0.86;
  for (const [a, r0, r1, w] of [[-2.2, 12, 34, 3.4], [-1.6, 14, 44, 4], [-1.0, 12, 36, 3.4]] as const) {
    p.stroke([{ x: cx + Math.cos(a) * r0, y: cy + Math.sin(a) * r0 }, { x: cx + Math.cos(a) * r1, y: cy + Math.sin(a) * r1 }], w, INK, 1, true);
  }
  const arc = Array.from({ length: 7 }, (_, i) => {
    const a = Math.PI * (1.15 + (i / 6) * 0.7);
    return { x: cx + Math.cos(a) * 9, y: cy + Math.sin(a) * 9 };
  });
  p.stroke(arc, 2.4);
  return canvas;
}
