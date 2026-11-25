import type { V3 } from '../gl/math';
import { ball, grid, join, MAT, type Mesh, tube } from '../gl/mesh';

/**
 * A yellow American school bus, metres: the rear at x = 0, the nose at
 * x = BUS_LEN, wheels on y = 0, half width 1.2 (painted in skins.ts by place).
 */
export const BUS_LEN = 12.8;

/** A box with rounded edges; `uv.x` says how far round to the sides a point is. */
const shell = (c: V3, r: V3, e: number, mat: number = MAT.bus): Mesh => ball(c, r, { mat: mat as 14, e, n: 44, poleX: true });

function wheel(x: number, z: number, r: number): Mesh {
  const at = (d: number): V3 => [x, r, z + d];
  return join(
    tube([at(-0.16), at(-0.15), at(0.15), at(0.16)], (u) => (u < 0.1 || u > 0.9 ? r * 0.9 : r), { mat: MAT.rubber, col: '#1a1817', sides: 36, up: [0, 1, 0] }),
    ball(at(Math.sign(z) * 0.14), [r, r, 0.04], { mat: MAT.rubber, col: '#232120' }),
    ball(at(Math.sign(z) * 0.17), [r * 0.58, r * 0.58, 0.05], { mat: MAT.gloss, col: '#2c2a28' }),
    ball(at(Math.sign(z) * 0.2), [r * 0.32, r * 0.32, 0.06], { mat: MAT.gloss, col: '#d9a52a' }),
  );
}

/** A black arch over a wheel. */
function arch(x: number, z: number, r: number): Mesh {
  return grid(20, 4, (u, v) => {
    const a = u * Math.PI;
    const k = r * (1 + 0.2 * v);
    return { p: [x - Math.cos(a) * k, 0.5 + Math.sin(a) * k, z + Math.sign(z) * 0.03] };
  }, { mat: MAT.paint, col: '#16130f' });
}

export function busMesh(): Mesh {
  const z = 1.2;
  return join(
    shell([5.6, 1.82, 0], [5.6, 1.26, z], 0.13),
    shell([11.75, 1.08, 0], [1.02, 0.6, 1.08], 0.22),
    // The dark skirt under, the bumpers.
    ball([6.2, 0.55, 0], [6.1, 0.16, 1.05], { mat: MAT.paint, col: '#171411', e: 0.2 }),
    ball([12.76, 0.62, 0], [0.12, 0.17, 1.2], { mat: MAT.gloss, col: '#1b1a1a', e: 0.25 }),
    ball([11.17, 2.18, 0], [0.06, 0.36, 0.035], { mat: MAT.paint, col: '#14110c', e: 0.3 }),
    // The grille and the headlights.
    ball([12.72, 1.12, 0], [0.07, 0.3, 0.55], { mat: MAT.gloss, col: '#25231f', e: 0.2 }),
    ...[-0.14, 0, 0.14].map((y) => ball([12.79, 1.12 + y, 0], [0.02, 0.025, 0.5], { mat: MAT.gloss, col: '#9c9a92', e: 0.4 })),
    ...[-1, 1].flatMap((s) => [
      ball([12.7, 1.06, s * 0.8], [0.1, 0.19, 0.19], { mat: MAT.gloss, col: '#3c3a36' }),
      ball([12.76, 1.06, s * 0.8], [0.08, 0.15, 0.15], { mat: MAT.glow, col: '#fff3c4' }),
      // Mirrors on their arms.
      tube([[12.2, 1.5, s * 0.95], [12.4, 1.95, s * 1.25], [12.45, 2.15, s * 1.32]], () => 0.025, { mat: MAT.paint, col: '#111111', sides: 8 }),
      ball([12.45, 2.0, s * 1.32], [0.07, 0.2, 0.12], { mat: MAT.gloss, col: '#1b1a19', e: 0.4 }),
      wheel(10.75, s * 1.02, 0.52), wheel(2.7, s * 1.02, 0.52),
      arch(10.75, s * 1.2, 0.6), arch(2.7, s * 1.2, 0.6),
      // The warning lamps on the roof's front edge.
      ball([11.2, 2.86, s * 0.86], [0.08, 0.13, 0.13], { mat: MAT.glow, col: '#ff4a22' }),
      ball([11.2, 2.86, s * 0.56], [0.08, 0.11, 0.11], { mat: MAT.glow, col: '#ffb02a' }),
    ]),
  );
}
