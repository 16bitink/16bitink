import { createRng } from '../../../src/logic/rng';
import { makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { blotchShape, glaze } from '../../../src/art/snakes/cornPaint';
import { PAPER_FILL } from '../../../src/art/palette';
import { rgba } from '../../../src/art/wash';
import { blotch, fleck, HOG } from './lowPaint';

/**
 * The hognose's body seen from the ground, as a short thick tube lying on
 * the sand: its skin painted once unrolled (the back's tan-olive with
 * squarish umber blotches down the middle and smaller ones low on the
 * flank, keeled scales, then the cream belly mottled grey with the belly
 * plates across it), then wrapped round the tube slice by slice. Each point
 * of the spine has its own roll, so the body can lie twisted, belly up in
 * one coil and back up in the next. Seen a little from above.
 */
const PERIOD = 420;
/** Unrolled skin px per half turn (dorsal midline .. belly midline). */
const HP = 240;
const PAD = 40;
/** How far above the ground the camera looks down (radians): a little of the far side shows over the top. */
const ELEV = 0.32;
const BANDS = 12;
/** Screen px of tube per px of unrolled skin along it, at the base width. */
export const BASE_W = 230;
const ALONG = BASE_W / 150;

const wrapX = (x: number, f: (x: number) => void): void => [-PERIOD, 0, PERIOD].forEach((k) => f(x + k));

/** One half of the skin: x along the body, y from the back's midline (0) round the flank to the belly's midline (HP). */
function paintHalf(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(PERIOD, HP);
  const pen = new Pen(ctx, seed, 0.4);
  const g = ctx.createLinearGradient(0, 0, 0, HP);
  g.addColorStop(0, '#94804c');
  g.addColorStop(0.3, '#ab9058');
  g.addColorStop(0.52, HOG.flank);
  g.addColorStop(0.66, HOG.low);
  g.addColorStop(0.73, '#e2d7b4');
  g.addColorStop(0.77, HOG.belly);
  g.addColorStop(1, HOG.bellyLit);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PERIOD, HP);
  const rng = createRng(seed);
  // Warm ochre between the blotches; grey mottling over the belly.
  for (let k = 0; k < 3; k++) wrapX(k * 140 + 100, (x) => glaze(ctx, x, 10, 44, 40, 0, HOG.ochre, 0.4));
  for (let i = 0; i < 40; i++) {
    const x = rng() * PERIOD;
    const y = HP * (0.78 + rng() * 0.2);
    const r = 4 + rng() * 8;
    const a = 0.08 + rng() * 0.14;
    wrapX(x, (xx) => glaze(ctx, xx, y, r, r * 0.6, 0, HOG.mottle, a));
  }
  // The belly plates across the belly, each with its free edge shaded.
  for (let x = 0; x < PERIOD; x += 21) {
    pen.hair([pt(x, HP * 0.77), pt(x + 1.5, HP * 0.88), pt(x + 1, HP)], 1.2, '#a59c88', 0.22);
    glaze(ctx, x + 6, HP * 0.9, 7, HP * 0.1, 0, PAPER_FILL, 0.18);
  }
  // Keeled scales down the back and flank.
  ctx.lineCap = 'round';
  for (let row = 0; row < 15; row++) {
    const y = 6 + row * 11.5;
    for (let x = (row % 2) * 8; x < PERIOD + 16; x += 16) {
      ctx.strokeStyle = rgba(HOG.shadow, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 4);
      ctx.quadraticCurveTo(x + 3, y - 4, x + 8, y);
      ctx.quadraticCurveTo(x + 3, y + 4, x - 7, y + 4);
      ctx.stroke();
      ctx.strokeStyle = rgba(PAPER_FILL, 0.22);
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 0.6);
      ctx.lineTo(x + 4, y - 0.6);
      ctx.stroke();
    }
  }
  // The squarish blotches down the back, and the smaller ones low on the flank between them.
  for (let k = 0; k < 3; k++) {
    wrapX(k * 140 + 30, (x) => blotch(pen, blotchShape(x, 0, 36, HP * 0.3, seed + k, { pow: 3.4, rough: 0.1 })));
    wrapX(k * 140 + 100, (x) => blotch(pen, blotchShape(x, HP * 0.5, 17, HP * 0.085, seed + 10 + k, { pow: 2.6, rough: 0.12 }), 0.85));
  }
  fleck(pen, [pt(-10, 0), pt(PERIOD + 10, 0), pt(PERIOD + 10, HP * 0.74), pt(-10, HP * 0.74)], 700, seed + 3, 1.1, HOG.blotchDeep, 0.3);
  return canvas;
}

