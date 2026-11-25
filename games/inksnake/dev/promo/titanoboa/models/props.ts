import type { V3 } from '../gl/math';
import { ball, grid, join, MAT, type Mesh, slab, tube } from '../gl/mesh';

/** Things to measure a snake against: a small car, a couch, a seesaw; and the dig's brush. Metres. */

const wheel = (x: number, z: number, r: number): Mesh => {
  const s = Math.sign(z);
  const at = (d: number): V3 => [x, r, z + d];
  return join(
    tube([at(-0.1), at(-0.09), at(0.09), at(0.1)], (u) => (u < 0.1 || u > 0.9 ? r * 0.88 : r), { mat: MAT.rubber, col: '#1c1a19', sides: 32 }),
    ball(at(0.09 * s), [r, r, 0.03], { mat: MAT.rubber, col: '#232120' }),
    ball(at(0.11 * s), [r * 0.6, r * 0.6, 0.04], { mat: MAT.gloss, col: '#b9b6ae' }),
    ball(at(0.14 * s), [r * 0.2, r * 0.2, 0.03], { mat: MAT.gloss, col: '#57544e' }),
  );
};

/** A small red hatchback, 3.6 m, nose at +x, wheels on y = 0. */
export function carMesh(): Mesh {
  const red = '#b5301f';
  const z = 0.78;
  const side = (s: 1 | -1): Mesh => join(
    // Window glass on the cabin's side, the pillar between, the door's handle.
    slab([[-1.12, 0.92], [-0.28, 0.92], [-0.28, 1.28], [-0.92, 1.28]], s * 0.66, s * 0.745, { mat: MAT.glass, col: '#22303a' }),
    slab([[-0.2, 0.92], [0.72, 0.92], [0.28, 1.28], [-0.2, 1.28]], s * 0.66, s * 0.745, { mat: MAT.glass, col: '#22303a' }),
    ball([-0.36, 0.76, s * 0.79], [0.09, 0.02, 0.02], { mat: MAT.gloss, col: '#d8d4ca', e: 0.5 }),
    tube([[-0.24, 0.9, s * 0.785], [-0.24, 0.6, s * 0.79], [-0.22, 0.36, s * 0.78]], () => 0.008, { mat: MAT.paint, col: '#3c0f0a', sides: 6 }),
    tube([[0.62, 0.88, s * 0.785], [0.66, 0.6, s * 0.79], [0.6, 0.36, s * 0.78]], () => 0.008, { mat: MAT.paint, col: '#3c0f0a', sides: 6 }),
    ball([0.62, 0.98, s * 0.84], [0.07, 0.06, 0.08], { mat: MAT.gloss, col: red, e: 0.6 }),
    ball([1.7, 0.68, s * 0.55], [0.1, 0.13, 0.15], { mat: MAT.glow, col: '#fff2c8' }),
    ball([-1.72, 0.74, s * 0.6], [0.06, 0.12, 0.12], { mat: MAT.glow, col: '#ff5a38' }),
    wheel(1.12, s * 0.68, 0.31), wheel(-1.15, s * 0.68, 0.31),
    ...[1.12, -1.15].map((x) => grid(18, 3, (u, v) => {
      const a = u * Math.PI;
      const k = 0.36 + 0.07 * v;
      return { p: [x - Math.cos(a) * k, 0.31 + Math.sin(a) * k, s * 0.79] };
    }, { mat: MAT.paint, col: '#7c1d12' })),
  );
  return join(
    ball([0, 0.62, 0], [1.75, 0.34, z], { mat: MAT.gloss, col: red, e: 0.32, n: 40, poleX: true }),
    ball([-0.16, 1.0, 0], [1.12, 0.44, 0.7], { mat: MAT.gloss, col: red, e: 0.42, n: 40, poleX: true }),
    // Windscreen and back window.
    grid(8, 8, (u, v) => ({ p: [0.36 + 0.56 * (1 - u) + 0.03, 1.26 - 0.36 * (1 - u), (v - 0.5) * 1.16] }), { mat: MAT.glass, col: '#22303a' }),
    side(1), side(-1),
    ball([1.76, 0.4, 0], [0.07, 0.09, 0.76], { mat: MAT.gloss, col: '#2a2724', e: 0.4 }),
    ball([-1.76, 0.4, 0], [0.07, 0.09, 0.76], { mat: MAT.gloss, col: '#2a2724', e: 0.4 }),
    ball([1.76, 0.56, 0], [0.03, 0.05, 0.3], { mat: MAT.gloss, col: '#1a1816', e: 0.4 }),
  );
}

