import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { B, BLACK_TONES, blackWash, furEdge, glint, hairs, paintMantle } from './badgerPaint';

/**
 * The honey badger's head side on, facing +x, its origin at the nape (the
 * pivot it is drawn on at, badgerBody.ts NECK), with a thick neck behind it
 * that melts into the body: a broad, flat skull tapering to a blunt snout
 * and a big black nose; the silver mantle over the crown from the forehead
 * back, its edge running from just above the eye back over the small
 * rounded ear (a low ridge of skin, half in the mantle) and down the neck;
 * the face, cheeks, muzzle and throat jet black; a small dark eye with a
 * catchlight. The lower jaw hinges under the ear and closes cleanly into the
 * head; biting, the lips pull back off the teeth.
 *
 *   'shut'         mouth closed, eye open
 *   'grip'         jaws apart round a snake's body: the mouth's inside only shows in the gap
 *   'gripTop'      'grip' without the mouth's inside, drawn again over the snake, so both jaws close round it
 *   'gripWince'    'grip' with the eye squeezed shut (bitten while holding on)
 *   'gripWinceTop' its overlay
 *   'lunge'        jaws wide, lips back, teeth bared
 *   'wince'        bitten: a snarl, the eye squeezed shut
 *   'out'          collapsed: mouth closed, the eye shut and slack
 *   'wide'         awake: the eye wide open
 *   'smug'         the eye half lidded, the tongue out licking the lips
 */
export type HeadPose = 'shut' | 'grip' | 'gripTop' | 'gripWince' | 'gripWinceTop' | 'lunge' | 'wince' | 'out' | 'wide' | 'smug';

const TOP: readonly Pt[] = [
  ...cub(pt(-36, -2), pt(-14, -9), pt(14, -10), pt(36, -6), 12),
  ...cub(pt(36, -6), pt(52, -3), pt(64, 3), pt(74, 9), 10).slice(1),
  ...cub(pt(74, 9), pt(80, 12), pt(84, 15), pt(87, 18), 6).slice(1),
];
const NOSE: readonly Pt[] = [...cub(pt(87, 18), pt(95, 16), pt(100, 25), pt(98, 31), 8), ...cub(pt(98, 31), pt(96, 36), pt(91, 37), pt(86, 36), 6).slice(1)];
const RICTUS = pt(56, 41);
const UPPER_LIP: readonly Pt[] = cub(pt(86, 36), pt(82, 40), pt(72, 42), RICTUS, 10);
/** The jaw hinges under the ear. */
const HINGE = pt(24, 40);
const LOWER_LIP: readonly Pt[] = cub(RICTUS, pt(66, 43), pt(76, 43), pt(83, 42), 10);
const CHIN: readonly Pt[] = cub(pt(83, 42), pt(85, 48), pt(77, 53), pt(62, 54), 8);
const JAW_UNDER: readonly Pt[] = cub(pt(62, 54), pt(48, 55), pt(36, 54), pt(26, 52), 8);
const THROAT: readonly Pt[] = cub(pt(26, 52), pt(10, 58), pt(-10, 64), pt(-36, 64), 10);
/** The whole head, mouth closed. */
const HEAD: readonly Pt[] = [...TOP, ...NOSE.slice(1), ...UPPER_LIP.slice(1), ...LOWER_LIP.slice(1), ...CHIN.slice(1), ...JAW_UNDER.slice(1), ...THROAT.slice(1)];
/** The head less its lower jaw: back from the corner of the mouth to the hinge, down behind the jaw to the throat. */
const SKULL: readonly Pt[] = [...TOP, ...NOSE.slice(1), ...UPPER_LIP.slice(1), pt(40, 41), HINGE, pt(20, 50), ...THROAT];
/** The lower jaw, closed: hinge, corner, lip, chin, under the jaw back to the hinge. */
const JAW: readonly Pt[] = [HINGE, pt(40, 41), ...LOWER_LIP, ...CHIN.slice(1), ...JAW_UNDER.slice(1)];

