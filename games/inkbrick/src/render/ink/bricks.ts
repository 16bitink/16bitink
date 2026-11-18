import { ellipse, INK, Pen, roundRect, type Pt } from '../pen';
import { C, LINE } from './palette';

/**
 * Brick art in ink (InkFish's pen). Each kind reads at a glance by shape and
 * texture, not colour alone: sand stipple (soft), wood grain and nails (tough,
 * cracks for hits lost), cross-hatched cobbles (stone), three shells (x3), a
 * hooped keg, a star (pickup), glinting ice, a key, a hatched gate with a keyhole.
 */
export type BrickDraw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const INSET = 4;
const bodyOf = (w: number, h: number): Pt[] => roundRect(INSET, INSET, w - INSET * 2, h - INSET * 2, Math.min(9, h * 0.18));

/** Fill, texture inside the outline, then the outline itself (last, so it stays crisp). */
function brick(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, fill: string, inside: (p: Pen, body: Pt[]) => void, line = LINE): Pen {
  const p = new Pen(ctx, seed, 0.9);
  const body = bodyOf(w, h);
  p.fill(body, fill);
  p.clipped(body, () => inside(p, body));
  p.closed(body, line);
  return p;
}

/** A bottom-weighted stipple: the shade side of a block. */
const shade = (p: Pen, body: Pt[], h: number, amount: number): void =>
  p.stipple(body, amount, (_x, y) => 0.08 + 0.85 * Math.pow(y / h, 2.2), 0.9);

const soft = (variant: number): BrickDraw => (ctx, w, h) =>
  brick(ctx, w, h, 11 + variant * 7, C.sand, (p, body) => {
    shade(p, body, h, w * h * 0.11);
    // Ripples in the sand.
    for (let i = 0; i < 2; i++) {
      const y = h * (0.36 + i * 0.22) + p.jitter(2);
      const x0 = w * (0.18 + 0.1 * ((variant + i) % 3));
      p.hair([{ x: x0, y }, { x: x0 + w * 0.12, y: y - 2 }, { x: x0 + w * 0.24, y: y + 1 }, { x: x0 + w * 0.34, y: y - 1 }], 1.4, INK, 0.55);
    }
    if (variant === 1) [0.72, 0.78, 0.83].forEach((fx, i) => p.dot(w * fx, h * (0.42 + i * 0.07), 2, INK, 0.7));
  });

/** Tough driftwood: grain, nails; stage 2 and 3 add bold cracks (1 = intact). */
const tough = (stage: 1 | 2 | 3): BrickDraw => (ctx, w, h) => {
  const p = brick(ctx, w, h, 31, C.drift, (pen, body) => {
    const lines = Math.max(1, Math.min(3, Math.round((h - INSET * 2) / 15)));
    for (let i = 1; i <= lines; i++) {
      const y = INSET + ((h - INSET * 2) * i) / (lines + 1);
      const pts = Array.from({ length: 7 }, (_, k) => ({ x: INSET + ((w - INSET * 2) * k) / 6, y: y + Math.sin(k * 1.3 + i) * 1.6 }));
      pen.hair(pts, 1.5, INK, 0.7);
    }
    pen.hatch(body, 4.5, 0.7, 1.1, { onlyBelow: h * 0.66, alpha: 0.55 });
    pen.closed(ellipse(w * 0.62, h * 0.42, Math.min(7, w * 0.06), 3.2, 10), 1.3);
  });
  for (const x of w > h ? [INSET + 9, w - INSET - 9] : [w / 2]) {
    p.dot(x, h * 0.3, 2.6);
    p.dot(x, h * 0.72, 2.6);
  }
  if (stage >= 2) crack(p, w * 0.42, INSET, [[-0.08, 0.35], [0.06, 0.62], [-0.03, 0.9]], w, h);
  if (stage >= 3) {
    crack(p, w * (w > h ? 0.74 : 0.2), h - INSET, [[0.06, -0.3], [-0.05, -0.55], [0.04, -0.8]], w, h);
    p.fill([{ x: w * 0.42 - 6, y: INSET + 1 }, { x: w * 0.42 + 8, y: INSET + 1 }, { x: w * 0.42 + 1, y: INSET + 10 }], INK, 0.9);
  }
};

