import { KRAIT_PAINT } from '../../../src/art/chapters/reefSnakePaint';
import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import type { EyeState } from './story';

/**
 * The banded sea krait's head from the side, facing +x, for the close shots:
 * the game's top-down head (chapters/reefSnakeHead.ts) walked round to the
 * camera with the same paint: a small blunt head, glossy blue-black over the
 * crown, the yellow snout and upper lip, the yellow stripe over the eye back
 * to the temple, a small dark eye, a pale cream chin, a pink mouth and
 * needle teeth. The black reaches back to the nape, where the silver-blue
 * neck and its black rings (the body strip) take over. Two sprites, each
 * hinged at its origin, so they can open round anything (as gulphen's
 * snakeSide.ts, the corn snake's).
 */
export const JAW_ART = 45.5;

const K = KRAIT_PAINT;

const toothRow = (d: Draw, line: readonly Pt[], side: 1 | -1): void => {
  for (let i = 2; i < line.length - 2; i += 2) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const tip = pt(a.x - 1.6, a.y + side * 2.6);
    d.pen.fill([a, tip, b], PAPER_FILL, 1);
    d.pen.hair([a, tip, b], 0.3, d.ink, 0.55);
  }
};

const lipPoints = (y0: number, y1: number, n = 26): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(-2 + (i / n) * 46, y0 + (y1 - y0) * (i / n)));

/** The eye: small and dark, a glossy brown iris round a round pupil, a catchlight, a silver rim on the black; or shut. */
function eye(d: Draw, c: Pt, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 3.9;
  const ball = oval(c.x, c.y, r, r * 0.94, 24);
  pen.fill(oval(c.x, c.y, r + 1.1, r + 1, 24), K.sheen, 0.55);
  if (state !== 'open') {
    pen.fill(ball, K.band, 1);
    const line = state === 'happy'
      ? cub(pt(c.x - r, c.y + 1), pt(c.x - 2, c.y - 3.2), pt(c.x + 2, c.y - 3.2), pt(c.x + r, c.y + 1), 10)
      : cub(pt(c.x - r, c.y - 1), pt(c.x - 2, c.y + 1.2), pt(c.x + 2, c.y + 1.2), pt(c.x + r, c.y - 1), 10);
    pen.stroke(line, 1.5, K.yellowLit, 1, false);
    return;
  }
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.8, c.y - 0.8, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, '#8a6a48');
    g.addColorStop(0.5, K.iris);
    g.addColorStop(1, '#120c08');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    pen.dot(c.x + 0.5, c.y + 0.2, 1.7, '#07050a', 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.4)), K.bandDeep, 0.4);
  });
  pen.stroke(closed(ball), 0.8, d.ink, 1, false);
  pen.dot(c.x - 1.2, c.y - 1.3, 0.85, PAPER_FILL, 1);
  pen.dot(c.x + 1.4, c.y + 1.2, 0.35, PAPER_FILL, 0.7);
}

/** Small and blunt: a low domed crown, the snout rounding down to the lip. */
const SKULL: readonly Pt[] = [
  ...cub(pt(-22, -9.5), pt(-10, -10.8), pt(2, -13), pt(14, -14.2), 12),
  ...cub(pt(14, -14.2), pt(27, -15.4), pt(37, -12.6), pt(42, -7.6), 12).slice(1),
  ...cub(pt(42, -7.6), pt(45.6, -4.6), pt(46.4, -1.4), pt(45, 0.8), 8).slice(1),
  ...cub(pt(45, 0.8), pt(36, 2.2), pt(14, 2.6), pt(-22, 4), 14).slice(1),
];

/** The yellow snout's back edge, curving down in front of the eye. */
const SNOUT_EDGE = cub(pt(32, -16), pt(30.4, -10), pt(31.6, -4), pt(30.4, 3), 10);

