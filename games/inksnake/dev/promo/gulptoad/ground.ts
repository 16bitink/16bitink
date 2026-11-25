import { BARRENS_PLACE } from '../../../src/art/chapters/barrensPlace';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BOARD, type LevelDef } from '../../../src/level/types';
import type { GroundLayer } from './camera';

/**
 * Chapter 2's pine barrens, painted by the game's own painter (pale sugar
 * sand, rusty pine needles, lichen): two different boards, each turned a
 * quarter to suit the tall video, laid side by side with one feathered into
 * the other. Together they cover everything the camera sees in the loop, so
 * nothing is mirrored or repeated.
 */
const level = (id: string): LevelDef => ({
  id, name: 'Pine Barrens', snake: 'hognose', start: { x: 480, y: 270 }, heading: 0, length: 60, target: 120, par: 60, prey: [], zones: [], solids: [], cover: [],
});

/** Ground units (world units at zoom 1) per board px, and canvas px per board px. */
const SCALE = 5;
const RES = 4;
/** Left off a board's edges, board px: the painter darkens them. */
const EDGE = 8;
const BOARD_W = (BOARD.h - 2 * EDGE) * SCALE;
const BOARD_H = (BOARD.w - 2 * EDGE) * SCALE;
/** What the sand covers, ground units about frame 1's origin: the camera's whole range (see the test). */
export const SAND = { x: -2500, y: -2152, w: 3770, h: BOARD_H } as const;
/** How wide the left board's edge is feathered over the right one, ground units. */
const FEATHER = 420;

export interface Sand {
  readonly canvas: HTMLCanvasElement;
}

function paintBoard(id: string, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(BOARD.h * RES, BOARD.w * RES);
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.scale(RES, RES);
  BARRENS_PLACE!.ground(makeDraw(ctx, seed, 0, 0), level(id));
  releaseScratch();
  return canvas;
}

export function paintSand(): Sand {
  const k = RES / SCALE;
  const { canvas, ctx } = makeCanvas(Math.ceil(SAND.w * k), Math.ceil(SAND.h * k));
  const lay = (board: HTMLCanvasElement, to: CanvasRenderingContext2D, x: number): void => {
    to.drawImage(board, EDGE * RES, EDGE * RES, board.width - 2 * EDGE * RES, board.height - 2 * EDGE * RES, x * k, 0, BOARD_W * k, BOARD_H * k);
  };
  const rightAt = SAND.w - BOARD_W;
  lay(paintBoard('promo-gulptoad', 1763), ctx, rightAt);
  // The left board, fading out over the right one's edge.
  const left = makeCanvas(canvas.width, canvas.height);
  lay(paintBoard('promo-gulptoad-west', 1767), left.ctx, 0);
  const fade = left.ctx.createLinearGradient(rightAt * k, 0, (rightAt + FEATHER) * k, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  left.ctx.globalCompositeOperation = 'destination-out';
  left.ctx.fillStyle = fade;
  left.ctx.fillRect(rightAt * k, 0, canvas.width, canvas.height);
  ctx.drawImage(left.canvas, 0, 0);
  return { canvas };
}

export function drawSand(ctx: CanvasRenderingContext2D, sand: Sand, layers: readonly GroundLayer[]): void {
  for (const g of layers) {
    if (g.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = g.alpha;
    ctx.drawImage(sand.canvas, g.x + SAND.x * g.zoom, g.y + SAND.y * g.zoom, SAND.w * g.zoom, SAND.h * g.zoom);
    ctx.restore();
  }
}
