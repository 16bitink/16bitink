import type { Pt } from '../../../../src/art/pen';
import { seeded, spline } from '../../crabbird/art/paint';
import { band, curve, dab, fillShape, inkLine, softLine, turn, within } from '../../heroncrab/art/ink';

/**
 * The great blue heron's head in its own frame (bill along +x, head middle at
 * 0,0): a white face with fine feathering and rounded shading, a black stripe
 * from over the eye back across the crown into long nape plumes, a slight
 * brow over the yellow eye, a long yellow-orange dagger bill whose lower
 * mandible swings open about the hinge, and a throat that bulges when
 * something big has gone down it.
 */
export const EYE: Pt = { x: 12, y: -6 };
export const HINGE: Pt = { x: 20, y: 5 };
export const BILL_TIP = 142;
/** The lower mandible's turn about the hinge at full gape. */
export const GAPE_MAX = 0.75;

const WHITE = '#f8f5ee';
const BLACK = '#1d1e26';
const BILL = '#e5a838';
const BILL_LIT = '#f6d37a';
const BILL_DUSK = '#8b6a3a';

const HEAD: readonly Pt[] = spline([
  { x: -44, y: 10 }, { x: -42, y: -10 }, { x: -28, y: -24 }, { x: 0, y: -27 }, { x: 22, y: -21 }, { x: 34, y: -10 }, { x: 36, y: 8 }, { x: 18, y: 22 },
  { x: -10, y: 26 }, { x: -34, y: 22 },
], 5, true);
/** Over the eye, back across the crown to the nape. */
const STRIPE: readonly Pt[] = spline([
  { x: 26, y: -15 }, { x: 8, y: -21 }, { x: -16, y: -25 }, { x: -38, y: -18 }, { x: -46, y: -10 }, { x: -36, y: -6 }, { x: -16, y: -12 }, { x: 6, y: -11 },
], 5, true);
const UPPER: readonly Pt[] = spline([
  { x: 21, y: -15 }, { x: 56, y: -11 }, { x: 100, y: -4 }, { x: 132, y: 1 }, { x: BILL_TIP, y: 4 }, { x: 120, y: 5 }, { x: 70, y: 5 }, { x: 20, y: 6 },
], 4, true);
const LOWER: readonly Pt[] = spline([
  { x: 20, y: 5 }, { x: 70, y: 5 }, { x: 120, y: 5 }, { x: BILL_TIP - 3, y: 5 }, { x: 116, y: 9 }, { x: 70, y: 13 }, { x: 20, y: 17 },
], 4, true);

/** The swollen throat under the jaw, `u` 0 flat .. 1 full. */
function paintThroat(ctx: CanvasRenderingContext2D, u: number, boil: number): void {
  if (u < 0.02) return;
  const ry = 8 + 12 * u;
  const pouch = Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return { x: -6 + Math.cos(a) * (26 + 6 * u), y: 16 + 6 * u + Math.sin(a) * ry };
  });
  const g = ctx.createRadialGradient(-6, 4, 4, -4, 14, 40);
  g.addColorStop(0, WHITE);
  g.addColorStop(0.55, '#eceae4');
  g.addColorStop(1, '#a9afb9');
  fillShape(ctx, pouch, g);
  within(ctx, pouch, () => {
    const rnd = seeded(61);
    for (let i = 0; i < 40; i++) {
      const x = -34 + rnd() * 66;
      const y = 10 + rnd() * (ry + 10);
      softLine(ctx, [{ x, y }, { x: x - 3, y: y + 1 }], 0.7, '#8f96a2', 0.1, 1);
    }
  });
  inkLine(ctx, pouch.slice(4, 13), 1.3, 0.7, boil);
}

