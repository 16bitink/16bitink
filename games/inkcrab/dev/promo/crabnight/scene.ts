import { THEMES } from '../../../src/art/backdrop';
import { clouds, LAGOON_H, lagoon, resort, shore, SHORE_H, sky, SKY_H } from '../../../src/art/backdrop/atoll';
import { BACKDROP_W } from '../../../src/art/backdrop/common';
import { driftLog } from '../../../src/art/backdrop/pnw';
import { type Draw, makeDraw, pt } from '../../../src/art/kit';
import { INK, MOON_SAND, PALE_SAND, PAPER } from '../../../src/art/palette';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { drawChunk, makeSandPatterns } from '../../../src/art/sand';
import { createTerrain, dig, setTile, TILE } from '../../../src/logic/terrain';
import { VIDEO } from '../short';
import { GAME_SURFACE, GAME_TILE, SHORE_Y, wrackY } from './story';

/**
 * The sets, baked once: beach 1's coral island by day (the game's atoll
 * backdrop over the game's hatched sand), the same beach by night, a close
 * shot of its sand, the line of weed a wave leaves, and Moonlit Bay, the
 * game's last beach: its backdrop layers over the game's own diggable sand
 * in moonlit grey, a burrow dug down to a buried shell.
 */
const { width: W, height: H } = VIDEO;
/** Backdrop px per design px: the atoll's 1024 px tile across the frame. */
const K = W / BACKDROP_W;
/** Where the atoll's shore sand sits on screen: our sand starts just under it. */
const SHORE_LINE = SHORE_Y - 10;
const SHORE_GROUND_IN_LAYERS = SKY_H + LAGOON_H + 280;
const TOP = SHORE_LINE - SHORE_GROUND_IN_LAYERS * K;
/** Matches the painted sand patch under the son's feet. */
const DAY_SAND = '#f0d9aa';
const DAY_SAND_LOW = '#ead1a0';

function layer(ctx: CanvasRenderingContext2D, y: number, seed: number, draw: (d: Draw) => void): void {
  ctx.save();
  ctx.translate(0, TOP + y * K);
  ctx.scale(K, K);
  draw(makeDraw(ctx, seed, 0, 0));
  ctx.restore();
}

/** The colour of one row of the canvas, averaged, carried up to the top of the frame. */
function fillAbove(ctx: CanvasRenderingContext2D, y: number, res = 1): void {
  const row = ctx.getImageData(0, Math.ceil((y + 3) * res), W * res, 1).data;
  const avg = [0, 1, 2].map((c) => {
    let sum = 0;
    for (let x = 0; x < W * res; x++) sum += row[x * 4 + c]!;
    return Math.round(sum / (W * res));
  });
  ctx.fillStyle = `rgb(${avg.join(',')})`;
  ctx.fillRect(0, 0, W, Math.ceil(y) + 3);
}

/** The game's hatched sand from `top` down, faint, its edge inked. */
function daySand(ctx: CanvasRenderingContext2D, top: number): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#e2cb98');
  g.addColorStop(0.06, DAY_SAND);
  g.addColorStop(1, DAY_SAND_LOW);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);
  const patterns = makeSandPatterns(ctx, 2, PALE_SAND);
  ctx.translate(0, top);
  ctx.scale(2, 2);
  for (const [p, alpha] of [[patterns.grain, 0.35], [patterns.sand, 0.16]] as const) {
    ctx.fillStyle = p;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, W / 2, (H - top) / 2);
  }
  ctx.restore();
  const pen = new Pen(ctx, 41, 1);
  pen.stroke(Array.from({ length: 28 }, (_, i) => ({ x: -10 + i * 41, y: top + 2 * Math.sin(i * 1.7) })), 2.4, INK, 0.7);
  pen.hair(Array.from({ length: 28 }, (_, i) => ({ x: -10 + i * 41, y: top + 22 + 5 * Math.sin(i * 0.9) })), 1.3, INK, 0.25);
}

