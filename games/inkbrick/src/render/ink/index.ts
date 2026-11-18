import { art, type ArtKey } from '../../art/manifest';
import { ART_STYLE } from '../../art/style';
import { boardDrawer, surroundDrawer } from './boards';
import { BRICK_DRAWERS } from './bricks';
import { FRIEND_DRAWERS, FRIEND_SIZES } from './friends';
import { LOCK_DRAWERS, LOCK_SIZES } from './lock';
import { PIECE_DRAWERS } from './pieces';
import { INK_RAFT_SIZES, RAFT_DRAWERS } from './rafts';
import { VARIETY_DRAWERS, VARIETY_SIZES } from './variety';

/**
 * The ink set's code-drawn keys, baked once to canvases at their manifest
 * image size (InkFish bakes its art the same way). Phaser takes the canvas
 * as a texture; the DOM screens get a data URL of it.
 */
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function drawers(): Map<string, Draw> {
  const m = new Map<string, Draw>();
  for (const [kind, d] of Object.entries(BRICK_DRAWERS)) {
    m.set(`brick-${kind}`, d);
    m.set(`brick-${kind}-sq`, d);
  }
  for (const [key, d] of Object.entries({ ...PIECE_DRAWERS, ...RAFT_DRAWERS, ...VARIETY_DRAWERS, ...FRIEND_DRAWERS, ...LOCK_DRAWERS })) m.set(key, d);
  for (let c = 1; c <= 5; c++) {
    m.set(`bg-${c}-board`, boardDrawer(c));
    m.set(`bg-${c}-wide`, surroundDrawer(c));
  }
  return m;
}

const DRAWERS = drawers();
const canvases = new Map<string, HTMLCanvasElement>();
const dataUrls = new Map<string, string>();

/** Sizes (image px) of code-drawn keys that aren't in the art manifest (the variety pieces). */
const OWN_SIZES: Readonly<Record<string, { readonly w: number; readonly h: number }>> = { ...VARIETY_SIZES, ...FRIEND_SIZES, ...LOCK_SIZES };

/**
 * True when the active style draws this key in code. Keys the painted set
 * never had (the variety pieces, 2026-11-18) are drawn in ink in both sets.
 */
export const isInkDrawn = (key: string): boolean => DRAWERS.has(key) && (key in art ? ART_STYLE === 'ink' : true);

/** Every code-drawn key that isn't in the manifest (the play scene loads them up front). */
export const OWN_KEYS: readonly string[] = [...DRAWERS.keys()].filter((k) => !(k in art) && k in OWN_SIZES);

export function inkCanvas(key: string): HTMLCanvasElement {
  const done = canvases.get(key);
  if (done) return done;
  const draw = DRAWERS.get(key);
  const size = INK_RAFT_SIZES[key] ?? OWN_SIZES[key] ?? art[key as ArtKey];
  if (!draw || !size) throw new Error(`InkBrick ink art: no drawer for "${key}"`);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  draw(ctx, size.w, size.h);
  canvases.set(key, canvas);
  return canvas;
}

/** A brick drawn at its own size (image px), so its lines stay even however long or thin it is. */
export function inkBrickCanvas(key: string, w: number, h: number): HTMLCanvasElement {
  const draw = DRAWERS.get(key);
  if (!draw) throw new Error(`InkBrick ink art: no drawer for "${key}"`);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(w));
  canvas.height = Math.max(2, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  draw(ctx, canvas.width, canvas.height);
  return canvas;
}

export function inkUrl(key: string): string {
  let url = dataUrls.get(key);
  if (!url) {
    url = inkCanvas(key).toDataURL('image/png');
    dataUrls.set(key, url);
  }
  return url;
}
