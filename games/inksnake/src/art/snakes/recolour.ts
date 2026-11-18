import { makeDraw, type Draw } from '../kit';
import { makeCanvas, shrink } from '../pen';
import type { SnakeArt, SpriteArt } from '../types';

/**
 * A snake's drawings repainted in another colouring: the source painted on
 * a layer of its own, every pixel's colour remapped by hue (the pen's blue
 * left alone), then an optional glaze over it, and laid onto the canvas.
 * The brushwork stays the source's, so a morph or a cousin keeps the
 * painting's quality (the candy cane corn snake is the corn snake's).
 */

/** Hue 0..360, saturation and lightness 0..1. */
export interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/** A pixel's new colour, or null to keep it. */
export type HueMap = (c: Hsl) => Hsl | null;

/** A glaze over the remapped layer (painted only where there's paint), in the drawing's own units. */
export type Glaze = (ctx: CanvasRenderingContext2D, part: 'strip' | 'head', size: { readonly w: number; readonly h: number }) => void;

function toHsl(r: number, g: number, b: number): Hsl {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? ((G - B) / d + (G < B ? 6 : 0)) * 60 : max === G ? ((B - R) / d + 2) * 60 : ((R - G) / d + 4) * 60;
  return { h, s, l };
}

function toRgb({ h, s, l }: Hsl): [number, number, number] {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
}

function remap(data: Uint8ClampedArray, map: HueMap): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! === 0) continue;
    const out = map(toHsl(data[i]!, data[i + 1]!, data[i + 2]!));
    if (!out) continue;
    const [r, g, b] = toRgb({ h: ((out.h % 360) + 360) % 360, s: clamp01(out.s), l: clamp01(out.l) });
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Paints `paint` through the map onto `ctx` (whose transform the layer copies). */
function through(ctx: CanvasRenderingContext2D, paint: (layer: CanvasRenderingContext2D) => void, map: HueMap, glaze: (layer: CanvasRenderingContext2D) => void): void {
  const { canvas } = ctx;
  const { canvas: layer, ctx: lctx } = makeCanvas(canvas.width, canvas.height);
  const t = ctx.getTransform();
  lctx.setTransform(t);
  paint(lctx);
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = lctx.getImageData(0, 0, layer.width, layer.height);
  remap(img.data, map);
  lctx.putImageData(img, 0, 0);
  lctx.setTransform(t);
  lctx.globalCompositeOperation = 'source-atop';
  glaze(lctx);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
  shrink(layer);
}

function sprite<P extends string>(src: SpriteArt<P>, map: HueMap, glaze: (ctx: CanvasRenderingContext2D) => void, seed: number): SpriteArt<P> {
  return {
    frame: src.frame, res: src.res, poses: src.poses,
    draw: (d: Draw, pose: P) => through(d.pen.ctx, (layer) => src.draw(makeDraw(layer, seed + d.f, d.f, d.g, d.ink), pose), map, glaze),
  };
}

/** `src` repainted through `map`, with `glaze` over it, in the new snake's own interface colours. */
export function recoloured(src: SnakeArt, map: HueMap, colours: SnakeArt['colours'], glaze: Glaze = () => undefined): SnakeArt {
  const strip = (paint: SnakeArt['drawStrip']) => (d: Draw, length: number): void =>
    through(d.pen.ctx, (layer) => paint(makeDraw(layer, 11, d.f, d.g, d.ink), length), map, (layer) => glaze(layer, 'strip', { w: length, h: 24 }));
  const headGlaze = (ctx: CanvasRenderingContext2D): void => glaze(ctx, 'head', { w: src.head.frame, h: src.head.frame });
  return {
    period: src.period,
    drawStrip: strip(src.drawStrip),
    ...(src.drawBelly ? { drawBelly: strip(src.drawBelly) } : {}),
    head: sprite(src.head, map, headGlaze, 300),
    tongue: src.tongue,
    snout: src.snout,
    colours,
  };
}

/** The pen's blue (and anything grey): left as it is. */
export const isInk = (c: Hsl): boolean => c.s < 0.12 || (c.h > 200 && c.h < 270);
