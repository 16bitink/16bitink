import { type Pt } from '../../../../src/art/pen';
import { fur, rngOf } from '../../otterpocket/brush';
import { curve, dab, softLine, taper, turn } from '../../seal/art/paint';
import { fillShape, inkLine, linear, P, radial, ring, spline, within } from './ink';
import { drawWalnut } from './walnut';

/**
 * The carrion crow's head in its own frame (bill along +x, skull middle at
 * 0,0, about 115 units tall): sleek black feathers glossed blue and violet,
 * a stout black bill with an arched culmen, bristles laid forward over its
 * base, a dark brown eye with a catchlight and a fine pale rim.
 */
export const EYE: Pt = { x: 17, y: -13 };
export const HINGE: Pt = { x: 42, y: 10 };
/** Each mandible's turn about the hinge at full gape (upper, lower). */
const OPEN = { upper: -0.26, lower: 0.36 } as const;
export const BILL_TIP: Pt = { x: 151, y: 14 };
/** How far the bill is open to hold a walnut, and where the nut sits in it. */
export const HOLD_GAPE = 1.1;
const NUT_R = 50;

export interface HeadLook {
  /** 0 shut .. 1 wide. */
  readonly gape: number;
  /** Where the eye looks: -1 back .. 1 ahead, -1 up .. 1 down. */
  readonly look: Pt;
  /** 0 open .. 1 shut. */
  readonly lid: number;
  /** The brow's drop: 0 easy .. 1 a hard, narrow stare. */
  readonly brow: number;
  /** A walnut held in the bill. */
  readonly nut: boolean;
}

const HEAD: readonly Pt[] = spline(P(-62, 28, -64, -8, -48, -40, -16, -57, 18, -55, 44, -41, 56, -26, 54, 10, 44, 32, 18, 50, -14, 62, -44, 60), 6, true);
const UPPER: readonly Pt[] = spline(P(36, -33, 62, -34, 92, -29, 120, -18, 141, -3, 151, 15, 139, 12, 118, 9, 84, 9, 38, 10), 6, true);
const LOWER: readonly Pt[] = spline(P(36, 8, 84, 10, 118, 10, 142, 14, 132, 22, 104, 31, 70, 34, 36, 34), 6, true);

/** Where the held nut's middle is, head frame. */
export const NUT_AT: Pt = { x: 143, y: 18 };
export const nutRadius = NUT_R;

function paintMandible(ctx: CanvasRenderingContext2D, shape: readonly Pt[], upper: boolean, boil: number): void {
  fillShape(ctx, shape, upper
    ? linear(ctx, 60, -42, 76, 14, [[0, '#9098ae'], [0.16, '#555b70'], [0.45, '#2a2c38'], [1, '#14141b']])
    : linear(ctx, 70, 6, 76, 36, [[0, '#1a1a22'], [0.6, '#2b2d39'], [1, '#4b5064']]));
  within(ctx, shape, () => {
    if (upper) {
      softLine(ctx, spline(P(62, -28, 94, -23, 122, -12, 141, 2), 5), 9, '#c5cede', 0.75, 4);
      softLine(ctx, spline(P(70, -12, 104, -8, 130, 2), 5), 14, '#5c6580', 0.35, 4);
      for (let i = 0; i < 9; i++) softLine(ctx, curve({ x: 72 + i * 8, y: -26 + i * 1.5 }, { x: 80 + i * 8, y: -14 + i }, { x: 82 + i * 8, y: 4 }, 6), 1.2, '#0c0c12', 0.3, 1);
    } else softLine(ctx, P(46, 28, 100, 26, 132, 18), 5, '#737b92', 0.5, 3);
  });
  inkLine(ctx, shape, 1.8, 0.95, boil, true, '#0b0b11');
}

function paintEye(ctx: CanvasRenderingContext2D, look: HeadLook, boil: number): void {
  const { x, y } = EYE;
  const r = 14.5;
  // A dark socket, then a fine pale rim of skin and feather light so the eye reads on black.
  dab(ctx, x, y, r * 2, '6,6,10', 0.75);
  fillShape(ctx, ring(x, y, r + 2.6), '#5d6584');
  fillShape(ctx, ring(x, y, r + 0.9), '#0d0c12');
  const eye = ring(x, y, r);
  within(ctx, eye, () => {
    const ix = x + look.look.x * 4.2;
    const iy = y + look.look.y * 3.6;
    fillShape(ctx, eye, '#21130c');
    fillShape(ctx, ring(ix, iy, 12.6), radial(ctx, ix + 1.5, iy + 4, 13, [[0, '#96592c'], [0.5, '#5d3118'], [1, '#1f1008']]));
    fillShape(ctx, ring(ix, iy, 6.6), '#050406');
    if (look.lid > 0.02) {
      const edge = y - r - 1 + look.lid * (2 * r + 2);
      fillShape(ctx, [{ x: x - 16, y: y - 18 }, { x: x + 16, y: y - 18 }, { x: x + 16, y: edge }, ...curve({ x: x + 16, y: edge }, { x, y: edge + 5 * (1 - look.lid) }, { x: x - 16, y: edge }, 6)], '#2b2e40');
      softLine(ctx, P(x - 14, edge, x + 14, edge), 2, '#6b7392', 0.8, 2);
    }
    if (look.lid < 0.7) {
      fillShape(ctx, ring(x - 4.4 + look.look.x * 1.5, y - 4.8, 3.6), '#ffffff');
      fillShape(ctx, ring(x + 5 + look.look.x * 1.5, y + 5, 1.6), '#e8dccb', 0.8);
    }
  });
  inkLine(ctx, eye, 1.4, 0.95, boil, true, '#060609');
  // The brow: a ridge of feathers that drops over the eye.
  const d = look.brow * 12;
  const brow = curve({ x: x - 21, y: y - 11 + d * 0.15 }, { x: x - 2, y: y - 22 + d }, { x: x + 21, y: y - 9 + d * 0.6 }, 8);
  taper(ctx, brow, 5 + 9 * look.brow, 3, '#13141d', 1);
  softLine(ctx, brow.map((p) => ({ x: p.x, y: p.y - 4 - 4 * look.brow })), 4, '#7e88b4', 0.6, 3);
}

