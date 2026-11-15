import { drawSprite } from '../sprites';
import type { Cast } from './cast';
import type { Cam, FoxState } from './stage';

/** Nose to the middle of the head, board units (the fox's head is about this long). */
export const HEAD_BACK = 9;

/** The Red Fox's sprite, its nose at the state's spot, turned to its heading. */
export function drawFox(ctx: CanvasRenderingContext2D, cast: Cast, fox: FoxState, cam: Cam, boil: number, shake: { readonly x: number; readonly y: number }): void {
  const dx = Math.cos(fox.heading);
  const dy = Math.sin(fox.heading);
  const nose = cast.nose[fox.pose];
  const x = (fox.x - dx * nose - cam.cx) * cam.s + 540 + shake.x;
  const y = (fox.y - dy * nose - cam.cy) * cam.s + 960 + shake.y;
  drawSprite(ctx, cast.fox[fox.pose], boil, { x, y, scale: cam.s, rotation: fox.heading });
}

/** Where the middle of the fox's head is on screen. */
export function foxHead(fox: FoxState, cam: Cam, shake: { readonly x: number; readonly y: number }): { x: number; y: number } {
  return {
    x: (fox.x - Math.cos(fox.heading) * HEAD_BACK - cam.cx) * cam.s + 540 + shake.x,
    y: (fox.y - Math.sin(fox.heading) * HEAD_BACK - cam.cy) * cam.s + 960 + shake.y,
  };
}
