import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../crabbird/art/paint';
import { band, curve, dab, fillShape, inkLine, softLine } from '../../heroncrab/art/ink';

/**
 * People on the bank, in profile against the bright pond: dark painted
 * silhouettes with a cool rim of light, each face readable by its profile
 * (brow, nose, lips, chin), phones held up and glowing. One arm can punch
 * the air for the cheer, the mouth open.
 *
 * Local units: facing left (−x, towards the heron), feet at 0,0, 1000 tall.
 */
export interface Person {
  readonly x: number;
  readonly y: number;
  readonly k: number;
  /** 0 phone held up .. 1 the free arm thrown up in a cheer. */
  readonly cheer: number;
  /** 0 neutral .. 1 mouth wide open. */
  readonly shout: number;
  readonly cap: boolean;
  readonly tone: string;
  /** False leaves the small phone out (the caller draws a big one at `hand`). */
  readonly phone?: boolean;
  /** Where the phone hand is, local units. */
  readonly hand?: Pt;
}

const RIM = '#dfe9f2';

const PROFILE: readonly Pt[] = spline([
  // The back of the head, over the crown, then down the face: brow, nose, lips, chin.
  { x: 60, y: -846 }, { x: 54, y: -900 }, { x: 20, y: -940 }, { x: -30, y: -946 }, { x: -70, y: -922 }, { x: -84, y: -884 },
  { x: -88, y: -862 }, { x: -108, y: -836 }, { x: -94, y: -826 }, { x: -96, y: -810 }, { x: -90, y: -800 }, { x: -92, y: -790 },
  { x: -80, y: -770 }, { x: -50, y: -764 }, { x: -20, y: -770 }, { x: 10, y: -760 }, { x: 40, y: -770 }, { x: 64, y: -800 },
], 4, true);
const TORSO: readonly Pt[] = spline([
  { x: -14, y: -772 }, { x: -80, y: -730 }, { x: -96, y: -600 }, { x: -80, y: -420 }, { x: -60, y: -380 }, { x: 70, y: -380 },
  { x: 86, y: -440 }, { x: 96, y: -620 }, { x: 70, y: -736 }, { x: 24, y: -766 },
], 5, true);

function limb(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w0: number, w1: number, fill: string, boil: number): void {
  const { shape } = band(spline(pts, 5), w0, w1);
  fillShape(ctx, shape, fill);
  inkLine(ctx, shape, 1.4, 0.8, boil, true);
}

/** A phone held up, its screen glowing, its corner at `at`. */
function phone(ctx: CanvasRenderingContext2D, at: Pt, tilt: number, boil: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(tilt);
  const body: Pt[] = [{ x: -26, y: -50 }, { x: 26, y: -50 }, { x: 26, y: 50 }, { x: -26, y: 50 }];
  fillShape(ctx, body, '#15161d');
  dab(ctx, 0, 0, 120, '210,235,255', 0.35);
  fillShape(ctx, [{ x: -20, y: -42 }, { x: 20, y: -42 }, { x: 20, y: 42 }, { x: -20, y: 42 }], '#cfe6f5', 0.95);
  inkLine(ctx, body, 1.4, 0.9, boil, true);
  ctx.restore();
}

/** Where the near (free) fist is, local units: by the hip, or punched up behind the head. */
export const fistOf = (up: number): Pt => ({ x: 30 + 90 * up, y: -470 - 640 * up });

export function drawPerson(ctx: CanvasRenderingContext2D, p: Person, boil: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.k, p.k);
  const dark = p.tone;
  // Legs.
  limb(ctx, [{ x: -30, y: -400 }, { x: -40, y: -200 }, { x: -50, y: 0 }], 70, 50, dark, boil);
  limb(ctx, [{ x: 40, y: -400 }, { x: 40, y: -200 }, { x: 50, y: 0 }], 70, 50, dark, boil);
  // The far arm holds the phone up in front of the face.
  const hand = p.hand ?? { x: -200, y: -820 };
  limb(ctx, [{ x: 30, y: -700 }, { x: -110, y: -660 }, hand], 50, 36, dark, boil);
  fillShape(ctx, TORSO, dark);
  inkLine(ctx, TORSO, 1.6, 0.85, boil, true);
  softLine(ctx, TORSO.slice(1, 5), 10, RIM, 0.4, 3);
  // The head in profile, rim-lit down the face.
  fillShape(ctx, PROFILE, dark);
  softLine(ctx, PROFILE.slice(18, 50), 7, RIM, 0.6, 3);
  inkLine(ctx, PROFILE, 1.6, 0.9, boil, true);
  // The mouth: a dark notch that opens with the shout.
  if (p.shout > 0.05) fillShape(ctx, [{ x: -94, y: -790 }, { x: -66, y: -786 - 8 * p.shout }, { x: -70, y: -778 + 6 * p.shout }, { x: -92, y: -778 + 10 * p.shout }], '#0c0b10');
  // An eye glint and an ear, so it reads as a face.
  dab(ctx, -62, -858, 9, '230,240,250', 0.8);
  inkLine(ctx, curve({ x: 14, y: -870 }, { x: 34, y: -850 }, { x: 14, y: -826 }, 6), 1.4, 0.7, boil, false, RIM);
  if (p.cap) {
    const cap = spline([{ x: 56, y: -884 }, { x: 40, y: -940 }, { x: -30, y: -956 }, { x: -78, y: -918 }, { x: -140, y: -900 }, { x: -76, y: -892 }], 4, true);
    fillShape(ctx, cap, '#2a3550');
    inkLine(ctx, cap, 1.4, 0.85, boil, true);
  }
  if (p.phone !== false) phone(ctx, hand, -0.15, boil);
  else {
    ctx.save();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(hand.x, hand.y, 44, 36, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // The near arm: down by the side, or punched up for the cheer.
  const up = p.cheer;
  const fist = fistOf(up);
  limb(ctx, [{ x: 30, y: -720 }, { x: 40 + 60 * up, y: -580 - 300 * up }, fist], 54, 40, dark, boil);
  ctx.save();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(fist.x, fist.y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** A phone in a hand, sideways, its screen a clip the caller paints into (`paintScreen` in screen px). */
export function drawFilmingPhone(ctx: CanvasRenderingContext2D, box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }, rec: number, boil: number, paintScreen: () => void): void {
  const pad = 26;
  const body: Pt[] = [{ x: box.x - pad, y: box.y - pad }, { x: box.x + box.w + pad, y: box.y - pad }, { x: box.x + box.w + pad, y: box.y + box.h + pad }, { x: box.x - pad, y: box.y + box.h + pad }];
  ctx.save();
  ctx.shadowColor = 'rgba(10,12,20,0.45)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#17181f';
  ctx.beginPath();
  ctx.roundRect(body[0]!.x, body[0]!.y, box.w + 2 * pad, box.h + 2 * pad, 44);
  ctx.fill();
  ctx.restore();
  // The camera bump and a glint along the top edge.
  softLine(ctx, [{ x: box.x + 30, y: box.y - pad + 6 }, { x: box.x + box.w - 30, y: box.y - pad + 6 }], 4, '#6b7080', 0.6, 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  paintScreen();
  ctx.restore();
  // A red recording dot, blinking.
  if (rec > 0) {
    ctx.save();
    ctx.globalAlpha = rec;
    ctx.fillStyle = '#e2412f';
    ctx.beginPath();
    ctx.arc(box.x + 40, box.y + 40, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = '#0d0e14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(body[0]!.x, body[0]!.y, box.w + 2 * pad, box.h + 2 * pad, 44);
  ctx.stroke();
  ctx.restore();
}
