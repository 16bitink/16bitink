import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, pt, TAU } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { ellipseAt, glaze, petalBlade, vane } from '../../../src/art/critters/birdKit';
import { greyPlumage } from '../../../src/art/chapters/savannaBossPaint';
import { SB } from './paint';

/**
 * The secretary bird's head, side on and facing +x, painted for the promo
 * (the game's chapter-10 boss, savannaBossHead.ts, seen from the side): a
 * small ash-grey head, the bare orange-red skin round the eye running
 * forward to the bill, a dark hazel eye with a catchlight under a heavy
 * lid fringed with long black lashes, a stout hooked grey raptor bill with
 * a dark tip, and the crest: long grey quills with broad black tips off
 * the back of the head, lying back or (`crest` 1) fanned up.
 *
 * Origin at the eye's centre; the head is about 18 units from crown to
 * chin, the bill tip 15 units in front of the eye.
 */
export interface HeadLook {
  /** 0 the eye open .. 1 shut. */
  readonly lid: number;
  /** 0 the crest lying back .. 1 fanned up. */
  readonly crest: number;
}

const SEED = 5121;
export const EYE_R = 1.9;
/** Where the neck meets the head, from the eye. */
export const NAPE: Pt = pt(-5.5, 5.2);
export const BILL_TIP: Pt = pt(15.2, 4.4);

function headShape(): Pt[] {
  return Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return pt(-0.8 + c * 8.6 * (1 + 0.12 * Math.max(0, c)), 1.6 + s * (s < 0 ? 7.2 : 7.8));
  });
}

/** One quill: a grey shaft widening into a black spatulate tip. */
function quill(d: Draw, root: Pt, ang: number, len: number): void {
  const f = petalBlade(root, ang, len, 2.1, 0.04, 14);
  vane(d, f, 2.1, {
    base: SB.grey, alpha: 0.9, deep: SB.deep, glazes: [SB.pale, SB.mid], glazeAlpha: 0.3,
    tip: SB.black, tipFrom: 0.5, tipAlpha: 0.95, shaft: SB.deep, barbs: SB.deep, barbAlpha: 0.2, lit: SB.pale, line: 0.32, lineAlpha: 0.85,
  });
}

function crest(d: Draw, h: HeadLook, front: boolean): void {
  const n = 12;
  for (let i = 0; i < n; i++) {
    if ((i % 2 === 0) !== front) continue;
    const u = i / (n - 1);
    // Calm: lying back along the nape; raised: fanned from up-and-back to back.
    const calm = Math.PI - 0.15 - u * 0.35;
    const up = -Math.PI * (0.58 + u * 0.4);
    const ang = calm + h.crest * angleBetween(calm, up);
    const root = pt(-5.2 - u * 1.6, -3.6 + u * 3.4);
    quill(d, root, ang, 16 + Math.sin(u * Math.PI) * 10);
  }
}

/** The signed turn from a to b, the short way round. */
function angleBetween(a: number, b: number): number {
  let t = (b - a) % TAU;
  if (t > Math.PI) t -= TAU;
  if (t < -Math.PI) t += TAU;
  return t;
}

function bareFace(d: Draw): Pt[] {
  const skin = [
    ...cub(pt(-4.4, -0.6), pt(-4.2, -3.4), pt(1.2, -3.8), pt(4.6, -2.6), 10),
    ...cub(pt(4.6, -2.6), pt(6.6, -1.8), pt(7.2, 0.6), pt(6.8, 2.6), 8).slice(1),
    ...cub(pt(6.8, 2.6), pt(4.2, 3.6), pt(0, 3.6), pt(-2.8, 2.6), 8).slice(1),
    ...cub(pt(-2.8, 2.6), pt(-4.4, 1.8), pt(-4.8, 0.8), pt(-4.4, -0.6), 6).slice(1, -1),
  ];
  const { pen } = d;
  pen.fill(skin, SB.face, 1);
  pen.clipped(skin, () => {
    glaze(d, -0.6, -1.6, 4.4, 2.2, 0, SB.faceLit, 0.7);
    glaze(d, 2.4, 2.6, 5, 1.8, 0, SB.faceDeep, 0.65);
    // Fine wrinkles of bare skin.
    for (let i = 0; i < 6; i++) pen.hair([pt(-3.5 + i * 1.6, 2.4), pt(-3.2 + i * 1.6, 3.2)], 0.12, SB.faceDeep, 0.5);
  });
  pen.stroke(closed(skin), 0.22, d.ink, 0.75, false);
  return skin;
}

function eye(d: Draw, lid: number): void {
  const { pen } = d;
  const r = EYE_R;
  const ball = ellipseAt(0, 0, r, r * 0.96, 0, 28);
  pen.fill(ball, SB.irisDeep, 1);
  pen.clipped(ball, () => {
    glaze(d, 0.25, 0.4, r * 0.95, r * 0.9, 0, SB.iris, 0.95);
    glaze(d, 0.5, 0.9, r * 0.55, r * 0.4, 0, SB.irisLit, 0.7);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      pen.hair([pt(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55), pt(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92)], 0.06, SB.irisDeep, 0.5);
    }
    pen.dot(0.05, 0.05, r * 0.5, SB.pupil, 1);
    // A wet shadow under the lid.
    pen.fill([pt(-r, -r), pt(r, -r), pt(r, -r * 0.45), pt(-r, -r * 0.45)], SB.pupil, 0.35);
  });
  // The catchlight: upper left, with a faint second one low right.
  pen.dot(-r * 0.36, -r * 0.3, r * 0.2, PAPER_FILL, 0.95);
  pen.dot(r * 0.4, r * 0.38, r * 0.07, PAPER_FILL, 0.5);
  pen.stroke(closed(ball), 0.26, SB.line, 0.95, false);
  // The upper lid comes down over the eye; its edge carries the lashes.
  const edge = -r * 1.05 + lid * r * 2.1;
  if (lid > 0.02) {
    const cover = [...cub(pt(-r * 1.25, -r * 1.3), pt(-r * 0.6, -r * 1.6), pt(r * 0.6, -r * 1.6), pt(r * 1.25, -r * 1.3), 10), ...cub(pt(r * 1.25, edge * 0.8), pt(r * 0.6, edge + 0.35), pt(-r * 0.6, edge + 0.35), pt(-r * 1.25, edge * 0.8), 10)];
    pen.clipped(ellipseAt(0, 0, r * 1.06, r * 1.03, 0, 28), () => {
      pen.fill(cover, SB.face, 1);
      glaze(d, 0, edge - r * 0.6, r * 1.2, r * 0.7, 0, SB.faceLit, 0.5);
    });
  }
  lashes(d, edge, lid);
}

