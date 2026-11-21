import { createRng } from '../../../src/logic/rng';
import { zonePoly } from '../../../src/art/chapters/floodedPlaceKit';
import { FLOODED_PLACE } from '../../../src/art/chapters/floodedPlace';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BOARD, type CoverDef, type LevelDef, type ZoneDef } from '../../../src/level/types';
import { VIDEO } from '../short';
import type { GroundLayer } from './camera';

/**
 * Chapter 10's flooded forest, painted by the game's own painter on one board
 * and laid out to every side as mirrored tiles, so the camera can wander: a
 * bank of sedge and mud along the board's bottom edge, the tea-dark
 * blackwater above it with lily pads. The board is drawn turned a quarter,
 * to suit the tall video, so the water lies to the right of the bank, where
 * the anaconda waits, and the capybara comes down to it from the left.
 */
const SHORE = 300;
const shoreY = (i: number): number => Math.round(540 - (SHORE + 14 * Math.sin(i * 1.3 + 0.6) + 8 * Math.cos(i * 2.1 - 0.6)));
const BANK: ZoneDef = {
  kind: 'land', look: 'bank', shape: 'poly',
  points: [{ x: -20, y: 560 }, ...Array.from({ length: 13 }, (_, i) => ({ x: Math.round(-20 + (1000 * i) / 12), y: shoreY(i) })), { x: 980, y: 560 }],
};
const WATER: ZoneDef = { kind: 'water', look: 'blackwater', shape: 'rect', x: -20, y: -20, w: 1000, h: 580 };
const COVER: readonly CoverDef[] = [
  { look: 'lily', x: 250, y: 120, r: 46 },
  { look: 'lily', x: 560, y: 70, r: 40 },
  { look: 'lily', x: 820, y: 140, r: 44 },
  { look: 'water-lettuce', x: 90, y: 60, r: 36 },
];

const LEVEL: LevelDef = {
  id: 'promo-gulpcapy', name: 'Black Water', snake: 'anaconda', start: { x: 480, y: 270 }, heading: 0, length: 210, target: 500, par: 50,
  prey: [], zones: [WATER, BANK], solids: [], cover: COVER,
};

/** Ground units (world units at zoom 1) per board px, and canvas px per board px. */
const SCALE = 2.5;
const RES = 3;
const TILE = { w: BOARD.h * SCALE, h: BOARD.w * SCALE } as const;

/** Where frame 1's camera falls in a tile: the shore just past the capybara's nose. */
const IN_TILE = { x: 800, y: 1200 } as const;

/** The shore as a line along the board, x across it. */
const SHORE_LINE = zonePoly(BANK).filter((p) => p.y < 520 && p.x > -15 && p.x < 975).sort((a, b) => a.x - b.x);

/**
 * The blackwater's face, over the game's wash, so it reads as water at this
 * scale: the canopy's light reflected in long soft bands down the current,
 * thin glints, and the ripples lapping along the shore.
 */
function waterSheen(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-20, -20);
  SHORE_LINE.forEach((p) => ctx.lineTo(p.x, p.y + 4));
  ctx.lineTo(980, -20);
  ctx.closePath();
  ctx.clip();
  const across = ctx.createLinearGradient(0, 0, 0, 250);
  across.addColorStop(0, 'rgba(176,196,186,0.22)');
  across.addColorStop(0.5, 'rgba(120,150,150,0.1)');
  across.addColorStop(1, 'rgba(40,30,20,0.18)');
  ctx.fillStyle = across;
  ctx.fillRect(-20, -20, 1000, 300);
  const rng = createRng(4711);
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const y = 10 + rng() * 210;
    const x = rng() * 960;
    const len = 60 + rng() * 180;
    ctx.strokeStyle = `rgba(226,232,214,${0.1 + rng() * 0.18})`;
    ctx.lineWidth = 0.6 + rng() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y + (rng() - 0.5) * 6, x + len, y);
    ctx.stroke();
  }
  for (const [off, alpha] of [[-7, 0.4], [-15, 0.26], [-26, 0.15]] as const) {
    ctx.strokeStyle = `rgba(236,232,212,${alpha})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    SHORE_LINE.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + off) : ctx.lineTo(p.x, p.y + off + 2 * Math.sin(i * 2.3))));
    ctx.stroke();
  }
  ctx.restore();
}

export interface Bank {
  readonly canvas: HTMLCanvasElement;
}

export function paintBank(): Bank {
  const { canvas, ctx } = makeCanvas(BOARD.h * RES, BOARD.w * RES);
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.scale(RES, RES);
  const place = FLOODED_PLACE!;
  place.ground(makeDraw(ctx, 1741, 0, 0), LEVEL);
  waterSheen(ctx);
  for (const cv of COVER) place.cover?.(makeDraw(ctx, 1751, 0, 0), cv);
  releaseScratch();
  return { canvas };
}

const EDGE = 8 * RES;
const odd = (n: number): boolean => ((n % 2) + 2) % 2 === 1;

function drawLayer(ctx: CanvasRenderingContext2D, bank: Bank, g: GroundLayer): void {
  if (g.alpha <= 0) return;
  const [w, h] = [TILE.w * g.zoom, TILE.h * g.zoom];
  const x = g.x - IN_TILE.x * g.zoom;
  const y = g.y - IN_TILE.y * g.zoom;
  const ix0 = Math.floor(-x / w);
  const iy0 = Math.floor(-y / h);
  const ix1 = Math.floor((VIDEO.width - x) / w);
  const iy1 = Math.floor((VIDEO.height - y) / h);
  ctx.save();
  ctx.globalAlpha = g.alpha;
  for (let iy = iy0; iy <= iy1; iy++) {
    for (let ix = ix0; ix <= ix1; ix++) {
      ctx.save();
      // Each tile mirrors its neighbours, so their edges meet.
      ctx.translate(x + (odd(ix) ? (ix + 1) * w : ix * w), y + (odd(iy) ? (iy + 1) * h : iy * h));
      ctx.scale(odd(ix) ? -1 : 1, odd(iy) ? -1 : 1);
      // Inset a little: the painter darkens the board's very edge, which would show as a seam.
      ctx.drawImage(bank.canvas, EDGE, EDGE, bank.canvas.width - 2 * EDGE, bank.canvas.height - 2 * EDGE, 0, 0, w, h);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawBank(ctx: CanvasRenderingContext2D, bank: Bank, layers: readonly GroundLayer[]): void {
  for (const g of layers) drawLayer(ctx, bank, g);
}
