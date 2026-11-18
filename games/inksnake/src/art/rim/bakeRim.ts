import type Phaser from 'phaser';
import { BOARD, type LevelDef, type Place } from '../../level/types';
import { createRng } from '../../logic/rng';
import { hasWinterLook, snowOnSolid, winterGround } from '../daily/winter';
import { makeDraw } from '../kit';
import { ART_RES } from '../palette';
import { makeCanvas, releaseScratch } from '../pen';
import { placeArt } from '../places/index';
import { paintDailyCover, paintDailySolid } from '../daily/decor';
import { type Box, meets, type RimPiece, rimStrips } from './rimKit';
import { RIM_STYLES } from './rimStyles';
import { planSurround, SURROUND, surroundSeed } from './surroundPlan';

export const RIM_TEX = {
  /** The top and bottom strips (frames 'top', 'bottom'). */
  flat: (levelId: string) => `rimh-${levelId}`,
  /** The left and right strips (frames 'left', 'right'). */
  tall: (levelId: string) => `rimv-${levelId}`,
  surround: (levelId: string) => `surround-${levelId}`,
} as const;

export const RIM_PREFIXES = ['rimh-', 'rimv-', 'surround-'] as const;

const snowyAt = (level: LevelDef, place: Place): boolean => level.season === 'winter' && hasWinterLook(place);

/**
 * Paints a level's wall into two small textures, its strips at ART_RES: the
 * top over the bottom in one, the left beside the right in the other (a
 * board-sized texture would be mostly empty). Returns their keys.
 */
export function bakeRims(scene: Phaser.Scene, level: LevelDef, place: Place): { flat: string; tall: string } {
  const keys = { flat: RIM_TEX.flat(level.id), tall: RIM_TEX.tall(level.id) };
  if (scene.textures.exists(keys.flat) && scene.textures.exists(keys.tall)) return keys;
  const pieces = RIM_STYLES[place](createRng(surroundSeed(level.id) + 77));
  const snowy = snowyAt(level, place);
  const s = rimStrips();
  const fw = s.top.x1 - s.top.x0;
  const fh = s.top.y1 - s.top.y0;
  const flat = makeCanvas(Math.ceil(fw * ART_RES), Math.ceil(fh * 2 * ART_RES));
  paintStrip(flat.ctx, s.top, 0, 0, pieces, snowy);
  paintStrip(flat.ctx, s.bottom, 0, fh, pieces, snowy);
  const tw = s.left.x1 - s.left.x0;
  const th = s.left.y1 - s.left.y0;
  const tall = makeCanvas(Math.ceil(tw * 2 * ART_RES), Math.ceil(th * ART_RES));
  paintStrip(tall.ctx, s.left, 0, 0, pieces, snowy);
  paintStrip(tall.ctx, s.right, tw, 0, pieces, snowy);
  releaseScratch();
  const r = ART_RES;
  addFramed(scene, keys.flat, flat.canvas, [['top', 0, 0, fw * r, fh * r], ['bottom', 0, fh * r, fw * r, fh * r]]);
  addFramed(scene, keys.tall, tall.canvas, [['left', 0, 0, tw * r, th * r], ['right', tw * r, 0, tw * r, th * r]]);
  return keys;
}

/** The wall's pieces that reach into `box`, painted at (ox, oy) board px into the canvas; snow on them in winter. */
function paintStrip(ctx: CanvasRenderingContext2D, box: Box, ox: number, oy: number, pieces: readonly RimPiece[], snowy: boolean): void {
  ctx.save();
  ctx.setTransform(ART_RES, 0, 0, ART_RES, ox * ART_RES, oy * ART_RES);
  ctx.beginPath();
  ctx.rect(0, 0, box.x1 - box.x0, box.y1 - box.y0);
  ctx.clip();
  ctx.translate(-box.x0, -box.y0);
  pieces.forEach((p, i) => {
    if (meets(p.box, box)) p.paint(makeDraw(ctx, 1200 + i, 0, 0));
  });
  if (snowy) {
    pieces.forEach((p, i) => {
      if (meets(p.box, box)) for (const s of p.snow ?? []) snowOnSolid(makeDraw(ctx, 1600 + i, 0, 0), s);
    });
  }
  ctx.restore();
}

function addFramed(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, frames: readonly (readonly [string, number, number, number, number])[]): void {
  const tex = scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
  for (const [name, x, y, w, h] of frames) tex?.add(name, 0, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * The place carrying on past the border: its own ground (painted once more,
 * with none of the level's things, a size up so one painting reaches round
 * the board), snowed on in winter, with scenery from planSurround, at
 * SURROUND.res. Never a mirror of the board. Its origin lies SURROUND.x,
 * SURROUND.y up and left of the board's.
 */
export function bakeSurround(scene: Phaser.Scene, level: LevelDef, place: Place): string {
  const key = RIM_TEX.surround(level.id);
  if (scene.textures.exists(key)) return key;
  const art = placeArt(place);
  const w = BOARD.w + SURROUND.x * 2;
  const h = BOARD.h + SURROUND.y * 2;
  const { canvas, ctx } = makeCanvas(Math.ceil(w * SURROUND.res), Math.ceil(h * SURROUND.res));
  ctx.scale(SURROUND.res, SURROUND.res);
  const seed = surroundSeed(level.id) % 997;
  const plain: LevelDef = { ...level, solids: [], cover: [], nests: [], zones: [] };
  const k = Math.max(w / BOARD.w, h / BOARD.h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(k, k);
  ctx.translate(-BOARD.w / 2, -BOARD.h / 2);
  art.ground(makeDraw(ctx, 900 + seed, 0, 0), plain);
  if (snowyAt(level, place)) winterGround(makeDraw(ctx, 940 + seed, 0, 0), plain, place);
  ctx.restore();
  ctx.translate(SURROUND.x, SURROUND.y);
  const plan = planSurround(level, place);
  plan.covers.forEach((c, i) => paintDailyCover(makeDraw(ctx, 960 + i, 0, 0), c, level, place, art.cover));
  plan.solids.forEach((s, i) => paintDailySolid(makeDraw(ctx, 980 + i, 0, 0), s, level, place, art.solid));
  releaseScratch();
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
  return key;
}
