import { createRng, type Rng } from '../../../src/logic/rng';
import { cub, type Draw, makeDraw, pt, ribbon } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { ellipseAt, glaze } from '../../../src/art/critters/birdKit';
import { type HeadLook, NAPE, paintSecHead } from './head';
import { type BirdLeg, paintLeg } from './leg';
import { SB } from './paint';
import { bodyShape, paintTail, softPlumage } from './plumage';
import { paintWing } from './wing';

export { ankleOf, type BirdLeg, type Grip, reach } from './leg';

/**
 * The secretary bird side on, facing +x, drawn live each frame through the
 * game's pen (the line boils with the seed). Units: the body is about 68
 * long; standing, the crown is about 125 above the toes. Origin at the
 * body's centre; `tilt` pitches the body (and the knees with it), the feet
 * and the head are placed in the unpitched frame so they can stay on the
 * ground and on the target.
 *
 * Painted soft, with no hard egg outline (plumage.ts): a deep chest, the back
 * sloping into a long tail with two far-reaching central streamers, the
 * wing folded along the flank in graded rows of coverts over the black
 * flight feathers (wing.ts), or half open for balance; black trousers and
 * long bare scaly legs (leg.ts); the game boss's head (head.ts).
 */
export interface BirdPose {
  readonly at: Pt;
  readonly scale: number;
  readonly tilt: number;
  /** 0 wings folded .. 1 half open, raised for balance. */
  readonly wings: number;
  /** The eye's place and the head's turn (radians, + = bill down). */
  readonly head: { readonly at: Pt; readonly ang: number; readonly look: HeadLook };
  readonly near: BirdLeg;
  readonly far: BirdLeg;
  /** The ground's y (unpitched frame), for the contact shadows. */
  readonly ground: number;
}

const SEED = 6203;
const KNEE_NEAR = pt(9, 11);
const KNEE_FAR = pt(3, 10);
const NECK_BASE = pt(17, -5);

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

export const kneeOf = (p: BirdPose, side: 'near' | 'far'): Pt => rot(p[side].knee ?? (side === 'near' ? KNEE_NEAR : KNEE_FAR), p.tilt);

function neck(d: Draw, rng: Rng, base: Pt, nape: Pt): void {
  const spine = cub(base, pt(base.x + 6, base.y - 10), pt(nape.x - 6, nape.y + 8), nape, 14);
  const shape = ribbon(spine, (u) => 22 - u * 12.5).shape;
  softPlumage(d, shape, rng, { n: 60, size: 3.2, dir: () => Math.PI / 2 + 0.6, tones: [SB.grey, SB.pale, SB.white], line: 0.3 });
  d.pen.clipped(shape, () => glaze(d, (base.x + nape.x) / 2 + 5, (base.y + nape.y) / 2 + 3, 5, 12, 0.4, SB.white, 0.5));
}

function body(d: Draw, rng: Rng): void {
  const shape = softPlumage(d, bodyShape(), rng, { n: 230, size: 4.6, dir: (q) => Math.PI + q.y * 0.015, tones: [SB.deep, SB.grey, SB.white], line: 0.4, underline: true });
  d.pen.clipped(shape, () => {
    // The pale breast, the shadowed flank under the wing, the black lower belly the trousers grow from.
    glaze(d, 24, 4, 9, 11, 0, SB.white, 0.6);
    glaze(d, -6, 6, 22, 7, 0, SB.shadow, 0.25);
    glaze(d, 4, 18, 13, 5, 0, SB.black, 0.75);
    glaze(d, -8, 15, 8, 4, 0, SB.black, 0.5);
  });
}

/** Draws the bird at its pose. */
export function drawBird(ctx: CanvasRenderingContext2D, p: BirdPose, boil: number, flip = false): void {
  ctx.save();
  ctx.translate(p.at.x, p.at.y);
  ctx.scale(p.scale * (flip ? -1 : 1), p.scale);
  const d = makeDraw(ctx, SEED + boil * 17, boil, 0, SB.line);
  const rng = createRng(SEED);
  const { pen } = d;
  // Contact shadows on the ground.
  for (const l of [p.near, p.far]) pen.fill(ellipseAt(l.foot.x + 2, p.ground + 0.6, 8, 1.6, 0, 16), SB.line, l.foot.y > p.ground - 3 ? 0.28 : 0.1);
  pen.fill(ellipseAt(2, p.ground + 1, 34, 3.2, 0, 24), SB.line, 0.14);
  // The far leg, darkened (it's in the body's shade), and the far wing behind.
  for (const s of paintLeg(d, rng, kneeOf(p, 'far'), p.far)) pen.fill(s, SB.shadow, 0.4);
  const look = p.head.look;
  const nape = pt(p.head.at.x + rot(NAPE, p.head.ang).x, p.head.at.y + rot(NAPE, p.head.ang).y);
  if (p.wings > 0.05) {
    ctx.save();
    ctx.rotate(p.tilt);
    ctx.translate(-4, -3);
    paintWing(d, rng, p.wings, true);
    ctx.restore();
  }
  neck(d, rng, rot(NECK_BASE, p.tilt), nape);
  ctx.save();
  ctx.rotate(p.tilt);
  paintTail(d, pt(-29, 2), Math.PI - 0.24);
  body(d, rng);
  paintWing(d, rng, p.wings, false);
  ctx.restore();
  paintLeg(d, rng, kneeOf(p, 'near'), p.near);
  ctx.save();
  ctx.translate(p.head.at.x, p.head.at.y);
  ctx.rotate(p.head.ang);
  paintSecHead(d, look);
  ctx.restore();
  ctx.restore();
}
