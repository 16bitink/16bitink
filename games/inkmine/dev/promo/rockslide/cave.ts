import { cub, makeDraw, pt, type Draw } from '../../../src/art/kit';
import { drawTalusRidges, drawTalusSky } from '../../../src/art/talusSky';
import { TALUS_STYLE, talusStone } from '../../../src/art/creatures/rockcrab';
import { dab, mix, paint, SHADOW, soft } from '../../../src/art/paint';
import { BOIL, RED } from '../../../src/art/palette';
import { makeCanvas, pathOf, type Pt } from '../../../src/art/pen';
import { drawOreGlyph } from '../../../src/art/oreArt';
import { ORES } from '../../../src/logic/ore';
import { createRng } from '../../../src/logic/rng';
import { BLOCK, FLOOR_Y, ROOF_Y, SHAFT_X, SURFACE_Y } from './story';

/**
 * The Rockslide's cave, in Talus's colours, as a cross-section: the red sky
 * and mesas over a flat top, the Throne's butte standing over the west end,
 * and under it the long cave (roof, floor, a west end where the giant sleeps
 * and an east end where the opals lie), a shaft of three blocks cut down
 * through the roof over the opal bed. The picture is in world px; every
 * layer is one canvas that covers MARGIN px past the world's edges.
 */
export const MARGIN = 300;
const W = 2000;
const H = 2700;
const STONE = TALUS_STYLE.stone;
const SOIL = TALUS_STYLE.soil;
const DEEP = TALUS_STYLE.deep;
const SALT = '#f1e1cd';

/** The cave's ends: it runs from the west wall to the east wall. */
const WEST = -100;
const EAST = 1200;
export const CAVE_BOX = { x0: WEST, x1: EAST, y0: ROOF_Y, y1: FLOOR_Y + 110 } as const;

const rng = (seed: number): (() => number) => createRng(seed);

/** The dark inside of the cave: warm at the middle, falling off to black at the ends and the roof. */
function hollow(): Pt[] {
  const r = rng(7001);
  const top = Array.from({ length: 28 }, (_, i) => {
    const x = WEST + 20 + (i / 27) * (EAST - WEST - 40);
    return pt(x, ROOF_Y + (Math.abs(x - SHAFT_X) < BLOCK ? 0 : -20 + 48 * r() - (x < 120 ? 50 : 0)));
  });
  const floor = cub(pt(EAST - 10, FLOOR_Y + 70), pt(900, FLOOR_Y + 130), pt(300, FLOOR_Y + 90), pt(WEST + 10, FLOOR_Y + 60), 24);
  return [pt(WEST, ROOF_Y + 60), ...top, pt(EAST + 6, ROOF_Y + 70), pt(EAST + 14, FLOOR_Y + 30), ...floor, pt(WEST - 6, FLOOR_Y + 20)];
}

/** Strata, grit and pale salt streaks laid over a shape, as in Talus's rock. */
function strata(d: Draw, shape: readonly Pt[], seed: number, box: { x0: number; x1: number; y0: number; y1: number }): void {
  const r = rng(seed);
  d.pen.clipped(shape, () => {
    d.pen.stipple(shape, 9000, () => 0.5, 1.4, mix(DEEP, SHADOW, 0.5));
    d.pen.stipple(shape, 2400, () => 0.4, 1.2, mix(SOIL, '#fff0dc', 0.3));
    for (let i = 0; i < 60; i++) {
      const y = box.y0 + r() * (box.y1 - box.y0);
      const x = box.x0 + r() * (box.x1 - box.x0);
      const len = 120 + r() * 380;
      d.pen.hair(cub(pt(x, y), pt(x + len * 0.3, y + 16 * (r() - 0.5)), pt(x + len * 0.7, y + 22 * (r() - 0.5)), pt(x + len, y + 9 * (r() - 0.5)), 8), 1.6 + r() * 2, mix(DEEP, SHADOW, 0.6), 0.65);
    }
    for (let i = 0; i < 24; i++) {
      const x = box.x0 + r() * (box.x1 - box.x0);
      const y = box.y0 + r() * (box.y1 - box.y0);
      dab(d, [pt(x - 70 - r() * 80, y), pt(x, y - 8 - r() * 9), pt(x + 90 + r() * 60, y + 1), pt(x, y + 11)], SALT, 0.16, 7);
    }
  });
}