/** The upper jaw and skull; the lip runs along y ≈ 1. */
function drawUpper(d: Draw, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(SKULL, PAPER_FILL, 1);
  pen.clipped(SKULL, () => {
    // Blue-black crown, a cool sheen along its dome.
    const g = ctx.createLinearGradient(0, -16, 0, 3);
    g.addColorStop(0, K.bandLit);
    g.addColorStop(0.35, K.band);
    g.addColorStop(1, K.bandDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-24, -20, 74, 26);
    glaze(ctx, 16, -12.4, 15, 2, 0.04, K.sheen, 0.5);
    glaze(ctx, -8, -8.4, 10, 2, 0, K.sheen, 0.28);
    // The yellow snout, rounded: lit on its top, deepening down to the lip and round the tip.
    const snout = [...SNOUT_EDGE, pt(50, 3), pt(50, -17)];
    const y = ctx.createRadialGradient(38, -11, 0.5, 39, -6, 13);
    y.addColorStop(0, K.yellowLit);
    y.addColorStop(0.45, K.yellow);
    y.addColorStop(1, K.yellowDeep);
    pen.fill(snout, K.yellow, 1);
    pen.clipped(snout, () => {
      ctx.fillStyle = y;
      ctx.fillRect(28, -18, 22, 22);
      glaze(ctx, 37, -12.2, 5, 1.6, -0.2, PAPER_FILL, 0.45);
      // Its plates, in soft short marks.
      for (const plate of [cub(pt(36, -14.6), pt(37.5, -12), pt(37.6, -9.5), pt(36.4, -7.8), 6), cub(pt(41, -10.6), pt(42.6, -9.6), pt(43.6, -8.2), pt(44.2, -6.6), 6)]) pen.hair(plate, 0.4, K.yellowDeep, 0.45);
    });
    // The black feathered into the yellow, not a hard edge.
    glaze(ctx, 30.6, -6, 1.8, 10, 0, K.band, 0.55);
    // The stripe over the eye, back to the temple.
    const stripe = ribbon(cub(pt(31, -11.8), pt(24, -12.8), pt(12, -12.2), pt(1, -10), 14), (u) => 2.1 - 1.2 * u).shape;
    pen.fill(stripe, K.yellow, 0.92);
    pen.clipped(stripe, () => glaze(ctx, 22, -12.8, 8, 1, 0, K.yellowLit, 0.6));
    // The yellow upper lip: lit above, deeper at its edge, a few soft scale seams.
    const top = lipPoints(-2.6, -2.4);
    const lower = lipPoints(2.8, 0.6);
    const band = [...top, ...[...lower].reverse()];
    pen.fill(band, K.lip, 0.98);
    pen.clipped(band, () => {
      pen.fill(band.map((p) => pt(p.x, p.y + 2.8)), K.yellowDeep, 0.28);
      glaze(ctx, 20, -1.6, 20, 0.7, 0, K.yellowLit, 0.5);
    });
    for (const x of [6, 15, 24]) pen.hair(cub(pt(x, -2.3), pt(x + 0.8, -0.8), pt(x + 0.8, 0.4), pt(x, 1.6), 5), 0.35, K.yellowDeep, 0.35);
  });
  // The nostril, on the side of the snout.
  pen.fill(oval(42.4, -5.4, 1.15, 0.85, 12), '#2a1c0c', 0.9);
  pen.hair(cub(pt(41.2, -6.6), pt(42, -7.2), pt(43.2, -7), pt(43.8, -6.2), 5), 0.4, K.yellowLit, 0.8);
  eye(d, pt(25.5, -6.8), state);
  pen.stroke(SKULL.slice(0, 33), 1.6, d.ink, 1);
  pen.stroke(SKULL.slice(32), 1.2, d.ink, 1);
  fadeBack(ctx);
}

/** The back of the head dissolves into the neck. */
function fadeBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-24, 0, -8, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -24, 22, 48);
  ctx.restore();
}

export const KRAIT_UPPER: SpriteArt<EyeState> = { frame: 104, res: 7, poses: ['open', 'squeeze', 'happy'], draw: drawUpper };

const CHIN: readonly Pt[] = [
  ...cub(pt(-22, -4), pt(10, -2.6), pt(32, -2), pt(43.5, -0.6), 12),
  ...cub(pt(43.5, -0.6), pt(45, 0.6), pt(44.8, 2), pt(42.5, 3), 6).slice(1),
  ...cub(pt(42.5, 3), pt(32, 6.4), pt(12, 8.4), pt(-22, 9), 12).slice(1),
];

/** The lower jaw, pale cream and yellow, a dark ring creeping in at the back; the lip runs along y ≈ −1. */
function drawLower(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(CHIN, PAPER_FILL, 1);
  pen.clipped(CHIN, () => {
    pen.fill(CHIN, K.cream, 0.97);
    glaze(ctx, 30, -0.5, 14, 2.2, 0, K.lip, 0.6);
    pen.fill(CHIN.map((p) => pt(p.x, p.y + 5.4)), K.slate, 0.22);
    glaze(ctx, -14, 4, 7, 7, 0, K.band, 0.85);
    for (let i = 0; i < 9; i++) pen.hair([pt(i * 5 - 2, -3), pt(i * 5 - 3, 0.6)], 0.45, K.yellowDeep, 0.55);
  });
  pen.stroke(closed(CHIN.slice(0, -1)), 1.4, d.ink, 1);
  fadeBack(ctx);
}

export const KRAIT_LOWER: SpriteArt<'jaw'> = { frame: 104, res: 7, poses: ['jaw'], draw: drawLower };

/** The pink inside each jaw, with its small teeth, fading in as the mouth opens: on the same hinge as the jaw. */
function drawInside(d: Draw, pose: 'roof' | 'floor'): void {
  const { pen } = d;
  const s = pose === 'roof' ? 1 : -1;
  const a = pose === 'roof' ? lipPoints(4.2, 1.6) : lipPoints(-3.2, -0.6);
  const b = pose === 'roof' ? lipPoints(8.4, 3.4) : lipPoints(-8, -3);
  const pink = [...a, ...[...b].reverse()];
  toothRow(d, pose === 'roof' ? lipPoints(7.6, 3.2) : lipPoints(-7, -2.6), s);
  pen.fill(pink, K.mouth, 1);
  pen.clipped(pink, () => pen.fill(pink.map((p) => pt(p.x, p.y + s * 2.4)), K.mouthDeep, 0.6));
  pen.stroke(closed(pink), 0.7, d.ink, 0.9, false);
}

export const KRAIT_INSIDE: SpriteArt<'roof' | 'floor'> = { frame: 104, res: 7, poses: ['roof', 'floor'], draw: drawInside };