const BORDER: readonly Pt[] = [
  ...cub(pt(68, 5), pt(64, 7), pt(60, 8), pt(52, 10), 8),
  ...cub(pt(52, 10), pt(42, 12), pt(32, 14), pt(22, 18), 8).slice(1),
  ...cub(pt(22, 18), pt(8, 24), pt(-12, 28), pt(-38, 32), 10).slice(1),
];
const MANTLE: readonly Pt[] = [pt(-40, -24), pt(70, -24), pt(70, 4), ...BORDER];

const EYE = pt(56, 16);
const EAR = pt(26, 15);

const turn = (pts: readonly Pt[], a: number, c: Pt): Pt[] =>
  pts.map((p) => pt(c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a)));
const lift = (pts: readonly Pt[], dy: number, from: number): Pt[] => pts.map((p) => pt(p.x, p.y - dy * Math.max(0, Math.min(1, (p.x - from) / 14))));

interface Look {
  readonly gape: number;
  /** Lips pulled back off the teeth. */
  readonly bared: boolean;
  readonly eye: 'open' | 'shut' | 'squeeze' | 'wide' | 'half';
  /** Leave the mouth's inside out (the overlay drawn over a snake in the jaws). */
  readonly overlay: boolean;
  readonly tongue: boolean;
}

const LOOKS: Readonly<Record<HeadPose, Look>> = {
  shut: { gape: 0, bared: false, eye: 'open', overlay: false, tongue: false },
  grip: { gape: 0.42, bared: true, eye: 'open', overlay: false, tongue: false },
  gripTop: { gape: 0.42, bared: true, eye: 'open', overlay: true, tongue: false },
  gripWince: { gape: 0.42, bared: true, eye: 'squeeze', overlay: false, tongue: false },
  gripWinceTop: { gape: 0.42, bared: true, eye: 'squeeze', overlay: true, tongue: false },
  lunge: { gape: 0.62, bared: true, eye: 'open', overlay: false, tongue: false },
  wince: { gape: 0.36, bared: true, eye: 'squeeze', overlay: false, tongue: false },
  out: { gape: 0, bared: false, eye: 'shut', overlay: false, tongue: false },
  wide: { gape: 0, bared: false, eye: 'wide', overlay: false, tongue: false },
  smug: { gape: 0, bared: false, eye: 'half', overlay: false, tongue: true },
};

/** One tooth from its root, `len` long along `dir`. */
function tooth(d: Draw, root: Pt, len: number, dir: number, w: number): void {
  const { pen } = d;
  const tip = pt(root.x + Math.cos(dir) * len, root.y + Math.sin(dir) * len);
  const side = pt(-Math.sin(dir) * w, Math.cos(dir) * w);
  const shape = [pt(root.x - side.x, root.y - side.y), pt(root.x + (tip.x - root.x) * 0.6 + side.x * 0.7, root.y + (tip.y - root.y) * 0.6 + side.y * 0.7), tip, pt(root.x + side.x, root.y + side.y)];
  pen.fill(shape, B.tooth, 1);
  pen.hair(closed(shape), 0.3, B.line, 0.7);
}

/** The mouth's inside between the upper lip and the dropped lower one. */
function mouthInside(d: Draw, upper: readonly Pt[], lower: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const inside = [...upper, ...[...lower].reverse(), HINGE];
  pen.fill(inside, B.mouthDeep, 1);
  pen.clipped(inside, () => {
    const g = ctx.createLinearGradient(HINGE.x, 0, 90, 0);
    g.addColorStop(0, B.mouthDeep);
    g.addColorStop(0.7, B.mouth);
    ctx.fillStyle = g;
    ctx.fillRect(20, 20, 80, 70);
    glaze(ctx, 70, 52, 14, 5, 0.3, B.tongue, 0.7);
  });
}