/** A couch 2 m long, facing +z, its feet on y = 0. */
export function couchMesh(): Mesh {
  const c = '#2f6f74';
  const deep = '#275c62';
  const box = (at: V3, r: V3, col: string, e = 0.3): Mesh => ball(at, r, { mat: MAT.cloth, col, e, n: 32 });
  return join(
    box([0, 0.3, 0], [0.98, 0.16, 0.42], deep, 0.18),
    box([0, 0.66, -0.3], [0.96, 0.36, 0.16], c, 0.25),
    box([-0.9, 0.42, 0.02], [0.13, 0.28, 0.45], c, 0.35), box([0.9, 0.42, 0.02], [0.13, 0.28, 0.45], c, 0.35),
    ...[-0.39, 0.39].map((x) => box([x, 0.5, 0.08], [0.385, 0.1, 0.36], '#38828a', 0.35)),
    ...[-0.39, 0.39].map((x) => box([x, 0.8, -0.17], [0.375, 0.22, 0.12], '#38828a', 0.42)),
    box([-0.62, 0.74, 0.04], [0.17, 0.17, 0.08], '#d39a3c', 0.5),
    ...[[-0.86, 0.34], [0.86, 0.34], [-0.86, -0.34], [0.86, -0.34]].map(([x, z]) => tube([[x!, 0.16, z!], [x! * 1.01, 0.08, z!], [x! * 1.02, 0, z!]], (u) => 0.04 - 0.015 * u, { mat: MAT.gloss, col: '#4a2c18', sides: 10 })),
  );
}

/** The seesaw's pivot and its stand. */
export function pivotMesh(): Mesh {
  return ball([0, 0.0, 0], [0.22, 0.12, 0.95], { mat: MAT.gloss, col: '#4a4d52', e: 0.4 });
}
export function standMesh(h: number): Mesh {
  return join(
    slab([[-0.75, 0], [0.75, 0], [0.13, h], [-0.13, h]], -0.55, 0.55, { mat: MAT.gloss, col: '#39566b' }),
    ball([0, h, 0], [0.17, 0.17, 0.64], { mat: MAT.gloss, col: '#b9bec4', e: 0.6 }),
  );
}

/** The dig's soft brush: bristles' tip at the origin, the handle running up along +y. */
export function brushMesh(): Mesh {
  return join(
    tube([[0, 0.02, 0], [0.01, 0.1, 0], [0, 0.2, 0], [0, 0.26, 0]], (u) => 0.085 - 0.02 * u, { mat: MAT.fin, col: '#d9c08a', sides: 22, up: [0, 0, 1], squash: 0.5 }),
    tube([[0, 0.25, 0], [0, 0.3, 0], [0, 0.34, 0]], () => 0.07, { mat: MAT.gloss, col: '#c2c5c8', sides: 20, up: [0, 0, 1], squash: 0.55 }),
    tube([[0, 0.33, 0], [0, 0.45, 0], [0, 0.8, 0], [0, 1.4, 0]], (u) => 0.058 - 0.03 * Math.sin(u * 3), { mat: MAT.gloss, col: '#8f3d22', sides: 18, up: [0, 0, 1], squash: 0.7 }),
  );
}