/** The sky and the far mesas, down to the flat top the shaft is cut from. */
function skyLayer(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, MARGIN + SURFACE_Y);
  const d = makeDraw(ctx, 7010, 0, 0);
  drawTalusSky(d, W, canvas.height, canvas.height - 70);
  drawTalusRidges(d, W, canvas.height, canvas.height - 70, TALUS_STYLE);
  return canvas;
}

/** The Throne: a flat-topped red butte standing over the west end, banded, its foot a skirt of fallen rock. */
function butte(d: Draw): void {
  const r = rng(7020);
  const left = Array.from({ length: 9 }, (_, i) => pt(40 + (i % 2) * 10 + r() * 14 - 10 * (i / 8), SURFACE_Y - 70 - i * 44));
  const right = Array.from({ length: 9 }, (_, i) => pt(790 - (i % 2) * 8 - r() * 16 + 20 * (i / 8), SURFACE_Y - 70 - (8 - i) * 44));
  const top = [pt(70, -70), pt(250, -86), pt(470, -80), pt(690, -90), pt(770, -64)];
  const body = [pt(-40, SURFACE_Y + 4), pt(0, SURFACE_Y - 90), ...left.slice(1), ...top, ...[...right].reverse().slice(0, 8), pt(830, SURFACE_Y - 90), pt(880, SURFACE_Y + 4)];
  paint(d, body, mix(SOIL, '#b4553f', 0.45), { alpha: 1, shadow: 0.65, hatch: 0, line: 3.2 });
  d.pen.clipped(body, () => {
    // Bands of different rock, steps where the soft layers wore back.
    for (let k = 0; k < 11; k++) {
      const y = -40 + k * 36 + r() * 12;
      const line = Array.from({ length: 12 }, (_, i) => pt(i * 80, y + Math.sin(i * 0.9 + k) * 7));
      d.pen.hair(line, 2.6 + r() * 1.8, mix(DEEP, SHADOW, 0.5), 0.25);
      dab(d, [...line, ...[...line].reverse().map((p) => pt(p.x, p.y + 12 + r() * 8))], mix(STONE, SOIL, r()), 0.28, 5);
    }
    // Fluting down the cliff.
    for (let k = 0; k < 14; k++) {
      const x = 60 + (k / 13) * 740 + r() * 30;
      const y0 = -40 + r() * 200;
      d.pen.hair([pt(x, y0), pt(x + (r() - 0.5) * 14, y0 + 60 + r() * 60), pt(x + (r() - 0.5) * 18, y0 + 100 + r() * 90)], 2 + r() * 1.5, mix(DEEP, SHADOW, 0.6), 0.35);
    }
    d.pen.stipple(body, 5000, (x) => 0.3 + 0.5 * (x / 850), 1.4, mix(DEEP, SHADOW, 0.6));
  });
  // The skirt of fallen rock at its foot.
  for (let k = 0; k < 26; k++) {
    const x = -20 + k * 36 + r() * 16;
    const s = 28 + r() * 44;
    talusStone(d, x, SURFACE_Y - s * 0.28 - r() * 20, s, 7100 + k, true, TALUS_STYLE);
  }
}

