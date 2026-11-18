import type { TreatKind } from '../../level/daily';
import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { bezier, edge, glint, oval, pt, ribbon, shade, skin, TAU, tint, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';

/**
 * The dailies' treats, painted from above as little still lifes: paper,
 * a wash, shadow-side hatching, a glint and a pen contour, like the
 * critters. Cookies, candy canes and confetti stars have their own
 * paintings; the other treats share a wrapped sweet in their colours
 * until theirs are painted.
 */

const FRAME = 30;
const RES = 3;

function cookie(d: Draw): void {
  const rng = createRng(91 + d.f);
  const shape = blob(pt(0, 0), 10.5, 10.2, rng, 0.06, 28);
  tint(d, shape.map((p) => pt(p.x + 1.6, p.y + 2.2)), d.ink, 0.16);
  skin(d, shape, '#c98a4b', 0.78);
  // Baked darker towards the rim.
  d.pen.clipped(shape, () => d.pen.stroke([...shape, shape[0]!], 3.4, '#8f5226', 0.35, false));
  shade(d, shape, 0.35);
  // A swirl of white icing, and chocolate chips.
  const swirl = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 25) * TAU * 1.6;
    const r = 1.2 + i * 0.25;
    return pt(Math.cos(a) * r, Math.sin(a) * r);
  });
  d.pen.stroke(swirl, 1.5, PAPER_FILL, 0.95, false);
  for (const [x, y] of [[-5, -3], [4, -5], [5, 4], [-3, 6], [-7, 3]] as const) d.pen.dot(x + (rng() - 0.5), y + (rng() - 0.5), 1.15, '#4a2614', 0.9);
  edge(d, shape, 1.4);
}

function candyCane(d: Draw): void {
  const spine: Pt[] = [...bezier(pt(-3, 11), pt(-3, -2), pt(-3, -6), 10), ...bezier(pt(-3, -6), pt(-2, -13), pt(5, -9), 8).slice(1), ...bezier(pt(5, -9), pt(8, -7), pt(7, -3), 5).slice(1)];
  const { shape } = ribbon(spine, () => 5.2);
  tint(d, shape.map((p) => pt(p.x + 1.4, p.y + 2)), d.ink, 0.16);
  skin(d, shape, '#fbf4ef', 0.9);
  // Red stripes wound round it.
  d.pen.clipped(shape, () => {
    for (let i = -14; i < 16; i += 4) d.pen.fill([pt(-12, i), pt(12, i - 7), pt(12, i - 5), pt(-12, i + 2)], '#c8283a', 0.85);
  });
  shade(d, shape, 0.32);
  glint(d, spine.slice(2, 12).map((p) => pt(p.x - 1, p.y)), 1.1, 0.8);
  edge(d, shape, 1.3);
}

function star(r: number, inner: number, turn = -Math.PI / 2): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = turn + (i / 10) * TAU;
    const k = i % 2 === 0 ? r : inner;
    return pt(Math.cos(a) * k, Math.sin(a) * k);
  });
}

function confettiStar(d: Draw): void {
  const rng = createRng(77 + d.f);
  const colours = ['#d94a5a', '#3f8fd0', '#59b067', '#e0a830', '#9a62c9'];
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU;
    const r = 9 + rng() * 4;
    const c = pt(Math.cos(a) * r, Math.sin(a) * r);
    const t = rng() * Math.PI;
    const bit = [pt(-1.6, -0.7), pt(1.6, -0.7), pt(1.6, 0.7), pt(-1.6, 0.7)].map((p) => pt(c.x + p.x * Math.cos(t) - p.y * Math.sin(t), c.y + p.x * Math.sin(t) + p.y * Math.cos(t)));
    d.pen.fill(bit, colours[i % colours.length]!, 0.9);
  }
  const shape = star(9.5, 4.3);
  tint(d, shape.map((p) => pt(p.x + 1.4, p.y + 2)), d.ink, 0.16);
  skin(d, shape, '#f2c14e', 0.88);
  shade(d, shape, 0.3);
  glint(d, [pt(-3, -4), pt(-1, -6.5)], 1.2, 0.9);
  edge(d, shape, 1.3);
}

const SWEETS: Readonly<Record<TreatKind, string>> = {
  cookie: '#c98a4b', candycane: '#c8283a', confetti: '#f2c14e',
  envelope: '#c8283a', heart: '#e0607a', coin: '#e3b23c', paintedegg: '#7fb6d9', candy: '#9a62c9',
};

/** A wrapped sweet with twisted ends, in a treat's colour (the stand-in for treats not painted yet). */
function sweet(colour: string) {
  return (d: Draw): void => {
    const body = oval(0, 0, 7.5, 6, 22);
    const ends = [[pt(-7, 0), pt(-13, -5), pt(-13, 5)], [pt(7, 0), pt(13, -5), pt(13, 5)]] as const;
    for (const e of ends) {
      skin(d, e, colour, 0.5);
      edge(d, e, 1.1);
    }
    tint(d, body.map((p) => pt(p.x + 1.4, p.y + 2)), d.ink, 0.16);
    skin(d, body, colour, 0.82);
    shade(d, body, 0.3);
    glint(d, [pt(-3, -3), pt(1, -4)], 1.2, 0.85);
    edge(d, body, 1.3);
  };
}

const PAINTED: Partial<Record<TreatKind, (d: Draw) => void>> = { cookie, candycane: candyCane, confetti: confettiStar };

/** A treat's sprite (one pose, 'still'). */
export function treatArt(kind: TreatKind): SpriteArt<'still'> {
  const paint = PAINTED[kind] ?? sweet(SWEETS[kind]);
  return { frame: FRAME, res: RES, poses: ['still'], draw: (d) => paint(d) };
}

/** The critter key a treat's sprite is baked under. */
export const treatKey = (kind: TreatKind): string => `treat-${kind}`;
