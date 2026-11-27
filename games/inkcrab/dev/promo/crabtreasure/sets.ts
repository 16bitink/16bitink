import { THEMES } from '../../../src/art/backdrop';
import { clouds, SKY_H } from '../../../src/art/backdrop/atoll';
import { BACKDROP_W } from '../../../src/art/backdrop/common';
import { cub, type Draw, makeDraw, pt } from '../../../src/art/kit';
import { INK, PALE_SAND, PAPER, SAND_GRAIN } from '../../../src/art/palette';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { drawChunk, makeSandPatterns, CHUNK_PAD } from '../../../src/art/sand';
import { createTerrain, setTile, TILE, type Terrain } from '../../../src/logic/terrain';
import { VIDEO } from '../short';
import { DIGS, G, LOOP_S } from './story';

/**
 * The two places: the son's beach (beach 1's Maldives colours, painted soft,
 * as if the camera were focused on him) and the game's own view of beach 1
 * (its atoll backdrop, sharp, over the game's diggable sand, drawn by the
 * game's terrain renderer tile for tile as the crab digs).
 */
const K = VIDEO.width / BACKDROP_W;

/**
 * Beach 1's far layers, stacked as the game stacks them (backdropView.ts):
 * each layer's bottom sits `lift` world px above the ground line (design px
 * at BACKDROP_SCALE 0.5, hence the 2), so the lagoon runs on behind the palms.
 */
function layers(ctx: CanvasRenderingContext2D, ground: number, scale: number, seed: number): void {
  const layer = (height: number, lift: number, s: number, draw: (d: Draw) => void): void => {
    ctx.save();
    ctx.translate(0, ground - (2 * lift + height) * scale);
    ctx.scale(scale, scale);
    draw(makeDraw(ctx, seed + s, 0, 0));
    ctx.restore();
  };
  for (const [i, l] of THEMES.atoll.entries()) if (l.id !== 'clouds') layer(l.height, l.lift, i, l.draw);
}

/** Where the clouds' layer starts, stacked the same way. */
const cloudsTop = (ground: number): number => {
  const l = THEMES.atoll.find((x) => x.id === 'clouds')!;
  return ground - (2 * l.lift + l.height) * K;
};