/** The flat top the shaft opens in: a ragged line of red ground, with stones and a few barrel plants' worth of tufts left out. */
function groundLayer(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.translate(MARGIN, MARGIN);
  const d = makeDraw(ctx, 7030, 0, 0, RED);
  const r = rng(7031);
  const top = Array.from({ length: 41 }, (_, i) => {
    const x = -MARGIN + (i / 40) * W;
    return pt(x, SURFACE_Y - (Math.abs(x - SHAFT_X) < 130 ? 4 : 10 * r() + 8 * Math.sin(i * 0.7)));
  });
  const body = [...top, pt(W - MARGIN, H - MARGIN), pt(-MARGIN, H - MARGIN)];
  paint(d, body, STONE, { alpha: 1, shadow: 0.7, hatch: 0, line: 3 });
  // Under the top, the rock darkens with depth.
  const g = ctx.createLinearGradient(0, SURFACE_Y, 0, FLOOR_Y + 300);
  g.addColorStop(0, 'rgba(201, 143, 102, 0.3)');
  g.addColorStop(0.45, 'rgba(60, 30, 26, 0.45)');
  g.addColorStop(0.8, 'rgba(14, 6, 6, 0.85)');
  g.addColorStop(1, 'rgba(6, 2, 2, 0.95)');
  ctx.save();
  pathOf(ctx, body);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(-MARGIN, SURFACE_Y - 20, W, H);
  ctx.restore();
  strata(d, body, 7032, { x0: -MARGIN, x1: W - MARGIN, y0: SURFACE_Y, y1: H - MARGIN });
  // Stones lying on top.
  for (let k = 0; k < 16; k++) {
    const x = -250 + k * 120 + r() * 70;
    if (Math.abs(x - SHAFT_X) < 150) continue;
    talusStone(d, x, SURFACE_Y - 6 - r() * 4, 14 + r() * 26, 7040 + k, true, TALUS_STYLE);
  }
  // The shaft: cut clean through, its walls in shade.
  const hole = [pt(SHAFT_X - BLOCK / 2, SURFACE_Y - 30), pt(SHAFT_X + BLOCK / 2, SURFACE_Y - 30), pt(SHAFT_X + BLOCK / 2, ROOF_Y + 90), pt(SHAFT_X - BLOCK / 2, ROOF_Y + 90)];
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  pathOf(ctx, [...hollow()]);
  ctx.fill();
  pathOf(ctx, hole);
  ctx.fill();
  ctx.restore();
  // The roof's underside edge: a firm line and its shadow, so the cave reads as a hollow.
  const roofEdge = hollow().slice(1, 29);
  soft(ctx, 8, () => d.pen.stroke(roofEdge.map((p) => pt(p.x, p.y - 8)), 12, mix(DEEP, SHADOW, 0.5), 0.5, false));
  d.pen.stroke(roofEdge, 4, RED, 0.9, false);
  for (const side of [-1, 1]) {
    const x = SHAFT_X + (side * BLOCK) / 2;
    d.pen.stroke([pt(x, SURFACE_Y - 28), pt(x + side * 2, 600), pt(x - side, ROOF_Y + 4)], 3.4, mix(SHADOW, RED, 0.2), 0.95, false);
  }
  return canvas;
}

/** The dark inside the cave, its floor a bank of dust and gravel. */
function insideLayer(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.translate(MARGIN, MARGIN);
  const d = makeDraw(ctx, 7050, 0, 0, RED);
  const r = rng(7051);
  const shape = hollow();
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  const g = ctx.createRadialGradient(640, 1000, 60, 640, 1000, 980);
  g.addColorStop(0, '#2c1613');
  g.addColorStop(0.5, '#150a09');
  g.addColorStop(1, '#030101');
  ctx.fillStyle = g;
  ctx.fillRect(WEST - 40, ROOF_Y - 60, EAST - WEST + 80, FLOOR_Y - ROOF_Y + 300);
  // Faint rock of the back wall: stains and blocky ledges.
  for (let i = 0; i < 30; i++) dab(d, [pt(r() * 1500 - 120, 760 + r() * 480), pt(r() * 1500 - 120, 740 + r() * 480), pt(r() * 1500 - 120, 780 + r() * 480)].map((p, k) => pt(p.x * 0.1 + 200 + i * 40 + k * 30, p.y)), '#0c0606', 0.2, 20);
  for (let i = 0; i < 14; i++) {
    const x = WEST + r() * (EAST - WEST);
    const y = 740 + r() * 420;
    d.pen.hair(cub(pt(x, y), pt(x + 90, y - 10), pt(x + 190, y + 8), pt(x + 320, y - 4), 8), 2.6, mix(DEEP, SHADOW, 0.7), 0.35);
  }
  // The floor: a bank of pale dust and gravel in front.
  const floorTop = cub(pt(WEST - 20, FLOOR_Y - 8), pt(300, FLOOR_Y - 26), pt(900, FLOOR_Y + 6), pt(EAST + 20, FLOOR_Y - 16), 26);
  const floor = [...floorTop, pt(EAST + 20, FLOOR_Y + 200), pt(WEST - 20, FLOOR_Y + 200)];
  paint(d, floor, mix(SOIL, DEEP, 0.7), { alpha: 1, shadow: 0.5, hatch: 0.1, line: 0, cross: false });
  d.pen.clipped(floor, () => {
    d.pen.stipple(floor, 4200, (_, y) => (y < FLOOR_Y + 20 ? 0.8 : 0.35), 1.6, mix(DEEP, SHADOW, 0.5));
    d.pen.stipple(floor, 1500, () => 0.5, 1.4, mix(SOIL, '#fff0dc', 0.45));
  });
  d.pen.stroke(floorTop, 3, RED, 0.8, false);
  ctx.restore();
  return canvas;
}

