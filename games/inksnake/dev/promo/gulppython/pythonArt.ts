import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import type { PyEye } from './meal';

/**
 * The Indian rock python's head from the side, facing +x, its mouth shut:
 * the deer short's Burmese head (deer/burmeseHead.ts) repainted paler, as
 * the game's rock python is (chapters/jungleRivalsPython.ts): a pale
 * grey-buff head, the dark brown arrowhead over the crown edged in black,
 * its point running forward to the snout; the dark stripe from the nostril
 * through the eye to the corner of the mouth, the wedge under the eye; cream
 * lips notched with heat pits. The origin is where the head meets the neck
 * (profile.ts HEAD_A), the snout at x = 50. Eyes: 'wide' (amber, an upright
 * slit, a catchlight), 'dozy' (half shut) and 'asleep' (shut).
 */
const LINE = '#1a130c';
const P = {
  top: '#e2cfa4', cheek: '#cdb78c', low: '#a8946c', lip: '#f0e6c4', lipDeep: '#bcab7c', pit: '#3a2a16',
  arrow: '#6a4a2c', arrowLit: '#8e6a42', arrowDeep: '#3e2814', edge: '#16100a', stripe: '#4a3220',
  iris: '#c9862e', irisLit: '#ecbd62', irisDeep: '#5e3514', pupil: '#0c0806',
} as const;

const SNOUT: Pt = pt(50, 0);
const RICTUS: Pt = pt(14, 3.2);

const TOP: readonly Pt[] = [
  ...cub(pt(-10, -12.4), pt(8, -12.6), pt(26, -11.6), pt(39, -9.2), 14),
  ...cub(pt(39, -9.2), pt(46, -7.8), pt(50, -5), SNOUT, 8).slice(1),
];
const LIP: readonly Pt[] = cub(SNOUT, pt(41, 1.2), pt(25, 2.4), RICTUS, 14);
const CHIN: readonly Pt[] = [
  ...cub(SNOUT, pt(49.5, 3), pt(45, 5.6), pt(35, 7.6), 8),
  ...cub(pt(35, 7.6), pt(23, 10.2), pt(8, 11.8), pt(-10, 12), 12).slice(1),
];
const shift = (pts: readonly Pt[], dy: number): Pt[] => pts.map((p) => pt(p.x, p.y + dy));

function outline(): Pt[] {
  return [...TOP, ...CHIN.slice(1)];
}

/** The arrowhead over the crown: a point near the snout, widening back over the head. */
function arrowhead(): Pt[] {
  const top = TOP.filter((p) => p.x <= 45);
  const depth = (x: number): number => 0.6 + 8 * Math.max(0, Math.min(1, (45 - x) / 52)) ** 0.8;
  return [...top, ...[...top].reverse().map((p) => pt(p.x, p.y + depth(p.x)))];
}

const EYE: Pt = pt(36.5, -4.4);
const EYE_R = 3.8;

function eye(d: Draw, state: PyEye): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = EYE;
  const r = EYE_R;
  const ball = oval(c.x, c.y, r, r * 0.92, 24);
  pen.fill(oval(c.x, c.y, r + 0.9, r * 0.92 + 0.8, 24), P.arrowDeep, 0.6);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.6, c.y + 0.4, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, P.irisLit);
    g.addColorStop(0.55, P.iris);
    g.addColorStop(1, P.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * 1.1, c.y + Math.sin(a) * 1.1), pt(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.95)], 0.14, P.irisDeep, 0.4);
    }
    pen.fill(oval(c.x + 0.1, c.y, state === 'wide' ? 0.55 : 0.75, r * 0.86, 16), P.pupil, 1);
    if (state !== 'wide') {
      // The lid: the stripe's dark skin drawn down over the eye, its edge a soft ink line.
      const drop = state === 'dozy' ? 0.05 : 1.3;
      const lid = [...cub(pt(c.x - r - 1, c.y - r - 1), pt(c.x - r, c.y + drop * r), pt(c.x + r, c.y + drop * r), pt(c.x + r + 1, c.y - r - 1), 12)];
      pen.fill(lid, P.stripe, 1);
      pen.clipped(lid, () => glaze(ctx, c.x, c.y - r * 0.4, r, r * 0.5, 0, P.arrowLit, 0.4));
    } else {
      pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.45)), P.arrowDeep, 0.45);
    }
  });
  pen.stroke(closed(ball), 0.55, LINE, 1, false);
  if (state === 'asleep') {
    pen.stroke(cub(pt(c.x - r, c.y + 0.2), pt(c.x - 1.6, c.y + 2), pt(c.x + 1.6, c.y + 2), pt(c.x + r, c.y + 0.2), 10), 0.9, LINE, 1, false);
    return;
  }
  if (state === 'dozy') pen.stroke(cub(pt(c.x - r, c.y - 0.4), pt(c.x - 1.6, c.y + 0.6), pt(c.x + 1.6, c.y + 0.6), pt(c.x + r, c.y - 0.4), 10), 0.8, LINE, 1, false);
  pen.dot(c.x - 1.1, c.y + (state === 'dozy' ? 1 : -1.05), 0.62, PAPER_FILL, 1);
  if (state === 'wide') pen.dot(c.x + 1.15, c.y + 1.25, 0.22, PAPER_FILL, 0.6);
}

