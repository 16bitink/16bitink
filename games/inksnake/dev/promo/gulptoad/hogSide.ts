import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { blotchShape, glaze } from '../../../src/art/snakes/cornPaint';
import { paintHogBlotch } from '../../../src/art/chapters/barrensSnakePaint';
import type { SpriteArt } from '../../../src/art/types';
import type { EyeState } from './story';

/**
 * The eastern hognose's head from the side, facing +x, for the close shots:
 * the hognose of the fox short (hognose/lowHead.ts) in bold orange: broad
 * and deep, the snout's tip a shovel turned sharply up, sandy crown lit
 * warm, the dark bar across the crown in front of the eyes, the dark stripe
 * through the eye back to the jaw's corner, the big umber blotch on the
 * nape, cream lips, a brown-gold eye with a round pupil, a pink mouth.
 *
 * Sprites, each hinged at its origin, so they can open round anything;
 * hinge to tip is HOG_JAW_ART art units.
 */
export const HOG_JAW_ART = 45.5;
/** Art units the skull's back stands off the upper jaw's hinge line, and the chin's off the lower's. */
export const SKULL_RISE_ART = 14.3;
export const CHIN_DROP_ART = 8.9;
/** Art units behind the hinge where fadeBack has cleared the jaws. */
export const JAW_FADE_ART = 24;

export const HOG_ORANGE = {
  crown: '#b9702c', back: '#dc8a34', flank: '#eba653', low: '#f3cd8d', lip: '#f5e8c8', throat: '#f1e4c6',
  belly: '#f3ecd8', cool: '#c9bfa8', shadow: '#4a2410', blotch: '#3f2616', rim: '#150c07', iris: '#a8692a', irisLit: '#e7b65c', irisDeep: '#2c1508',
} as const;
const H = HOG_ORANGE;
const MOUTH = { throat: '#4a1620', deep: '#b8646e', floor: '#e9aeab' } as const;

const lipPoints = (y0: number, y1: number, n = 26): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(-2 + (i / n) * 46, y0 + (y1 - y0) * (i / n)));

/** The back of a jaw dissolves into the neck, where the body strip takes over. */
function fadeBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-24, 0, -8, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-32, -30, 24, 60);
  ctx.restore();
}

/** The eye: brown-gold with fine grain, a round pupil, the brow's shadow, a wet catchlight; or shut. */
function eye(d: Draw, c: Pt, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 4.5;
  const ball = oval(c.x, c.y, r, r * 0.95, 28);
  if (state !== 'open') {
    pen.fill(oval(c.x, c.y, r * 1.1, r, 24), H.back, 1);
    glaze(ctx, c.x - 1, c.y - 1.5, r, r * 0.6, 0, H.low, 0.5);
    const line = state === 'happy'
      ? cub(pt(c.x - r, c.y + 1.2), pt(c.x - 2, c.y - 3.6), pt(c.x + 2, c.y - 3.6), pt(c.x + r, c.y + 1.2), 10)
      : cub(pt(c.x - r, c.y - 1), pt(c.x - 2, c.y + 1.4), pt(c.x + 2, c.y + 1.4), pt(c.x + r, c.y - 1), 10);
    pen.stroke(line, 1.6, d.ink, 1, false);
    return;
  }
  pen.fill(oval(c.x + 0.2, c.y + 0.4, r * 1.25, r * 1.15, 28), H.shadow, 0.4);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.6, c.y + 0.8, 0.3, c.x, c.y, r * 1.05);
    g.addColorStop(0, H.irisLit);
    g.addColorStop(0.5, H.iris);
    g.addColorStop(1, H.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.48, c.y + Math.sin(a) * r * 0.48), pt(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95)], 0.16, H.irisDeep, 0.5);
    }
    pen.fill(oval(c.x + 0.2, c.y + 0.1, r * 0.45, r * 0.45, 20), '#0b0705', 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.45)), H.shadow, 0.55);
  });
  pen.stroke(closed(ball), 0.8, d.ink, 1, false);
  pen.dot(c.x - 1.5, c.y - 1.3, 0.85, PAPER_FILL, 1);
  pen.dot(c.x + 1.4, c.y + 1.7, 0.4, PAPER_FILL, 0.6);
}

