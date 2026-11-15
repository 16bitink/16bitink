import { makeCanvas } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { type Camera } from './geo';
import { eyesOf, type Pose, rigsOf, type Rigs, type Spine, spinesOf, surfacesOf, throatOf } from './model';
import { eyeItem, type Item, layDown, type Light, paintItems, spineItems, surfaceItems, throatItem } from './paint';

/** The offscreen layer the penguin is painted into before it's laid on the frame. */
export function makeLayer(): HTMLCanvasElement {
  return makeCanvas(VIDEO.width, VIDEO.height).canvas;
}

export interface FigureOptions {
  /** A spine lit up (0 .. 1), for a light running down them. */
  readonly glow?: (s: Spine) => number;
  /** More to paint in depth order with the penguin (the fish in its mouth). */
  readonly extra?: (rigs: Rigs) => readonly Item[];
  /** The eyes' catchlight, 0 .. 1. */
  readonly glint?: number;
  /** How soft the washes run, px. */
  readonly soft?: number;
}

/**
 * The penguin in `pose` through `cam`, everything painted far to near:
 * feathers, bill, eyes and, when the bill is open, the throat, the inside of
 * the mouth and its spines (and `extra`), then laid on the frame.
 */
export function drawPenguin(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, cam: Camera, pose: Pose, light: Light, boil: number, opts: FigureOptions = {}): Rigs {
  const rigs = rigsOf(pose);
  const open = pose.open > 0.015;
  const surfs = surfacesOf(pose, rigs);
  const of = (g: string): typeof surfs => surfs.filter((s) => s.group === g);
  // Feathers and eyes; then the inside of the mouth over the face where the bill gapes; then the bill.
  const feathers: Item[] = surfaceItems(cam, of('feather'), light, boil);
  for (const e of eyesOf(rigs)) {
    const it = eyeItem(cam, e, pose.blink, opts.glint ?? 1);
    if (it) feathers.push(it);
  }
  const mouth: Item[] = [];
  if (open) {
    const throat = throatItem(cam, throatOf(rigs));
    if (throat) mouth.push(throat);
    mouth.push(...surfaceItems(cam, of('mouth'), light, boil));
    mouth.push(...spineItems(cam, spinesOf(rigs), light, opts.glow));
    mouth.push(...(opts.extra?.(rigs) ?? []));
  }
  const lctx = layer.getContext('2d')!;
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.clearRect(0, 0, layer.width, layer.height);
  paintItems(lctx, feathers);
  paintItems(lctx, mouth);
  paintItems(lctx, surfaceItems(cam, of('bill'), light, boil));
  layDown(ctx, layer, opts.soft);
  return rigs;
}