/** The head. Draw the neck first: the head's feathers lap over it. */
export function paintCrowHead(ctx: CanvasRenderingContext2D, look: HeadLook, boil: number): void {
  const g = look.gape;
  // Inside the mouth.
  if (g > 0.04) {
    const a = turn({ x: 116, y: 8 }, HINGE, OPEN.upper * g);
    const b = turn({ x: 112, y: 14 }, HINGE, OPEN.lower * g);
    fillShape(ctx, [{ x: HINGE.x - 6, y: HINGE.y }, a, b], linear(ctx, HINGE.x, 0, 116, 0, [[0, '#2a1013'], [1, '#8a4a48']]));
  }
  // The lower mandible under the chin feathers; a held nut lies on it, its far side out of sight behind the upper mandible's tip.
  const mandible = (shape: readonly Pt[], upper: boolean, a: number): void => {
    ctx.save();
    ctx.translate(HINGE.x, HINGE.y);
    ctx.rotate(a);
    ctx.translate(-HINGE.x, -HINGE.y);
    paintMandible(ctx, shape, upper, boil);
    ctx.restore();
  };
  mandible(LOWER, false, OPEN.lower * g);
  if (look.nut) drawWalnut(ctx, NUT_AT, NUT_R, 0.25, boil);
  mandible(UPPER, true, OPEN.upper * g);
  fillShape(ctx, HEAD, linear(ctx, -10, -58, 6, 62, [[0, '#3b4058'], [0.22, '#22242f'], [0.6, '#14141b'], [1, '#101015']]));
  within(ctx, HEAD, () => {
    // Gloss: violet over the crown, blue-green on the cheek.
    dab(ctx, -8, -44, 56, '92,98,150', 0.45);
    dab(ctx, -30, 8, 46, '44,58,86', 0.35);
    dab(ctx, 10, 34, 40, '40,76,80', 0.28);
    dab(ctx, 40, 30, 34, '8,8,12', 0.5);
  });
  fur(ctx, rngOf(71), HEAD, {
    count: 260, dir: (p) => Math.PI - 0.15 - (p.y / 60) * 0.45 + (p.x > 20 ? (p.y < 0 ? 0.35 : -0.35) : 0), len: [8, 20], width: 2.6,
    inks: [['#8089b4', 0.2], ['#08080d', 0.45], ['#4f587c', 0.24], ['#37606a', 0.18], ['#101016', 0.4]],
    density: (p) => (Math.hypot(p.x - EYE.x, p.y - EYE.y) < 19 ? 0 : 1),
  });
  // The outline only where the head stands free: forehead, crown and chin (the back melts into the neck).
  inkLine(ctx, spline(P(-56, -26, -44, -43, -16, -57, 18, -55, 44, -41, 52, -33), 5), 1.6, 0.9, boil, false, '#0b0b11');
  softLine(ctx, spline(P(-58, -22, -42, -39, -14, -52, 18, -50, 40, -38), 5), 6, '#b9c4ec', 0.6, 4);
  // Nasal bristles: stiff hairs lying forward over the bill's base.
  const rng = rngOf(17);
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(OPEN.upper * g);
  ctx.translate(-HINGE.x, -HINGE.y);
  for (let i = 0; i < 70; i++) {
    const v = rng();
    const s = { x: 32 + rng() * 14, y: -31 + v * 34 };
    const len = 26 + rng() * 26;
    const e = { x: s.x + len, y: s.y + (0.5 - v) * 8 + 3 };
    taper(ctx, [s, { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 - 1.5 }, e], 3.4, 0.5, i % 4 === 0 ? '#5d678f' : i % 4 === 1 ? '#2c3045' : '#12121a', 0.95);
  }
  ctx.restore();
  // Chin bristles over the lower mandible's root.
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(OPEN.lower * g * 0.8);
  ctx.translate(-HINGE.x, -HINGE.y);
  for (let i = 0; i < 24; i++) {
    const s = { x: 22 + rng() * 22, y: 24 + rng() * 14 };
    taper(ctx, [s, { x: s.x + 14, y: s.y + 1 }, { x: s.x + 24 + rng() * 14, y: s.y - 2 }], 4.4, 0.6, i % 3 ? '#15151e' : '#3d4464', 0.95);
  }
  ctx.restore();
  paintEye(ctx, look, boil);
}