/** A bold zig-zag crack from (x0, y0) through offsets given as fractions of w (x) and h (y). */
function crack(p: Pen, x0: number, y0: number, steps: readonly (readonly [number, number])[], w: number, h: number): void {
  const k = Math.min(w, h * 3);
  const pts = [{ x: x0, y: y0 }, ...steps.map(([dx, dy]) => ({ x: x0 + dx * k * 0.5, y: y0 + dy * h }))];
  p.stroke(pts, 3.4, INK, 1, false);
  const mid = pts[2]!;
  p.hair([mid, { x: mid.x + k * 0.07, y: mid.y + h * 0.08 }], 1.8, INK, 0.9);
}

const stone: BrickDraw = (ctx, w, h) =>
  void brick(ctx, w, h, 41, C.stone, (p, body) => {
    p.hatch(body, 5, 0.75, 1.1, { alpha: 0.5 });
    p.hatch(body, 6, -0.75, 1.1, { alpha: 0.4 });
    // Cobble seams across the long side, one every ~60 px.
    const long = Math.max(w, h);
    const n = Math.max(1, Math.round(long / 60));
    for (let i = 1; i < n; i++) {
      const t = (long * i) / n;
      if (w >= h) p.stroke([{ x: t, y: INSET }, { x: t + 3, y: h / 2 }, { x: t - 2, y: h - INSET }], 2.2, INK, 1, false);
      else p.stroke([{ x: INSET, y: t }, { x: w / 2, y: t + 3 }, { x: w - INSET, y: t - 2 }], 2.2, INK, 1, false);
    }
  }, 4);

function shell(p: Pen, cx: number, cy: number, r: number): void {
  const out = ellipse(cx, cy, r, r * 0.92, 18);
  p.fill(out, C.white);
  p.stipple(out, r * r * 1.6, (x) => (x > cx ? 0.5 : 0.1), 0.7);
  p.closed(out, 2.2);
  const spiral = Array.from({ length: 22 }, (_, i) => {
    const t = i / 21;
    const a = t * Math.PI * 3.6;
    const rr = r * (1 - t) * 0.9;
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.92 };
  });
  p.hair(spiral, 1.6, INK, 0.95);
}

const x3: BrickDraw = (ctx, w, h) => {
  const p = brick(ctx, w, h, 51, C.mauve, (pen, body) => shade(pen, body, h, w * h * 0.12));
  const r = Math.min(h * 0.27, w * 0.13);
  const spots = w > h
    ? [0.22, 0.5, 0.78].map((fx) => ({ x: w * fx, y: h / 2 }))
    : [{ x: w * 0.3, y: h * 0.66 }, { x: w * 0.7, y: h * 0.66 }, { x: w / 2, y: h * 0.32 }];
  const rr = w > h ? r : h * 0.16;
  for (const s of spots) shell(p, s.x, s.y, rr);
};

const keg: BrickDraw = (ctx, w, h) => {
  const p = brick(ctx, w, h, 61, C.orange, (pen, body) => {
    for (let i = 1; i <= 2; i++) pen.hair([{ x: INSET, y: h * (0.2 + i * 0.2) }, { x: w / 2, y: h * (0.18 + i * 0.2) }, { x: w - INSET, y: h * (0.2 + i * 0.2) }], 1.4, INK, 0.6);
    pen.hatch(body, 4, 0.6, 1.2, { onlyBelow: h * 0.62, alpha: 0.6 });
  });
  const bands = w > h ? [0.2, 0.8] : [0.28, 0.72];
  for (const fx of bands) {
    const band = roundRect(w * fx - 5, INSET, 10, h - INSET * 2, 2, 3);
    p.fill(band, '#6b5446');
    p.closed(band, 1.6);
  }
  p.fill(ellipse(w / 2, h / 2, 5, 5, 10), INK, 0.95);
  p.dot(w / 2 - 1.5, h / 2 - 1.5, 1.3, C.paper);
};

function star(cx: number, cy: number, r: number): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
  });
}

const pickup: BrickDraw = (ctx, w, h) => {
  const p = brick(ctx, w, h, 71, C.sage, (pen, body) => shade(pen, body, h, w * h * 0.12));
  const s = star(w / 2, h / 2 + 1, h * 0.36);
  p.fill(s, C.gold);
  p.hatch(s, 3.2, 0.9, 0.9, { onlyBelow: h * 0.55, alpha: 0.6 });
  p.closed(s, 2.6);
};

