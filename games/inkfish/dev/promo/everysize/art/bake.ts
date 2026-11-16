import { makeCanvas, Pen } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';

/**
 * Baking for the new drawings: each one is painted in its own units (a body
 * length is LEN units, snout towards +x, centre at the origin) once per
 * line-boil frame, at whichever of a few resolutions the shot needs (the
 * bigger ones bake the first time they're asked for). The tail end can bend
 * column by column as it beats, like foodchain/art/orca.ts.
 */

export const LEN = 100;

export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** Paints one boil frame at `k` px per unit; `pen(part)` gives a seeded pen per part so the boil differs frame to frame. */
export type Paint = (ctx: CanvasRenderingContext2D, k: number, pen: (part: number, wobble?: number) => Pen) => void;

export interface Bend {
  /** Columns behind this x (units) bend; the bend grows to full at `to`. */
  readonly from: number;
  readonly to: number;
  /** Up-down swing at full bend, units. */
  readonly amp: number;
}

export interface Art {
  /**
   * Draws it centred at (x, y) screen px, `length` px a body length, `angle`
   * radians, `flip` mirrored top to bottom (for swimming left), `beat` the
   * tail's phase, `alpha` its opacity.
   */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, opts?: DrawOpts): void;
  /** Bakes the smallest size now (for kit pages and the first frame). */
  prepare(): void;
}

export interface DrawOpts {
  readonly flip?: boolean;
  readonly beat?: number;
  readonly alpha?: number;
  /** Fixes the boil frame (thumbnails). */
  readonly frame?: number;
}

const RES = [1.5, 4, 9, 18] as const;

export const boilOf = (t: number): number => Math.floor(t * BOIL_FPS) % BOIL_FRAMES;

export function createArt(box: Box, seed: number, paint: Paint, bend?: Bend): Art {
  const cache = new Map<number, HTMLCanvasElement[]>();
  const framesAt = (res: number): HTMLCanvasElement[] => {
    let frames = cache.get(res);
    if (frames) return frames;
    frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
      const w = Math.ceil((box.x1 - box.x0) * res);
      const h = Math.ceil((box.y1 - box.y0) * res);
      const { canvas, ctx } = makeCanvas(w, h);
      ctx.translate(-box.x0 * res, -box.y0 * res);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      paint(ctx, res, (part, wobble = 1) => new Pen(ctx, seed + f * 977 + part * 7919, Math.min(1.6, 0.25 + res * 0.09) * wobble));
      return canvas;
    });
    cache.set(res, frames);
    return frames;
  };
  return {
    prepare: () => void framesAt(RES[0]),
    draw(ctx, x, y, length, angle, t, opts = {}) {
      if (length < 1 || (opts.alpha ?? 1) <= 0) return;
      const scale = length / LEN;
      const m = ctx.getTransform();
      const need = scale * Math.hypot(m.a, m.b);
      const res = RES.find((r) => r >= need * 0.95) ?? RES[RES.length - 1]!;
      const c = framesAt(res)[opts.frame ?? boilOf(t)]!;
      ctx.save();
      if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);
      if (opts.flip) ctx.scale(1, -1);
      ctx.scale(scale, scale);
      const k = 1 / res;
      if (!bend || opts.beat === undefined) {
        ctx.drawImage(c, box.x0, box.y0, c.width * k, c.height * k);
      } else {
        const split = Math.max(0, Math.min(c.width, Math.round((bend.from - box.x0) * res)));
        ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
        const step = Math.max(1, Math.round((2.5 * res) / Math.max(0.05, need)));
        for (let sx = 0; sx < split; sx += step) {
          const ux = box.x0 + (sx + step / 2) * k;
          const b = Math.max(0, Math.min(1, (bend.from - ux) / (bend.from - bend.to)));
          const dy = bend.amp * b * b * Math.sin(opts.beat - 2.6 * b);
          const w = Math.min(step, split - sx);
          ctx.drawImage(c, sx, 0, w, c.height, box.x0 + sx * k, box.y0 + dy, w * k + 1.2 / Math.max(0.05, need), c.height * k);
        }
      }
      ctx.restore();
    },
  };
}
