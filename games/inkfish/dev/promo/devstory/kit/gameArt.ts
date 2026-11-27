import { BIRD_FRAMES, BIRD_TEX, drawBird } from '../../../../src/art/birdArt';
import type { FishShape, InkVariant } from '../../../../src/art/fishArt';
import { drawItem, ITEM_SIZE } from '../../../../src/art/itemArt';
import { INK, makeCanvas } from '../../../../src/art/pen';
import { ART_RES, drawPaper, drawWeed, type WeedKind } from '../../../../src/art/propArt';
import { BOAT_SPEC, drawBoat, type BoatKind } from '../../../../src/art/skyArt';
import { drawSquidPortrait, SQUID_TEX } from '../../../../src/art/squidArt';
import type { ItemId } from '../../../../src/levels/items';
import type { BirdId } from '../../../../src/logic/birds';
import { makeSprite, type Sprite } from '../../sprites';
import { drawSwimmer, type SwimLook } from '../../swimmer';
import type { Rect } from './geom';

/**
 * The game's own art at video size, for the preview window. Nothing here is
 * redrawn: every function bakes the game's drawing (src/art) once, scaled up
 * with a scaled context (pen strokes are vectors, so lines stay crisp), and
 * caches it. All draws are pure functions of `t` (the line boil flips at the
 * game's 8 fps over its 3 frames, so loops stay multiples of 1.5 s).
 */

/** The game's red paint (boats, ticks). */
export const PAINT_RED = '#a3342b';

/** Which of the game's 3 boil frames shows at `t` (8 fps, as in the game). */
export const boilAt = (t: number): number => ((Math.floor(t * 8) % 3) + 3) % 3;

const fishCache = new Map<string, Sprite>();
/** The game's fish sprite (res 4: up to ~1000 px long without blur). Cached. */
export function fishSprite(shape: FishShape, variant: InkVariant = 'light', res = 4): Sprite {
  const key = `${shape}|${variant}|${res}`;
  let s = fishCache.get(key);
  if (!s) {
    s = makeSprite(shape, res, variant);
    fishCache.set(key, s);
  }
  return s;
}

export interface GameFish {
  readonly shape: FishShape;
  /** Body centre, canvas px. */
  readonly x: number;
  readonly y: number;
  /** Body length, px. */
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt?: number;
  /** 'heavy' = the game's predator ink. */
  readonly variant?: InkVariant;
  /** Swim: tail-beat phase (rad) and strength 0..1. Defaults: a calm beat from `t`. */
  readonly beat?: number;
  readonly effort?: number;
  /** Jaw, lump, eyes, squash… (see swimmer.ts). */
  readonly look?: SwimLook;
}

/** A game fish, swimming (bends with its tail beat, can gape and gulp). */
export function drawGameFish(ctx: CanvasRenderingContext2D, f: GameFish, t: number): void {
  const sprite = fishSprite(f.shape, f.variant ?? 'light', f.length > 520 ? 6 : 4);
  drawSwimmer(ctx, sprite, {
    j: 0, shape: f.shape, age: 0, x: f.x, y: f.y, length: f.length, facing: f.facing, tilt: f.tilt ?? 0,
    beat: f.beat ?? t * 7, effort: f.effort ?? 0.5,
  }, boilAt(t), f.look);
}

/** A still canvas of a fish (one boil frame), sized `length` px long, facing right: input for the pen-draw reveal. */
export function fishStill(shape: FishShape, length: number, variant: InkVariant = 'light'): HTMLCanvasElement {
  const pad = 0.75;
  const { canvas, ctx } = makeCanvas(Math.ceil(length * (1 + pad)), Math.ceil(length * (1 + pad) * 0.7));
  drawGameFish(ctx, { shape, x: canvas.width / 2, y: canvas.height / 2, length, facing: 1, variant, effort: 0 }, 0);
  return trim(canvas);
}

