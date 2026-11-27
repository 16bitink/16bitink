import { THEMES } from '../../../src/art/backdrop';
import { BACKDROP_W } from '../../../src/art/backdrop/common';
import { seaplane } from '../../../src/art/backdrop/tropic';
import { makeDraw } from '../../../src/art/kit';
import { INK, PALE_SAND } from '../../../src/art/palette';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { makeSandPatterns, type SandPatterns } from '../../../src/art/sand';
import { VIDEO } from '../short';
import { layerTop, PARALLAX, S_PAINTED, screenX, type WorldCam } from './story';

/**
 * Beach 1, the Maldives atoll, drawn by the game's own backdrop code
 * (src/art/backdrop/atoll.ts): its sky, clouds, lagoon with the reef, the
 * resort's water villas and the shore of palms, each baked once at the
 * painted hook's scale and laid out on screen as the game stacks them over
 * its sand, with a gentle parallax. In front: white coral sand, hatched with
 * the game's sand patterns.
 */
const BAKE = S_PAINTED;
/** Design px baked left of the tile's start (the pan and the close-ups look a little past it). */
const MARGIN = 120;
const SPAN = BACKDROP_W + 2 * MARGIN;
/** Where the shore layer's sand meets its scrub, design px below the layer's top (atoll.ts SHORE_GROUND). */
export const SHORE_GROUND = 280;

export interface Layer {
  readonly id: string;
  readonly canvas: HTMLCanvasElement;
  readonly height: number;
  readonly lift: number;
}

export interface Beach {
  readonly layers: readonly Layer[];
  readonly plane: HTMLCanvasElement;
  readonly patterns: SandPatterns;
}

/** The seaplane as the game draws it (faces left), baked big: `PLANE_PX` canvas px per design unit of its own scale. */
const PLANE_BOX = { w: 90, h: 46 } as const;
const PLANE_PX = 4;

function bakePlane(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(PLANE_BOX.w * PLANE_PX * 2, PLANE_BOX.h * PLANE_PX * 2);
  ctx.scale(PLANE_PX * 2, PLANE_PX * 2);
  // Its ink at full strength: close up, it isn't far away any more.
  seaplane(makeDraw(ctx, 4242, 0, 0), PLANE_BOX.w / 2, PLANE_BOX.h / 2, 2);
  return canvas;
}

export function makeBeach(): Beach {
  const layers = THEMES.atoll.map((spec, i) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(SPAN * BAKE), Math.ceil(spec.height * BAKE));
    ctx.scale(BAKE, BAKE);
    ctx.translate(MARGIN, 0);
    spec.draw(makeDraw(ctx, 900 + i, 0, 0));
    return { id: spec.id, canvas, height: spec.height, lift: spec.lift };
  });
  const { ctx } = makeCanvas(4, 4);
  return { layers, plane: bakePlane(), patterns: makeSandPatterns(ctx, 2, PALE_SAND) };
}

/** Screen y where the shore's sand begins (the line our foreground sand runs down from). */
export function shoreLine(beach: Beach, cam: WorldCam): number {
  const shore = beach.layers.find((l) => l.id === 'shore')!;
  return layerTop(cam, shore.height, shore.lift) + SHORE_GROUND * cam.s;
}

/** The backdrop layers, far to near. `haze` lays paper over them (the close-ups' shallow focus). */
export function drawBackdrop(ctx: CanvasRenderingContext2D, beach: Beach, cam: WorldCam, haze = 0): void {
  const { width: W, height: H } = VIDEO;
  ctx.fillStyle = '#f5f0e1';
  ctx.fillRect(0, 0, W, H);
  for (const l of beach.layers) {
    const x = screenX(cam, -MARGIN, PARALLAX[l.id] ?? 1);
    ctx.drawImage(l.canvas, x, layerTop(cam, l.height, l.lift), SPAN * cam.s, l.height * cam.s);
  }
  if (haze > 0) {
    ctx.save();
    ctx.globalAlpha = haze;
    ctx.fillStyle = '#f7f1e2';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** The near beach: white coral sand from `top` down, in the game's hatching, scaled with the camera. */
export function drawSand(ctx: CanvasRenderingContext2D, beach: Beach, cam: WorldCam, top: number, alpha = 1): void {
  if (alpha <= 0) return;
  const { width: W, height: H } = VIDEO;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#f6eed8');
  g.addColorStop(0.45, '#f1e4c4');
  g.addColorStop(1, '#e6d3a8');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);
  // The hatching, anchored to the sand so it slides with the pan.
  const k = cam.s / 1.1;
  ctx.translate(screenX(cam, 0, 1), top);
  ctx.scale(k, k);
  for (const [p, a] of [[beach.patterns.grain, 0.35], [beach.patterns.sand, 0.22]] as const) {
    ctx.fillStyle = p;
    ctx.globalAlpha = alpha * a;
    ctx.fillRect(-4000, 0, 8000, (H - top) / k + 10);
  }
  ctx.restore();
  // Its edge where it meets the berm, in pen.
  const pen = new Pen(ctx, 77, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  pen.stroke(Array.from({ length: 30 }, (_, i) => ({ x: -20 + i * 40, y: top + 3 * Math.sin(i * 1.3 + 0.4) })), 2.2, INK, 0.5, false);
  ctx.restore();
}

/** The seaplane at a screen place; `scale` is screen px per design unit of the game's drawing at its size 2. */
export function drawPlane(ctx: CanvasRenderingContext2D, beach: Beach, x: number, y: number, scale: number, alpha = 1, tilt = 0): void {
  const w = PLANE_BOX.w * scale;
  const h = PLANE_BOX.h * scale;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.drawImage(beach.plane, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Warm light over the whole frame: golden hour at 1, a soft morning at the hook's base level. */
export function drawGold(ctx: CanvasRenderingContext2D, gold: number): void {
  if (gold <= 0) return;
  const { width: W, height: H } = VIDEO;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgba(255,196,128,${0.42 * gold})`);
  g.addColorStop(0.55, `rgba(255,214,160,${0.3 * gold})`);
  g.addColorStop(1, `rgba(255,200,150,${0.22 * gold})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  const r = ctx.createRadialGradient(W * 0.82, H * 0.2, 20, W * 0.82, H * 0.2, H * 0.7);
  r.addColorStop(0, `rgba(255,214,150,${0.45 * gold})`);
  r.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
