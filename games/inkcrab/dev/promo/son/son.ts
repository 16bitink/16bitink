import dig from './art/dig.png?url';
import holdCrab from './art/hold-crab.png?url';
import peek from './art/peek.png?url';
import trophy from './art/trophy.png?url';
import search from './art/search.png?url';
import torch from './art/torch.png?url';
import tablet from './art/tablet.png?url';
import asleep from './art/asleep.png?url';

/**
 * Dewy's son: a small fennec kit (yellow bucket hat, coral-striped tee, blue
 * shorts), the star of the InkCrab dev-story shorts (#149 on). Full-body painted
 * poses, transparent PNGs, each standing on its own small patch of painted sand
 * (set it on sand so the patch blends in). Cut from art/raw/sheet-up4.png by
 * art/cut.py. He never speaks, so he has no mouth sets; never give him a name or
 * an age on screen. Dewy himself: games/inkfish/dev/promo/devstory/dewy.ts.
 *
 *   const son = await loadSon();
 *   drawSon(ctx, son, { key: 'dig', x: 540, y: 1250, height: 760 });  // (x, y) = bottom centre
 */
const URLS = { dig, 'hold-crab': holdCrab, peek, trophy, search, torch, tablet, asleep } as const;
export type SonKey = keyof typeof URLS;
export const SON_KEYS = Object.keys(URLS) as SonKey[];
export type SonImages = Readonly<Record<SonKey, HTMLImageElement>>;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Son art failed to load: ${url}`));
    img.src = url;
  });
}

export async function loadSon(): Promise<SonImages> {
  const entries = await Promise.all(SON_KEYS.map(async (k) => [k, await loadImage(URLS[k])] as const));
  return Object.fromEntries(entries) as SonImages;
}

export interface SonPose {
  readonly key: SonKey;
  /** Bottom centre of the drawing, in canvas pixels. */
  readonly x: number;
  readonly y: number;
  /** Drawn height in canvas pixels (the width follows the image). */
  readonly height: number;
  readonly alpha?: number;
  /** Mirror left-right. */
  readonly flip?: boolean;
  /** Small rotation about the bottom centre, radians (a hop, a wiggle). */
  readonly tilt?: number;
}

/** Draws one pose. Pure: same arguments, same pixels. */
export function drawSon(ctx: CanvasRenderingContext2D, son: SonImages, pose: SonPose): void {
  const img = son[pose.key];
  const h = pose.height;
  const w = (img.width / img.height) * h;
  ctx.save();
  ctx.globalAlpha *= pose.alpha ?? 1;
  ctx.translate(pose.x, pose.y);
  if (pose.tilt) ctx.rotate(pose.tilt);
  if (pose.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}