/** The gums and teeth of the upper jaw along `lip`; with the lips back, a band of gum shows over them. */
function upperTeeth(d: Draw, lip: readonly Pt[], bared: boolean): void {
  const { pen } = d;
  if (bared) pen.fill([...lip, ...[...lip].reverse().map((p) => pt(p.x, p.y - 3.2))], '#b8606a', 0.95);
  tooth(d, pt(78, 40.5), 9.5, Math.PI / 2 + 0.12, 2.3);
  tooth(d, pt(70, 41.6), 4.2, Math.PI / 2 + 0.06, 2);
  tooth(d, pt(63, 41.4), 3.4, Math.PI / 2, 1.8);
  for (const x of [83, 86]) tooth(d, pt(x, 38.6), 3, Math.PI / 2, 1.2);
}

/** The lower jaw's teeth along its (turned) lip. */
function lowerTeeth(d: Draw, gape: number, bared: boolean): void {
  const { pen } = d;
  const lip = turn(LOWER_LIP, gape, HINGE);
  if (bared) pen.fill([...lip, ...[...lip].reverse().map((p) => pt(p.x + 1.6 * Math.sin(gape), p.y + 3 * Math.cos(gape)))], '#b8606a', 0.95);
  const up = -Math.PI / 2 + gape;
  for (const [x, len, w] of [[77, 8.5, 2.1], [70, 3.6, 1.8], [64, 3.2, 1.6], [81, 3, 1.2]] as const) {
    const root = turn([pt(x, 42.6)], gape, HINGE)[0]!;
    tooth(d, root, len, up - 0.08, w);
  }
}

function eye(d: Draw, look: Look['eye']): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = EYE;
  if (look === 'shut' || look === 'squeeze') {
    // Shut: the lid line with a pale catch of light along it so it reads on black; squeezed, with creases.
    const lid = look === 'shut' ? cub(pt(c.x - 5, c.y - 0.5), pt(c.x - 2, c.y + 2.4), pt(c.x + 2, c.y + 2.4), pt(c.x + 5, c.y - 0.5), 8) : cub(pt(c.x - 5.5, c.y - 2.2), pt(c.x - 2, c.y + 1.4), pt(c.x + 2, c.y + 1.4), pt(c.x + 5.5, c.y - 2.2), 8);
    pen.hair(lid.map((p) => pt(p.x, p.y - 1.2)), 1.1, B.sheenLit, 0.75);
    pen.hair(lid, 1.2, B.line, 1);
    if (look === 'squeeze') {
      for (const [a, l] of [[-2.6, 5], [-2.2, 6], [0.5, 5], [0.9, 4.5]] as const) {
        const from = pt(c.x + Math.cos(a) * 6, c.y - 1 + Math.sin(a) * 3.5);
        pen.hair([from, pt(from.x + Math.cos(a) * l, from.y + Math.sin(a) * l * 0.6)], 0.7, B.sheen, 0.8);
      }
    }
    return;
  }
  const r = look === 'wide' ? 4.4 : 3.6;
  // The bare dark rim, the brown iris, the pupil, the wet catchlight.
  pen.fill(oval(c.x, c.y, r + 1.4, r * 0.9 + 1.2, 18), B.coal, 1);
  pen.hair(cub(pt(c.x - r - 1.6, c.y - 0.8), pt(c.x - r, c.y - r - 1.4), pt(c.x + r, c.y - r - 1.4), pt(c.x + r + 1.6, c.y), 8), 0.8, B.sheenLit, look === 'wide' ? 0.9 : 0.5);
  const ball = oval(c.x, c.y, r, r * 0.9, 20);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x + 0.5, c.y + 0.8, 0.3, c.x, c.y, r);
    g.addColorStop(0, '#6e4a2c');
    g.addColorStop(0.55, B.iris);
    g.addColorStop(1, B.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    pen.fill(oval(c.x + 0.5, c.y + 0.2, r * 0.5, r * 0.5, 16), '#050404', 1);
    if (look === 'half') pen.fill([pt(c.x - r - 1, c.y - r - 1), pt(c.x + r + 1, c.y - r - 1), pt(c.x + r + 1, c.y + 0.3), pt(c.x - r - 1, c.y - 0.5)], B.coal, 1);
  });
  pen.stroke(closed(ball), 0.6, B.line, 1, false);
  if (look === 'half') pen.hair(cub(pt(c.x - r - 1, c.y - 0.5), pt(c.x - 2, c.y + 0.5), pt(c.x + 2, c.y + 0.5), pt(c.x + r + 1, c.y + 0.2), 8), 1, B.sheenLit, 0.8);
  pen.dot(c.x - 1.3, look === 'half' ? c.y + 1.4 : c.y - 1.5, r * 0.28, PAPER_FILL, 1);
  pen.dot(c.x + 1.6, c.y + 1.8, r * 0.1, PAPER_FILL, 0.6);
}

