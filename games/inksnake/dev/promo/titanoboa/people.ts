import { capsule as limb, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import { rgba } from '../../../src/art/wash';

/**
 * Two people, painted in washes with a firm pen line, three-quarters to us
 * and facing +x: the scientist (glasses, grey-streaked hair in a bun, a lab
 * coat, hand at her chin, eyes up at her thought) and the swimmer (mask and
 * snorkel pushed up on his forehead, trunks; calm, then wide-eyed with his
 * hands up). Art units: the head is about 100 tall, its middle near 0, 0.
 */
const P = {
  skin: '#c98d63', lit: '#f0c096', deep: '#8a5638', line: '#1c1410', white: '#fdf8ec', iris: '#4a2c18', lip: '#a4523f', blush: '#d8705a',
} as const;

/** A finger, arm or leg of one thickness. */
const capsule = (a: Pt, b: Pt, r: number): Pt[] => limb(a, b, r * 2, r * 1.8);
const all = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];

/** A shape in washes: light from the upper left sinking to the deep tone, a soft core shadow, a lit edge, the pen's outline. */
function wash(d: Draw, shape: readonly Pt[], col: string, deep: string, lit: string, w = 1.6): void {
  const { pen } = d;
  const { ctx } = pen;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const [rx, ry] = [(x1 - x0) / 2, (y1 - y0) / 2];
  pen.fill(shape, col, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(x0, y0 + ry * 0.2, x1, y1 - ry * 0.2);
    g.addColorStop(0, rgba(lit, 0.75));
    g.addColorStop(0.3, rgba(lit, 0.12));
    g.addColorStop(0.55, rgba(deep, 0.12));
    g.addColorStop(1, rgba(deep, 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, y0 - 2, rx * 2 + 4, ry * 2 + 4);
    glaze(ctx, x0 + rx * 0.7, y0 + ry * 0.55, rx * 0.8, ry * 0.7, 0, lit, 0.4);
    for (const [k, a] of [[0.34, 0.16], [0.22, 0.2], [0.1, 0.28]] as const) pen.crescent(shape, pt(-rx * k, -ry * k * 0.7), () => pen.fill(shape, deep, a));
    pen.crescent(shape, pt(Math.min(3, rx * 0.12), Math.min(3, ry * 0.1)), () => pen.fill(shape, lit, 0.5));
  });
  pen.stroke(all(shape), w, P.line, 1);
}

/** A soft-edged stroke: a fold's shadow, a muscle's turn. */
function soft(d: Draw, path: readonly Pt[], width: number, colour: string, alpha: number): void {
  for (const [k, a] of [[1, 0.3], [0.66, 0.35], [0.34, 0.4]] as const) {
    d.pen.fill(ribbon(path, (u) => Math.max(0.4, width * k * Math.sin(Math.PI * (0.06 + 0.9 * u)))).shape, colour, alpha * a);
  }
}

/** A fold in cloth: its shadow, and the light on the ridge beside it. */
function fold(d: Draw, path: readonly Pt[], width: number): void {
  soft(d, path, width, '#4a4a60', 0.75);
  soft(d, path.map((p) => pt(p.x - width * 0.62, p.y - 1)), width * 0.55, '#ffffff', 0.8);
  d.pen.hair(path, 0.9, '#3a3848', 0.5);
}

