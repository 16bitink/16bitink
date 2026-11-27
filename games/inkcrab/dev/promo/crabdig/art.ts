import { THEMES } from '../../../src/art/backdrop';
import { BACKDROP_W } from '../../../src/art/backdrop/common';
import { drawCrabBack, drawCrabFront, type CrabColors } from '../../../src/art/crabArt';
import { FOOT, FRAME, GROUND, SHELL_MID, SHELL_UNITS } from '../../../src/art/frame';
import { drawPuff } from '../../../src/art/itemArt';
import { makeDraw } from '../../../src/art/kit';
import { crabShift } from '../../../src/art/mouth';
import { HIGHLIGHT, INK, PALE_SAND, SAND_GRAIN, SAND_WET } from '../../../src/art/palette';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { fitFor } from '../../../src/art/shellFit';
import { drawChunk, makeSandPatterns } from '../../../src/art/sand';
import { createTerrain, setTile, TILE, type Terrain } from '../../../src/logic/terrain';
import type { ShellKind } from '../../../src/logic/shells';
import { bakeSprite, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { VIDEO } from '../short';

/**
 * The pictures of the dig short, all from the game's own drawings: the
 * atoll's backdrop (beach 1, the Maldives), the game's hatched sand
 * (drawChunk over a tile grid, as terrainView.ts draws it), the player
 * hermit crab and its shells, and the puff of sand it moves house behind.
 * New here: the old skin (the crab's own drawing in pale ink), grains of
 * sand, the damp, the sun and moon racing over, and tracks on the beach.
 */
const RES = 4;
/** Frame px from a shell's middle to its opening (the anchor all the crab's layers share). */
const FOOT_FROM_MIDDLE = FOOT.x - SHELL_MID;
/** Local x of FOOT in a sprite (drawSprite places local x 0). */
const FOOT_LOCAL = FOOT.x - FRAME / 2;
/** A crab fills this much of a shell its own size (the game's bodyFill near the cap). */
const FULL = 0.93;
/** The old skin: the crab's own shape, washed pale, in a faded ink. */
const SKIN_COLORS: CrabColors = { body: '#f3ead6', tip: '#ddd0b4', soft: '#f4e6dc' };
const SKIN_INK = '#7d82a3';

export interface Cast {
  readonly back: Sprite;
  readonly front: Sprite;
  readonly nakedBack: Sprite;
  readonly nakedFront: Sprite;
  readonly skinBack: Sprite;
  readonly skinFront: Sprite;
  readonly shells: ReadonlyMap<ShellKind, Sprite>;
  readonly fits: ReadonlyMap<ShellKind, number>;
  readonly puff: Sprite;
}

/** How much to scale a kind's drawing so it is drawn to its size, as the game's measureShell does. */
function measuredFit(sprite: Sprite): number {
  const canvas = sprite.frames[0]!;
  const { width: W, height: H } = canvas;
  const px = canvas.getContext('2d')!.getImageData(0, 0, W, H).data;
  let [x0, x1, y0, y1] = [W, -1, H, -1];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3]! <= 40) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < x0 ? 1 : fitFor((x1 - x0 + 1) / sprite.res, (y1 - y0 + 1) / sprite.res);
}

export function makeCast(kinds: readonly ShellKind[]): Cast {
  const shells = new Map(kinds.map((kind) => [kind, shellSprite(kind, RES)] as const));
  return {
    back: crabSprite('back', RES),
    front: crabSprite('front', RES),
    nakedBack: crabSprite('back', RES, true),
    nakedFront: crabSprite('front', RES, true),
    skinBack: bakeSprite(FRAME, RES, GROUND, 140, (d) => drawCrabBack(d, false, SKIN_COLORS), SKIN_INK),
    skinFront: bakeSprite(FRAME, RES, GROUND, 150, (d) => drawCrabFront(d, false, SKIN_COLORS), SKIN_INK),
    shells,
    fits: new Map([...shells].map(([kind, sprite]) => [kind, measuredFit(sprite)] as const)),
    puff: bakeSprite(64, 4, 0, 700, (d) => drawPuff(d, 64 * 0.36)),
  };
}

