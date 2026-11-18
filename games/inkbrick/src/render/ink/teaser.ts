import { INK, Pen, roundRect, type Pt } from '../pen';
import { C, LINE } from './palette';

/**
 * The tomorrow teaser's wall: a short run of inked bricks along the bottom
 * with a big "?" on them, the top left clear for Brumm to peek over. A tease,
 * not a preview: the same wall every day, nothing of tomorrow's real layout.
 * Image px (2x the CSS box).
 */
export const TEASER_W = 192;
export const TEASER_H = 160;
/** Where the wall's top edge sits, as a share of the height (Brumm peeks above it). */
export const TEASER_WALL_TOP = 0.5;

const FILLS = [C.sand, C.mauve, C.ice, C.sand, C.stone, C.orange, C.sand, C.ice] as const;

function wall(p: Pen, w: number, h: number): void {
  const top = h * TEASER_WALL_TOP;
  const rows = 3;
  const rh = (h - top - 4) / rows;
  const bw = w / 3.2;
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const y = top + r * rh;
    for (let x = r % 2 ? -bw / 2 : 0; x < w; x += bw) {
      const brick = roundRect(x + 2, y + 2, bw - 4, rh - 4, 5, 4);
      p.fill(brick, FILLS[k++ % FILLS.length]!);
      p.stipple(brick, 70, (_x, yy) => (yy > y + rh * 0.55 ? 0.6 : 0.08), 0.8);
      p.closed(brick, LINE * 0.8);
    }
  }
}

function questionMark(p: Pen, cx: number, cy: number, s: number): void {
  const hook: Pt[] = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI * (1.05 + (i / 10) * 1.35);
    return { x: cx + Math.cos(a) * s, y: cy - s * 0.55 + Math.sin(a) * s * 0.8 };
  });
  const stem = [{ x: cx, y: cy + s * 0.45 }];
  p.stroke([...hook, ...stem], 6, INK, 1);
  p.dot(cx, cy + s * 1.05, 4.6);
}

export function teaserWallCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TEASER_W;
  canvas.height = TEASER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const p = new Pen(ctx, 1122, 0.6);
  wall(p, TEASER_W, TEASER_H);
  // The "?" sits on a paper patch so it reads at 60 px wide.
  const cx = TEASER_W * 0.5;
  const cy = TEASER_H * 0.73;
  const patch = roundRect(cx - 22, cy - 30, 44, 58, 10, 4);
  p.fill(patch, C.white);
  p.closed(patch, LINE * 0.8);
  questionMark(p, cx, cy - 4, 13);
  return canvas;
}

let url: string | null = null;

export function teaserWallUrl(): string {
  url ??= teaserWallCanvas().toDataURL('image/png');
  return url;
}