/** The whole skin, three half turns tall (belly .. back .. belly .. back), x padded so a slice can run past the period. */
export function bakeSkin(seed: number): HTMLCanvasElement {
  const half = paintHalf(seed);
  const { canvas, ctx } = makeCanvas(PERIOD + PAD, HP * 3);
  for (const x of [0, PERIOD]) {
    ctx.save();
    ctx.translate(x, HP);
    ctx.scale(1, -1);
    ctx.drawImage(half, 0, 0);
    ctx.restore();
    ctx.drawImage(half, x, HP);
    ctx.save();
    ctx.translate(x, HP * 3);
    ctx.scale(1, -1);
    ctx.drawImage(half, 0, 0);
    ctx.restore();
  }
  return canvas;
}

/** The skin with its fine detail melted away, for the bands at the silhouette, where the skin turns away and its plates and scales would crowd into a comb. */
export function softSkin(skin: HTMLCanvasElement): HTMLCanvasElement {
  const small = makeCanvas(Math.ceil(skin.width / 8), Math.ceil(skin.height / 8));
  small.ctx.imageSmoothingQuality = 'high';
  small.ctx.drawImage(skin, 0, 0, small.canvas.width, small.canvas.height);
  const { canvas, ctx } = makeCanvas(skin.width, skin.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small.canvas, 0, 0, skin.width, skin.height);
  return canvas;
}

/** The light across the tube, top edge to bottom: the far side turning away, a matte sheen, the low flank in shadow, the contact with the sand. */
export function bakeShade(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, rgba(HOG.shadow, 0.3));
  g.addColorStop(0.07, rgba(HOG.shadow, 0));
  g.addColorStop(0.17, rgba(PAPER_FILL, 0.3));
  g.addColorStop(0.3, rgba(PAPER_FILL, 0.08));
  g.addColorStop(0.45, rgba(PAPER_FILL, 0));
  g.addColorStop(0.62, rgba(HOG.shadow, 0.1));
  g.addColorStop(0.85, rgba(HOG.shadow, 0.36));
  g.addColorStop(1, rgba(HOG.shadow, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return canvas;
}

export interface Tube {
  /** Front (under the head) to the tail's tip, screen px. */
  readonly spine: readonly Pt[];
  readonly widths: readonly number[];
  /**
   * How far each point is rolled about the body (radians) from back up, for a stretch running left to
   * right on screen; a stretch running right to left is seen from its other side, so the same roll there
   * shows the mirror view (π is belly straight up either way).
   */
  readonly rolls: readonly number[];
}

interface Frame {
  readonly t: Pt;
  readonly n: Pt;
}

/** The tangent (front to tail) and the normal to its left at each point. */
function frames(spine: readonly Pt[]): Frame[] {
  return spine.map((_, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(spine.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = pt((b.x - a.x) / len, (b.y - a.y) / len);
    return { t, n: pt(t.y, -t.x) };
  });
}

/** The tube's two edges (left of travel, then right). */
export function tubeEdges(tube: Tube, k = 1): { left: Pt[]; right: Pt[] } {
  const fr = frames(tube.spine);
  const left = tube.spine.map((p, i) => pt(p.x + fr[i]!.n.x * (tube.widths[i]! / 2) * k, p.y + fr[i]!.n.y * (tube.widths[i]! / 2) * k));
  const right = tube.spine.map((p, i) => pt(p.x - fr[i]!.n.x * (tube.widths[i]! / 2) * k, p.y - fr[i]!.n.y * (tube.widths[i]! / 2) * k));
  return { left, right };
}

/** Its soft shadow on the sand, under and a little behind it. */
export function drawTubeShadow(ctx: CanvasRenderingContext2D, tube: Tube): void {
  const { left, right } = tubeEdges(tube, 0.9);
  const low = tube.spine.map((p, i) => (left[i]!.y > right[i]!.y ? left[i]! : right[i]!));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, a] of [[0.36, 0.06], [0.24, 0.08], [0.14, 0.12], [0.07, 0.16]] as const) {
    ctx.strokeStyle = rgba('#4a3820', a);
    ctx.lineWidth = BASE_W * w;
    ctx.beginPath();
    low.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + 10, p.y + 2) : ctx.lineTo(p.x + 10, p.y + 2)));
    ctx.stroke();
  }
  ctx.restore();
}