function nose(d: Draw): void {
  const { pen } = d;
  pen.fill([...NOSE, pt(82, 32), pt(82, 22)], B.nose, 1);
  pen.clipped([...NOSE, pt(82, 32), pt(82, 22)], () => glaze(pen.ctx, 92, 23, 6, 3.6, 0.5, B.sheen, 0.6));
  glint(d, pt(93, 22), 3.2, 1.8, 0.5, 0.6);
  pen.fill(oval(95, 31, 2.4, 1.6, 12), '#030303', 0.95);
  pen.hair(cub(pt(86, 22), pt(84, 26), pt(84, 31), pt(86, 35), 6), 0.6, B.line, 0.8);
}

/** The small rounded ear: a low ridge of skin behind the eye, its rim catching the light, half in the mantle. */
function ear(d: Draw): void {
  const { pen } = d;
  const rim = cub(pt(EAR.x - 8, EAR.y + 2), pt(EAR.x - 6, EAR.y - 6), pt(EAR.x + 5, EAR.y - 7), pt(EAR.x + 8, EAR.y + 1), 10);
  pen.fill([...rim, pt(EAR.x, EAR.y + 3)], B.coal, 1);
  pen.fill([...rim.map((p) => pt(EAR.x + (p.x - EAR.x) * 0.6, EAR.y + 1 + (p.y - EAR.y) * 0.5)), pt(EAR.x, EAR.y + 2)], B.deep, 0.9);
  pen.hair(rim, 1.3, B.mantleMid, 0.9);
  pen.hair(rim.slice(2, -2).map((p) => pt(p.x + 0.3, p.y + 1.8)), 0.7, B.line, 0.8);
}

function tongue(d: Draw): void {
  const { pen } = d;
  const t = [...cub(pt(76, 42), pt(86, 42), pt(96, 39), pt(98, 33), 8), ...cub(pt(98, 33), pt(95, 31), pt(92, 36), pt(86, 39), 6).slice(1), pt(76, 40)];
  pen.fill(t, B.tongue, 1);
  glint(d, pt(90, 39), 3.2, 1.3, -0.5, 0.45);
  pen.stroke(closed(t), 0.6, B.line, 0.9, false);
}

/** The skin and fur over a head shape: black with the cheek's and muzzle's sheen, the mantle over the crown. */
function paintFace(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  blackWash(d, shape, pt(48, 30), 0.42);
  pen.clipped(shape, () => {
    glaze(ctx, 76, 26, 12, 7, 0.4, B.sheen, 0.45);
    glaze(ctx, 40, 32, 20, 12, 0, B.sheen, 0.35);
    glaze(ctx, 10, 58, 40, 12, 0, B.deep, 0.55);
  });
  hairs(d, shape, 320, 7100, 4.5, (x, y) => (x > 50 ? Math.PI + 0.4 : Math.PI + 0.1 + (y > 34 ? 0.3 : 0)), BLACK_TONES, 0.4);
  pen.clipped(shape, () => paintMantle(d, MANTLE, BORDER, 7200, (x) => (x > 46 ? Math.PI + 0.35 : Math.PI + 0.05), 420));
  for (const [y, l] of [[33, 14], [36, 16], [39, 12]] as const) pen.hair(cub(pt(82, y), pt(76, y + 1), pt(72, y + 3), pt(82 - l, y + 5), 6), 0.35, B.sheen, 0.55);
}

