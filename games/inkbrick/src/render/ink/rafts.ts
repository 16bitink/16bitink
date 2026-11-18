import { INK, Pen, roundRect, type Pt } from '../pen';
import { C } from './palette';

/**
 * Skip's six milestone rafts in ink (raft-3 ... raft-100), at the painted
 * deck along the bottom (the hitbox's own height), the rest rising above it.
 * Masts stand toward the right end and the sails are tall, so they show above
 * the bigger ink Skip (who lies on top). Same 180 px width as the painted set;
 * taller canvases (INK_RAFT_SIZES) since the raft is drawn in its own aspect.
 */
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const DECK_H = 18;
const MAST_X = 0.7;

/** Ink canvas sizes (image px) where they differ from the painted set's manifest sizes. */
export const INK_RAFT_SIZES: Readonly<Record<string, { readonly w: number; readonly h: number }>> = {
  'raft-7': { w: 180, h: 140 },
  'raft-14': { w: 180, h: 120 },
  'raft-30': { w: 180, h: 136 },
  'raft-50': { w: 180, h: 140 },
  'raft-100': { w: 180, h: 144 },
};
/** The sail's reach from the mast to just short of the right end. */
const reach = (w: number, x: number): number => w - x - 6;

/** A lashed deck in `fill`; `band` paints alternate planks (the stripes). */
function deck(p: Pen, w: number, h: number, fill: string, band?: string): void {
  const y = h - DECK_H - 1;
  const body = roundRect(2, y, w - 4, DECK_H - 1, 5, 10);
  p.fill(body, fill);
  if (band) {
    for (let x = 6, i = 0; x < w - 6; x += 15, i++) {
      if (i % 2) continue;
      p.fill([{ x, y }, { x: x + 15, y }, { x: x + 15, y: y + DECK_H }, { x, y: y + DECK_H }], band);
    }
  }
  p.hair([{ x: 6, y: y + DECK_H / 2 }, { x: w - 6, y: y + DECK_H / 2 + 1 }], 1.2, INK, 0.7);
  p.hatch(body, 4, 0.7, 0.9, { onlyBelow: y + DECK_H * 0.6, alpha: 0.5 });
  for (const fx of [0.12, 0.5, 0.88]) {
    const rope = roundRect(w * fx - 3.5, y - 1, 7, DECK_H + 1, 2, 3);
    p.fill(rope, C.sand);
    p.hatch(rope, 2.6, -1, 0.8, { alpha: 0.8 });
    p.closed(rope, 1.2);
  }
  p.closed(body, 2.2);
}

/** A longboat hull: a low curved body with raised ends. */
function hull(p: Pen, w: number, h: number, fill: string, trim: string): void {
  const top = h - DECK_H - 3;
  const shape: Pt[] = [
    { x: 2, y: top - 8 }, { x: 10, y: top }, { x: w - 10, y: top }, { x: w - 3, y: top - 7 },
    { x: w - 8, y: h - 6 }, { x: w - 22, y: h - 2 }, { x: 22, y: h - 2 }, { x: 8, y: h - 6 },
  ];
  p.fill(shape, fill);
  p.hatch(shape, 4, 0.75, 0.9, { onlyBelow: top + DECK_H * 0.55, alpha: 0.5 });
  p.stroke([{ x: 8, y: top + 5 }, { x: w - 8, y: top + 5 }], 3, trim, 1, false);
  for (let x = 24; x < w - 20; x += 22) {
    const shield = [...Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return { x: x + Math.cos(a) * 5, y: top + 10 + Math.sin(a) * 5 };
    })];
    p.fill(shield, trim);
    p.closed(shield, 1.1);
  }
  p.closed(shape, 2.2);
}

function mast(p: Pen, x: number, top: number, bottom: number): void {
  p.stroke([{ x, y: bottom }, { x, y: top }], 3, INK, 1, true);
  p.dot(x, top, 2.2);
}

/** A triangular sail hung from the mast, swelling to the right. */
function sailShape(x: number, top: number, bottom: number, reach: number): Pt[] {
  const belly = Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    return { x: x + 2 + reach * Math.sin(t * Math.PI * 0.5) * (1 - 0.15 * t), y: top + 2 + (bottom - top - 2) * t };
  });
  return [{ x: x + 2, y: top + 2 }, ...belly, { x: x + 2, y: bottom }];
}