/** The skin wrapped round the tube slice by slice (the roll choosing which part of it faces the camera), the light over it, its contour. */
export function drawTube(ctx: CanvasRenderingContext2D, skins: { readonly sharp: HTMLCanvasElement; readonly soft: HTMLCanvasElement }, shade: HTMLCanvasElement, tube: Tube, seed: number): void {
  const { spine, widths, rolls } = tube;
  const n = spine.length;
  if (n < 2) return;
  const fr = frames(spine);
  const { left, right } = tubeEdges(tube);
  ctx.save();
  ctx.beginPath();
  [...left, ...[...right].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const base = ctx.getTransform();
  let along = 0;
  for (let i = 0; i + 1 < n; i++) {
    const a = spine[i]!;
    const b = spine[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) continue;
    const { t, n: nl } = fr[i]!;
    const w = (widths[i]! + widths[i + 1]!) / 2;
    const sw = (len * BASE_W) / w / ALONG;
    const sx = along % PERIOD;
    // The camera is above: more of whichever edge faces up shows; the roll is measured from that side.
    const elev = ELEV * -nl.y;
    const phi = (rolls[i]! + rolls[i + 1]!) / 2 - Math.PI * ((nl.y + 1) / 2);
    const kx = len / sw;
    for (let k = 0; k < BANDS; k++) {
      const p0 = (k / BANDS) * Math.PI;
      const p1 = ((k + 1) / BANDS) * Math.PI;
      const v0 = -Math.cos(p0);
      const v1 = -Math.cos(p1);
      const th = p0 - elev + phi + Math.PI;
      const y0 = ((((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / Math.PI) * HP;
      const y1 = y0 + ((p1 - p0) / Math.PI) * HP;
      const ky = ((v1 - v0) * w) / 2 / (y1 - y0);
      const o = pt(a.x + nl.x * (-v0 * w) / 2, a.y + nl.y * (-v0 * w) / 2);
      ctx.setTransform(base);
      ctx.transform(t.x * kx, t.y * kx, -nl.x * ky, -nl.y * ky, o.x, o.y);
      const yy = Math.max(0, Math.min(HP * 3 - 2, y0));
      const skin = k < 2 || k >= BANDS - 2 ? skins.soft : skins.sharp;
      ctx.drawImage(skin, sx, yy, sw + 2, Math.min(HP * 3 - yy, y1 - y0 + 1.5), 0, yy - y0, sw + 2, Math.min(HP * 3 - yy, y1 - y0 + 1.5));
    }
    ctx.setTransform(base);
    ctx.transform(t.x, t.y, -nl.x * (w / 256), -nl.y * (w / 256), a.x + (nl.x * w) / 2, a.y + (nl.y * w) / 2);
    ctx.drawImage(shade, 0, 0, 4, 256, 0, 0, len + 1.5, 256);
    along += sw;
  }
  ctx.restore();
  const pen = makeDraw(ctx, seed, 0, 0, HOG.line).pen;
  const tip = spine[n - 1]!;
  pen.stroke([...left.slice(2), tip, ...[...right].reverse().slice(0, -2)], 3.4, HOG.line, 1);
}

/** Width at a share of the body's length from the head (0) to the tail (1): stocky to near the end, then a short tail. */
export function bodyWidth(u: number, depth: number): number {
  const tail = u < 0.72 ? 1 : 1 - 0.95 * Math.pow((u - 0.72) / 0.28, 1.3);
  return BASE_W * depth * tail;
}

/** A fixed jitter for the shadow side so the pen pass keeps its seed per boil. */
export const tubeSeed = (boil: number): number => 52000 + boil * 7;
