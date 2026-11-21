import type { Rng } from '../../../src/logic/rng';
import { closed, type Draw, lerp, pt, TAU } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { type Blade, glaze, petalBlade } from '../../../src/art/critters/birdKit';
import { blackFeather } from '../../../src/art/chapters/savannaBossPaint';
import { SB } from './paint';

/**
 * The near (or far) wing, side on, facing +x. `k` 0 folded along the flank
 * .. 1 half open and raised for balance. The black flight feathers are
 * rooted along a trailing line (secondaries at the body end, primaries at
 * the hand end), the grey coverts lie over their roots in rows that get
 * smaller towards the leading edge and the shoulder (greater, median,
 * lesser, marginal), each feather a little different in length, angle and
 * overlap.
 */
interface WingFrame {
  readonly lead: (u: number) => Pt;
  readonly trail: (u: number) => Pt;
  readonly ang: (u: number) => number;
  readonly len: (u: number) => number;
}

const turn = (a: number, b: number): number => ((((b - a) % TAU) + TAU * 1.5) % TAU) - Math.PI;

function frameOf(k: number): WingFrame {
  const L = (a: Pt, b: Pt): Pt => lerp(a, b, k);
  const leadA = L(pt(16, -7), pt(13, -9));
  const leadB = L(pt(-14, -11), pt(-5, -38));
  const trailA = L(pt(13, 4), pt(3, -3));
  const trailB = L(pt(-16, 0), pt(-12, -34));
  return {
    lead: (u) => lerp(leadA, leadB, u),
    trail: (u) => lerp(trailA, trailB, u),
    ang: (u) => {
      const folded = Math.PI - 0.07 - u * 0.04;
      const open = -Math.PI * (0.96 - u * 0.36);
      return folded + k * turn(folded, open);
    },
    len: (u) => (1 - k) * (22 + 20 * u) + k * (30 + 16 * u),
  };
}

function covert(d: Draw, f: Blade, w: number, len: number, ang: number, tone: string): void {
  const { pen } = d;
  pen.fill(f.shape, tone, 1);
  pen.clipped(f.shape, () => {
    const root = f.at(0.15, 0);
    const tip = f.at(0.85, 0);
    glaze(d, root.x, root.y, len * 0.5, w * 0.55, ang, SB.deep, 0.35);
    glaze(d, tip.x, tip.y - w * 0.15, len * 0.3, w * 0.4, ang, SB.pale, 0.55);
  });
  pen.hair(f.shape.slice(Math.floor(f.shape.length * 0.25), Math.floor(f.shape.length * 0.75)), Math.max(0.2, w * 0.05), SB.white, 0.6);
  pen.hair(closed(f.shape), 0.22, SB.line, 0.45);
}

export function paintWing(d: Draw, rng: Rng, k: number, far: boolean): void {
  const w = frameOf(k);
  // Flight feathers: secondaries first, the primaries over them.
  const n = 13;
  const flights = Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    const len = w.len(u) * (0.94 + rng() * 0.12);
    return { f: petalBlade(w.trail(u), w.ang(u) + (rng() - 0.5) * 0.05, len, 7.4 - u * 1.4, (1 - k) * 0.02), width: 7.4 - u * 1.4 };
  });
  for (const { f, width } of flights) blackFeather(d, f, width, 0.45);
  // An underlay so no gaps show between the rows.
  const panel = [...Array.from({ length: 9 }, (_, i) => w.lead(i / 8)), ...Array.from({ length: 9 }, (_, i) => w.trail(1 - i / 8))];
  d.pen.fill(panel, SB.grey, 1);
  // Coverts, row by row from the trailing edge to the leading edge, each row smaller.
  const rows: readonly (readonly [number, number, number, number, string])[] = [
    [0.12, 13, 16, 5.2, SB.mid], [0.4, 12, 11, 4.2, SB.grey], [0.66, 11, 7.6, 3.4, SB.grey], [0.88, 10, 5, 2.6, SB.pale],
  ];
  for (const [v, count, size, width, tone] of rows) {
    for (let i = count - 1; i >= 0; i--) {
      const u = (i + 0.5 * (rng() - 0.5)) / (count - 1);
      const cu = Math.max(0, Math.min(1, u));
      const root = lerp(w.trail(cu), w.lead(cu), v);
      // Smaller towards the shoulder (u = 0 is the body end).
      const len = size * (0.72 + 0.4 * cu) * (0.88 + rng() * 0.24);
      const ang = w.ang(cu) + (rng() - 0.5) * 0.12;
      covert(d, petalBlade(pt(root.x + (rng() - 0.5) * 0.8, root.y + (rng() - 0.5) * 0.8), ang, len, width), width, len, ang, tone);
    }
  }
  // The leading edge: a soft line of tiny marginal feathers, and the light along it.
  const edge = Array.from({ length: 12 }, (_, i) => w.lead(i / 11));
  d.pen.hair(edge, 0.9, SB.white, 0.55);
  d.pen.hair(edge.map((p) => pt(p.x, p.y - 0.5)), 0.4, SB.line, 0.4);
  if (far) {
    for (const { f } of flights) d.pen.fill(f.shape, SB.shadow, 0.25);
    d.pen.fill(panel, SB.shadow, 0.3);
  }
}