function sail(p: Pen, shape: Pt[], fill: string, stripes?: readonly string[]): void {
  p.fill(shape, fill);
  if (stripes) {
    const ys = shape.map((q) => q.y);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const sh = (y1 - y0) / stripes.length;
    p.clipped(shape, () => stripes.forEach((c, i) => p.fill([{ x: 0, y: y0 + i * sh }, { x: 999, y: y0 + i * sh }, { x: 999, y: y0 + (i + 1) * sh }, { x: 0, y: y0 + (i + 1) * sh }], c)));
  }
  p.hatch(shape, 3.4, 1.1, 0.8, { alpha: 0.35 });
  p.closed(shape, 2);
}

const striped: Draw = (ctx, w, h) => deck(new Pen(ctx, 603, 0.5), w, h, C.white, C.red);

const patchedSail: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 607, 0.5);
  const x = w * MAST_X;
  const bottom = h - DECK_H - 2;
  mast(p, x, 4, bottom + 2);
  const s = sailShape(x, 6, bottom - 4, reach(w, x));
  sail(p, s, C.white);
  for (const [px, py, c] of [[x + 10, h * 0.22, C.mauve], [x + 22, h * 0.5, C.stone], [x + 8, h * 0.62, C.sage]] as const) {
    const patch = [{ x: px, y: py }, { x: px + 14, y: py + 1 }, { x: px + 13, y: py + 13 }, { x: px - 1, y: py + 12 }];
    p.fill(patch, c);
    p.closed(patch, 1.2);
    p.hair([{ x: px + 2, y: py + 4 }, { x: px + 11, y: py + 4 }], 0.9);
    p.hair([{ x: px + 2, y: py + 9 }, { x: px + 11, y: py + 9 }], 0.9);
  }
  deck(p, w, h, C.drift);
};

const pennants: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 614, 0.5);
  const bottom = h - DECK_H - 2;
  const x0 = 10;
  const x1 = w - 10;
  mast(p, x0, 6, bottom + 2);
  mast(p, x1, 6, bottom + 2);
  const line = Array.from({ length: 11 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / 10, y: 9 + Math.sin((i / 10) * Math.PI) * 26 }));
  const colors = [C.red, C.gold, C.blue, C.sage, C.mauve] as const;
  line.slice(1, -1).forEach((q, i) => {
    const flag = [{ x: q.x - 7, y: q.y }, { x: q.x + 7, y: q.y }, { x: q.x, y: q.y + 17 }];
    p.fill(flag, colors[i % colors.length]!);
    p.closed(flag, 1.2);
  });
  p.stroke(line, 1.4);
  deck(p, w, h, C.drift);
};

const blueBanner: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 630, 0.5);
  const x = w * MAST_X + 4;
  const bottom = h - DECK_H - 2;
  mast(p, x, 3, bottom + 2);
  const f = reach(w, x);
  const flag: Pt[] = [{ x: x + 2, y: 6 }, { x: x + f * 0.55, y: 4 }, { x: x + f, y: 10 }, { x: x + f * 0.72, y: 26 }, { x: x + f, y: 44 }, { x: x + f * 0.5, y: 40 }, { x: x + 2, y: 46 }];
  p.fill(flag, C.blue);
  p.hatch(flag, 3.4, 0.9, 0.8, { onlyBelow: 30, alpha: 0.5 });
  p.closed(flag, 2);
  const sun = Array.from({ length: 14 }, (_, i) => ({ x: x + 18 + Math.cos((i / 14) * Math.PI * 2) * 8, y: 25 + Math.sin((i / 14) * Math.PI * 2) * 8 }));
  p.fill(sun, C.gold);
  p.closed(sun, 1.5);
  deck(p, w, h, C.teal);
};

const redLongboat: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 650, 0.5);
  const x = w * MAST_X;
  const bottom = h - DECK_H - 4;
  mast(p, x, 3, bottom + 2);
  sail(p, sailShape(x, 5, bottom - 2, reach(w, x)), C.white, [C.red, C.white, C.red, C.white, C.red]);
  hull(p, w, h, C.driftDark, C.gold);
};

const rainbowSail: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 700, 0.5);
  const x = w * MAST_X;
  const bottom = h - DECK_H - 4;
  mast(p, x, 2, bottom + 2);
  sail(p, sailShape(x, 4, bottom - 2, reach(w, x)), C.white, [C.red, C.orange, C.gold, C.sage, C.blue, C.mauve]);
  hull(p, w, h, C.gold, C.red);
};

export const RAFT_DRAWERS: Readonly<Record<string, Draw>> = {
  'raft-3': striped,
  'raft-7': patchedSail,
  'raft-14': pennants,
  'raft-30': blueBanner,
  'raft-50': redLongboat,
  'raft-100': rainbowSail,
};
