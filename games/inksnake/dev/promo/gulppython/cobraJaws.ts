import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { COBRA } from '../cobra/cobraArt';
import type { EyeState } from './story';

/**
 * The king cobra's head from the side, facing +x, split at the jaws so they
 * can open round a python: the #115 short's painted head (cobra/cobraHead.ts)
 * laid out the way gulphen's jaws are (snakeSide.ts: each sprite hinged at
 * its origin, the lip along y ≈ 1, the tip at JAW_ART). Long and big, flat
 * on top, the crown's large shields (the two big occipitals at the back)
 * edged in ink, a broad blunt snout; warm olive-brown, the pale yellow lip
 * scales each edged black behind; a big bronze eye with a ROUND pupil and a
 * catchlight; a cream throat; a pale pink mouth with short front fangs.
 */
export const JAW_ART = 45.5;

const P = {
  crown: '#6c663a', top: '#7a7243', cheek: '#5d5732', low: '#8b8253', lip: '#ecdfa8', lipDeep: '#bfae6c',
  iris: '#b98b3e', irisLit: '#e0b866', irisDeep: '#3a2610', pupil: '#0a0705',
  mouth: '#f0c8c0', mouthDeep: '#b8746c', fang: '#fbf6e8',
} as const;

const SKULL: readonly Pt[] = [
  ...cub(pt(-22, -12.5), pt(-8, -14.6), pt(6, -16.2), pt(18, -16.4), 12),
  ...cub(pt(18, -16.4), pt(27, -16.6), pt(34, -14.6), pt(40, -10.4), 10).slice(1),
  ...cub(pt(40, -10.4), pt(44.4, -7.2), pt(46.6, -3.4), pt(45.6, 0.8), 8).slice(1),
  ...cub(pt(45.6, 0.8), pt(36, 2.2), pt(14, 2.8), pt(-22, 4.2), 14).slice(1),
];
const TOP_N = 31;
const lipPoints = (y0: number, y1: number, n = 26): Pt[] => Array.from({ length: n + 1 }, (_, i) => pt(-2 + (i / n) * 47, y0 + (y1 - y0) * (i / n)));

function eye(d: Draw, c: Pt, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 4.4;
  const ball = oval(c.x, c.y, r, r * 0.94, 26);
  pen.fill(oval(c.x, c.y + 0.2, r + 1.1, r * 0.94 + 1, 26), COBRA.shadow, 0.55);
  if (state !== 'open') {
    pen.fill(ball, P.cheek, 1);
    const line = state === 'happy'
      ? cub(pt(c.x - r, c.y + 1), pt(c.x - 2, c.y - 3.4), pt(c.x + 2, c.y - 3.4), pt(c.x + r, c.y + 1), 10)
      : cub(pt(c.x - r, c.y - 1), pt(c.x - 2, c.y + 1.2), pt(c.x + 2, c.y + 1.2), pt(c.x + r, c.y - 1), 10);
    pen.stroke(line, 1.4, COBRA.line, 1, false);
    return;
  }
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.5, c.y + 0.6, 0.3, c.x, c.y, r * 1.05);
    g.addColorStop(0, P.irisLit);
    g.addColorStop(0.5, P.iris);
    g.addColorStop(1, P.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * 2, c.y + Math.sin(a) * 2), pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)], 0.14, P.irisDeep, 0.4);
    }
    pen.fill(oval(c.x + 0.3, c.y + 0.1, 1.85, 1.85, 20), P.pupil, 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.5)), COBRA.shadow, 0.5);
  });
  pen.stroke(closed(ball), 0.6, COBRA.line, 1, false);
  pen.dot(c.x - 1.5, c.y - 1.4, 0.85, PAPER_FILL, 1);
  pen.dot(c.x + 1.5, c.y + 1.6, 0.28, PAPER_FILL, 0.6);
}

/** The crown's shields along the top, the scales round the eye, the nostril. */
function shields(d: Draw): void {
  const { pen } = d;
  for (const [x0, x1, y] of [[-12, -8, -14.6], [-2, 1, -15.6], [9, 12, -16.3], [20, 22.5, -16.4], [34.5, 36, -14.2], [40.8, 41.6, -10]] as const) {
    pen.hair(cub(pt(x0, y + 0.2), pt(x0 + 0.6, y + 2.4), pt(x1 - 0.4, y + 3.6), pt(x1, y + 4.4), 6), 0.4, COBRA.line, 0.6);
  }
  // The big occipitals' shared seam and the parietals' along the top.
  pen.hair(cub(pt(-14, -13.2), pt(-6, -12.4), pt(4, -12.8), pt(14, -13.6), 10), 0.32, COBRA.line, 0.4);
  pen.hair(cub(pt(21.5, -12.6), pt(25, -14), pt(31, -13.6), pt(34.4, -11.4), 8), 0.48, COBRA.line, 0.75);
  for (const pts of [
    [pt(22, -7.6), pt(20.8, -4.6), pt(21.4, -1.6)],
    [pt(16.6, -10.6), pt(14, -5.6), pt(12.6, -1)],
    [pt(6, -12.6), pt(4, -7.2), pt(3, -1.4)],
    [pt(14, -5.6), pt(8, -5.6), pt(4.2, -6.6)],
  ]) pen.hair(pts, 0.34, COBRA.line, 0.5);
  pen.fill(oval(41.4, -4.4, 1.1, 0.85, 12), COBRA.line, 0.9);
}

