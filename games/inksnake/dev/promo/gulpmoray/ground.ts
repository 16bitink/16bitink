import { REEF_PLACE } from '../../../src/art/chapters/reefPlace';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BOARD, type CoverDef, type LevelDef } from '../../../src/level/types';
import { VIDEO } from '../short';
import type { GroundLayer } from './story';

/**
 * Chapter 6's reef floor, painted by the game's own reef painters on one
 * board (sea, sand and seagrass) and laid out to every
 * side as mirrored tiles, so the camera can wander (as gulphen's ground.ts).
 * The board is drawn turned a quarter, to suit the tall video. Plus the
 * light coming down through the water.
 */
const LEVEL: LevelDef = {
  id: 'promo-gulpmoray', name: 'Reef', snake: 'krait', start: { x: 480, y: 270 }, heading: 0, length: 210, target: 500, par: 50, prey: [],
  zones: [{ kind: 'water', look: 'reef', shape: 'rect', x: -40, y: -40, w: 1040, h: 620 }],
  solids: [],
  cover: [
    { look: 'seagrass', x: 130, y: 90, r: 40 } satisfies CoverDef,
    { look: 'seagrass', x: 720, y: 300, r: 36 } satisfies CoverDef,
  ],
};

/** Ground units (world units at zoom 1) per board px, and canvas px per board px. */
const SCALE = 4;
const RES = 3;
const TILE = { w: BOARD.h * SCALE, h: BOARD.w * SCALE } as const;
const IN_TILE = { x: 1300, y: 1500 } as const;

export interface Reef {
  readonly floor: HTMLCanvasElement;
}

export function paintReef(): Reef {
  const place = REEF_PLACE!;
  const { canvas: floor, ctx } = makeCanvas(BOARD.h * RES, BOARD.w * RES);
  ctx.translate(floor.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.scale(RES, RES);
  place.ground(makeDraw(ctx, 1907, 0, 0), LEVEL);
  (LEVEL.cover ?? []).forEach((c, i) => place.cover(makeDraw(ctx, 1920 + i, 0, 0), c));
  releaseScratch();
  return { floor };
}

const odd = (n: number): boolean => ((n % 2) + 2) % 2 === 1;

function drawLayer(ctx: CanvasRenderingContext2D, reef: Reef, g: GroundLayer): void {
  if (g.alpha <= 0) return;
  const [w, h] = [TILE.w * g.zoom, TILE.h * g.zoom];
  const x = g.x - IN_TILE.x * g.zoom;
  const y = g.y - IN_TILE.y * g.zoom;
  const [ix0, iy0] = [Math.floor(-x / w), Math.floor(-y / h)];
  const [ix1, iy1] = [Math.floor((VIDEO.width - x) / w), Math.floor((VIDEO.height - y) / h)];
  ctx.save();
  ctx.globalAlpha = g.alpha;
  for (let iy = iy0; iy <= iy1; iy++) {
    for (let ix = ix0; ix <= ix1; ix++) {
      ctx.save();
      ctx.translate(x + (odd(ix) ? (ix + 1) * w : ix * w), y + (odd(iy) ? (iy + 1) * h : iy * h));
      ctx.scale(odd(ix) ? -1 : 1, odd(iy) ? -1 : 1);
      ctx.drawImage(reef.floor, 0, 0, w, h);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawFloor(ctx: CanvasRenderingContext2D, reef: Reef, layers: readonly GroundLayer[]): void {
  for (const g of layers) drawLayer(ctx, reef, g);
}

/** Light from above: brighter at the top of the water, soft slanting shafts swaying (on the loop), a cool deep tint low down. */
export function drawWaterLight(ctx: CanvasRenderingContext2D, t: number, loop: number): void {
  const { width: W, height: H } = VIDEO;
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, 'rgba(210,240,250,0.22)');
  sky.addColorStop(0.45, 'rgba(160,215,235,0.04)');
  sky.addColorStop(1, 'rgba(14,52,92,0.2)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const phase = (2 * Math.PI * t) / loop;
    const x = -200 + i * 330 + 50 * Math.sin(phase * (i % 2 ? 1 : 2) + i * 1.7);
    const w = 70 + 40 * ((i * 37) % 3);
    const a = 0.07 + 0.035 * Math.sin(phase * 2 + i);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(235,250,255,${a})`);
    g.addColorStop(0.75, 'rgba(235,250,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w + 520, H);
    ctx.lineTo(x + 380, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