/** A bright tropical sky, deepest at the top. */
function skyWash(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#5fb6e6');
  g.addColorStop(0.6, '#a6dcf2');
  g.addColorStop(1, '#e3f5fb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------- the son's beach

/** Where the far bank of the island meets our sand. */
const BANK = 1040;

export interface BeachSet {
  readonly base: HTMLCanvasElement;
  readonly clouds: HTMLCanvasElement;
  readonly cloudsTop: number;
}

/** The near sand: white coral sand, warmer towards us, with soft grain and ripples. */
function nearSand(ctx: CanvasRenderingContext2D, top: number): void {
  const d = makeDraw(ctx, 55, 0, 0);
  const edge: Pt[] = Array.from({ length: 46 }, (_, i) => pt(-20 + i * 25, top + 7 * Math.sin(i * 0.6) + 3 * Math.sin(i * 1.7)));
  const shape = [...edge, pt(1110, VIDEO.height + 10), pt(-30, VIDEO.height + 10)];
  const g = ctx.createLinearGradient(0, top, 0, VIDEO.height);
  g.addColorStop(0, '#fbf5e6');
  g.addColorStop(0.45, '#f9ecd2');
  g.addColorStop(1, '#f4dfb8');
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  d.pen.stipple(shape, 3800, (_, y) => 0.12 + 0.35 * Math.min(1, (y - top) / 800), 1.6, SAND_GRAIN);
  d.pen.stroke(edge, 2, INK, 0.25, false);
  for (const [x, y, w] of [[60, 1150, 200], [640, 1180, 260], [300, 1260, 180], [820, 1290, 200], [40, 1700, 240], [700, 1760, 300], [380, 1860, 220]] as const) {
    d.pen.hair(cub(pt(x, y), pt(x + w * 0.3, y - 9), pt(x + w * 0.7, y + 9), pt(x + w, y), 12), 2.4, INK, 0.16);
  }
}

/**
 * Baked once, at a third of the size and scaled up, so the far island goes
 * soft behind the son (the look of a photo focused on him), then the near
 * sand at full size, a touch softer too.
 */
export function makeBeachSet(): BeachSet {
  const S = 3;
  const small = makeCanvas(Math.ceil(VIDEO.width / S), Math.ceil(VIDEO.height / S));
  small.ctx.scale(1 / S, 1 / S);
  skyWash(small.ctx, VIDEO.width, VIDEO.height, BANK);
  layers(small.ctx, BANK, K, 900);
  const sand = makeCanvas(Math.ceil(VIDEO.width / 1.6), Math.ceil(VIDEO.height / 1.6));
  sand.ctx.scale(1 / 1.6, 1 / 1.6);
  nearSand(sand.ctx, BANK - 14);
  const { canvas: base, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small.canvas, 0, 0, VIDEO.width, VIDEO.height);
  ctx.drawImage(sand.canvas, 0, 0, VIDEO.width, VIDEO.height);
  const c = makeCanvas(Math.ceil((VIDEO.width + 80) / S), Math.ceil((SKY_H * K + 20) / S));
  c.ctx.scale(1 / S, 1 / S);
  c.ctx.translate(40, 0);
  c.ctx.scale(K, K);
  clouds(makeDraw(c.ctx, 905, 0, 0));
  return { base, clouds: c.canvas, cloudsTop: cloudsTop(BANK) };
}

export function drawBeachSet(ctx: CanvasRenderingContext2D, set: BeachSet, t: number): void {
  ctx.drawImage(set.base, 0, 0);
  const sway = 18 * Math.sin((2 * Math.PI * t) / LOOP_S);
  ctx.drawImage(set.clouds, -40 + sway, set.cloudsTop, VIDEO.width + 80, set.clouds.height * 3);
}

// ---------------------------------------------------------------- the game's beach 1

/** The game's surface line on screen: the atoll's shore stands on it. */
export const SURFACE_Y = G.oy + G.surface * G.tile;
/** How much finer than the close-up the sand's hatching is drawn. */
const HATCH = 0.25;

export interface GameSet {
  readonly base: HTMLCanvasElement;
  readonly clouds: HTMLCanvasElement;
  readonly cloudsTop: number;
  /** The terrain after each number of dig events, drawn when first needed. */
  readonly terrain: (digs: number) => HTMLCanvasElement;
  readonly deep: HTMLCanvasElement;
}

/** The level's sand: rows from the surface down, a low dune on the right, and the dig events' holes. */
function terrainAfter(digs: number): Terrain {
  const t = createTerrain(G.cols, G.cols * 2);
  for (let y = 0; y < G.cols * 2; y++) {
    for (let x = 0; x < G.cols; x++) {
      if (y >= G.surface) setTile(t, x, y, TILE.sand);
    }
  }
  DIGS.slice(0, digs).forEach(([, tiles]) => tiles.forEach(([x, y]) => setTile(t, x, y, TILE.air)));
  return t;
}

export function makeGameSet(): GameSet {
  const { canvas: base, ctx } = makeCanvas(VIDEO.width, SURFACE_Y + 40);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, SURFACE_Y + 40);
  const top = cloudsTop(SURFACE_Y);
  skyWash(ctx, VIDEO.width, Math.max(0, top) + 40, Math.max(1, top + 40));
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, Math.max(0, top) + 30, VIDEO.width, VIDEO.height);
  layers(ctx, SURFACE_Y, K, 700);
  const c = makeCanvas(VIDEO.width + 80, Math.ceil(SKY_H * K) + 20);
  c.ctx.translate(40, 0);
  c.ctx.scale(K, K);
  clouds(makeDraw(c.ctx, 705, 0, 0));
  const cache = new Map<number, HTMLCanvasElement>();
  const res = G.tile / 16;
  const size = Math.ceil((G.cols * 16 + CHUNK_PAD * 2) * res);
  const chunk = (digs: number, ty: number): HTMLCanvasElement => {
    const { canvas, ctx: tctx } = makeCanvas(size, size);
    const patterns = makeSandPatterns(tctx, res, PALE_SAND);
    // The hatching at the size it has on a phone, not blown up with the close-up: finer strokes, same sand.
    for (const p of Object.values(patterns)) p.setTransform(new DOMMatrix().scale(HATCH / res));
    drawChunk(tctx, terrainAfter(digs), { tx: 0, ty, tiles: G.cols }, 16, res, patterns, PALE_SAND);
    return canvas;
  };
  // The deep sand below the dig never changes: one chunk for it.
  const deep = chunk(0, G.cols);
  const terrain = (digs: number): HTMLCanvasElement => {
    const hit = cache.get(digs);
    if (hit) return hit;
    const canvas = chunk(digs, 0);
    cache.set(digs, canvas);
    return canvas;
  };
  return { base, clouds: c.canvas, cloudsTop: top, terrain, deep };
}

export function drawGameSet(ctx: CanvasRenderingContext2D, set: GameSet, digs: number, t: number): void {
  ctx.drawImage(set.base, 0, 0);
  const sway = 18 * Math.sin((2 * Math.PI * t) / LOOP_S);
  ctx.drawImage(set.clouds, -40 + sway, set.cloudsTop);
  const pad = CHUNK_PAD * (G.tile / 16);
  ctx.drawImage(set.deep, G.ox - pad, G.oy + G.cols * G.tile - pad);
  ctx.drawImage(set.terrain(digs), G.ox - pad, G.oy - pad);
}
