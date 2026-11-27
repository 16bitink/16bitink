import { drawHighlight } from '../../../src/art/itemArt';
import { makeDraw } from '../../../src/art/kit';
import { PALE_SAND } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { CHUNK_PAD, drawChunk, makeSandPatterns } from '../../../src/art/sand';
import { TILE_PX } from '../../../src/level/build';
import { shellPx } from '../../../src/logic/shells';
import { createTerrain, setTile, TILE, type Terrain } from '../../../src/logic/terrain';
import { clamp01, ramp, smooth } from '../short';
import { drawSparkle } from './marks';
import { crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { CENTRE_X, S_GAME, screenX, type WorldCam } from './story';

/**
 * The game's level 1 as the game draws it: its diggable sand (src/art/sand.ts
 * drawChunk, over a real Terrain), the player hermit crab in its shell
 * digging down a few tiles, and a bigger shell buried under the game's
 * highlighter swipe, which the dig opens up just before the beach turns back.
 * Each state of the dig is baked once.
 */
const COLS = 10;
const ROWS = 30;
/**
 * Screen px per world px for the level: the game's camera zoomed right in on
 * the crab (its backdrop is cropped to the lagoon above), so the crab and
 * its dig read on a phone. The sand is baked at this resolution.
 */
const RES = 9;
/** World x at the screen's centre before the pan (see terrainX). */
const WORLD_CENTRE = 20;

/** Crab centre (tiles) and the row it stands on, for each step of the dig: already a tile down, then down and along to the buried shell. */
const PATH: readonly (readonly [number, number])[] = [[5.0, 1], [4.6, 2], [4.3, 2], [4.0, 2]];
/** When each step after the first is dug (the crab moves into it). */
export const STEP_AT = [12.9, 13.9, 14.9] as const;
/** The pocket the buried shell lies in: columns and rows, opened at OPEN_AT. */
const POCKET = { cols: [1, 2], rows: [0, 1] } as const;
export const OPEN_AT = 15.6;
const BURIED = { kind: 'moonsnail', size: 5 } as const;
const CRAB_SIZE = 4;
const STEP_S = 0.3;

export interface Game {
  /** One baked sand canvas per dig state: 0 untouched … PATH.length − 1 the last step, then the pocket open. */
  readonly sand: readonly HTMLCanvasElement[];
  readonly back: Sprite;
  readonly front: Sprite;
  readonly shell: Sprite;
  readonly buried: Sprite;
  readonly swipe: HTMLCanvasElement;
}

function stepTiles(cx: number, floor: number): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [];
  for (let c = Math.floor(cx - 0.5); c <= Math.floor(cx + 0.5); c++) for (const r of [floor - 2, floor - 1]) if (r >= 0) out.push([c, r]);
  return out;
}

function terrainAt(state: number): Terrain {
  const t = createTerrain(COLS, ROWS);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) setTile(t, x, y, TILE.sand);
  for (let k = 0; k <= Math.min(state, PATH.length - 1); k++) for (const [c, r] of stepTiles(...PATH[k]!)) setTile(t, c, r, TILE.air);
  if (state >= PATH.length) for (const c of POCKET.cols) for (const r of POCKET.rows) setTile(t, c, r, TILE.air);
  return t;
}

export function makeGame(): Game {
  const sand = Array.from({ length: PATH.length + 1 }, (_, state) => {
    const px = Math.ceil((COLS * TILE_PX + CHUNK_PAD * 2) * RES);
    const { canvas, ctx } = makeCanvas(px, px);
    drawChunk(ctx, terrainAt(state), { tx: 0, ty: 0, tiles: COLS }, TILE_PX, RES, makeSandPatterns(ctx, RES, PALE_SAND), PALE_SAND);
    return canvas;
  });
  const swipe = makeCanvas(64 * 4, 40 * 4);
  swipe.ctx.scale(4, 4);
  drawHighlight(makeDraw(swipe.ctx, 61, 0, 0), 64, 40);
  return {
    sand,
    back: crabSprite('back', 2.5),
    front: crabSprite('front', 2.5),
    shell: shellSprite('whelk', 2.5),
    buried: shellSprite(BURIED.kind, 2.5),
    swipe: swipe.canvas,
  };
}

/** Screen px per world px at this camera. */
const zoomOf = (cam: WorldCam): number => RES * (cam.s / S_GAME);
/** Screen x of world x `wx` in the level (it pans with the foreground). */
const terrainX = (cam: WorldCam, wx: number): number => screenX(cam, CENTRE_X, 1) + (wx - WORLD_CENTRE) * zoomOf(cam);

/** Which baked dig state shows at `t`. */
export function digState(t: number): number {
  const dug = STEP_AT.filter((at) => t >= at - 0.12).length;
  return t >= OPEN_AT ? PATH.length : dug;
}

