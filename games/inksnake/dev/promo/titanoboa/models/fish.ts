import { even, knots, norm, spline3, type V3 } from '../gl/math';
import { ball, grid, join, MAT, type Mesh, mirrorZ, tube } from '../gl/mesh';

/**
 * A big lungfish, as swam in Colombia 58–60 million years ago: a heavy scaly
 * body, small eye, blunt mouth, paddle fins, the fin of the back, tail and
 * belly all in one. Nose at x = 0.5, tail tip x = -0.5, facing +x.
 */
const HIGH: readonly (readonly [number, number])[] = [[0, 0.012], [0.03, 0.05], [0.1, 0.088], [0.22, 0.125], [0.4, 0.14], [0.6, 0.112], [0.78, 0.066], [0.9, 0.03], [1, 0.004]];
const WIDE: readonly (readonly [number, number])[] = [[0, 0.014], [0.03, 0.05], [0.1, 0.082], [0.22, 0.1], [0.4, 0.1], [0.6, 0.075], [0.78, 0.04], [0.9, 0.016], [1, 0.003]];
const midY = (u: number): number => knots([[0, -0.012], [0.2, 0], [0.5, 0.006], [1, 0.012]], u);

export function fishMesh(wag: number): Mesh {
  const z = (u: number): number => 0.09 * Math.sin(wag - u * 3.4) * u * u;
  const at = (u: number, a: number): V3 => [0.5 - u, midY(u) + knots(HIGH, u) * Math.cos(a), z(u) + knots(WIDE, u) * Math.sin(a)];
  const body = grid(70, 28, (u, v) => {
    const a = (v - 0.5) * Math.PI * 2;
    return { p: at(u, a), uv: [u, a] };
  }, { mat: MAT.fish, wrap: true });
  const fin = (from: number, to: number, side: 1 | -1, tall: readonly (readonly [number, number])[]): Mesh => grid(30, 5, (s, v) => {
    const u = from + (to - from) * s;
    const h = knots(HIGH, Math.min(1, u)) * 0.9 + knots(tall, s) * v;
    return { p: [0.5 - u - 0.05 * v * s, midY(Math.min(1, u)) + side * h, z(Math.min(1, u)) + 0.012 * v * Math.sin(wag * 2 + s * 6)], uv: [s * 2.2, v] };
  }, { mat: MAT.fin, col: '#6f6a3a' });
  const paddle = (x: number, y: number, zz: number, l: number, ang: number): Mesh => grid(16, 8, (s, v) => {
    const w = l * 0.24 * Math.sin(Math.PI * Math.min(1, s * 0.92 + 0.08)) ** 0.7;
    const d: V3 = norm([-Math.cos(ang), -Math.sin(ang), 0.42]);
    return { p: [x + d[0] * l * s + (v - 0.5) * w * 1.4 * Math.sin(ang), y + d[1] * l * s - (v - 0.5) * w * 2 * Math.cos(ang), zz + d[2] * l * s], uv: [v * 0.7, s] };
  }, { mat: MAT.fin, col: '#7d7642' });
  const eye = (s: 1 | -1): Mesh => {
    const c: V3 = [0.5 - 0.095, 0.032, 0.066 * s];
    return join(
      ball(c, [0.02, 0.02, 0.014], { mat: MAT.gloss, col: '#c9a94a', n: 14 }),
      ball([c[0] + 0.001, c[1], c[2] + 0.007 * s], [0.011, 0.011, 0.0095], { mat: MAT.gloss, col: '#0a0806', n: 12 }),
      ball([c[0] + 0.005, c[1] + 0.006, c[2] + 0.014 * s], [0.0035, 0.0035, 0.0035], { mat: MAT.glow, col: '#fffbe8', n: 8 }),
    );
  };
  const pec = paddle(0.5 - 0.23, -0.05, 0.08, 0.21, 0.75);
  const pel = paddle(0.5 - 0.64, -0.07, 0.05, 0.16, 0.8);
  const lip: V3[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = ((i / 12) - 0.5) * 2;
    lip.push([0.5 - 0.008 - 0.075 * a * a, -0.03 - 0.012 * a * a, 0.062 * Math.sin(a * 1.45)]);
  }
  // The edge of the gill cover.
  const gill: V3[] = Array.from({ length: 9 }, (_, i): V3 => {
    const a = 0.5 + (i / 8) * 2.1;
    const u = 0.2 + 0.03 * Math.sin((i / 8) * Math.PI);
    const p = at(u, a);
    return [p[0], p[1], p[2] + 0.002];
  });
  const gl = tube(even(spline3(gill), 20).pts, (u) => 0.007 * Math.sin(Math.PI * (0.1 + 0.8 * u)), { mat: MAT.paint, col: '#1d1a10', sides: 8 });
  return join(
    body, fin(0.4, 1.02, 1, [[0, 0], [0.3, 0.07], [0.7, 0.075], [1, 0.01]]), fin(0.66, 1.02, -1, [[0, 0], [0.4, 0.06], [0.75, 0.06], [1, 0.01]]),
    pec, mirrorZ(pec), pel, mirrorZ(pel), eye(1), eye(-1), gl, mirrorZ(gl),
    tube(even(spline3(lip), 26).pts, () => 0.009, { mat: MAT.paint, col: '#2a2415', sides: 8 }),
  );
}