const ice = (cracked: boolean): BrickDraw => (ctx, w, h) => {
  const p = brick(ctx, w, h, 81, C.ice, (pen, body) => {
    pen.hatch(body, 6, -0.9, 1, { alpha: 0.3, onlyBelow: h * 0.45 });
    pen.stroke([{ x: w * 0.12, y: h * 0.62 }, { x: w * 0.3, y: h * 0.26 }], 3.2, C.white, 1, false);
    pen.stroke([{ x: w * 0.22, y: h * 0.7 }, { x: w * 0.34, y: h * 0.46 }], 2.2, C.white, 1, false);
  }, 2.6);
  if (!cracked) return;
  const c = { x: w * 0.62, y: h * 0.48 };
  for (const [dx, dy] of [[-0.3, -0.5], [0.35, -0.45], [0.3, 0.55], [-0.25, 0.5], [0.5, 0.05]] as const)
    p.stroke([c, { x: c.x + dx * Math.min(w, h * 2) * 0.5, y: c.y + dy * h * 0.8 }], 2.4, INK, 1, false);
};

const key: BrickDraw = (ctx, w, h) => {
  const p = brick(ctx, w, h, 91, C.teal, (pen, body) => shade(pen, body, h, w * h * 0.1));
  const r = h * 0.2;
  const cx = w > h ? w * 0.32 : w * 0.3;
  const shaftEnd = w > h ? w * 0.74 : w * 0.82;
  const ring = ellipse(cx, h / 2, r, r, 14);
  const shaft = [{ x: cx + r, y: h / 2 - 3 }, { x: shaftEnd, y: h / 2 - 3 }, { x: shaftEnd, y: h / 2 + 3 }, { x: cx + r, y: h / 2 + 3 }];
  const teeth = [{ x: shaftEnd - 12, y: h / 2 + 3 }, { x: shaftEnd - 12, y: h / 2 + 10 }, { x: shaftEnd - 6, y: h / 2 + 10 }, { x: shaftEnd - 6, y: h / 2 + 3 }];
  for (const s of [shaft, teeth, ring]) p.fill(s, C.gold);
  p.fill(ellipse(cx, h / 2, r * 0.45, r * 0.45, 10), C.teal);
  p.closed(shaft, 2);
  p.closed(teeth, 2);
  p.closed(ring, 2.4);
  p.closed(ellipse(cx, h / 2, r * 0.45, r * 0.45, 10), 1.8);
};

const gate: BrickDraw = (ctx, w, h) => {
  const p = brick(ctx, w, h, 101, C.gate, (pen, body) => {
    pen.hatch(body, 3.6, 0.8, 1.2, { alpha: 0.75 });
    pen.hatch(body, 4.5, -0.8, 1.1, { alpha: 0.55 });
  }, 4);
  for (const fx of w > h ? [0.2, 0.8] : []) p.stroke([{ x: w * fx, y: INSET }, { x: w * fx, y: h - INSET }], 3, INK, 1, false);
  const plate = ellipse(w / 2, h / 2, h * 0.3, h * 0.36, 16);
  p.fill(plate, C.paper);
  p.closed(plate, 2.4);
  p.fill(ellipse(w / 2, h * 0.42, h * 0.1, h * 0.1, 12), INK);
  p.fill([{ x: w / 2 - h * 0.05, y: h * 0.45 }, { x: w / 2 + h * 0.05, y: h * 0.45 }, { x: w / 2 + h * 0.09, y: h * 0.7 }, { x: w / 2 - h * 0.09, y: h * 0.7 }], INK);
};

const dense: BrickDraw = (ctx, w, h) =>
  void brick(ctx, w, h, 111, C.white, (p, body) => p.stipple(body, w * h * 0.05, (_x, y) => 0.1 + 0.5 * (y / h), 0.8), 2.6);

/** brick-<kind> (180 x 60) and brick-<kind>-sq (60 x 60) share one drawer. */
export const BRICK_DRAWERS: Readonly<Record<string, BrickDraw>> = {
  'soft-1': soft(0), 'soft-2': soft(1), 'soft-3': soft(2),
  'tough-1': tough(1), 'tough-2': tough(2), 'tough-3': tough(3),
  stone, x3, keg, pickup, 'ice-1': ice(false), 'ice-2': ice(true), key, gate, dense,
};