/** A sprite with its FOOT at (x, y), facing `facing`. */
function atFoot(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, x: number, y: number, scale: number, facing: number, alpha = 1): void {
  drawSprite(ctx, sprite, boil, { x: x - facing * FOOT_LOCAL * scale, y, scale, facing, alpha });
}

export interface CrabDraw {
  /** The shell's opening on the ground (the game's FOOT), screen px. */
  readonly x: number;
  readonly y: number;
  /** Screen px per frame px of a shell its size (shellPx / SHELL_UNITS, zoomed). */
  readonly unit: number;
  readonly kind: ShellKind;
  readonly facing: 1 | -1;
  /** Radians about the opening. */
  readonly rot?: number;
  /** The crab's scale against its shell (default FULL). */
  readonly fill?: number;
  /** Which body: in its shell, the old skin alone, or out of its shell (red) reaching. */
  readonly body?: 'crab' | 'skin' | 'none';
  readonly alpha?: number;
}

/** The shell's drawing scale for a crab drawing. */
export const drawnOf = (cast: Cast, kind: ShellKind, unit: number): number => unit * cast.fits.get(kind)!;

/** Where a crab's middle (of crab and shell) sits from its opening, in its own unrotated frame. */
export const middleFromFoot = (unit: number): { readonly x: number; readonly y: number } => ({ x: -0.15 * SHELL_UNITS * unit, y: -0.33 * SHELL_UNITS * unit });

/** A hermit crab in its shell, as crabView.ts layers it: far legs, the shell, then head, near legs and claw. */
export function drawCrab(ctx: CanvasRenderingContext2D, cast: Cast, c: CrabDraw, boil: number): void {
  const drawn = drawnOf(cast, c.kind, c.unit);
  const body = c.unit * (c.fill ?? FULL);
  const shift = crabShift(c.kind, drawn, body);
  ctx.save();
  ctx.translate(c.x, c.y);
  if (c.rot) ctx.rotate(c.rot);
  const a = c.alpha ?? 1;
  const kind = c.body ?? 'crab';
  if (kind === 'crab') atFoot(ctx, cast.back, boil, c.facing * shift, 0, body, c.facing, a);
  if (kind !== 'skin') atFoot(ctx, cast.shells.get(c.kind)!, boil, 0, 0, drawn, c.facing, a);
  if (kind === 'crab') atFoot(ctx, cast.front, boil, c.facing * shift, 0, body, c.facing, a);
  if (kind === 'skin') {
    atFoot(ctx, cast.skinBack, boil, c.facing * shift, 0, body, c.facing, a);
    atFoot(ctx, cast.skinFront, boil, c.facing * shift, 0, body, c.facing, a);
  }
  ctx.restore();
}

/** Just the crab's body out of a shell (red, as the game inks it mid-swap), FOOT at (x, y). */
export function drawNaked(ctx: CanvasRenderingContext2D, cast: Cast, x: number, y: number, scale: number, facing: 1 | -1, boil: number): void {
  atFoot(ctx, cast.nakedBack, boil, x, y, scale, facing);
  atFoot(ctx, cast.nakedFront, boil, x, y, scale, facing);
}

/** A shell alone, its middle at x, lying on the ground y. */
export function drawShellAt(ctx: CanvasRenderingContext2D, cast: Cast, kind: ShellKind, x: number, y: number, unit: number, facing: 1 | -1, boil: number, alpha = 1): void {
  const drawn = drawnOf(cast, kind, unit);
  atFoot(ctx, cast.shells.get(kind)!, boil, x + facing * FOOT_FROM_MIDDLE * drawn, y, drawn, facing, alpha);
}

/** Frame px from the middle of a shell to its opening. */
export const footFromMiddle = (cast: Cast, kind: ShellKind, unit: number): number => FOOT_FROM_MIDDLE * drawnOf(cast, kind, unit);

export function drawPuffAt(ctx: CanvasRenderingContext2D, cast: Cast, x: number, y: number, size: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  drawSprite(ctx, cast.puff, boil, { x, y, scale: size / 64, alpha });
}

