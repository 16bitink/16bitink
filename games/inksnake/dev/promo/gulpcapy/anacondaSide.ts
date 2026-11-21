import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { blotchShape, glaze } from '../../../src/art/snakes/cornPaint';
import { ANACONDA_TONE, paintSpot } from '../../../src/art/chapters/floodedSnakePaint';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The green anaconda's head from the side, facing +x, for the close shots:
 * the game's top-down head (chapters/floodedSnakeHead.ts) walked round to the
 * camera with the same paint box: long, low and narrow, the olive crown lit
 * yellow-olive and sinking to moss on the cheek, a big black blotch on the
 * nape, the eye and the nostril up on top (it lies with only those above the
 * water), the orange stripe edged in black running back from the eye to the
 * jaw's corner, yellowish lip scales spotted dark, a pink mouth and small
 * hooked teeth.
 *
 * Sprites, each hinged at its origin, so they can open round anything:
 * ANA_UPPER (skull and upper jaw; eye 'open' | 'squeeze' | 'happy'),
 * ANA_LOWER (the lower jaw), ANA_INSIDE ('roof' | 'floor': the pink inside
 * each jaw, with its teeth). Hinge to tip is ANA_JAW_ART art units.
 */
export const ANA_JAW_ART = 45.5;
export type AnaEye = 'open' | 'squeeze' | 'happy';

const T = ANACONDA_TONE;
const MOUTH = { throat: '#4a1c22', deep: '#b87278', floor: '#e6b5ae', front: '#f2d2c8' } as const;

const lipPoints = (y0: number, y1: number, n = 26): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(-2 + (i / n) * 46, y0 + (y1 - y0) * (i / n)));

/** The back of a jaw dissolves into the neck, where the body strip takes over. */
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

/** The eye, high on the head: olive-gold, an upright oval pupil, a wet catchlight; or shut. */
function eye(d: Draw, c: Pt, state: AnaEye): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 3.5;
  const ball = oval(c.x, c.y, r, r * 0.9, 24);
  if (state !== 'open') {
    pen.fill(ball, T.olive, 1);
    const line = state === 'happy'
      ? cub(pt(c.x - r, c.y + 0.8), pt(c.x - 1.6, c.y - 3), pt(c.x + 1.6, c.y - 3), pt(c.x + r, c.y + 0.8), 10)
      : cub(pt(c.x - r, c.y - 0.8), pt(c.x - 1.6, c.y + 1), pt(c.x + 1.6, c.y + 1), pt(c.x + r, c.y - 0.8), 10);
    pen.stroke(line, 1.4, d.ink, 1, false);
    return;
  }
  pen.fill(ball.map((p) => pt(p.x + 0.4, p.y + 0.6)), d.ink, 0.35);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.8, c.y - 0.8, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, '#d8c46a');
    g.addColorStop(0.5, T.iris);
    g.addColorStop(1, '#2e2a10');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    pen.fill(oval(c.x + 0.3, c.y + 0.1, 0.95, 2.3, 14), '#0e0c08', 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.35)), T.moss, 0.5);
  });
  pen.stroke(closed(ball), 0.85, d.ink, 1, false);
  pen.dot(c.x - 1.1, c.y - 1.1, 0.7, PAPER_FILL, 1);
}

const SKULL: readonly Pt[] = [
  ...cub(pt(-22, -10.5), pt(-8, -11.6), pt(6, -12.6), pt(18, -12.8), 12),
  ...cub(pt(18, -12.8), pt(26, -14.2), pt(34, -12.6), pt(40, -9.6), 12).slice(1),
  ...cub(pt(40, -9.6), pt(44, -7.4), pt(46.6, -4.4), pt(45.5, 0.6), 8).slice(1),
  ...cub(pt(45.5, 0.6), pt(36, 2), pt(14, 2.6), pt(-22, 4), 14).slice(1),
];
const EYE = pt(28.6, -10.4);