/** Crops a canvas to its painted pixels (+pad). */
export function trim(src: HTMLCanvasElement, pad = 6): HTMLCanvasElement {
  const d = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data;
  let x0 = src.width, y0 = src.height, x1 = 0, y1 = 0;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (d[(y * src.width + x) * 4 + 3]! > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0) return src;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(src.width - 1, x1 + pad); y1 = Math.min(src.height - 1, y1 + pad);
  const { canvas, ctx } = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
  ctx.drawImage(src, -x0, -y0);
  return canvas;
}

const bakeCache = new Map<string, HTMLCanvasElement>();
function baked(key: string, w: number, h: number, res: number, paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let c = bakeCache.get(key);
  if (!c) {
    const made = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
    made.ctx.scale(res, res);
    paint(made.ctx);
    c = made.canvas;
    bakeCache.set(key, c);
  }
  return c;
}

/** Draws `img` centred on (x, y), `width` px wide, mirrored when facing -1, rotated `rot`. */
function place(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, width: number, facing: 1 | -1 = 1, rot = 0, alpha = 1): void {
  const h = (width * img.height) / img.width;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(facing, 1);
  ctx.drawImage(img, -width / 2, -h / 2, width, h);
  ctx.restore();
}

/** The giant squid boss portrait (arms fanned), baked at 3x. Facing right = mantle left, arms right (as in the game). */
export function squidImage(): HTMLCanvasElement {
  return baked('squid', SQUID_TEX.portrait.w, SQUID_TEX.portrait.h, 3, (c) => drawSquidPortrait(c, 'heavy', 77));
}
export interface PlacedArt { readonly x: number; readonly y: number; readonly width: number; readonly facing?: 1 | -1; readonly rot?: number; readonly alpha?: number }
/** The giant squid boss, centred on (x, y), `width` px wide, with a slow breathing bob. */
export function drawGameSquid(ctx: CanvasRenderingContext2D, p: PlacedArt, t: number): void {
  const bob = Math.sin(t * 2.2) * p.width * 0.006;
  place(ctx, squidImage(), p.x, p.y + bob, p.width * (1 + 0.012 * Math.sin(t * 2.2)), p.facing ?? 1, p.rot ?? 0, p.alpha);
}

/** One of the game's items (the rubber duck decoy is 'duck'), baked at 6x the game's item size per boil frame (the painters draw at ART_RES). */
export function itemImage(kind: ItemId, frame = 0): HTMLCanvasElement {
  return baked(`item-${kind}-${frame}`, ITEM_SIZE * ART_RES, ITEM_SIZE * ART_RES, 3, (c) => drawItem(c, kind, 101 + frame * 977));
}
/** A game item centred on (x, y), `width` px wide. The duck faces left in the game's drawing; pass facing -1 to turn it. */
export function drawGameItem(ctx: CanvasRenderingContext2D, kind: ItemId, p: PlacedArt, t: number): void {
  place(ctx, itemImage(kind, boilAt(t)), p.x, p.y, p.width, p.facing ?? 1, p.rot ?? 0, p.alpha);
}

/** A game bird (tern, gull, pelican, gannet, dragonfly), flapping through its 4 frames at `flapHz`. */
export function drawGameBird(ctx: CanvasRenderingContext2D, kind: BirdId, p: PlacedArt, t: number, flapHz = 6, dive = false): void {
  const frame = dive ? BIRD_FRAMES - 1 : Math.floor(t * flapHz) % (BIRD_FRAMES - 1);
  const img = baked(`bird-${kind}-${frame}`, BIRD_TEX.w * ART_RES, BIRD_TEX.h * ART_RES, 2.5, (c) => drawBird(c, kind, frame, 5 + frame));
  place(ctx, img, p.x, p.y, p.width, p.facing ?? 1, p.rot ?? 0, p.alpha);
}

/** A game boat; (x, y) is the middle of its waterline. */
export function drawGameBoat(ctx: CanvasRenderingContext2D, kind: BoatKind, p: PlacedArt, t: number): void {
  const spec = BOAT_SPEC[kind];
  const img = baked(`boat-${kind}`, spec.w * ART_RES, spec.h * ART_RES, 1.5, (c) => drawBoat(c, kind, 31));
  const s = p.width / spec.w;
  const rock = Math.sin(t * 1.7) * 0.03;
  place(ctx, img, p.x, p.y - (spec.waterline - spec.h / 2) * s + Math.sin(t * 2.1) * 2, p.width, p.facing ?? 1, (p.rot ?? 0) + rock, p.alpha);
}