/** The lid's rim and the long lashes off it, sweeping up and forward. */
function lashes(d: Draw, edge: number, lid: number): void {
  const { pen } = d;
  const r = EYE_R;
  const rim = cub(pt(-r * 1.15, edge * 0.55 - 0.15), pt(-r * 0.5, edge - 0.05), pt(r * 0.5, edge - 0.05), pt(r * 1.2, edge * 0.55 - 0.1), 16);
  pen.stroke(rim, 0.42, SB.line, 1, false);
  const n = 11;
  const rng = createRng(SEED + 7);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const p = rim[Math.round(1 + u * (rim.length - 3))]!;
    // Long and curled on the open eye; drooping down over the cheek when shut.
    const up = 1 - lid;
    const len = (2.2 + Math.sin(u * Math.PI) * 2.0 + rng() * 0.4) * (0.75 + 0.25 * up);
    const a0 = -Math.PI / 2 + (u - 0.35) * 1.3;
    const ang = a0 * up + (Math.PI / 2 + (u - 0.5) * 0.6) * (1 - up);
    const mid = pt(p.x + Math.cos(ang) * len * 0.55, p.y + Math.sin(ang) * len * 0.55);
    const curl = ang + (up > 0.5 ? 0.55 : -0.35);
    const tip = pt(mid.x + Math.cos(curl) * len * 0.5, mid.y + Math.sin(curl) * len * 0.5);
    pen.hair([p, mid, tip], 0.34, SB.line, 0.95);
  }
  // A few short lashes on the lower lid when open.
  if (lid < 0.5) for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.25 + i * 0.12);
    const p = pt(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.0);
    pen.hair([p, pt(p.x + Math.cos(a) * 0.9, p.y + Math.sin(a) * 0.9)], 0.18, SB.line, 0.8);
  }
}

function bill(d: Draw): void {
  const { pen } = d;
  const upper = [
    ...cub(pt(5.2, -1.6), pt(9, -2.6), pt(13.6, -1.8), pt(15.6, 2.0), 14),
    ...cub(pt(15.6, 2.0), pt(16, 3.4), pt(15.6, 4.6), pt(BILL_TIP.x, BILL_TIP.y + 0.8), 6).slice(1),
    ...cub(pt(BILL_TIP.x, BILL_TIP.y + 0.8), pt(14.4, 3.6), pt(13.4, 2.6), pt(12.2, 2.5), 6).slice(1),
    ...cub(pt(12.2, 2.5), pt(9.6, 2.6), pt(7.2, 2.6), pt(5.6, 2.4), 8).slice(1),
  ];
  const lower = [...cub(pt(6, 2.4), pt(8.6, 2.7), pt(11, 2.7), pt(12.6, 2.9), 8), ...cub(pt(12.6, 2.9), pt(11.4, 4.0), pt(8.4, 4.4), pt(6.2, 4.0), 8).slice(1)];
  pen.fill(lower, SB.bill, 1);
  pen.clipped(lower, () => glaze(d, 9, 4.2, 4, 1, 0, SB.billDeep, 0.6));
  pen.stroke(closed(lower), 0.26, d.ink, 0.95, false);
  pen.fill(upper, SB.bill, 1);
  pen.clipped(upper, () => {
    glaze(d, 9, -1.4, 5, 1.4, 0.05, SB.billLit, 0.75);
    glaze(d, 10, 2.2, 6, 1.1, 0, SB.billDeep, 0.6);
    pen.fill(ellipseAt(15.4, 2.8, 2.6, 3.4, 0.3, 16), SB.billDark, 0.92);
    pen.hair([pt(6.4, -1.4), pt(11, -1.6), pt(14, -0.4)], 0.2, PAPER_FILL, 0.55);
  });
  pen.stroke(closed(upper), 0.32, d.ink, 1, false);
  // The cere and the nostril at the bill's base, the gape line.
  pen.dot(7.4, -0.5, 0.32, SB.line, 0.85);
  pen.hair([pt(5.8, 2.5), pt(9, 2.65), pt(12.4, 2.7)], 0.22, SB.line, 0.9);
}

/** Paints the head (with its crest) at the eye; `back` / `front` crest layers lie behind and over the head. */
export function paintSecHead(d: Draw, h: HeadLook): void {
  const rng = createRng(SEED);
  crest(d, h, false);
  const shape = headShape();
  greyPlumage(d, shape, rng, { n: 46, size: 2.6, dir: (p) => Math.PI + (p.y - 1.6) * 0.04, line: 0.4 });
  d.pen.clipped(shape, () => {
    glaze(d, 1.5, 7, 7, 2.6, 0, SB.white, 0.5);
    glaze(d, -2, -5, 6, 2.6, 0, SB.pale, 0.4);
  });
  bareFace(d);
  bill(d);
  eye(d, h.lid);
  crest(d, h, true);
}