/** The upper jaw and skull; the lip runs along y ≈ 1. */
function drawUpper(d: Draw, state: AnaEye): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(SKULL, PAPER_FILL, 1);
  pen.clipped(SKULL, () => {
    const g = ctx.createLinearGradient(0, -14, 0, 3);
    [0, 0.2, 0.5, 0.8, 1].forEach((s, i) => g.addColorStop(s, T.wash[i]!));
    ctx.fillStyle = g;
    ctx.fillRect(-24, -20, 74, 26);
    glaze(ctx, 12, -11, 20, 2.4, 0.03, T.olive, 0.5);
    // The big black blotch on the nape and small dark spots on the crown, as the game's head.
    paintSpot(ctx, blotchShape(-10, -11, 9, 4.6, 9101, { rough: 0.12, pow: 2.2, lobe: 0.12, n: 40 }), 9102 + d.f, d.ink, T, 0.9);
    for (const [x, y, rx] of [[8, -11.6, 2.2], [14, -6.6, 1.6], [3, -7.8, 1.4], [38, -8.6, 1.1]] as const) {
      paintSpot(ctx, blotchShape(x, y, rx, rx * 0.75, 9110 + x, { rough: 0.15, n: 20 }), 9111 + d.f, d.ink, T, 0.6);
    }
    // The orange stripe, edged in black, back from the eye to the corner of the jaw.
    const stripe = cub(pt(25.5, -9.4), pt(18, -7.4), pt(8, -4.6), pt(-8, -1.4), 16);
    const black = ribbon(stripe, (u) => 3.4 - 0.9 * u).shape;
    const orange = ribbon(stripe, (u) => 1.9 - 0.6 * u).shape;
    pen.fill(black, T.spot, 0.95);
    pen.fill(orange, T.stripe, 1);
    pen.clipped(orange, () => glaze(ctx, 14, -7.2, 9, 0.8, -0.2, '#f2b060', 0.6));
    // The lip scales, yellowish, each edged in moss, a dark spot on every few.
    const lower = lipPoints(2.8, 0.6);
    const upper = lipPoints(-1.6, -2.2);
    pen.fill([...upper, ...[...lower].reverse()], T.lip, 0.95);
    for (let i = 2; i < 25; i += 3) pen.hair([upper[i]!, lower[i]!], 0.45, T.moss, 0.75);
    for (const i of [5, 11, 17]) glaze(ctx, upper[i]!.x + 1.4, 0.4, 1.2, 1, 0, T.spot, 0.75);
    pen.hair(upper, 0.45, T.moss, 0.7);
    // A wet sheen along the crown and hairlines of its small scales.
    glaze(ctx, 20, -12, 12, 1.2, 0.05, PAPER_FILL, T.sheen * 1.6);
    for (let x = -14; x < 40; x += 3.2) pen.hair([pt(x, -9 + Math.sin(x) * 0.4), pt(x + 1.6, -8.2)], 0.25, T.shadow, 0.35);
  });
  // The nostril, up on top of the snout.
  pen.fill(oval(42.4, -7.6, 1.15, 0.7, 12), T.spot, 0.95);
  pen.hair([pt(41.4, -8.3), pt(43.4, -8.2)], 0.3, T.olive, 0.8);
  eye(d, EYE, state);
  pen.stroke(SKULL.slice(0, 33), 1.6, d.ink, 1);
  pen.stroke(SKULL.slice(32), 1.2, d.ink, 1);
  fadeBack(ctx);
}

export const ANA_UPPER: SpriteArt<AnaEye> = { frame: 104, res: 7, poses: ['open', 'squeeze', 'happy'], draw: drawUpper };

const CHIN: readonly Pt[] = [
  ...cub(pt(-22, -4), pt(10, -2.6), pt(32, -2), pt(44, -0.6), 12),
  ...cub(pt(44, -0.6), pt(45.6, 0.6), pt(45.4, 2.2), pt(43, 3.4), 6).slice(1),
  ...cub(pt(43, 3.4), pt(32, 6.6), pt(12, 8.6), pt(-22, 9.5), 12).slice(1),
];

/** The lower jaw: olive along the lip, a pale yellow throat; the lip runs along y ≈ −1. */
function drawLower(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(CHIN, PAPER_FILL, 1);
  pen.clipped(CHIN, () => {
    pen.fill(CHIN, T.belly, 0.97);
    ctx.save();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = T.lip;
    ctx.beginPath();
    CHIN.slice(0, 12).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    for (const x of [-6, 4, 14, 24, 33]) glaze(ctx, x, -1.4, 1.4, 1.1, 0, T.spot, 0.8);
    glaze(ctx, 8, 7, 22, 3, 0.05, T.ground, 0.35);
    pen.fill(CHIN.map((p) => pt(p.x, p.y + 5.6)), T.shadow, 0.2);
    for (let i = 0; i < 9; i++) pen.hair([pt(i * 5 - 2, -3), pt(i * 5 - 3, 0.6)], 0.45, T.moss, 0.55);
  });
  pen.stroke(closed(CHIN.slice(0, -1)), 1.4, d.ink, 1);
  fadeBack(ctx);
}

export const ANA_LOWER: SpriteArt<'jaw'> = { frame: 104, res: 7, poses: ['jaw'], draw: drawLower };

/** The pink inside each jaw, with its small hooked teeth, fading in as the mouth opens: on the same hinge as the jaw. */
function drawInside(d: Draw, pose: 'roof' | 'floor'): void {
  const { pen } = d;
  const s = pose === 'roof' ? 1 : -1;
  const a = pose === 'roof' ? lipPoints(4.2, 1.6) : lipPoints(-3.2, -0.6);
  const b = pose === 'roof' ? lipPoints(6.8, 3) : lipPoints(-6.4, -2.6);
  const pink = [...a, ...[...b].reverse()];
  const teeth = pose === 'roof' ? lipPoints(6.2, 2.8) : lipPoints(-5.8, -2.4);
  for (let i = 2; i < teeth.length - 2; i += 2) {
    const [p, q] = [teeth[i]!, teeth[i + 1]!];
    const tip = pt(p.x - 1.6, p.y + s * 2.6);
    pen.fill([p, tip, q], PAPER_FILL, 1);
    pen.hair([p, tip, q], 0.3, d.ink, 0.55);
  }
  pen.fill(pink, MOUTH.floor, 1);
  pen.clipped(pink, () => {
    pen.fill(pink.map((p) => pt(p.x, p.y + s * 2.4)), MOUTH.deep, 0.6);
    glaze(pen.ctx, -10, s * 4, 14, 5, 0, MOUTH.throat, 0.5);
  });
  pen.stroke(closed(pink), 0.7, d.ink, 0.9, false);
}

export const ANA_INSIDE: SpriteArt<'roof' | 'floor'> = { frame: 104, res: 7, poses: ['roof', 'floor'], draw: drawInside };