function paintEye(ctx: CanvasRenderingContext2D, boil: number): void {
  const { x, y } = EYE;
  const r = 6.2;
  // The bare lore between eye and bill, a dull greenish yellow.
  fillShape(ctx, spline([{ x: x + 3, y: y - 5 }, { x: 22, y: -12 }, { x: 22, y: 2 }, { x: x + 4, y: y + 5 }], 4, true), '#b8b98a', 0.85);
  dab(ctx, x, y, r + 5, '150,150,120', 0.35);
  const iris = ctx.createRadialGradient(x - 1, y - 1, 0.5, x, y, r);
  iris.addColorStop(0, '#fff1a0');
  iris.addColorStop(0.6, '#f2cf3c');
  iris.addColorStop(1, '#a07818');
  ctx.save();
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0807';
  ctx.beginPath();
  ctx.arc(x + 0.5, y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.38, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  inkLine(ctx, Array.from({ length: 21 }, (_, i) => ({ x: x + Math.cos((i / 20) * Math.PI * 2) * r, y: y + Math.sin((i / 20) * Math.PI * 2) * r })), 1.3, 0.9, boil);
  // A slight brow: a shadow and a firm stroke over the eye.
  softLine(ctx, curve({ x: x - r - 4, y: y - r }, { x, y: y - r - 5 }, { x: x + r + 5, y: y - r + 1 }, 6), 4, '#3a3d48', 0.45, 3);
  inkLine(ctx, curve({ x: x - r - 3, y: y - r * 0.7 }, { x, y: y - r - 3 }, { x: x + r + 3, y: y - r * 0.6 }, 6), 1.6, 0.85, boil);
}

function paintFace(ctx: CanvasRenderingContext2D, boil: number): void {
  const g = ctx.createRadialGradient(-2, -8, 4, -4, 2, 48);
  g.addColorStop(0, WHITE);
  g.addColorStop(0.55, '#eceae4');
  g.addColorStop(1, '#a9afb9');
  fillShape(ctx, HEAD, g);
  within(ctx, HEAD, () => {
    // Fine feathering, swept back from the bill.
    const rnd = seeded(83);
    for (let i = 0; i < 130; i++) {
      const x = -42 + rnd() * 76;
      const y = -24 + rnd() * 48;
      softLine(ctx, [{ x, y }, { x: x - 2.5 - rnd() * 2.5, y: y + 0.5 + 0.05 * y }], 0.7, '#8e95a1', 0.07 + rnd() * 0.08, 1);
    }
    dab(ctx, -28, 16, 22, '110,118,132', 0.4);
    dab(ctx, 6, 18, 16, '150,156,168', 0.3);
    fillShape(ctx, STRIPE, BLACK, 0.95);
    softLine(ctx, [{ x: 20, y: -16 }, { x: -2, y: -22 }, { x: -30, y: -19 }], 2.2, '#5a5e6c', 0.6, 2);
  });
  // The long black plumes trailing off the nape, tapering to points.
  for (const [len, drop, w] of [[104, 10, 8], [88, 20, 6], [70, 4, 4]] as const) {
    const plume = curve({ x: -40, y: -14 }, { x: -40 - len * 0.5, y: -16 + drop * 0.3 }, { x: -40 - len, y: -10 + drop }, 12);
    fillShape(ctx, band(plume, w, 0.6).shape, BLACK, 0.95);
    softLine(ctx, plume.slice(0, 8), 1.2, '#6a6e7c', 0.6, 1);
    inkLine(ctx, plume, 0.8, 0.5, boil);
  }
  inkLine(ctx, HEAD, 1.6, 0.85, boil, true);
}

/** The inside of the open mouth: drawn before anything the bill holds. */
export function paintMouthInside(ctx: CanvasRenderingContext2D, gape: number): void {
  if (gape < 0.05) return;
  const a = GAPE_MAX * gape;
  const inner = [{ x: HINGE.x - 4, y: HINGE.y }, { x: 120, y: 4 }, turn({ x: 120, y: 7 }, HINGE, a)];
  const g = ctx.createLinearGradient(HINGE.x, 0, 120, 0);
  g.addColorStop(0, '#5e2c2a');
  g.addColorStop(1, '#c77a64');
  fillShape(ctx, inner, g, 0.95);
}

function paintBill(ctx: CanvasRenderingContext2D, gape: number, boil: number): void {
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(GAPE_MAX * gape);
  ctx.translate(-HINGE.x, -HINGE.y);
  const lg = ctx.createLinearGradient(0, 5, 0, 17);
  lg.addColorStop(0, BILL_LIT);
  lg.addColorStop(1, '#c98a26');
  fillShape(ctx, LOWER, lg);
  softLine(ctx, [{ x: 24, y: 6 }, { x: 132, y: 6 }], 1.6, '#fff0c0', 0.8, 1);
  inkLine(ctx, LOWER, 1.4, 0.85, boil, true);
  ctx.restore();
  const ug = ctx.createLinearGradient(0, -16, 0, 6);
  ug.addColorStop(0, BILL_DUSK);
  ug.addColorStop(0.3, BILL);
  ug.addColorStop(1, '#c98a26');
  fillShape(ctx, UPPER, ug);
  within(ctx, UPPER, () => softLine(ctx, [{ x: 30, y: -6 }, { x: 80, y: -3 }, { x: 128, y: 2 }], 3, BILL_LIT, 0.7));
  softLine(ctx, [{ x: 24, y: 4.5 }, { x: 134, y: 4 }], 1.4, '#fff0c0', 0.7, 1);
  inkLine(ctx, UPPER, 1.5, 0.9, boil, true);
  inkLine(ctx, [{ x: 36, y: -6 }, { x: 48, y: -5 }], 1.1, 0.7, boil);
}

/** The head and bill, the throat swollen by `throat` (0 .. 1). */
export function paintHeronHead(ctx: CanvasRenderingContext2D, gape: number, throat: number, boil: number): void {
  // The throat over the face's lower edge, so the two read as one swelling chin.
  paintFace(ctx, boil);
  paintThroat(ctx, throat, boil);
  paintBill(ctx, gape, boil);
  // The eye last, so the bill's root never laps over it.
  paintEye(ctx, boil);
}