/** Beach 1 by day: sky, lagoon, water villas, palms, then our sand. */
export function makeDaySet(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  layer(ctx, 0, 1, sky);
  layer(ctx, 0, 5, clouds);
  layer(ctx, SKY_H, 2, lagoon);
  layer(ctx, SKY_H, 3, resort);
  layer(ctx, SKY_H + LAGOON_H, 4, shore);
  fillAbove(ctx, TOP);
  daySand(ctx, SHORE_Y);
  return canvas;
}

/** Where the moon hangs at night: low over the lagoon, clear of the captions. */
const SUN = { x: 880, y: 525 } as const;
const NIGHT_TINT = '#202a5e';

/** Dyes whatever is on `ctx` night blue, `dark` 0..1 of the way. */
export function nightDye(ctx: CanvasRenderingContext2D, dark: number): void {
  if (dark <= 0) return;
  ctx.save();
  ctx.globalAlpha = dark;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = NIGHT_TINT;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(16,22,58,0.28)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** What night adds to the dyed beach: a moon in the sun's place, stars, moonlight on the sand (transparent elsewhere). */
export function makeNightSky(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  // Moonlight on the sand: a cool sheen, brighter towards the sea.
  const sheen = ctx.createLinearGradient(0, SHORE_Y, 0, H);
  sheen.addColorStop(0, 'rgba(170,185,230,0.22)');
  sheen.addColorStop(1, 'rgba(170,185,230,0.05)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, SHORE_Y, W, H - SHORE_Y);
  let seed = 7;
  const rnd = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W;
    const y = rnd() * (TOP + 150 * K);
    if (Math.hypot(x - SUN.x, y - SUN.y) < 110) continue;
    ctx.globalAlpha = 0.3 + rnd() * 0.6;
    ctx.fillStyle = rnd() > 0.7 ? '#fff4d6' : '#e3ebff';
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rnd() * rnd() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const [r, a] of [[180, 0.16], [90, 0.3]] as const) {
    const g = ctx.createRadialGradient(SUN.x, SUN.y, 10, SUN.x, SUN.y, r);
    g.addColorStop(0, `rgba(220,230,255,${a})`);
    g.addColorStop(1, 'rgba(220,230,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(SUN.x - r, SUN.y - r, r * 2, r * 2);
  }
  const moon = ctx.createRadialGradient(SUN.x - 12, SUN.y - 12, 4, SUN.x, SUN.y, 46);
  moon.addColorStop(0, '#fffdf0');
  moon.addColorStop(1, '#dcdcea');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(SUN.x, SUN.y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  new Pen(ctx, 3, 1).circle(SUN.x, SUN.y, 46, 1.6, INK);
  ctx.globalAlpha = 1;
  return canvas;
}

/** Close on the sand: the beach behind thrown out of focus, the sand sharp and near from `sandTop` down. */
export function makeCloseSet(day: HTMLCanvasElement, sandTop: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.save();
  ctx.filter = 'blur(7px)';
  ctx.translate(W / 2, sandTop - 110);
  ctx.scale(1.9, 1.9);
  ctx.translate(-W / 2, -SHORE_Y);
  ctx.drawImage(day, 0, 0);
  ctx.restore();
  daySand(ctx, sandTop);
  // Ripples in the near sand, bigger and further apart towards the viewer.
  const pen = new Pen(ctx, 91, 1);
  for (const [x, y, w] of [[60, 860, 220], [620, 840, 300], [300, 980, 260], [-40, 1150, 340], [560, 1180, 380], [200, 1450, 420], [700, 1520, 360], [-60, 1700, 400]] as const) {
    pen.hair([pt(x, y), pt(x + w * 0.3, y - 10), pt(x + w * 0.7, y + 8), pt(x + w, y)], 2.4 + (y - 800) / 400, INK, 0.22);
  }
  return canvas;
}

/** The low close view of the seaweed line: the lagoon meeting the sand behind, out of focus, the sand sharp in front. */
export function makeWrackCloseSet(day: HTMLCanvasElement, sea: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.save();
  ctx.filter = 'blur(3px)';
  // The day set's lagoon (y ≈ 615–745 there) brought down to meet the sand here.
  ctx.drawImage(day, 0, sea - 745);
  ctx.restore();
  fillAbove(ctx, 40);
  daySand(ctx, sea);
  // The wet sand the waves keep washing, darker near the water.
  const wet = ctx.createLinearGradient(0, sea, 0, sea + 200);
  wet.addColorStop(0, 'rgba(176,150,105,0.5)');
  wet.addColorStop(1, 'rgba(176,150,105,0)');
  ctx.fillStyle = wet;
  ctx.fillRect(0, sea, W, 200);
  return canvas;
}

const WEED = ['#5b5a2a', '#6f6a32', '#4a4f2a', '#7d6a35'] as const;

/**
 * The line of weed the waves leave at the high-water mark: a damp band of
 * darker sand, tangles of brown-green seaweed with their little floats,
 * bits of driftwood and broken shell along it.
 */
export function makeWrack(line: (x: number) => number = wrackY, k = 1): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  // The damp band where the water last reached.
  for (let x = -20; x < W + 20; x += 6) {
    const g = ctx.createLinearGradient(0, line(x) - 30 * k, 0, line(x) + 26 * k);
    g.addColorStop(0, 'rgba(170,140,90,0)');
    g.addColorStop(0.6, 'rgba(170,140,90,0.32)');
    g.addColorStop(1, 'rgba(170,140,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, line(x) - 30 * k, 7, 56 * k);
  }
  const d = makeDraw(ctx, 4242, 0, 0);
  const { pen } = d;
  // Driftwood first, the weed tangled over it.
  ctx.save();
  ctx.scale(4 * k, 4 * k);
  const d4 = makeDraw(ctx, 4244, 0, 0);
  for (const [x0, x1, r] of [[40, 82, 2.4], [168, 190, 1.6], [236, 262, 2]] as const) {
    const s4 = 4 * k;
    driftLog(d4, pt(x0 / k, line(x0 * 4) / s4 + 1), pt(x1 / k, line(x1 * 4) / s4 - 1), r);
  }
  ctx.restore();
  for (let x = -30 * k; x < W + 30 * k; x += (7 + pen.rng() * 9) * Math.sqrt(k)) {
    if (pen.rng() < 0.18) continue;
    const y = line(x) + pen.jitter(9 * k);
    const len = (22 + pen.rng() * 46) * k;
    const dir = pen.rng() < 0.5 ? -1 : 1;
    const color = WEED[Math.floor(pen.rng() * WEED.length)]!;
    const strand = [pt(x, y), pt(x + dir * len * 0.35, y + k * (-6 + pen.jitter(5))), pt(x + dir * len * 0.7, y + k * (4 + pen.jitter(5))), pt(x + dir * len, y + k * pen.jitter(6))];
    pen.stroke(strand, (5 + pen.rng() * 4) * k, color, 0.85, false);
    pen.hair(strand, 1.1 * Math.sqrt(k), INK, 0.45);
    // Little round floats on the fronds.
    if (pen.rng() < 0.5) {
      const p = strand[2]!;
      pen.fill(Array.from({ length: 10 }, (_, i) => pt(p.x + 4.5 * k * Math.cos((i / 10) * Math.PI * 2), p.y + 4.5 * k * Math.sin((i / 10) * Math.PI * 2))), '#8a7a3a', 0.9);
    }
  }
  // Bits of broken shell and coral rubble, pale.
  for (let i = 0; i < 26; i++) {
    const x = pen.rng() * W;
    const y = line(x) + pen.jitter(14 * k);
    const r = (3 + pen.rng() * 5) * k;
    pen.fill(Array.from({ length: 8 }, (_, k) => pt(x + r * Math.cos((k / 8) * Math.PI * 2), y + r * 0.6 * Math.sin((k / 8) * Math.PI * 2))), '#fbf3e2', 0.95);
    pen.hair(Array.from({ length: 9 }, (_, k) => pt(x + r * Math.cos((k / 8) * Math.PI * 2), y + r * 0.6 * Math.sin((k / 8) * Math.PI * 2))), 0.9 * Math.sqrt(k), INK, 0.5);
  }
  return canvas;
}

// ---------------------------------------------------------------- Moonlit Bay, the game's last beach

/** Backdrop px per design px for the bay's layers, and where its tile starts so the moon sits left of centre. */
const BAY_K = 1.3;
const BAY_X = -110;
const RES = GAME_TILE / 16;

/** The game's burrow: rows 0–3 air, sand below, a tunnel dug down to a pocket with a shell in it. */
export const GAME_ROWS = { surface: 3, cols: 24 } as const;
/** Buried shells resting on the floors of their pockets, on screen (a tile column's middle, a floor row's top). */
const tileX = (col: number): number => -18 + (col + 0.5) * GAME_TILE;
const floorY = (row: number): number => GAME_SURFACE + (row - 3) * GAME_TILE;
export const BURIED = [
  { kind: 'moonsnail', x: tileX(6), y: floorY(11) },
  { kind: 'conch', x: tileX(15), y: floorY(14) },
] as const;

function bayLayers(ctx: CanvasRenderingContext2D, res: number): void {
  const layers = THEMES.moonlit;
  const topOf = (height: number, lift: number): number => GAME_SURFACE - (2 * lift + height) * BAY_K;
  layers.forEach((l, i) => {
    const sheet = makeCanvas(W * res, H * res);
    sheet.ctx.save();
    sheet.ctx.scale(res, res);
    sheet.ctx.translate(BAY_X, topOf(l.height, l.lift));
    sheet.ctx.scale(BAY_K, BAY_K);
    l.draw(makeDraw(sheet.ctx, 900 + i, 0, 0));
    sheet.ctx.translate(BACKDROP_W, 0);
    l.draw(makeDraw(sheet.ctx, 900 + i, 0, 0));
    sheet.ctx.restore();
    ctx.drawImage(sheet.canvas, 0, 0, W, H);
  });
  const sky = layers.find((l) => l.id === 'sky')!;
  fillAbove(ctx, topOf(sky.height, sky.lift), res);
}

function terrain(ctx: CanvasRenderingContext2D, res: number): void {
  const n = GAME_ROWS.cols;
  const t = createTerrain(n, n);
  for (let x = 0; x < n; x++) for (let y = GAME_ROWS.surface; y < n; y++) setTile(t, x, y, TILE.sand);
  // The burrow: down from the surface, along, and into each shell's pocket.
  for (let y = GAME_ROWS.surface; y <= 9; y++) dig(t, 3, y);
  for (let x = 3; x <= 7; x++) for (const y of [9, 10]) dig(t, x, y);
  for (let x = 7; x <= 15; x++) dig(t, x, 10);
  for (let y = 10; y <= 13; y++) for (const x of [14, 15, 16]) if (y >= 11) dig(t, x, y);
  const r = RES * res;
  const { canvas, ctx: c } = makeCanvas((n * 16 + 4) * r, (n * 16 + 4) * r);
  drawChunk(c, t, { tx: 0, ty: 0, tiles: n }, 16, r, makeSandPatterns(c, r, MOON_SAND), MOON_SAND);
  ctx.drawImage(canvas, -2 * RES - 18, GAME_SURFACE - GAME_ROWS.surface * GAME_TILE - 2 * RES, canvas.width / res, canvas.height / res);
}

/** Moonlit Bay as the game shows it: the backdrop, the diggable sand with its burrow, the night's tint over all. */
export const GAME_RES = 2;

/** Baked at GAME_RES px per frame px, so the camera can close in on the strand and stay sharp. */
export function makeGameSet(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W * GAME_RES, H * GAME_RES);
  ctx.scale(GAME_RES, GAME_RES);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  bayLayers(ctx, GAME_RES);
  terrain(ctx, GAME_RES);
  return canvas;
}

/** The game's night tint (nightView.ts: NIGHT_HEX by moonlight), laid over the beach and everything on it. */
export function nightTint(ctx: CanvasRenderingContext2D, alpha = 0.16): void {
  ctx.save();
  ctx.fillStyle = '#141c3c';
  ctx.globalAlpha = alpha;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