// ------------------------------------------------------------------ the backdrop

/** Screen px per backdrop design px (at zoom 1). */
const B = 1.5;
const BACK_W = 3000;

export interface Backdrop {
  readonly canvas: HTMLCanvasElement;
  /** Canvas y of the beach's surface. */
  readonly surface: number;
  /** World x of the canvas's left edge (world x 0 is the crab's column). */
  readonly left: number;
}

/** Beach 1's far layers stacked as backdropView.ts stacks them, bottoms on the surface line; the sky carried on up. */
export function makeBackdrop(): Backdrop {
  const layers = THEMES.atoll;
  const tops = layers.map((l) => -(2 * l.lift + l.height) * B);
  const height = Math.ceil(-Math.min(...tops)) + 1500;
  const surface = height - 40;
  const { canvas, ctx } = makeCanvas(BACK_W, height);
  layers.forEach((layer, i) => {
    // Each on its own sheet: a layer erases its own foot (fadeBottom), which mustn't punch through the others.
    const sheet = makeCanvas(BACK_W, height);
    sheet.ctx.translate(-260, surface + tops[i]!);
    sheet.ctx.scale(B, B);
    for (let k = 0; k * BACKDROP_W * B < BACK_W + 600; k++) {
      layer.draw(makeDraw(sheet.ctx, 900 + i, 0, 0));
      sheet.ctx.translate(BACKDROP_W, 0);
    }
    ctx.drawImage(sheet.canvas, 0, 0);
  });
  // The sky's colour just under its layer's top, carried on up to the top without a seam.
  const skyTop = Math.max(0, Math.ceil(surface + tops[0]!));
  const row = ctx.getImageData(0, skyTop + 3, BACK_W, 1).data;
  const avg = [0, 1, 2].map((c) => {
    let sum = 0;
    for (let x = 0; x < BACK_W; x++) sum += row[x * 4 + c]!;
    return Math.round(sum / BACK_W);
  });
  // Above the layer, a high blue sky deepening upwards, so a wide shot isn't a blank page.
  const sky = ctx.createLinearGradient(0, 0, 0, skyTop + 3);
  sky.addColorStop(0, '#9fd0e4');
  sky.addColorStop(1, `rgb(${avg.join(',')})`);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BACK_W, skyTop + 3);
  ctx.fillStyle = `rgb(${avg.join(',')})`;
  ctx.fillRect(0, skyTop + 3, BACK_W, height);
  ctx.restore();
  return { canvas, surface, left: -1500 };
}

// ------------------------------------------------------------------ the game's sand

export interface Sand {
  readonly canvas: HTMLCanvasElement;
  /** Screen (world) px per tile. */
  readonly tilePx: number;
  /** Canvas px the drawing is padded by (drawChunk's CHUNK_PAD). */
  readonly pad: number;
}

/** A tile grid drawn with the game's sand renderer: `air(i, j)` says which tiles are dug out. Rows start at the surface. */
export function drawSand(cols: number, rows: number, tileUnits: number, res: number, air: (i: number, j: number) => boolean): Sand {
  const terrain: Terrain = createTerrain(cols, rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) setTile(terrain, i, j, air(i, j) ? TILE.air : TILE.sand);
  const tiles = Math.max(cols, rows);
  const side = Math.ceil((tiles * tileUnits + 4) * res);
  const { canvas, ctx } = makeCanvas(side, side);
  drawChunk(ctx, terrain, { tx: 0, ty: 0, tiles }, tileUnits, res, makeSandPatterns(ctx, res, PALE_SAND), PALE_SAND);
  return { canvas, tilePx: tileUnits * res, pad: 2 * res };
}

/** One drawing kept per key: the sand is redrawn only when the dig changes it. */
export function cached<T>(make: (key: string) => T): (key: string) => T {
  let last: { key: string; value: T } | null = null;
  return (key) => {
    if (last?.key !== key) last = { key, value: make(key) };
    return last.value;
  };
}

// ------------------------------------------------------------------ marks