/** The shovel: the snout's top dips, then curls sharply up to the keeled rostral's point. */
const TIP = pt(51.6, -17.6);
const TOP: readonly Pt[] = [
  ...cub(pt(-26, -13.6), pt(-14, -13.6), pt(0, -13.6), pt(7, -14), 14),
  ...cub(pt(7, -14), pt(14, -14.8), pt(16, -16.8), pt(22, -16.8), 8).slice(1),
  ...cub(pt(22, -16.8), pt(29.4, -17), pt(33, -13), pt(38.5, -11.6), 10).slice(1),
  ...cub(pt(38.5, -11.6), pt(43.4, -10.8), pt(47, -13.2), TIP, 10).slice(1),
];
const ROSTRAL: readonly Pt[] = [
  ...cub(TIP, pt(53.6, -18.2), pt(54, -15.6), pt(53.4, -13.2), 6),
  ...cub(pt(53.4, -13.2), pt(52.2, -8), pt(49.4, -3.4), pt(45.5, 0.6), 8).slice(1),
];
const SKULL: readonly Pt[] = [...TOP, ...ROSTRAL.slice(1), ...cub(pt(45.5, 0.6), pt(36, 2.2), pt(14, 2.6), pt(-26, 4), 14).slice(1)];
const EYE = pt(24.5, -8.6);

/** The skin: the countershaded wash, the head's markings, the shields, the lip scales. */
function paintSkull(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const g = ctx.createLinearGradient(0, -18, 0, 4);
  g.addColorStop(0, '#e2a258');
  g.addColorStop(0.14, H.back);
  g.addColorStop(0.5, '#e0943f');
  g.addColorStop(0.78, H.flank);
  g.addColorStop(1, H.low);
  ctx.fillStyle = g;
  ctx.fillRect(-28, -26, 90, 36);
  glaze(ctx, 30, -12, 12, 4, 0.2, H.crown, 0.5);
  glaze(ctx, 49, -10, 5, 9, 0.35, H.low, 0.55);
  glaze(ctx, 10, -4, 18, 5, 0, '#c9702a', 0.3);
  // The big blotch on the nape, the bar across the crown in front of the eyes.
  paintHogBlotch(ctx, blotchShape(-9, -11.6, 10.5, 5.4, 9711, { rough: 0.14, pow: 2.6, lobe: 0.1, n: 44 }), 9712 + d.f, d.ink, 1, 0.4);
  paintHogBlotch(ctx, ribbon(cub(pt(35.6, -14.5), pt(32, -13.2), pt(30.2, -11), pt(29, -7.4), 10), (u) => 4.4 - 1.6 * u).shape, 9720 + d.f, d.ink, 0.9, 0.3);
  // The stripe through the eye, back and down to the jaw's corner.
  paintHogBlotch(ctx, ribbon(cub(pt(25, -6.4), pt(16, -4.6), pt(6, -1.8), pt(-6, 2.2), 14), (u) => 4.2 - 1.4 * u).shape, 9730 + d.f, d.ink, 0.9, 0.35);
  // The cream lip scales, each edged.
  const lower = lipPoints(3, 0.8);
  const upper = lipPoints(-1.2, -2.2);
  pen.fill([...upper, ...[...lower].reverse()], H.lip, 0.96);
  for (let i = 2; i < 25; i += 3) pen.hair([upper[i]!, lower[i]!], 0.45, H.shadow, 0.65);
  pen.hair(upper, 0.45, H.shadow, 0.6);
  // Light along the crown and the shovel's edge; its keel.
  glaze(ctx, 12, -15.2, 15, 1.4, 0, PAPER_FILL, 0.5);
  glaze(ctx, 50.8, -14.6, 2, 3.4, 0.5, PAPER_FILL, 0.6);
  pen.hair(cub(pt(41, -9.4), pt(45.6, -9.2), pt(48.6, -11.8), pt(51.2, -16), 8), 0.6, H.shadow, 0.6);
  pen.hair(cub(pt(44.6, -8.2), pt(46, -5), pt(46, -2.4), pt(45.2, -1.6), 6), 0.5, H.shadow, 0.5);
  for (const q of [[pt(39, -11), pt(39.8, -4)], [pt(17, -16.6), pt(16, -11)], [pt(7, -16), pt(6, -10.6)], [pt(20, -12.8), pt(24, -14.4), pt(29.4, -13)]]) pen.hair(q, 0.5, d.ink, 0.45);
  const rng = createRng(9741);
  for (let i = 0; i < 70; i++) {
    const x = -20 + rng() * 34;
    const y = -13 + rng() * 11;
    pen.hair([pt(x, y), pt(x + 1.2, y + 0.3), pt(x + 1.9, y + 0.1)], 0.24, H.shadow, 0.35);
  }
}

