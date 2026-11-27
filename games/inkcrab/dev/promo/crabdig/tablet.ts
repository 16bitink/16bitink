import { bobAt, ENTER_S, type DewyImages } from '../../../../inkfish/dev/promo/devstory/dewy';
import { INK } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { SHELL_UNITS } from '../../../src/art/frame';
import { shellPx } from '../../../src/logic/shells';
import { type Cast, drawCrab, drawSand, drawSwipe, drawShellAt, footFromMiddle } from './art';

/**
 * Dewy's `proud` bust holds up a drawing tablet painted with InkFish's
 * goldfish. In this short he's proud of InkCrab, so the tablet shows the
 * game instead: its hatched sand, a tunnel, the player crab in its shell and
 * a buried shell under the highlighter. The picture follows the bust exactly
 * (dewy.ts's slide, bob and squash, recomputed here) and is clipped to the
 * screen's corners in the pose's own pixels.
 */
const SCREEN = [
  { x: 437, y: 997 },
  { x: 923, y: 951 },
  { x: 967, y: 1278 },
  { x: 457, y: 1332 },
] as const;
const ART = { w: 560, h: 400 } as const;

/** The game, as painted on the tablet: sky, sand with a dug tunnel, the crab, a buried shell. */
export function makeTabletArt(cast: Cast): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(ART.w, ART.h);
  const top = 120;
  const sky = ctx.createLinearGradient(0, 0, 0, top);
  sky.addColorStop(0, '#d9eef2');
  sky.addColorStop(1, '#bfe6e6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ART.w, top + 10);
  const tile = 56;
  const sand = drawSand(11, 6, 14, 4, (i, j) => (j === 1 && i >= 2 && i <= 7) || (j === 0 && i >= 6 && i <= 7) || (j === 2 && i >= 6 && i <= 7));
  ctx.fillStyle = '#ebe1c8';
  ctx.fillRect(0, top, ART.w, ART.h - top);
  ctx.drawImage(sand.canvas, -sand.pad, top - sand.pad);
  const unit = (shellPx(4) / SHELL_UNITS) * 3.5;
  drawSwipe(ctx, 140, top + 4.6 * tile - 30, 110, 70, 0.5, 9);
  drawShellAt(ctx, cast, 'whelk', 140, top + 4.6 * tile, unit, -1, 0, 0.5);
  const x = 3.2 * tile;
  drawCrab(ctx, cast, { x: x + footFromMiddle(cast, 'topshell', unit), y: top + 2 * tile, unit, kind: 'topshell', facing: 1 }, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, ART.w - 3, ART.h - 3);
  return canvas;
}

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
/** dewy.ts's enter easing. */
const easeOutBack = (u: number): number => {
  const c = 1.45;
  const v = clamp01(u) - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
};

export interface TabletPlace {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly enterAt: number;
  readonly talking: number;
}

/** Paints the game over the `proud` tablet's screen, exactly where drawDewy drew the bust. */
export function drawTablet(ctx: CanvasRenderingContext2D, dewy: DewyImages, art: HTMLCanvasElement, p: TabletPlace): void {
  if (p.t < p.enterAt) return;
  const img = dewy.proud;
  const w = p.width;
  const h = (img.naturalHeight / img.naturalWidth) * w;
  const slide = (1 - easeOutBack((p.t - p.enterAt) / ENTER_S)) * h * 1.1;
  const { lift, squash } = bobAt(p.t, p.talking);
  const k = w / img.naturalWidth;
  ctx.save();
  ctx.translate(p.x, p.y + slide - lift * h);
  ctx.scale(1 - squash * 0.5, 1 + squash);
  ctx.translate(-w / 2, -h);
  ctx.scale(k, k);
  ctx.beginPath();
  SCREEN.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
  ctx.closePath();
  ctx.clip();
  // The art mapped onto the screen: its corners on the screen's top-left, top-right and bottom-left.
  const [tl, tr, , bl] = SCREEN;
  ctx.transform((tr.x - tl.x) / ART.w, (tr.y - tl.y) / ART.w, (bl.x - tl.x) / ART.h, (bl.y - tl.y) / ART.h, tl.x, tl.y);
  // A touch bigger than the screen, so its bezel's inner edge never shows a gap.
  ctx.drawImage(art, -8, -8, ART.w + 16, ART.h + 24);
  ctx.restore();
}
