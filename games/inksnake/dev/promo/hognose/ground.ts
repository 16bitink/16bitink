import type { LevelDef } from '../../../src/level/types';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BARRENS_PLACE } from '../../../src/art/chapters/barrensPlace';
import { INK } from '../../../src/art/palette';

/**
 * The Pine Barrens' own ground (the game's level 10, "the fox's road": sand,
 * rusty needles, fox prints), painted once at GROUND_K px per board unit over
 * a window of the board, so the sand grain and needles are at the same scale
 * as the snake and fox drawn on it.
 */
export const GROUND_K = 9;
/** The window of the board painted, board px (its top-left is world 0, 0). */
export const WORLD = { x0: 330, y0: 40, w: 300, h: 460 } as const;

const LEVEL = {
  id: 'barrens-10', name: 'ground', snake: 'hognose', start: { x: 480, y: 270 }, heading: 0, length: 60, target: 120, par: 60, prey: [],
} as unknown as LevelDef;

export function paintGround(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil(WORLD.w * GROUND_K), Math.ceil(WORLD.h * GROUND_K));
  ctx.scale(GROUND_K, GROUND_K);
  ctx.translate(-WORLD.x0, -WORLD.y0);
  BARRENS_PLACE!.ground(makeDraw(ctx, 5, 0, 0, INK), LEVEL);
  releaseScratch();
  return canvas;
}