function markings(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const arrow = arrowhead();
  pen.fill(arrow, P.arrow, 0.97);
  pen.clipped(arrow, () => {
    glaze(ctx, 16, -11.4, 22, 2, 0, P.arrowLit, 0.6);
    glaze(ctx, 4, -6, 14, 2.4, 0, P.arrowDeep, 0.45);
  });
  pen.hair(arrow.slice(arrow.length / 2), 0.7, P.edge, 0.95);
  pen.hair(cub(pt(46, -5.6), pt(34, -8.6), pt(16, -4.8), pt(-8, -3.6), 12), 1.2, '#f6ead0', 0.6);
  const stripe = [...cub(pt(48.5, -3.6), pt(42, -5.8), pt(30, -5.8), pt(22, -2.2), 10), ...cub(pt(22, -2.2), pt(16, 0.4), pt(8, 1.6), pt(-6, 2.2), 8).slice(1),
    ...cub(pt(-6, 4.2), pt(8, 3.6), pt(16, 2.8), pt(22, 0.8), 8), ...cub(pt(22, 0.8), pt(30, -2.2), pt(42, -2.4), pt(48.5, -2), 10).slice(1)];
  pen.fill(stripe, P.stripe, 0.9);
  pen.hair(stripe.slice(0, 18), 0.45, P.edge, 0.7);
  pen.fill([pt(33.6, -2.4), pt(39.4, -2.4), pt(37.2, 1.6), pt(35.4, 1.7)], P.stripe, 0.9);
}

function scales(d: Draw): void {
  const rng = createRng(6211);
  for (let i = 0; i < 150; i++) {
    const x = -4 + rng() * 50;
    const y = -11 + rng() * 20;
    d.pen.hair([pt(x, y), pt(x + 0.8, y + 0.4), pt(x + 0.6, y + 1.1)], 0.15, LINE, 0.16);
  }
  for (let x = 46; x > 26; x -= 3.4) d.pen.fill(oval(x, 1.5 - ((x - 15) / 37) * 0.6 - 1.2, 0.85, 0.5, 10), P.pit, 0.8);
  for (let x = 30; x > 12; x -= 3.2) d.pen.fill(oval(x, 5 + ((30 - x) / 18) * 4.2, 0.75, 0.48, 10), P.pit, 0.7);
}

function drawHead(d: Draw, state: PyEye): void {
  const { pen } = d;
  const { ctx } = pen;
  const shape = outline();
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, P.top);
    g.addColorStop(0.42, P.cheek);
    g.addColorStop(0.62, P.low);
    g.addColorStop(0.78, P.lip);
    g.addColorStop(1, P.lipDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-12, -14, 66, 28);
    glaze(ctx, 24, -9, 22, 2.2, 0.03, PAPER_FILL, 0.3);
    pen.fill([...LIP, ...shift(LIP, -2.8).reverse()], P.lip, 0.88);
    markings(d);
    pen.fill([...LIP, ...CHIN.slice(0, 12).reverse()], P.lip, 0.9);
    pen.fill(shift(CHIN, -1.6).slice(4), P.lipDeep, 0.3);
    // The throat's round, shaded under the jaw.
    glaze(ctx, 14, 10.5, 22, 2.4, 0.04, '#7a6646', 0.35);
    scales(d);
  });
  pen.dot(48.2, -3.2, 0.75, LINE, 0.95);
  eye(d, state);
  // The mouth is shut: one firm line along the lips.
  pen.hair(LIP, 0.8, LINE, 1);
  pen.stroke(TOP, 1.1, d.ink, 1);
  pen.stroke(CHIN, 1, d.ink, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(-10, 0, -3, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(-30, -30, 33, 60);
  ctx.restore();
}

export const PY_HEAD: SpriteArt<PyEye> = { frame: 130, res: 10, poses: ['wide', 'dozy', 'asleep'], draw: drawHead };