/** Grains of sand in flight: pale crumbs, each with a touch of ink. */
export function drawGrains(ctx: CanvasRenderingContext2D, grains: readonly { at: { x: number; y: number }; r: number; alpha: number }[], scale: number): void {
  for (const g of grains) {
    if (g.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = g.alpha;
    // A lumpy clump: a few overlapping crumbs, wet-sand brown, with a dark rim.
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = g.r * 2.1 + k * 2.1;
      ctx.moveTo(g.at.x + Math.cos(a) * g.r * 0.5 * scale + g.r * 0.8 * scale, g.at.y + Math.sin(a) * g.r * 0.5 * scale);
      ctx.ellipse(g.at.x + Math.cos(a) * g.r * 0.5 * scale, g.at.y + Math.sin(a) * g.r * 0.5 * scale, g.r * 0.8 * scale, g.r * 0.65 * scale, a, 0, Math.PI * 2);
    }
    ctx.fillStyle = SAND_WET;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = SAND_GRAIN;
    ctx.stroke();
    ctx.restore();
  }
}

/** Damp sand round the chamber: a dark wet wash, soft at its edge. */
export function drawDamp(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, amount: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, `rgba(120,92,58,${0.55 * amount})`);
  g.addColorStop(0.6, `rgba(140,110,72,${0.4 * amount})`);
  g.addColorStop(1, 'rgba(160,130,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A sun (rayed) or a moon (a crescent) in ink and wash. */
export function drawSky(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, what: 'sun' | 'moon', alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = new Pen(ctx, 40 + boil, 0.8);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (what === 'sun') {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    pen.circle(x, y, r, 3, INK);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + boil * 0.1;
      pen.stroke([{ x: x + Math.cos(a) * r * 1.3, y: y + Math.sin(a) * r * 1.3 }, { x: x + Math.cos(a) * r * 1.7, y: y + Math.sin(a) * r * 1.7 }], 3, INK, 0.8, false);
    }
  } else {
    ctx.fillStyle = '#f4f1e4';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.85, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.restore();
}

/** A paw print (four toes and a pad) or a bird's three-toed track, pressed into the beach's top. */
export function drawPrint(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kind: 'paw' | 'bird', flip: boolean, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.fillStyle = 'rgba(107,90,60,0.55)';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2 / s;
  if (kind === 'paw') {
    const blobs: [number, number, number, number][] = [[0, 2, 7, 5], [-8, -6, 3, 2.6], [-3, -9, 3, 2.6], [3, -9, 3, 2.6], [8, -6, 3, 2.6]];
    for (const [bx, by, rx, ry] of blobs) {
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 2.4 / s;
    ctx.strokeStyle = 'rgba(80,66,44,0.8)';
    ctx.beginPath();
    for (const a of [-0.6, 0, 0.6]) {
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(a) * 12, -Math.cos(a) * 12 * 0.5);
    }
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The game's highlighter swipe: something can be taken here. */
export function drawSwipe(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, alpha: number, seed: number): void {
  if (alpha <= 0) return;
  const pen = new Pen(ctx, 600 + seed, 0.5);
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = 0.86 + pen.rng() * 0.14;
    return { x: cx + Math.cos(a) * (w / 2) * r, y: cy + Math.sin(a) * (h / 2) * r };
  });
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  pen.fill(pts, HIGHLIGHT, alpha);
  ctx.restore();
}

/** A four-pointed glint, swelling and fading as `u` runs 0..1. */
export function drawGlint(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, u: number): void {
  if (u <= 0 || u >= 1) return;
  const k = Math.sin(Math.PI * u);
  const r = size * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(u * 0.8);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.22;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#fffbe8';
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/** Night over everything (deepest over the sky), so days and nights race past. */
export function drawNight(ctx: CanvasRenderingContext2D, surfaceY: number, amount: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(13,18,48,${0.62 * amount})`;
  ctx.fillRect(0, 0, VIDEO.width, Math.max(0, surfaceY));
  ctx.fillStyle = `rgba(13,18,48,${0.38 * amount})`;
  ctx.fillRect(0, Math.max(0, surfaceY), VIDEO.width, VIDEO.height);
  ctx.restore();
}