/** Light of one colour laid over everything painted so far: from the right, out of the dark on the left. */
function moonlit(ctx: CanvasRenderingContext2D, x0: number, x1: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(8,16,40,0.48)');
  g.addColorStop(0.5, 'rgba(14,28,64,0.26)');
  g.addColorStop(1, 'rgba(120,160,230,0.1)');
  ctx.fillStyle = g;
  ctx.fillRect(-400, -400, 800, 800);
  const v = ctx.createLinearGradient(0, -60, 0, 320);
  v.addColorStop(0, 'rgba(6,12,30,0)');
  v.addColorStop(1, 'rgba(6,12,30,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(-400, -400, 800, 800);
  ctx.restore();
}

/** The moon's rim along a shape's right edge. */
function rim(d: Draw, shape: readonly Pt[], w: number): void {
  d.pen.clipped(shape, () => {
    for (const [k, a] of [[1.8, 0.22], [1, 0.55], [0.5, 0.75]] as const) d.pen.crescent(shape, pt(-w * k, w * k * 0.35), () => d.pen.fill(shape, '#cfe4ff', a));
  });
}

const FACE: readonly Pt[] = [
  ...cub(pt(-34, -26), pt(-30, -62), pt(34, -64), pt(40, -24), 14),
  ...cub(pt(40, -24), pt(43, -8), pt(42, 10), pt(37, 24), 8).slice(1),
  ...cub(pt(37, 24), pt(32, 42), pt(22, 52), pt(10, 52), 8).slice(1),
  ...cub(pt(10, 52), pt(-8, 52), pt(-28, 36), pt(-34, -2), 10).slice(1),
];

interface FaceMood {
  /** Where the eyes look, −1..1 each way. */
  readonly look: Pt;
  readonly wide: number;
  readonly mouth: 'think' | 'smile' | 'grit';
  readonly brow: number;
}

function eye(d: Draw, x: number, y: number, w: number, m: FaceMood): void {
  const { pen } = d;
  const h = 6.2 + 4.2 * m.wide;
  const ball = oval(x, y, w, h, 22);
  pen.fill(ball, P.white, 1);
  pen.clipped(ball, () => {
    const r = 5.4 - 1.2 * m.wide;
    const [ix, iy] = [x + m.look.x * (w - r * 0.7), y + m.look.y * (h - r * 0.6)];
    pen.fill(oval(ix, iy, r, r, 18), P.iris, 1);
    pen.fill(oval(ix, iy, r * 0.5, r * 0.5, 14), '#0c0806', 1);
    pen.fill(oval(x, y - h * 1.5, w * 1.2, h * 0.8, 16), P.deep, 0.4);
    pen.dot(ix - 1.6, iy - 1.8, 1.35, '#ffffff', 1);
  });
  pen.stroke(cub(pt(x - w - 1, y + 1), pt(x - w * 0.5, y - h * 1.5), pt(x + w * 0.5, y - h * 1.5), pt(x + w + 1, y + 0.5), 10), 1.9, P.line, 1, false);
  pen.hair(cub(pt(x - w, y + 1), pt(x - w * 0.4, y + h * 1.3), pt(x + w * 0.4, y + h * 1.3), pt(x + w, y + 0.6), 10), 0.8, P.line, 0.7);
  pen.stroke(cub(pt(x - w - 2, y - h - 5 - m.brow * 2), pt(x - w * 0.4, y - h - 9 - m.brow * 5), pt(x + w * 0.4, y - h - 9 - m.brow * 6), pt(x + w + 2, y - h - 4 - m.brow * 6), 10), 3, '#2c1c14', 1, false);
}

function face(d: Draw, m: FaceMood): void {
  const { pen } = d;
  wash(d, FACE, P.skin, P.deep, P.lit, 1.9);
  pen.clipped(FACE, () => {
    glaze(pen.ctx, -10, 18, 14, 9, 0, P.blush, 0.32);
    glaze(pen.ctx, 34, 18, 9, 8, 0, P.blush, 0.32);
    glaze(pen.ctx, 12, 46, 22, 9, 0, P.deep, 0.3);
  });
  eye(d, -3, -6, 9.5, m);
  eye(d, 27, -6, 7.8, m);
  // The nose, three-quarter.
  pen.stroke(cub(pt(17, -6), pt(22, 4), pt(26, 12), pt(23, 16), 8), 1.4, P.line, 0.9, false);
  pen.stroke(cub(pt(23, 16), pt(19, 19), pt(14, 18), pt(12, 15), 6), 1.3, P.line, 0.9, false);
  if (m.mouth === 'grit') {
    const mouth = [...cub(pt(0, 29), pt(8, 25), pt(24, 25), pt(31, 28), 10), ...cub(pt(31, 28), pt(28, 40), pt(6, 41), pt(0, 29), 10).slice(1)];
    pen.fill(mouth, P.white, 1);
    pen.stroke(all(mouth), 1.5, P.line, 1, false);
    pen.hair([pt(1, 33), pt(30, 33)], 0.9, P.line, 0.85);
    for (const x of [7, 13, 19, 25]) pen.hair([pt(x, 27), pt(x, 38)], 0.7, P.line, 0.7);
  } else if (m.mouth === 'think') {
    pen.stroke(cub(pt(4, 34), pt(12, 31), pt(20, 31), pt(27, 33), 8), 1.9, P.lip, 1, false);
    pen.hair(cub(pt(9, 39), pt(14, 41), pt(19, 41), pt(23, 39), 6), 1, P.deep, 0.7);
  } else {
    pen.stroke(cub(pt(0, 29), pt(8, 38), pt(24, 38), pt(30, 28), 10), 2, P.lip, 1, false);
  }
}

function ear(d: Draw, x: number, y: number): void {
  wash(d, oval(x, y, 7.5, 11, 18), P.skin, P.deep, P.lit, 1.4);
  d.pen.hair(cub(pt(x - 3, y - 5), pt(x + 3, y - 4), pt(x + 2, y + 3), pt(x - 2, y + 4), 6), 0.9, P.deep, 0.8);
}

/** A hand, palm out, fingers up (the swimmer's "no thanks"). */
function palm(d: Draw, x: number, y: number, k: number): void {
  for (const [dx, dy, a] of [[-12, -24, -0.28], [-4, -30, -0.08], [5, -29, 0.1], [13, -23, 0.28]] as const) {
    wash(d, capsule(pt(x + dx * 0.6 * k, y - 8), pt(x + (dx + a * 14) * k, y + dy), 4.8), P.skin, P.deep, P.lit, 1.2);
  }
  wash(d, capsule(pt(x - 10 * k, y + 4), pt(x - 22 * k, y - 8), 5), P.skin, P.deep, P.lit, 1.2);
  wash(d, oval(x, y, 14, 14, 20), P.skin, P.deep, P.lit, 1.4);
  d.pen.hair(cub(pt(x - 8, y - 2), pt(x - 2, y + 4), pt(x + 4, y + 4), pt(x + 9, y - 1), 6), 0.8, P.deep, 0.8);
}

function drawScientist(d: Draw): void {
  const { pen } = d;
  const hair = '#4b3a34';
  // The bun and the hair behind.
  wash(d, oval(-40, -48, 20, 18, 24), hair, '#1f1512', '#85706a', 1.6);
  wash(d, oval(-8, -28, 44, 42, 30), hair, '#1f1512', '#85706a', 1.8);
  // The coat and the shirt.
  wash(d, [pt(-14, 34), pt(22, 46), pt(24, 84), pt(-24, 84)], P.skin, P.deep, P.lit, 1.5);
  const coat = [...cub(pt(-26, 66), pt(-70, 78), pt(-98, 104), pt(-112, 340), 12), pt(124, 340), ...cub(pt(124, 340), pt(112, 120), pt(84, 86), pt(34, 72), 12).slice(1), pt(4, 120)];
  wash(d, coat, '#d9d4cc', '#5f6076', '#ffffff', 2);
  pen.clipped(coat, () => {
    glaze(pen.ctx, -78, 130, 34, 60, 0.35, '#ffffff', 0.55);
    for (const [x0, y0, x1, y1, w] of [[-74, 108, -92, 250, 15], [-58, 122, -66, 290, 13], [-34, 160, -40, 330, 11], [24, 190, 30, 335, 13], [-96, 170, -104, 320, 11]] as const) {
      fold(d, cub(pt(x0, y0), pt(x0 - 10, y0 + (y1 - y0) * 0.35), pt(x1 + 12, y0 + (y1 - y0) * 0.7), pt(x1, y1), 14), w);
    }
    // Where the sleeve pulls at the shoulder.
    fold(d, cub(pt(-60, 84), pt(-76, 96), pt(-84, 112), pt(-84, 134), 10), 9);
    fold(d, cub(pt(-48, 80), pt(-60, 100), pt(-58, 120), pt(-52, 138), 10), 7);
    // The dark inside the open front.
    soft(d, cub(pt(4, 118), pt(2, 170), pt(4, 250), pt(4, 338), 14), 22, '#3c3c52', 0.6);
  });
  wash(d, [pt(-24, 68), pt(4, 120), pt(32, 74), pt(26, 66), pt(4, 92), pt(-18, 62)], '#3f7f86', '#234a52', '#7fc0c0', 1.5);
  // The lapels, turned back, each with its own shade; a breast pocket with a pen; buttons.
  wash(d, [...cub(pt(-26, 64), pt(-50, 100), pt(-44, 116), pt(-30, 118), 10), pt(-36, 126), ...cub(pt(-36, 126), pt(-24, 150), pt(-8, 164), pt(3, 172), 8).slice(1), ...cub(pt(3, 172), pt(0, 130), pt(-12, 92), pt(-26, 64), 10).slice(1)], '#e4dfd6', '#74758a', '#ffffff', 1.5);
  wash(d, [...cub(pt(34, 72), pt(54, 104), pt(48, 118), pt(36, 120), 10), pt(42, 128), ...cub(pt(42, 128), pt(30, 150), pt(16, 164), pt(5, 172), 8).slice(1), ...cub(pt(5, 172), pt(10, 130), pt(22, 94), pt(34, 72), 10).slice(1)], '#cfcac4', '#5f6076', '#f4f2ee', 1.5);
  wash(d, [pt(-74, 168), pt(-34, 172), pt(-36, 212), pt(-72, 208)], '#d4cfc8', '#66677c', '#ffffff', 1.3);
  wash(d, capsule(pt(-48, 150), pt(-47, 184), 3), '#2f6f8a', '#123a4c', '#9fd8ec', 1);
  for (const y of [200, 258, 316]) wash(d, oval(12, y, 4.6, 4.6, 16), '#b9b4ac', '#55566a', '#ffffff', 1);
  pen.stroke([pt(4, 170), pt(4, 340)], 1.3, P.line, 0.8, false);
  face(d, { look: pt(0.55, -0.75), wide: 0.15, mouth: 'think', brow: 0.6 });
  ear(d, -35, 2);
  // Hair over the brow, a grey streak.
  const fringe = [...cub(pt(-37, -6), pt(-46, -62), pt(20, -82), pt(43, -26), 18), ...cub(pt(43, -26), pt(28, -46), pt(0, -50), pt(-18, -34), 10).slice(1), ...cub(pt(-18, -34), pt(-28, -26), pt(-31, -14), pt(-30, -2), 8).slice(1)];
  wash(d, fringe, hair, '#1f1512', '#85706a', 1.8);
  pen.hair(cub(pt(-26, -30), pt(-18, -56), pt(8, -62), pt(28, -46), 10), 3, '#c9bfb4', 0.8);
  // Round glasses.
  for (const [x, r] of [[-3, 16], [28, 14]] as const) {
    pen.fill(oval(x, -5, r, r, 24), '#dff2f4', 0.18);
    pen.stroke(all(oval(x, -5, r, r, 26)), 2.2, '#2a211c', 1, false);
    pen.hair([pt(x - r * 0.5, -5 - r * 0.2), pt(x - r * 0.1, -5 - r * 0.65)], 1.4, '#ffffff', 0.9);
  }
  pen.stroke([pt(13, -7), pt(15, -7)], 2.2, '#2a211c', 1, false);
  pen.stroke([pt(-19, -6), pt(-33, -3)], 2, '#2a211c', 1, false);
  // The arm up, the hand at the chin.
  const sleeve = [...cub(pt(100, 340), pt(112, 200), pt(92, 130), pt(58, 92), 12), pt(36, 104), ...cub(pt(36, 104), pt(48, 150), pt(50, 220), pt(40, 340), 12).slice(1)];
  wash(d, sleeve, '#d4cfc8', '#585970', '#ffffff', 1.9);
  pen.clipped(sleeve, () => {
    for (const [x0, y0, x1, y1, w] of [[48, 112, 86, 124, 9], [52, 134, 94, 160, 10], [54, 168, 98, 178, 9], [52, 204, 100, 226, 11], [50, 250, 98, 262, 10], [48, 296, 96, 316, 11]] as const) {
      fold(d, cub(pt(x0, y0), pt(x0 + 12, y0 + 12), pt(x1 - 14, y1 - 6), pt(x1, y1), 12), w);
    }
  });
  // The cuff.
  wash(d, [pt(34, 100), pt(60, 86), pt(68, 98), pt(42, 114)], '#e6e1d8', '#74758a', '#ffffff', 1.4);
  wash(d, oval(40, 82, 18, 17, 24), P.skin, P.deep, P.lit, 1.6);
  for (const [x, y] of [[26, 74], [28, 83], [31, 91]] as const) wash(d, capsule(pt(x + 16, y + 2), pt(x - 2, y), 5.6), P.skin, P.deep, P.lit, 1.2);
  wash(d, capsule(pt(40, 72), pt(30, 48), 5.8), P.skin, P.deep, P.lit, 1.3);
}

export const SCIENTIST: SpriteArt<'think'> = { frame: 700, res: 2.8, poses: ['think'], draw: drawScientist };

/** A bent arm or leg, shoulder to elbow to wrist (half widths at each): one outline round both parts, no seam at the joint. */
function bent(d: Draw, a: Pt, b: Pt, c: Pt, r: readonly [number, number, number]): void {
  const { pen } = d;
  const parts = [limb(a, b, r[0] * 2, r[1] * 2.1), limb(b, c, r[1] * 2.15, r[2] * 2)];
  for (const s of parts) pen.stroke(all(s), 4.2, P.line, 1, false);
  for (const s of parts) pen.fill(s, P.skin, 1);
  for (const s of parts) {
    pen.clipped(s, () => {
      for (const [k, al] of [[0.9, 0.16], [0.6, 0.2], [0.3, 0.26]] as const) pen.crescent(s, pt(-r[1] * k, -r[1] * k * 0.4), () => pen.fill(s, P.deep, al));
    });
  }
  glaze(pen.ctx, b.x - 2, b.y, r[1] * 1.1, r[1] * 1.1, 0, P.skin, 0.8);
  const run = (p: Pt, q: Pt): Pt[] => [0.1, 0.35, 0.6, 0.9].map((t) => pt(p.x + (q.x - p.x) * t - r[1] * 0.35, p.y + (q.y - p.y) * t));
  soft(d, run(a, b), r[0] * 0.8, P.lit, 0.9);
  soft(d, run(b, c), r[1] * 0.75, P.lit, 0.9);
  for (const s of parts) rim(d, s, 2.2);
}

/** His arms, drawn before the chest, so the shoulders run into it. */
function arms(d: Draw, nope: boolean): void {
  if (nope) {
    bent(d, pt(-46, 86), pt(-96, 138), pt(-84, 72), [16, 13, 9]);
    palm(d, -84, 54, -1);
    bent(d, pt(46, 86), pt(100, 136), pt(106, 70), [16, 13, 9]);
    palm(d, 106, 52, 1);
  } else {
    bent(d, pt(-46, 86), pt(-80, 144), pt(-66, 196), [16, 13, 9]);
    wash(d, oval(-62, 204, 12, 14, 18), P.skin, P.deep, P.lit, 1.5);
    bent(d, pt(46, 86), pt(88, 142), pt(60, 190), [16, 13, 9]);
    wash(d, oval(54, 196, 13, 13, 18), P.skin, P.deep, P.lit, 1.5);
  }
}

function drawSwimmer(d: Draw, pose: 'calm' | 'nope'): void {
  const { pen } = d;
  const nope = pose === 'nope';
  // Legs and trunks, chest and neck.
  for (const x of [-26, 22]) {
    bent(d, pt(x, 200), pt(x - 2, 272), pt(x - 5, 340), [22, 16, 11]);
  }
  arms(d, nope);
  const chest = [...cub(pt(-18, 60), pt(-62, 68), pt(-72, 92), pt(-62, 130), 12), ...cub(pt(-62, 130), pt(-52, 160), pt(-50, 180), pt(-52, 206), 8).slice(1), pt(50, 206), ...cub(pt(50, 206), pt(48, 180), pt(54, 156), pt(62, 128), 8).slice(1), ...cub(pt(62, 128), pt(72, 90), pt(60, 68), pt(22, 60), 12).slice(1)];
  wash(d, [pt(-16, 34), pt(20, 46), pt(24, 72), pt(-22, 72)], P.skin, P.deep, P.lit, 1.5);
  wash(d, chest, P.skin, P.deep, P.lit, 1.9);
  pen.clipped(chest, () => {
    // Collarbones, the chest, ribs and belly, turned with soft shadow and light.
    soft(d, cub(pt(-44, 84), pt(-24, 76), pt(-12, 78), pt(0, 84), 10), 6, P.deep, 0.8);
    soft(d, cub(pt(46, 82), pt(28, 76), pt(16, 78), pt(6, 84), 10), 6, P.deep, 0.9);
    soft(d, cub(pt(-48, 112), pt(-34, 130), pt(-12, 130), pt(0, 116), 12), 10, P.deep, 0.95);
    soft(d, cub(pt(6, 116), pt(20, 130), pt(40, 128), pt(50, 110), 12), 11, P.deep, 1);
    glaze(pen.ctx, -28, 104, 22, 14, 0, P.lit, 0.6);
    glaze(pen.ctx, 22, 103, 18, 12, 0, P.lit, 0.4);
    soft(d, [pt(3, 96), pt(2, 120), pt(2, 150), pt(2, 176)], 8, P.deep, 0.8);
    for (const y of [142, 160, 178]) {
      soft(d, cub(pt(-26, y), pt(-16, y + 4), pt(-8, y + 4), pt(0, y), 8), 4, P.deep, 0.55);
      soft(d, cub(pt(4, y), pt(12, y + 4), pt(20, y + 4), pt(30, y - 1), 8), 5, P.deep, 0.65);
    }
    soft(d, cub(pt(44, 120), pt(38, 150), pt(38, 180), pt(44, 206), 10), 22, P.deep, 0.7);
  });
  rim(d, chest, 4);
  pen.dot(2, 182, 2, P.deep, 0.9);
  const trunks = [pt(-55, 196), pt(54, 196), pt(56, 250), pt(8, 254), pt(2, 226), pt(-6, 254), pt(-56, 250)];
  wash(d, trunks, '#d8532f', '#7a2416', '#ffa05a', 1.9);
  pen.clipped(trunks, () => {
    for (const [x0, x1] of [[-36, -44], [-14, -22], [16, 22], [34, 42]] as const) soft(d, cub(pt(x0, 208), pt(x0 - 3, 222), pt(x1 + 4, 236), pt(x1, 252), 8), 9, '#5c160c', 0.9);
    soft(d, cub(pt(-30, 210), pt(-34, 224), pt(-34, 238), pt(-36, 250), 8), 5, '#ffb07a', 0.9);
  });
  rim(d, trunks, 3.4);
  pen.hair([pt(-54, 206), pt(54, 206)], 1.6, '#ffe2b0', 0.9);
  face(d, nope ? { look: pt(0.95, -0.1), wide: 1, mouth: 'grit', brow: 1.1 } : { look: pt(0.8, 0.1), wide: 0.1, mouth: 'smile', brow: 0.1 });
  rim(d, FACE, 3.4);
  ear(d, -35, 2);
  const hair = [...cub(pt(-36, -6), pt(-48, -70), pt(26, -88), pt(43, -26), 20), ...cub(pt(43, -26), pt(30, -42), pt(0, -44), pt(-20, -34), 10).slice(1), pt(-30, -4)];
  wash(d, hair, '#2e1e16', '#120a07', '#6a4a36', 1.8);
  // The mask up on the forehead: strap, frame, glass; the snorkel beside it.
  pen.stroke(cub(pt(-42, -26), pt(-30, -40), pt(-18, -46), pt(-8, -48), 8), 7, '#1a1a20', 1, false);
  const mask = [...cub(pt(-14, -38), pt(-18, -66), pt(0, -70), pt(16, -68), 10), ...cub(pt(16, -68), pt(40, -68), pt(50, -54), pt(44, -38), 10).slice(1), ...cub(pt(44, -38), pt(30, -30), pt(24, -44), pt(14, -34), 8).slice(1), ...cub(pt(14, -34), pt(4, -30), pt(-8, -32), pt(-14, -38), 8).slice(1)];
  wash(d, mask, '#f0b52e', '#9a6412', '#ffe9a0', 1.9);
  for (const g of [oval(0, -51, 12, 11, 22), oval(30, -51, 11, 11, 22)]) {
    wash(d, g, '#7fb8c9', '#2c5566', '#eafcff', 1.4);
    pen.hair([pt(g[0]!.x - 18, -54), pt(g[0]!.x - 12, -60)], 1.8, '#ffffff', 0.9);
  }
  pen.stroke([...cub(pt(-30, 18), pt(-50, 16), pt(-56, -10), pt(-52, -40), 10), ...cub(pt(-52, -40), pt(-50, -64), pt(-48, -84), pt(-46, -104), 8).slice(1)], 11, P.line, 1, false);
  pen.stroke([...cub(pt(-30, 18), pt(-50, 16), pt(-56, -10), pt(-52, -40), 10), ...cub(pt(-52, -40), pt(-50, -64), pt(-48, -84), pt(-46, -104), 8).slice(1)], 7, '#f0742e', 1, false);
  pen.stroke([pt(-46.4, -90), pt(-45.6, -106)], 8, '#f6e6c8', 1, false);
  moonlit(pen.ctx, -130, 130);
}

export const SWIMMER: SpriteArt<'calm' | 'nope'> = { frame: 700, res: 2.6, poses: ['calm', 'nope'], draw: drawSwimmer };
