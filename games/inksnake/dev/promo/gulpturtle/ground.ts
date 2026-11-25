import { createRng } from '../../../src/logic/rng';
import { zonePoly } from '../../../src/art/chapters/floodedPlaceKit';
import { FLOODED_PLACE } from '../../../src/art/chapters/floodedPlace';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BOARD, type CoverDef, type LevelDef, type ZoneDef } from '../../../src/level/types';
import { VIDEO } from '../short';
import type { GroundLayer } from '../gulpcapy/camera';

/**
 * Chapter 10's flooded bank, as the capybara short's (../gulpcapy/ground.ts:
 * the game's painter, its board turned a quarter, the water to the right),
 * but laid out with no mirroring: one shore running down the whole world,
 * open bank to its left, open blackwater to its right, every tile its own
 * painting, each fading into the one before it. The tile frame 1 sits on is
 * the capybara short's own.
 */

/** Ground units (world units at zoom 1) per board px, and canvas px per board px. */
const SCALE = 2.5;
const RES = 3;
const EDGE_PX = 8;
const TILE = { w: BOARD.h * SCALE, h: BOARD.w * SCALE } as const;
/** Ground units per board px down a tile: its edges, where the painter darkens, are left off. */
const DOWN = TILE.h / (BOARD.w - 2 * EDGE_PX);

/** Where frame 1's camera falls in its tile: the shore just past the turtle's nose. */
const IN_TILE = { x: 800, y: 1200 } as const;

/** The shore's points are this far apart (board px); a tile's shore runs on from the one above it STEPS of them up. */
const SHORE = 300;
const SPACING = 1000 / 12;
const STEPS = 10;
const PITCH = { x: TILE.w - 170, y: STEPS * SPACING * DOWN } as const;
/** How far a tile overlaps the ones before it, and fades in over them. */
const OVERLAP = { x: TILE.w - PITCH.x, y: TILE.h - PITCH.y } as const;

const shoreY = (i: number): number => Math.round(540 - (SHORE + 14 * Math.sin(i * 1.3 + 0.6) + 8 * Math.cos(i * 2.1 - 0.6)));

type Kind = 'shore' | 'bank' | 'water';
const WATER: ZoneDef = { kind: 'water', look: 'blackwater', shape: 'rect', x: -20, y: -20, w: 1000, h: 580 };
const ALL_BANK: ZoneDef = { kind: 'land', look: 'bank', shape: 'poly', points: [{ x: -60, y: -60 }, { x: 1020, y: -60 }, { x: 1020, y: 600 }, { x: -60, y: 600 }] };

function shoreBank(j: number): ZoneDef {
  // Past the board's ends too, off the frame-1 tile, so neighbours' shores meet.
  const [from, to] = j === 0 ? [0, 12] : [-2, 14];
  const points = Array.from({ length: to - from + 1 }, (_, n) => ({ x: Math.round(-20 + SPACING * (from + n)), y: shoreY(from + n + j * STEPS) }));
  const [x0, x1] = [points[0]!.x, points[points.length - 1]!.x];
  return { kind: 'land', look: 'bank', shape: 'poly', points: [{ x: x0, y: 560 }, ...points, { x: x1, y: 560 }] };
}

const lily = (x: number, y: number, r: number): CoverDef => ({ look: 'lily', x, y, r });
const lettuce = (x: number, y: number, r: number): CoverDef => ({ look: 'water-lettuce', x, y, r });

/** Frame 1's pads; every other tile has a few of its own, nowhere in the same place. */
function coverOf(kind: Kind, i: number, j: number): readonly CoverDef[] {
  if (kind === 'bank') return [];
  if (kind === 'shore' && j === 0) return [lily(250, 120, 46), lily(560, 70, 40), lily(820, 140, 44), lettuce(90, 60, 36)];
  const rng = createRng(9176 + i * 733 + j * 4099);
  rng();
  const reach = kind === 'shore' ? 130 : 420;
  const n = kind === 'shore' ? 3 : 5;
  return Array.from({ length: n }, (_, k) => {
    const x = 90 + ((k + 0.15 + 0.7 * rng()) * 780) / n;
    const y = 60 + rng() * reach;
    return rng() < 0.3 ? lettuce(x, y, 30 + 10 * rng()) : lily(x, y, 34 + 14 * rng());
  });
}

const levelOf = (kind: Kind, i: number, j: number, zones: readonly ZoneDef[]): LevelDef => ({
  id: kind === 'shore' && j === 0 ? 'promo-gulpcapy' : `promo-gulpturtle-${kind}-${i}-${j}`,
  name: 'Black Water', snake: 'anaconda', start: { x: 480, y: 270 }, heading: 0, length: 210, target: 500, par: 50,
  prey: [], zones, solids: [], cover: coverOf(kind, i, j),
});

