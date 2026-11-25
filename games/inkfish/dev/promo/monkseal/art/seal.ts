import type { Pt } from '../../../../src/art/pen';
import { screenScale } from '../../seal/art/paint';
import { drawSealBody, GROUND } from './sealBody';
import { drawSealFace, type FaceLook, NOSTRIL } from './sealFace';

/** A whole monk seal from the front: the body, then the head over it (tilted about its neck), and an eel up its nose or not. */
export interface SealPose {
  /** The head's middle on screen when upright, and px per unit (the head is 400 units wide). */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** Head tilt, radians, and shift in units. */
  readonly tilt?: number;
  readonly dx?: number;
  readonly dy?: number;
  readonly face: Omit<FaceLook, 'lw'>;
  readonly eel?: { readonly spine: readonly Pt[]; readonly slide?: number; readonly headOut?: boolean; readonly alarm?: number };
  /** Drawn in the open mouth, under the muzzle, in head units. */
  readonly inMouth?: (ctx: CanvasRenderingContext2D) => void;
  readonly breath?: number;
  readonly liftL?: number;
  readonly liftR?: number;
  readonly afloat?: boolean;
  /** Drawn over the face, in head units (sunglasses). */
  readonly over?: (ctx: CanvasRenderingContext2D, lw: number) => void;
  /** Draw the head only. */
  readonly headOnly?: boolean;
}

export const groundOf = (p: SealPose): number => p.y + GROUND * p.scale;

export function drawSeal(ctx: CanvasRenderingContext2D, p: SealPose): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.scale, p.scale);
  // Ink weights in screen px, a little lighter on small seals.
  const px = screenScale(ctx);
  const lw = Math.min(1.5, (1.15 * Math.max(0.55, Math.min(1, px / 1.6))) / px * 1.4);
  if (!p.headOnly) drawSealBody(ctx, { lw, breath: p.breath ?? 0, liftL: p.liftL ?? 0, liftR: p.liftR ?? 0, afloat: p.afloat ?? false });
  ctx.translate(p.dx ?? 0, (p.dy ?? 0) + 120);
  ctx.rotate(p.tilt ?? 0);
  ctx.translate(0, -120);
  drawSealFace(ctx, { ...p.face, lw }, p.eel, p.inMouth);
  p.over?.(ctx, lw);
  ctx.restore();
}

/**
 * A limp eel hanging from the nostril, in head units: out of the hole, over
 * the lip and straight down, swinging further towards the tail, its end
 * curled a little. `len` units long, `sway` -1 .. 1.
 */
export function hangingEel(len: number, sway: number, phase = 0, curl = 1): Pt[] {
  const n = 26;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const out = Math.min(1, (u * len) / 46);
    const swing = sway * 62 * u * u + 12 * Math.sin(phase + u * 4.2) * u;
    const hook = curl * 40 * Math.max(0, u - 0.66) ** 2 * 9;
    return {
      x: NOSTRIL.x - 6 + 14 * Math.sin(Math.min(1, out) * 1.4) + swing + hook * 0.9,
      y: NOSTRIL.y - 12 + u * len - curl * 60 * Math.max(0, u - 0.82) ** 2 * 8,
    };
  });
}
