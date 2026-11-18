import { ellipse, INK, Pen, roundRect, type Pt } from '../pen';
import { C, LINE } from './palette';
import { LINK_FILLS } from './variety';

/**
 * Keys and their gates in ink. A key brick is a chunky old iron key (ring
 * bow, shaft, teeth) tied with rope to a driftwood tag, so it still reads as
 * a brick to break; its gate is a stone door with a big keyhole plate. Each
 * key/gate pair has its own colour and its own shape (the key's bow and the
 * gate's plate: round, diamond, clover, square), so a level with two pairs
 * shows which key opens which door. `key-fly-<c>` is the key alone, for the
 * unlock moment (it flies to its gate and turns in the lock).
 */
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const INSET = 4;
const IRON = '#6b6670';
const IRON_DARK = '#4c4852';

function inked(p: Pen, shape: Pt[], fill: string, line: number, inside?: () => void): void {
  p.fill(shape, fill);
  if (inside) p.clipped(shape, inside);
  p.closed(shape, line);
}

/** The pair's shape, centred on (cx, cy) with radius r: 0 round, 1 diamond, 2 clover, 3 square. */
export function pairShape(c: number, cx: number, cy: number, r: number): Pt[] {
  switch (c % 4) {
    case 1: return [{ x: cx, y: cy - r * 1.1 }, { x: cx + r, y: cy }, { x: cx, y: cy + r * 1.1 }, { x: cx - r, y: cy }];
    case 2: return Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2 - Math.PI / 2;
      const rr = r * (0.78 + 0.26 * Math.abs(Math.cos(a * 1.5)));
      return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
    });
    case 3: return roundRect(cx - r * 0.92, cy - r * 0.92, r * 1.84, r * 1.84, r * 0.25, 5);
    default: return ellipse(cx, cy, r, r, 24);
  }
}

/** A chunky iron key lying along x from x0 (the bow) to x1 (the teeth), centred on cy; s = its thickness unit. */
function key(p: Pen, c: number, x0: number, x1: number, cy: number, s: number): void {
  const bowR = s * 1.55;
  const bx = x0 + bowR;
  const shaftH = s * 0.85;
  const shaft = roundRect(bx + bowR * 0.6, cy - shaftH / 2, x1 - bx - bowR * 0.6, shaftH, shaftH * 0.3, 6);
  const tx = x1 - s * 1.5;
  const teeth = [
    { x: tx - s * 0.9, y: cy + shaftH / 2 - 1 }, { x: tx - s * 0.9, y: cy + s * 1.3 }, { x: tx - s * 0.35, y: cy + s * 1.3 },
    { x: tx - s * 0.35, y: cy + s * 0.85 }, { x: tx + s * 0.2, y: cy + s * 0.85 }, { x: tx + s * 0.2, y: cy + s * 1.3 },
    { x: tx + s * 0.8, y: cy + s * 1.3 }, { x: tx + s * 0.8, y: cy + shaftH / 2 - 1 },
  ];
  const iron = (shape: Pt[]): void => inked(p, shape, IRON, 2.8, () => p.hatch(shape, 3, 0.8, 1, { onlyBelow: cy, alpha: 0.6 }));
  iron(teeth);
  iron(shaft);
  // The collar where the bow meets the shaft.
  iron(roundRect(bx + bowR * 0.45, cy - shaftH * 0.85, s * 0.6, shaftH * 1.7, 2, 3));
  const bow = pairShape(c, bx, cy, bowR);
  inked(p, bow, IRON, 3.2, () => p.hatch(bow, 3, 0.8, 1, { onlyBelow: cy, alpha: 0.6 }));
  // The bow's hole shows the pair's colour, so key and gate match at a glance.
  const hole = pairShape(c, bx, cy, bowR * 0.5);
  inked(p, hole, LINK_FILLS[c % LINK_FILLS.length]!, 2.2);
  p.stroke([{ x: bx + bowR * 0.8, y: cy - shaftH * 0.18 }, { x: x1 - s * 0.6, y: cy - shaftH * 0.18 }], 1.6, C.paperGrey, 0.9, false);
}