/** Game seaweed (kinds 0..2) standing on (x, y = its foot), `height` px tall, swaying with the boil. */
export function drawGameWeed(ctx: CanvasRenderingContext2D, kind: WeedKind, x: number, y: number, height: number, t: number, alpha = 1): void {
  const frame = boilAt(t);
  const img = baked(`weed-${kind}-${frame}`, 128 * 3, 256 * 3, 1, (c) => drawWeed(c, 7 + kind * 13, kind, frame, 128 * 3, 256 * 3));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.3 + x * 0.01) * 0.04);
  const w = (height * img.width) / img.height;
  ctx.drawImage(img, -w / 2, -height, w, height);
  ctx.restore();
}

let paperTile: HTMLCanvasElement | null = null;
/** The game's sketchbook paper as a repeating pattern. */
export function paperPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  if (!paperTile) {
    const made = makeCanvas(512, 512);
    drawPaper(made.ctx, 512);
    paperTile = made.canvas;
  }
  return ctx.createPattern(paperTile, 'repeat')!;
}

export interface SeaLook {
  /** Waterline y (canvas px); above it the sky. Omit for all water. */
  readonly surfaceY?: number;
  /** 0 day .. 1 night (the ducks' 3 a.m.). */
  readonly night?: number;
  /** Deeper = darker wash at the bottom, 0..1. */
  readonly depth?: number;
}

/** The game's sea as a backdrop in `r`: paper, blue washes deepening downwards, sky, an inked waterline, current marks. */
export function drawSea(ctx: CanvasRenderingContext2D, r: Rect, t: number, look: SeaLook = {}): void {
  const night = look.night ?? 0;
  const depth = look.depth ?? 0.4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = paperPattern(ctx);
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const top = look.surfaceY ?? r.y;
  if (look.surfaceY !== undefined && top > r.y) {
    const sky = ctx.createLinearGradient(0, r.y, 0, top);
    sky.addColorStop(0, night ? `rgba(20,28,58,${0.55 + night * 0.35})` : 'rgba(120,170,210,0.32)');
    sky.addColorStop(1, night ? `rgba(40,52,92,${0.4 + night * 0.3})` : 'rgba(190,215,230,0.18)');
    ctx.fillStyle = sky;
    ctx.fillRect(r.x, r.y, r.w, top - r.y);
  }
  const sea = ctx.createLinearGradient(0, top, 0, r.y + r.h);
  sea.addColorStop(0, `rgba(44,79,134,${0.16 + night * 0.4})`);
  sea.addColorStop(1, `rgba(28,42,74,${0.3 + depth * 0.4 + night * 0.3})`);
  ctx.fillStyle = sea;
  ctx.fillRect(r.x, top, r.w, r.y + r.h - top);
  // Current marks, drifting slowly.
  ctx.strokeStyle = night > 0.5 ? 'rgba(220,226,240,0.35)' : 'rgba(27,26,31,0.28)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const fx = ((i * 0.618) % 1);
    const fy = ((i * 0.381 + 0.13) % 1);
    const x = r.x + ((fx * r.w + t * 12) % r.w);
    const y = top + 30 + fy * (r.y + r.h - top - 50);
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const px = x + k * 3.2;
      const py = y + Math.sin(k * 0.8 + t * 2 + i) * 3;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  if (look.surfaceY !== undefined) {
    ctx.strokeStyle = night > 0.5 ? 'rgba(230,236,250,0.85)' : INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = r.x; x <= r.x + r.w; x += 8) {
      const y = top + Math.sin(x * 0.03 + t * 2.4) * 3 + Math.sin(x * 0.011 - t * 1.3) * 2;
      if (x === r.x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export type { BoatKind, BirdId, ItemId, WeedKind, FishShape };
