import { makeCanvas } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { curve, ink, PAL, paintShell, type Pt, rng, trace } from './shell';

/**
 * The lobster's hard parts, painted once per line-boil frame (body units: the
 * body is 460 from the tail fan's tip to the rostrum's): the carapace, the six
 * rings of the abdomen, the tail fan's plates, and the two claws, each with its
 * moving finger. Every part faces right (+x forward), y down.
 */

/** Sprite px per body unit. */
const RES = 3;
const p = (x: number, y: number): Pt => ({ x, y });

export interface Part {
  readonly frames: readonly HTMLCanvasElement[];
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

function part(w: number, h: number, ox: number, oy: number, draw: (c: CanvasRenderingContext2D, boil: number) => void): Part {
  return {
    w, h, ox, oy,
    frames: Array.from({ length: BOIL_FRAMES }, (_, f) => {
      const { canvas, ctx } = makeCanvas(w * RES, h * RES);
      ctx.scale(RES, RES);
      ctx.translate(ox, oy);
      draw(ctx, f);
      return canvas;
    }),
  };
}

export function drawPart(c: CanvasRenderingContext2D, a: Part, boil: number): void {
  c.drawImage(a.frames[boil % BOIL_FRAMES]!, -a.ox, -a.oy, a.w, a.h);
}

// ---------------------------------------------------------------- the carapace (its hind edge's middle at 0,0)

export const CARAPACE_LEN = 205;
/** Local to the carapace: the eyes' stalks, the antennae, the shoulders, the legs. */
export const EYE_NEAR: Pt = p(152, -44);
export const EYE_FAR: Pt = p(190, -44);
export const ANTENNA: Pt = p(170, 2);
export const SHOULDER_NEAR: Pt = p(122, 50);
export const SHOULDER_FAR: Pt = p(142, 34);
export const LEG_BASES: readonly Pt[] = [p(104, 58), p(80, 62), p(56, 64), p(32, 64)];

const CARAPACE = curve([
  p(-4, -56), p(14, -63), p(50, -72), p(92, -72), p(124, -63), p(148, -54), p(178, -49), p(222, -50), p(188, -39), p(171, -32), p(164, -22), p(168, -8), p(174, 8),
  p(169, 24), p(152, 40), p(122, 54), p(80, 65), p(40, 69), p(6, 66), p(-6, 48), p(-13, 10), p(-12, -26),
], true, 10);

function drawCarapace(c: CanvasRenderingContext2D, boil: number): void {
  paintShell(c, CARAPACE, {
    top: -74, bottom: 70, seed: 41, boil, inkWidth: 3.6, specks: 420, freckles: 130, gloss: { x: 66, y: -18, rx: 84, ry: 30 },
  });
  c.save();
  trace(c, CARAPACE, true);
  c.clip();
  // The cervical groove: a deep soft furrow from the back down and forward, with a lit lip behind it.
  const groove = curve([p(112, -74), p(100, -50), p(90, -22), p(92, 2), p(106, 22), p(128, 34)], false, 8);
  for (const [w, color, a] of [[15, PAL.back, 0.16], [9, PAL.back, 0.28], [4.5, PAL.ink, 0.55]] as const) ink(c, groove, w, boil, false, color, a);
  ink(c, groove.map((q) => p(q.x - 6, q.y + 1)), 3, boil, false, PAL.rim, 0.42);
  // The line between the gill chamber and the heart, and the gill cover's soft fold.
  ink(c, curve([p(-8, -34), p(30, -38), p(62, -34), p(88, -24)], false), 2, boil, false, PAL.ink, 0.35);
  ink(c, curve([p(-10, 42), p(40, 50), p(90, 44), p(124, 32)], false), 2, boil, false, PAL.ink, 0.28);
  ink(c, curve([p(-12, -30), p(-5, 8), p(0, 48)], false), 2.6, boil, false, PAL.ink, 0.5);
  ink(c, curve([p(-7, -30), p(0, 8), p(5, 48)], false), 2, boil, false, PAL.rim, 0.5);
  // The wet streak along the back.
  ink(c, curve([p(16, -50), p(48, -57), p(84, -57)], false), 4.2, boil, false, PAL.cream, 0.6);
  ink(c, curve([p(114, -50), p(130, -45)], false), 3.2, boil, false, PAL.cream, 0.5);
  // Short hatching under the cheek, following the round.
  const r = rng(9);
  for (let i = 0; i < 24; i++) {
    const x = 6 + i * 6.4 + 3 * r();
    ink(c, [p(x, 60 - i * 0.55), p(x + 4, 50 - i * 0.55 - 4 * r())], 1.2, boil, false, PAL.ink, 0.35);
  }
  c.restore();
  // Spines along the rostrum and on the cheek.
  for (const [x, y] of [[150, -54], [165, -50], [181, -47]] as const) {
    trace(c, [p(x - 5, y + 2), p(x + 9, y - 8), p(x + 8, y + 2)], true);
    c.fillStyle = PAL.warm;
    c.fill();
    ink(c, [p(x - 5, y + 2), p(x + 9, y - 8), p(x + 8, y + 1)], 2.2, boil);
  }
}

// ---------------------------------------------------------------- the abdomen's rings (hind joint at 0,0; +x forward)

export const RING_LEN = 32;
export const RINGS = 6;
const ringTop = (i: number): number => 34 + i * 4.6;
export const ringBottom = (i: number): number => 30 + i * 4.8;

function drawRing(c: CanvasRenderingContext2D, boil: number, i: number): void {
  const t = ringTop(i);
  const u = ringTop(i + 0.8);
  const b = ringBottom(i);
  const o = curve([
    p(-8, -t * 0.7), p(-5, -t + 1), p(6, -t - 4), p(24, -u - 3), p(44, -u + 2), p(50, -u * 0.5), p(50, 8), p(44, b * 0.72), p(26, b * 0.9), p(12, b + 12), p(-4, b + 16),
    p(0, b * 0.8), p(-5, b * 0.35), p(-10, 0), p(-11, -t * 0.35),
  ], true, 6);
  paintShell(c, o, { top: -u - 5, bottom: b + 14, seed: 60 + i, boil, inkWidth: 3.2, specks: 90, freckles: 26, gloss: { x: 16, y: -t * 0.34, rx: 26, ry: t * 0.42 } });
  c.save();
  trace(c, o, true);
  c.clip();
  // The smooth hind band of each ring, and the fold above its side flap.
  ink(c, curve([p(2, -t - 2), p(-1, -t * 0.4), p(1, b * 0.3), p(6, b * 0.85)], false), 1.8, boil, false, PAL.ink, 0.5);
  ink(c, curve([p(6, -t), p(3, -t * 0.4), p(5, b * 0.3), p(9, b * 0.8)], false), 1.8, boil, false, PAL.rim, 0.45);
  ink(c, curve([p(0, b * 0.42), p(20, b * 0.34), p(46, b * 0.4)], false), 1.8, boil, false, PAL.ink, 0.35);
  ink(c, curve([p(9, -t * 0.82), p(24, -u * 0.84)], false), 4, boil, false, PAL.cream, 0.55);
  // A blush of orange on the flap's point.
  const g = c.createRadialGradient(0, b + 10, 1, 0, b + 10, 22);
  g.addColorStop(0, 'rgba(255,226,180,0.75)');
  g.addColorStop(1, 'rgba(255,226,180,0)');
  c.fillStyle = g;
  c.fillRect(-30, b - 20, 70, 60);
  c.restore();
}

// ---------------------------------------------------------------- the tail fan's plates (root at 0,0; -x backwards)

export const PLATE_LEN = 84;
function drawPlate(c: CanvasRenderingContext2D, boil: number, middle: boolean): void {
  const w = middle ? 23 : 27;
  const l = middle ? PLATE_LEN : PLATE_LEN + 2;
  const o = curve([p(6, -9), p(-14, -w * 0.72), p(-l * 0.6, -w), p(-l + 8, -w * 0.86), p(-l - 4, -w * 0.3), p(-l - 4, w * 0.3), p(-l + 8, w * 0.86), p(-l * 0.6, w), p(-14, w * 0.72), p(6, 9)], true, 8);
  paintShell(c, o, { top: -w - 10, bottom: w + 26, seed: middle ? 81 : 82, boil, inkWidth: 2.8, specks: 60, freckles: 14, gloss: { x: -40, y: -4, rx: 40, ry: w * 0.6 } });
  c.save();
  trace(c, o, true);
  c.clip();
  // The pale fringe at the hind edge, the ribs fanning out to it.
  const g = c.createLinearGradient(-l - 4, 0, -l + 26, 0);
  g.addColorStop(0, 'rgba(255,232,192,0.95)');
  g.addColorStop(0.35, 'rgba(255,190,130,0.6)');
  g.addColorStop(1, 'rgba(255,190,130,0)');
  c.fillStyle = g;
  c.fillRect(-l - 10, -w - 10, 50, 2 * w + 20);
  for (let k = -5; k <= 5; k++) ink(c, [p(-l + 22, k * w * 0.16), p(-l - 4, k * w * 0.2)], 1.1, boil, false, PAL.ink, 0.5);
  for (const k of middle ? [-0.38, 0.38] : [0]) {
    ink(c, [p(2, k * 8), p(-l * 0.72, k * w * 1.2)], 3, boil, false, PAL.back, 0.4);
    ink(c, [p(0, k * 8 - 2), p(-l * 0.7, k * w * 1.2 - 3)], 1.8, boil, false, PAL.rim, 0.55);
  }
  if (!middle) ink(c, curve([p(-l * 0.68, -w), p(-l * 0.64, 0), p(-l * 0.68, w)], false), 1.8, boil, false, PAL.ink, 0.6);
  c.restore();
}

// ---------------------------------------------------------------- the claws (wrist at 0,0; +x to the tips; the moving finger above)

export interface ClawShape {
  readonly hand: readonly Pt[];
  readonly finger: readonly Pt[];
  readonly hinge: Pt;
  /** The finger's rest angle when the claw is shut. */
  readonly shut: number;
  readonly length: number;
}

export const CRUSHER: ClawShape = {
  hand: curve([
    p(-8, -15), p(12, -40), p(46, -62), p(82, -64), p(106, -48), p(116, -26), p(130, -10), p(150, -6), p(172, -10), p(196, -24), p(203, -14), p(190, 14), p(160, 38), p(118, 53),
    p(68, 57), p(24, 43), p(-6, 18),
  ], true, 8),
  finger: curve([p(-14, -10), p(4, -25), p(38, -30), p(74, -18), p(100, 8), p(106, 24), p(96, 22), p(74, 14), p(46, 10), p(18, 14), p(-6, 14)], true, 8),
  hinge: p(98, -42),
  shut: 0.02,
  length: 204,
};

export const CUTTER: ClawShape = {
  hand: curve([
    p(-7, -12), p(14, -28), p(48, -41), p(84, -42), p(106, -32), p(114, -15), p(132, -5), p(164, -3), p(196, -12), p(221, -26), p(224, -16), p(206, 6), p(172, 22), p(122, 33),
    p(66, 37), p(22, 29), p(-5, 14),
  ], true, 8),
  finger: curve([p(-12, -8), p(8, -17), p(48, -20), p(88, -8), p(116, 12), p(122, 22), p(108, 19), p(80, 11), p(48, 7), p(16, 9), p(-6, 10)], true, 8),
  hinge: p(101, -27),
  shut: 0.02,
  length: 224,
};

function tooth(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sharp: boolean, boil: number): void {
  const o = sharp ? [p(x - w, y), p(x, y + h), p(x + w, y)] : curve([p(x - w, y), p(x - w * 0.8, y + h * 0.8), p(x, y + h), p(x + w * 0.8, y + h * 0.8), p(x + w, y)], false, 5);
  trace(c, o, true);
  c.fillStyle = PAL.cream;
  c.fill();
  ink(c, o, 1.6, boil, false, PAL.ink, 0.9);
}

function tipGlow(c: CanvasRenderingContext2D, outline: readonly Pt[], at: Pt, r: number): void {
  c.save();
  trace(c, outline, true);
  c.clip();
  const g = c.createRadialGradient(at.x, at.y, 2, at.x, at.y, r);
  g.addColorStop(0, 'rgba(255,232,196,0.9)');
  g.addColorStop(0.5, 'rgba(255,186,120,0.4)');
  g.addColorStop(1, 'rgba(255,186,120,0)');
  c.fillStyle = g;
  c.fillRect(at.x - r, at.y - r, 2 * r, 2 * r);
  c.restore();
}

function drawHand(c: CanvasRenderingContext2D, boil: number, s: ClawShape, crusher: boolean): void {
  const k = crusher ? 1 : 0.66;
  // The fixed finger's teeth: blunt molars, or a row of sharp ones.
  for (const [x, y] of crusher ? [[132, -8], [150, -5], [168, -8]] as const : []) tooth(c, x, y + 4, 9, -13, false, boil);
  if (!crusher) for (let i = 0; i < 8; i++) tooth(c, 124 + i * 11.5, -2 - (i > 5 ? (i - 5) * 4 : 0), 5, -9, true, boil);
  paintShell(c, s.hand, {
    top: -64 * k, bottom: 58 * k, seed: crusher ? 21 : 22, boil, inkWidth: 3.6, specks: crusher ? 260 : 170, freckles: 80, gloss: { x: 62, y: -16 * k, rx: 62, ry: 30 * k },
  });
  tipGlow(c, s.hand, crusher ? p(200, -18) : p(222, -22), 44);
  c.save();
  trace(c, s.hand, true);
  c.clip();
  ink(c, curve([p(22, -38 * k), p(48, -50 * k), p(78, -50 * k)], false), 5 * k + 0.6, boil, false, PAL.cream, 0.6);
  ink(c, curve([p(88, -48 * k), p(94, -42 * k)], false), 4, boil, false, PAL.cream, 0.5);
  // The swell of the muscle: a soft fold from the hinge back, and the socket round the hinge.
  ink(c, curve([p(114, -20 * k), p(96, 4 * k), p(64, 18 * k), p(28, 20 * k)], false), 7, boil, false, PAL.back, 0.16);
  ink(c, curve([p(112, -16 * k), p(124, 14 * k), p(160, 18 * k), p(192, 0)], false), 2, boil, false, PAL.ink, 0.28);
  ink(c, curve([p(84, -62 * k), p(90, -40 * k), p(108, -28 * k)], false), 2.6, boil, false, PAL.ink, 0.55);
  ink(c, curve([p(2, -24 * k), p(8, 0), p(4, 26 * k)], false), 2.2, boil, false, PAL.ink, 0.45);
  const r = rng(crusher ? 5 : 6);
  for (let i = 0; i < 22; i++) {
    const x = 22 + i * 5.6 + 3 * r();
    ink(c, [p(x, 50 * k - Math.abs(i - 9) * 0.5), p(x + 5, 40 * k - 4 * r())], 1.2, boil, false, PAL.ink, 0.34);
  }
  c.restore();
  // Knobs along the top of the hand.
  for (const [x, y] of [[20, -46], [44, -60], [70, -64]] as const) {
    const o = [p(x - 7, y * k + 4), p(x + 3, y * k - 7), p(x + 9, y * k + 2)];
    trace(c, o, true);
    c.fillStyle = PAL.warm;
    c.fill();
    ink(c, o, 2.2, boil);
  }
}

function drawFinger(c: CanvasRenderingContext2D, boil: number, s: ClawShape, crusher: boolean): void {
  for (const x of crusher ? [26, 44, 62] : []) tooth(c, x, 8, 9, 13, false, boil);
  if (!crusher) for (let i = 0; i < 7; i++) tooth(c, 22 + i * 11.5, 6 + (i > 4 ? (i - 4) * 4 : 0), 5, 9, true, boil);
  paintShell(c, s.finger, {
    top: crusher ? -30 : -20, bottom: 30, seed: crusher ? 31 : 32, boil, inkWidth: 3.4, specks: crusher ? 90 : 70, freckles: 26, gloss: { x: 40, y: -10, rx: 44, ry: 12 }, under: 0,
  });
  tipGlow(c, s.finger, crusher ? p(104, 20) : p(120, 19), 40);
  ink(c, curve(crusher ? [p(8, -18), p(36, -23), p(64, -14)] : [p(10, -11), p(44, -14), p(78, -5)], false), 3.6, boil, false, PAL.cream, 0.55);
}

export interface LobsterParts {
  readonly carapace: Part;
  readonly rings: readonly Part[];
  readonly telson: Part;
  readonly uropod: Part;
  readonly claws: readonly { readonly shape: ClawShape; readonly hand: Part; readonly finger: Part }[];
}

/** The claws in order: the cutter (far side), the crusher (near side). */
export function makeLobsterParts(): LobsterParts {
  const claw = (shape: ClawShape, crusher: boolean) => ({
    shape,
    hand: part(260, 160, 20, 82, (c, f) => drawHand(c, f, shape, crusher)),
    finger: part(160, 90, 24, 44, (c, f) => drawFinger(c, f, shape, crusher)),
  });
  return {
    carapace: part(250, 170, 24, 88, drawCarapace),
    rings: Array.from({ length: RINGS }, (_, i) => part(80, 170, 20, 78, (c, f) => drawRing(c, f, i))),
    telson: part(120, 80, 100, 40, (c, f) => drawPlate(c, f, true)),
    uropod: part(120, 80, 100, 40, (c, f) => drawPlate(c, f, false)),
    claws: [claw(CUTTER, false), claw(CRUSHER, true)],
  };
}
