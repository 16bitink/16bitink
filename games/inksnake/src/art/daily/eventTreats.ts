import { bezier, edge, glint, oval, pt, shade, skin, TAU, tint, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/** The event treats (Lunar New Year, Valentine's, St Patrick's, Easter, Halloween), painted like the other dailies' treats. */

const drop = (d: Draw, shape: readonly Pt[]): void => tint(d, shape.map((p) => pt(p.x + 1.4, p.y + 2)), d.ink, 0.16);
const rect = (hw: number, hh: number): Pt[] => [pt(-hw, -hh), pt(hw, -hh), pt(hw, hh), pt(-hw, hh)];

/** A red envelope with a gold flap, seal and border. */
export function envelope(d: Draw): void {
  const body = rect(10.5, 7.5);
  drop(d, body);
  skin(d, body, '#c8283a', 0.88);
  shade(d, body, 0.32);
  const border = rect(8.8, 5.9);
  d.pen.stroke([...border, border[0]!], 0.9, '#e8b93e', 0.85, false);
  const flap = [pt(-10.5, -7.5), pt(10.5, -7.5), pt(0, 1.5)];
  skin(d, flap, '#d63a48', 0.8);
  d.pen.stroke([...flap, flap[0]!], 1.1, '#e8b93e', 0.9, false);
  const seal = oval(0, 1.5, 3.3, 3.3, 16);
  skin(d, seal, '#f0c445', 0.95);
  d.pen.stroke([...seal, seal[0]!], 0.8, '#a8741a', 0.8, false);
  d.pen.dot(0, 1.5, 0.9, '#a8741a', 0.85);
  glint(d, [pt(-1.3, 0), pt(0.2, -0.8)], 0.8, 0.9);
  edge(d, body, 1.3);
}

/** A glossy heart-shaped candy. */
export function heart(d: Draw): void {
  const shape: Pt[] = Array.from({ length: 36 }, (_, i) => {
    const t = (i / 36) * TAU;
    return pt(0.62 * 16 * Math.sin(t) ** 3, -0.62 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + 1);
  });
  drop(d, shape);
  skin(d, shape, '#e0405e', 0.9);
  d.pen.clipped(shape, () => d.pen.stroke([...shape, shape[0]!], 3.2, '#a81f40', 0.4, false));
  shade(d, shape, 0.35);
  glint(d, bezier(pt(-6.4, -3), pt(-6.6, -6), pt(-3.6, -7), 6), 1.5, 0.95);
  d.pen.dot(-2.6, -2.4, 0.9, PAPER_FILL, 0.9);
  edge(d, shape, 1.4);
}

/** A gold coin with a clover stamped on it. */
export function coin(d: Draw): void {
  const body = oval(0, 0, 10, 10, 28);
  drop(d, body);
  skin(d, body, '#e8b73a', 0.92);
  shade(d, body, 0.36);
  const rim = oval(0, 0, 7.8, 7.8, 28);
  d.pen.stroke([...rim, rim[0]!], 0.9, '#a8741a', 0.75, false);
  // Four hearts make the clover, with a stem.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const c = pt(Math.cos(a) * 2.3, Math.sin(a) * 2.3 - 0.6);
    const leaf = oval(c.x, c.y, 2.3, 2.3, 12);
    skin(d, leaf, '#3f9a4e', 0.9);
    d.pen.stroke([...leaf, leaf[0]!], 0.7, '#1f5f2c', 0.8, false);
  }
  d.pen.stroke([pt(0.4, 0.6), pt(1.4, 4), pt(3, 6)], 1, '#1f5f2c', 0.9, false);
  glint(d, [pt(-7, -3.5), pt(-5, -6.2)], 1.2, 0.9);
  edge(d, body, 1.4);
}

/** An Easter egg with painted bands and dots. */
export function paintedEgg(d: Draw): void {
  const shape: Pt[] = Array.from({ length: 30 }, (_, i) => {
    const t = (i / 30) * TAU;
    const y = -Math.cos(t) * 11;
    const w = Math.sin(t) * 8.2 * (1 - 0.14 * Math.cos(t));
    return pt(w, y);
  });
  drop(d, shape);
  skin(d, shape, '#bfe3ee', 0.9);
  d.pen.clipped(shape, () => {
    d.pen.fill([pt(-12, -5.5), pt(12, -6.5), pt(12, -3.5), pt(-12, -2.5)], '#e0607a', 0.88);
    d.pen.fill([pt(-12, 2), pt(12, 1), pt(12, 3), pt(-12, 4)], '#f2c14e', 0.9);
    for (const x of [-6, -2, 2, 6]) d.pen.dot(x, -4, 0.7, PAPER_FILL, 0.9);
    for (const x of [-5, -1.5, 2, 5.5]) d.pen.dot(x, 7, 1, '#9a62c9', 0.9);
    d.pen.stroke([pt(-9, 3), pt(-5, 1.5), pt(-1, 3), pt(3, 1.5), pt(7, 3), pt(10, 2)], 0.8, '#3f8fd0', 0.85, false);
  });
  shade(d, shape, 0.34);
  glint(d, [pt(-4.4, -6.5), pt(-3.6, -9)], 1.2, 0.95);
  edge(d, shape, 1.4);
}

/** A wrapped Halloween candy: orange wrapper striped black, black twists. */
export function halloweenCandy(d: Draw): void {
  const body = oval(0, 0, 7.5, 6, 22);
  for (const s of [-1, 1] as const) {
    const twist = [pt(s * 7, 0), pt(s * 13, -5.5), pt(s * 12, 0), pt(s * 13, 5.5)];
    skin(d, twist, '#f08a24', 0.85);
    d.pen.stroke([pt(s * 8, 0), pt(s * 12, -3)], 0.9, '#2a1a12', 0.9, false);
    d.pen.stroke([pt(s * 8, 0), pt(s * 12, 3)], 0.9, '#2a1a12', 0.9, false);
    edge(d, twist, 1.1);
  }
  drop(d, body);
  skin(d, body, '#f08a24', 0.9);
  d.pen.clipped(body, () => {
    for (const x of [-4, 0, 4]) d.pen.fill([pt(x - 1, -8), pt(x + 1, -8), pt(x + 2.4, 8), pt(x + 0.4, 8)], '#2a1a12', 0.88);
  });
  shade(d, body, 0.3);
  glint(d, [pt(-5.5, -3), pt(-3, -4.4)], 1.1, 0.8);
  edge(d, body, 1.3);
}