/** The upper jaw and skull; the lip runs along y ≈ 1. */
function drawUpper(d: Draw, state: EyeState): void {
  const { pen } = d;
  pen.fill(SKULL, PAPER_FILL, 1);
  pen.clipped(SKULL, () => paintSkull(d));
  pen.fill(oval(42.6, -6.6, 1.2, 0.9, 12), d.ink, 0.95);
  eye(d, EYE, state);
  pen.hair(cub(pt(18.6, -11.8), pt(21, -14.6), pt(27, -14.8), pt(30, -11.6), 10), 1.1, d.ink, 0.85);
  pen.stroke(TOP, 1.6, d.ink, 1);
  pen.stroke(ROSTRAL, 1.5, d.ink, 1, false);
  pen.stroke(SKULL.slice(TOP.length + ROSTRAL.length - 2), 1.2, d.ink, 1);
  fadeBack(pen.ctx);
}

export const HOG_UPPER: SpriteArt<EyeState> = { frame: 116, res: 7, poses: ['open', 'squeeze', 'happy'], draw: drawUpper };

const CHIN: readonly Pt[] = [
  ...cub(pt(-24, -4), pt(10, -2.6), pt(32, -2), pt(44, -0.6), 12),
  ...cub(pt(44, -0.6), pt(45.8, 0.6), pt(45.4, 2.6), pt(42.6, 3.8), 6).slice(1),
  ...cub(pt(42.6, 3.8), pt(32, 7.2), pt(12, 9.2), pt(-24, 9.8), 12).slice(1),
];

/** The lower jaw: cream lip scales, an orange blush along them, a pale throat; the lip runs along y ≈ −1. */
function drawLower(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(CHIN, PAPER_FILL, 1);
  pen.clipped(CHIN, () => {
    const g = ctx.createLinearGradient(0, -4, 0, 10);
    g.addColorStop(0, H.lip);
    g.addColorStop(0.4, H.belly);
    g.addColorStop(1, H.cool);
    ctx.fillStyle = g;
    ctx.fillRect(-28, -8, 80, 22);
    glaze(ctx, -8, 0.5, 22, 3.4, 0.02, H.flank, 0.75);
    glaze(ctx, 22, 2, 22, 1.8, -0.02, H.low, 0.5);
    for (let i = 0; i < 9; i++) pen.hair([pt(i * 5 - 2, -3), pt(i * 5 - 3, 1)], 0.45, H.shadow, 0.5);
    pen.hair(cub(pt(-10, 3), pt(10, 2.2), pt(28, 1.6), pt(42, 0.8), 10), 0.4, H.shadow, 0.35);
    glaze(ctx, 8, 8.6, 26, 2.4, 0.03, H.shadow, 0.22);
  });
  pen.stroke(closed(CHIN.slice(0, -1)), 1.4, d.ink, 1);
  fadeBack(ctx);
}

export const HOG_LOWER: SpriteArt<'jaw'> = { frame: 116, res: 7, poses: ['jaw'], draw: drawLower };

/** The pink inside each jaw, with its small teeth, fading in as the mouth opens: on the same hinge as the jaw. */
function drawInside(d: Draw, pose: 'roof' | 'floor'): void {
  const { pen } = d;
  const s = pose === 'roof' ? 1 : -1;
  const a = pose === 'roof' ? lipPoints(4.2, 1.6) : lipPoints(-3.2, -0.6);
  const b = pose === 'roof' ? lipPoints(7.6, 3.2) : lipPoints(-7.2, -2.8);
  const teeth = pose === 'roof' ? lipPoints(6.8, 3) : lipPoints(-6.4, -2.6);
  for (let i = 3; i < teeth.length - 2; i += 3) {
    const [p, q] = [teeth[i]!, teeth[i + 1]!];
    const tip = pt(p.x - 1.4, p.y + s * 2.2);
    pen.fill([p, tip, q], PAPER_FILL, 1);
    pen.hair([p, tip, q], 0.3, d.ink, 0.55);
  }
  const pink = [...a, ...[...b].reverse()];
  pen.fill(pink, MOUTH.floor, 1);
  pen.clipped(pink, () => {
    pen.fill(pink.map((p) => pt(p.x, p.y + s * 2.4)), MOUTH.deep, 0.55);
    glaze(pen.ctx, -8, s * 4, 14, 5, 0, MOUTH.throat, 0.5);
  });
  pen.stroke(closed(pink), 0.7, d.ink, 0.9, false);
}

export const HOG_INSIDE: SpriteArt<'roof' | 'floor'> = { frame: 116, res: 7, poses: ['roof', 'floor'], draw: drawInside };