/** The upper jaw and skull; the lip runs along y ≈ 1. */
function drawUpper(d: Draw, state: EyeState): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(SKULL, PAPER_FILL, 1);
  pen.clipped(SKULL, () => {
    const g = ctx.createLinearGradient(0, -17, 0, 4);
    g.addColorStop(0, P.crown);
    g.addColorStop(0.3, P.top);
    g.addColorStop(0.68, P.cheek);
    g.addColorStop(1, P.low);
    ctx.fillStyle = g;
    ctx.fillRect(-24, -20, 74, 26);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(154,129,80,0.55)';
    ctx.fillRect(-24, -20, 74, 26);
    ctx.restore();
    glaze(ctx, 16, -14.4, 20, 1.8, 0.02, PAPER_FILL, 0.3);
    glaze(ctx, 2, -8, 12, 6, 0, COBRA.deep, 0.35);
    glaze(ctx, 38, -5, 6, 4, 0, '#8d8660', 0.35);
    // The pale lip band, each scale's back edge inked.
    const lip = lipPoints(1.6, 0.8);
    const band = lipPoints(-2.4, -2.2);
    pen.fill([...band, ...[...lip].reverse()], P.lip, 0.92);
    pen.fill([...lipPoints(-0.4, -0.8), ...[...lip].reverse()], P.lipDeep, 0.4);
    for (let i = 2; i < 25; i += 3) pen.hair([band[i]!, lip[i - 1]!], 0.4, COBRA.line, 0.55);
    const rng = createRng(33121);
    for (let i = 0; i < 160; i++) {
      const x = -16 + rng() * 58;
      const y = -14 + rng() * 10;
      pen.hair([pt(x, y), pt(x + 0.8, y + 0.4), pt(x + 0.6, y + 1.1)], 0.14, COBRA.line, 0.18);
    }
    shields(d);
  });
  eye(d, pt(28.4, -8.2), state);
  pen.stroke(SKULL.slice(0, TOP_N), 1.6, d.ink, 1);
  pen.stroke(SKULL.slice(TOP_N - 1), 1.1, d.ink, 1);
  dissolveBack(ctx);
}

export const COBRA_UPPER: SpriteArt<EyeState> = { frame: 104, res: 7, poses: ['open', 'squeeze', 'happy'], draw: drawUpper };

const CHIN: readonly Pt[] = [
  ...cub(pt(-22, -4), pt(10, -2.6), pt(32, -2), pt(44, -0.6), 12),
  ...cub(pt(44, -0.6), pt(45.6, 0.6), pt(45.4, 2.4), pt(42.6, 3.8), 6).slice(1),
  ...cub(pt(42.6, 3.8), pt(32, 7.6), pt(12, 9.6), pt(-22, 10), 12).slice(1),
];

/** The lower jaw: the pale yellow lip scales, the cream throat with a faint dark mottle. */
function drawLower(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(CHIN, PAPER_FILL, 1);
  pen.clipped(CHIN, () => {
    const g = ctx.createLinearGradient(0, -3, 0, 10);
    g.addColorStop(0, P.lip);
    g.addColorStop(0.5, COBRA.throat);
    g.addColorStop(1, P.lipDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-24, -6, 72, 18);
    glaze(ctx, -6, 8.6, 14, 2.6, 0, COBRA.bandDeep, 0.4);
    glaze(ctx, 26, 2, 12, 1.4, -0.05, PAPER_FILL, 0.4);
    for (const [x, y] of [[2, 7.2], [10, 6.8], [-8, 7.6]] as const) glaze(ctx, x, y, 1.8, 1.1, 0, COBRA.deep, 0.3);
    for (let i = 0; i < 7; i++) pen.hair([pt(i * 6.4 - 2, -3), pt(i * 6.4 - 3, 0.8)], 0.36, COBRA.line, 0.45);
  });
  pen.stroke(closed(CHIN.slice(0, -1)), 1.4, d.ink, 1);
  dissolveBack(ctx);
}

export const COBRA_LOWER: SpriteArt<'jaw'> = { frame: 104, res: 7, poses: ['jaw'], draw: drawLower };

/** The pale pink inside each jaw with a row of small teeth, the short fixed fangs at the roof's front. */
function drawInside(d: Draw, pose: 'roof' | 'floor'): void {
  const { pen } = d;
  const s = pose === 'roof' ? 1 : -1;
  const a = pose === 'roof' ? lipPoints(4.2, 1.6) : lipPoints(-3.2, -0.6);
  const b = pose === 'roof' ? lipPoints(8.4, 3.4) : lipPoints(-8, -3);
  const pink = [...a, ...[...b].reverse()];
  const teeth = pose === 'roof' ? lipPoints(7.4, 3) : lipPoints(-6.8, -2.4);
  for (let i = 2; i < teeth.length - 4; i += 2) {
    const [p, q] = [teeth[i]!, teeth[i + 1]!];
    const tip = pt(p.x - 1.4, p.y + s * 2.2);
    pen.fill([p, tip, q], PAPER_FILL, 1);
    pen.hair([p, tip, q], 0.25, COBRA.line, 0.5);
  }
  pen.fill(pink, P.mouth, 1);
  pen.clipped(pink, () => pen.fill(pink.map((p) => pt(p.x, p.y + s * 2.4)), P.mouthDeep, 0.55));
  pen.stroke(closed(pink), 0.7, COBRA.line, 0.9, false);
  if (pose === 'roof') {
    const f = pt(41.5, 1.8);
    const fang = [pt(f.x + 1, f.y), pt(f.x - 0.6, f.y + 4.4), pt(f.x - 1.4, f.y)];
    pen.fill(fang, P.fang, 1);
    pen.hair(closed(fang), 0.3, COBRA.line, 0.7);
  }
}

export const COBRA_INSIDE: SpriteArt<'roof' | 'floor'> = { frame: 104, res: 7, poses: ['roof', 'floor'], draw: drawInside };

/** The back of the skull dissolves into the neck. */
function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-24, 0, -8, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -24, 22, 48);
  ctx.restore();
}