/** The opal bed at the east end: lumps in a seam of ironstone along the floor and up the wall, every glyph the game's own (talusOres.ts). */
export const OPAL_LUMPS: readonly { readonly x: number; readonly y: number; readonly t: number; readonly seed: number }[] = (() => {
  const r = rng(7060);
  const out: { x: number; y: number; t: number; seed: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const u = r();
    // Along the floor from under the shaft out to the east end, and piled up the wall.
    const x = 770 + u * 330 + (r() - 0.5) * 40;
    const up = Math.pow(r(), 1.8) * (1 - u * 0.2);
    const y = FLOOR_Y + 8 - up * 520 + r() * 30;
    out.push({ x, y, t: 92 + r() * 120 - up * 30, seed: 7061 + i * 13 });
  }
  return out.sort((a, b) => a.y - b.y);
})();

function bedLayer(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.translate(MARGIN, MARGIN);
  const d = makeDraw(ctx, 7070, 0, 0, RED);
  // The ironstone seam they lie in.
  const seam = [pt(710, FLOOR_Y + 40), pt(860, FLOOR_Y - 120), pt(990, 820), pt(1080, 560), pt(EAST + 40, 540), pt(EAST + 40, FLOOR_Y + 60)];
  paint(d, seam, '#6c3b2c', { alpha: 1, shadow: 0.6, hatch: 0, line: 2.4 });
  d.pen.clipped(seam, () => d.pen.stipple(seam, 2600, () => 0.5, 1.4, '#2c1710'));
  const T = 120;
  OPAL_LUMPS.forEach((l) => {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.scale(l.t / T, l.t / T);
    drawOreGlyph(ctx, ORES.opal, T, l.seed);
    ctx.restore();
  });
  return canvas;
}

export interface CaveLayers {
  readonly sky: HTMLCanvasElement;
  readonly butte: HTMLCanvasElement;
  readonly ground: HTMLCanvasElement;
  readonly inside: HTMLCanvasElement;
  readonly bed: HTMLCanvasElement;
}

/** Everything behind the giant and the prospector, baked once. */
export function makeCave(): CaveLayers {
  const { canvas: butteCanvas, ctx } = makeCanvas(W, MARGIN + SURFACE_Y);
  ctx.translate(MARGIN, MARGIN);
  butte(makeDraw(ctx, 7020, 0, 0, RED));
  return { sky: skyLayer(), butte: butteCanvas, ground: groundLayer(), inside: insideLayer(), bed: bedLayer() };
}

/** One block of the shaft: `row` picks its grain; one canvas per boil frame. */
export function makeBlock(row: number): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(BLOCK + 8, BLOCK + 8);
    ctx.translate(4, 4);
    const d = makeDraw(ctx, 7800 + row * 7 + f, f, 0, RED);
    const shape = [pt(0, 0), pt(BLOCK * 0.5, 2), pt(BLOCK, 0), pt(BLOCK, BLOCK), pt(BLOCK * 0.5, BLOCK - 2), pt(0, BLOCK)];
    paint(d, shape, mix(STONE, SOIL, 0.12 + 0.12 * (row % 2)), { alpha: 1, shadow: 0.6, hatch: 0.16, line: 2.2 });
    d.pen.stipple(shape, 420, () => 0.55, 1.2, mix(DEEP, SHADOW, 0.6));
    d.pen.stipple(shape, 90, () => 0.5, 1, mix(SOIL, '#fff0dc', 0.5));
    return canvas;
  });
}

export const blockCorner = (row: number): Pt => pt(SHAFT_X - BLOCK / 2 - 4, SURFACE_Y + row * BLOCK - 4);