/** The key brick: a driftwood tag with the pair's colour band, rope to the key's bow, the key over it. */
function keyBrick(c: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, 1200 + c, 0.7);
    const tag = roundRect(INSET, INSET, w - INSET * 2, h - INSET * 2, Math.min(9, h * 0.2));
    inked(p, tag, C.drift, LINE, () => {
      for (let i = 1; i <= 2; i++) p.hair([{ x: INSET, y: h * (0.2 + i * 0.22) }, { x: w / 2, y: h * (0.18 + i * 0.22) }, { x: w - INSET, y: h * (0.2 + i * 0.22) }], 1.3, INK, 0.5);
      p.hatch(tag, 4.5, 0.7, 1, { onlyBelow: h * 0.68, alpha: 0.45 });
      const band = roundRect(INSET, INSET, Math.min(w * 0.12, 20), h - INSET * 2, 2, 3);
      p.fill(band, LINK_FILLS[c % LINK_FILLS.length]!);
      p.closed(band, 1.8);
    });
    // The key fills the tag's height: chunky enough to read on a phone.
    const long = w >= h * 1.4;
    const s = long ? Math.min(h * 0.21, w * 0.075) : Math.min(w, h) * 0.12;
    const x0 = long ? w * 0.13 : w * 0.1;
    const x1 = w - (long ? w * 0.07 : w * 0.1);
    const cy = h * 0.43;
    key(p, c, x0, x1, cy, s);
  };
}

/** The key alone (the unlock moment). */
function keyFly(c: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, 1210 + c, 0.6);
    key(p, c, 6, w - 6, h * 0.4, h * 0.2);
  };
}

/** The gate: a stone door with iron straps and a big keyhole plate in the pair's shape and colour. */
function gateBrick(c: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, 1220 + c, 0.8);
    const door = roundRect(INSET, INSET, w - INSET * 2, h - INSET * 2, Math.min(8, h * 0.16));
    inked(p, door, C.gate, 4.2, () => {
      p.hatch(door, 4, 0.8, 1.1, { alpha: 0.6 });
      p.hatch(door, 5.5, -0.8, 1, { alpha: 0.35 });
      if (w > h * 1.4) {
        for (const fx of [0.14, 0.86]) {
          const strap = roundRect(w * fx - 6, INSET, 12, h - INSET * 2, 1, 3);
          p.fill(strap, IRON_DARK);
          p.closed(strap, 1.8);
          p.dot(w * fx, h * 0.3, 2.2, C.paperGrey);
          p.dot(w * fx, h * 0.7, 2.2, C.paperGrey);
        }
      }
    });
    const r = Math.min(h * 0.38, w * 0.3);
    const plate = pairShape(c, w / 2, h / 2, r);
    inked(p, plate, LINK_FILLS[c % LINK_FILLS.length]!, 3, () => p.hatch(plate, 3, 0.8, 0.9, { onlyBelow: h / 2 + r * 0.3, alpha: 0.5 }));
    // The keyhole: a round top and a flared slot, big and plainly a lock.
    p.fill(ellipse(w / 2, h / 2 - r * 0.2, r * 0.26, r * 0.26, 14), INK);
    p.fill([{ x: w / 2 - r * 0.12, y: h / 2 - r * 0.1 }, { x: w / 2 + r * 0.12, y: h / 2 - r * 0.1 }, { x: w / 2 + r * 0.22, y: h / 2 + r * 0.55 }, { x: w / 2 - r * 0.22, y: h / 2 + r * 0.55 }], INK);
  };
}

const PAIRS = [0, 1, 2, 3] as const;
/** The flying key's image height (its width is 120). */
export const KEY_FLY_H = 64;

export const LOCK_DRAWERS: Readonly<Record<string, Draw>> = Object.fromEntries(PAIRS.flatMap((c) => [
  [`brick-key-${c}`, keyBrick(c)], [`brick-gate-${c}`, gateBrick(c)], [`key-fly-${c}`, keyFly(c)],
]));

export const LOCK_SIZES: Readonly<Record<string, { readonly w: number; readonly h: number }>> =
  Object.fromEntries(PAIRS.map((c) => [`key-fly-${c}`, { w: 120, h: KEY_FLY_H }]));