/** Soft light on the open water, thin glints down the current, and ripples lapping a shore. */
function sheen(ctx: CanvasRenderingContext2D, kind: Kind, seed: number, shore: readonly { x: number; y: number }[]): void {
  ctx.save();
  ctx.beginPath();
  if (kind === 'shore') {
    ctx.moveTo(-20, -20);
    shore.forEach((p) => ctx.lineTo(p.x, p.y + 4));
    ctx.lineTo(980, -20);
  } else ctx.rect(-20, -20, 1000, 580);
  ctx.closePath();
  ctx.clip();
  const across = ctx.createLinearGradient(0, 0, 0, 250);
  const tones = kind === 'shore' ? ['rgba(176,196,186,0.22)', 'rgba(120,150,150,0.1)', 'rgba(40,30,20,0.18)'] : Array(3).fill('rgba(176,196,186,0.22)');
  tones.forEach((c: string, i) => across.addColorStop(i / 2, c));
  ctx.fillStyle = across;
  ctx.fillRect(-20, -20, 1000, 580);
  const rng = createRng(seed);
  ctx.lineCap = 'round';
  const [n, deep] = kind === 'shore' ? [26, 210] : [52, 530];
  for (let i = 0; i < n; i++) {
    const y = 10 + rng() * deep;
    const x = rng() * 960;
    const len = 60 + rng() * 180;
    ctx.strokeStyle = `rgba(226,232,214,${0.1 + rng() * 0.18})`;
    ctx.lineWidth = 0.6 + rng() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y + (rng() - 0.5) * 6, x + len, y);
    ctx.stroke();
  }
  if (kind === 'shore') {
    for (const [off, alpha] of [[-7, 0.4], [-15, 0.26], [-26, 0.15]] as const) {
      ctx.strokeStyle = `rgba(236,232,212,${alpha})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      shore.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + off) : ctx.lineTo(p.x, p.y + off + 2 * Math.sin(i * 2.3))));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Fades a tile's left and top edges, over the overlap. */
function feather(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  for (const [x, y] of [[(OVERLAP.x / TILE.w) * w, 0], [0, (OVERLAP.y / TILE.h) * h]] as const) {
    const g = ctx.createLinearGradient(0, 0, x, y);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function paintTile(kind: Kind, i: number, j: number): HTMLCanvasElement {
  const bank = shoreBank(j);
  const zones = { shore: [WATER, bank], bank: [WATER, ALL_BANK], water: [WATER] }[kind];
  const level = levelOf(kind, i, j, zones);
  const seed = kind === 'shore' && j === 0 ? 0 : 1 + Math.abs(i * 37 + j * 101 + (i < 0 ? 17 : 0) + (j < 0 ? 29 : 0));
  const board = makeCanvas(BOARD.h * RES, BOARD.w * RES);
  board.ctx.translate(board.canvas.width, 0);
  board.ctx.rotate(Math.PI / 2);
  board.ctx.scale(RES, RES);
  const place = FLOODED_PLACE!;
  place.ground(makeDraw(board.ctx, 1741 + seed, 0, 0), level);
  if (kind !== 'bank') {
    const shore = kind === 'shore' ? zonePoly(bank).filter((p) => p.y < 520 && p.x > -15 && p.x < 975).sort((a, b) => a.x - b.x) : [];
    sheen(board.ctx, kind, 4711 + seed, shore);
  }
  for (const cv of level.cover ?? []) place.cover?.(makeDraw(board.ctx, 1751 + seed, 0, 0), cv);
  // The painter darkens the board's very edge: cut it off.
  const e = EDGE_PX * RES;
  const tile = makeCanvas(board.canvas.width - 2 * e, board.canvas.height - 2 * e);
  tile.ctx.drawImage(board.canvas, -e, -e);
  feather(tile.ctx, tile.canvas.width, tile.canvas.height);
  board.canvas.width = 0;
  releaseScratch();
  return tile.canvas;
}

/** Ground drawn past the frame's edges, for the camera's shake. */
const MARGIN = 40;

export interface Ground {
  readonly tile: (i: number, j: number) => HTMLCanvasElement;
  readonly scratch: { readonly canvas: HTMLCanvasElement; readonly ctx: CanvasRenderingContext2D };
}

/** The world's tiles, painted as they're first needed: the shore down column 0; bank and water repeat only far apart. */
export function paintGround(): Ground {
  const cache = new Map<string, HTMLCanvasElement>();
  const mod = (n: number, m: number): number => ((n % m) + m) % m;
  return {
    scratch: makeCanvas(VIDEO.width + 2 * MARGIN, VIDEO.height + 2 * MARGIN),
    tile: (i, j) => {
      const kind: Kind = i === 0 ? 'shore' : i < 0 ? 'bank' : 'water';
      const [ci, cj] = kind === 'shore' ? [0, j] : [kind === 'bank' ? -1 - mod(i + 2 * j, 3) : 1 + mod(i + j, 2), 0];
      const key = `${kind} ${ci} ${cj}`;
      const found = cache.get(key) ?? paintTile(kind, ci, cj);
      cache.set(key, found);
      return found;
    },
  };
}

function drawTiles(ctx: CanvasRenderingContext2D, ground: Ground, g: GroundLayer): void {
  const [w, h] = [TILE.w * g.zoom, TILE.h * g.zoom];
  const [px, py] = [PITCH.x * g.zoom, PITCH.y * g.zoom];
  const x = g.x - IN_TILE.x * g.zoom + MARGIN;
  const y = g.y - IN_TILE.y * g.zoom + MARGIN;
  const { width, height } = ctx.canvas;
  // One tile further up and left than shows, so a fading edge always has one under it.
  const i0 = Math.floor((-x - w) / px);
  const j0 = Math.floor((-y - h) / py);
  for (let j = j0; y + j * py < height; j++) {
    for (let i = i0; x + i * px < width; i++) {
      if (x + i * px + w < 0 || y + j * py + h < 0) continue;
      ctx.drawImage(ground.tile(i, j), x + i * px, y + j * py, w, h);
    }
  }
}

export function drawGround(ctx: CanvasRenderingContext2D, ground: Ground, layers: readonly GroundLayer[]): void {
  for (const g of layers) {
    if (g.alpha <= 0) continue;
    // Composed whole, then faded in as one, so the tiles' overlaps never show through.
    const s = ground.scratch;
    s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
    drawTiles(s.ctx, ground, g);
    ctx.save();
    ctx.globalAlpha = g.alpha;
    ctx.drawImage(s.canvas, -MARGIN, -MARGIN);
    ctx.restore();
  }
}