function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-36, 0, -12, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-130, -60, 118, 160);
  ctx.restore();
}

function drawHead(d: Draw, pose: HeadPose): void {
  const { pen } = d;
  const look = LOOKS[pose];
  if (look.gape < 0.05) {
    paintFace(d, HEAD);
    pen.hair([...UPPER_LIP, ...LOWER_LIP.slice(1, 6)], 1, B.line, 0.95);
    pen.hair(cub(pt(30, 46), pt(36, 50), pt(46, 52), pt(58, 52), 6), 0.7, B.sheen, 0.4);
    pen.stroke([...TOP.slice(6), ...NOSE.slice(1), ...UPPER_LIP.slice(1, 4)], 1.8, B.line, 1, false);
    pen.stroke([...LOWER_LIP.slice(-3), ...CHIN.slice(1), ...JAW_UNDER.slice(1), ...THROAT.slice(1, 6)], 1.7, B.line, 1, false);
    if (look.tongue) tongue(d);
  } else {
    const jaw = turn(JAW, look.gape, HINGE);
    const upper = look.bared ? lift(UPPER_LIP, 2.5, 52) : UPPER_LIP;
    if (!look.overlay) mouthInside(d, upper, turn(LOWER_LIP, look.gape, HINGE));
    // The lower jaw: black, its underside in shadow, closing up into the head at the hinge.
    blackWash(d, jaw, turn([pt(66, 48)], look.gape, HINGE)[0]!, 0.35);
    hairs(d, jaw, 80, 7300, 4, () => Math.PI + 0.25 + look.gape, BLACK_TONES, 0.4);
    pen.stroke(jaw.slice(2), 1.7, B.line, 1, false);
    lowerTeeth(d, look.gape, look.bared);
    paintFace(d, SKULL);
    upperTeeth(d, upper, look.bared);
    pen.hair(upper, 1, B.line, 1);
    // The skin folded back at the corner of the mouth.
    pen.hair(cub(pt(44, 38), pt(48, 42), pt(50, 46), pt(48, 50), 6), 0.9, B.sheen, 0.6);
    pen.stroke([...TOP.slice(6), ...NOSE.slice(1)], 1.8, B.line, 1, false);
    pen.stroke(THROAT.slice(2, 6), 1.7, B.line, 1, false);
    if (pose === 'wince') pen.hair(cub(pt(70, 30), pt(74, 26), pt(80, 25), pt(84, 27), 6), 0.8, B.sheen, 0.7);
  }
  nose(d);
  eye(d, look.eye);
  ear(d);
  furEdge(d, look.gape < 0.05 ? HEAD : SKULL, 40, 3.2, 7400, B.mantleMid, 0, 0.22);
  dissolveBack(d.pen.ctx);
}

export const BADGER_HEAD: SpriteArt<HeadPose> = {
  frame: 230,
  res: 5,
  poses: ['shut', 'grip', 'gripTop', 'gripWince', 'gripWinceTop', 'lunge', 'wince', 'out', 'wide', 'smug'],
  draw: drawHead,
};

/** Where the jaws close on a snake's body in 'grip' (head art units from the nape): the middle of the gap. */
export const GRIP_AT: Pt = pt(68, 51);

/** The overlay drawn over a snake held in the jaws, for each holding pose. */
export const OVERLAY: Partial<Readonly<Record<HeadPose, HeadPose>>> = { grip: 'gripTop', gripWince: 'gripWinceTop' };