/** Where the crab is: tiles, the step's ease, and whether it's scrabbling at the sand. */
export function crabAt(t: number): { readonly cx: number; readonly floor: number; readonly digging: number } {
  let i = 0;
  while (i < STEP_AT.length && t >= STEP_AT[i]!) i++;
  const from = PATH[Math.max(0, i - 1)]!;
  const to = PATH[i]!;
  const u = i === 0 ? 1 : smooth((t - STEP_AT[i - 1]!) / STEP_S);
  const next = STEP_AT[i] ?? OPEN_AT;
  // Scrabbling for the half second before each step and before the pocket opens.
  const digging = t < OPEN_AT + 0.1 ? ramp(t, next - 0.55, next - 0.4) * (1 - ramp(t, next, next + 0.1)) : 0;
  return { cx: from[0] + (to[0] - from[0]) * u, floor: from[1] + (to[1] - from[1]) * u, digging };
}

/** Sand puffs where the crab is digging: screen points and how big. */
export function puffsAt(t: number, cam: WorldCam): readonly { x: number; y: number; r: number; a: number }[] {
  const c = crabAt(t);
  if (c.digging <= 0) return [];
  const z = zoomOf(cam);
  return [0, 1, 2].map((i) => {
    const age = ((t * 2.6 + i / 3) % 1);
    return {
      x: terrainX(cam, (c.cx - 0.9) * TILE_PX) - age * 40 * z / 4,
      y: cam.ground + (c.floor - 0.6) * TILE_PX * z - age * 60,
      r: (10 + 26 * age) * z / 4.4,
      a: c.digging * (1 - age) * 0.8,
    };
  });
}

/**
 * The level over the painted beach: its sand (fading in and settling into
 * place as the beach turns into the game), the buried shell under its swipe,
 * and the crab. `alpha` is the morph.
 */
export function drawGame(ctx: CanvasRenderingContext2D, game: Game, cam: WorldCam, t: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const z = zoomOf(cam);
  const drop = (1 - smooth(alpha)) * 120;
  const sand = game.sand[digState(t)]!;
  const x0 = terrainX(cam, -CHUNK_PAD);
  const y0 = cam.ground + drop - CHUNK_PAD * z;
  const a = clamp01(alpha * 1.4);
  ctx.save();
  ctx.globalAlpha = a;
  // Dug-out sand behind the level, so its open trench reads as a hollow in the beach, not a hole to the paper.
  ctx.fillStyle = PALE_SAND.tunnel;
  ctx.globalAlpha = a * 0.6;
  ctx.fillRect(x0, cam.ground + drop, (sand.width * z) / RES, (sand.height * z) / RES);
  ctx.globalAlpha = a;
  ctx.drawImage(sand, x0, y0, (sand.width * z) / RES, (sand.height * z) / RES);

  // The buried shell: seen faintly through the sand over the game's highlighter, glinting, until the dig opens its pocket.
  const open = ramp(t, OPEN_AT, OPEN_AT + 0.25);
  const px = terrainX(cam, (POCKET.cols[0] + 1) * TILE_PX);
  const floor = cam.ground + drop + (POCKET.rows[1] + 1) * TILE_PX * z - 6;
  const bw = shellPx(BURIED.size) * z;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = a * (0.45 + 0.4 * open);
  ctx.drawImage(game.swipe, px - bw * 0.6, floor - bw * 0.82, bw * 1.2, bw * 0.72);
  ctx.restore();
  const pop = 1 + 0.18 * Math.sin(clamp01((t - OPEN_AT) / 0.4) * Math.PI);
  drawSprite(ctx, game.buried, boil, { x: px, y: floor, scale: ((z * shellPx(BURIED.size)) / 116) * pop, facing: 1, alpha: a * (0.5 + 0.5 * open) });
  // Its glint: a sparkle every 1.5 s, and a big one as it's dug free.
  drawSparkle(ctx, px + bw * 0.25, floor - bw * 0.55, 30, ((t + 0.4) % 1.5) / 0.6, boil);
  drawSparkle(ctx, px - bw * 0.1, floor - bw * 0.7, 64, (t - OPEN_AT) / 0.7, boil);

  // The crab: in its shell, facing the way it digs, scrabbling as it goes.
  const c = crabAt(t);
  const scale = (z * shellPx(CRAB_SIZE)) / 116;
  const jig = c.digging * Math.sin(t * 40) * 0.05;
  const at = { x: terrainX(cam, c.cx * TILE_PX), y: cam.ground + drop + c.floor * TILE_PX * z, scale, facing: -1, rotation: jig };
  drawSprite(ctx, game.back, boil, at);
  drawSprite(ctx, game.shell, boil, at);
  drawSprite(ctx, game.front, boil, at);
  ctx.restore();
}
