import { even, lerp3, spline3, type V3 } from '../gl/math';
import { ball, cone, grid, hex, join, MAT, type Mesh, tube } from '../gl/mesh';

/**
 * Titanoboa's skull, side on, lying in its slab of rock (the x, y plane;
 * z towards us), snout at +x: a low braincase, an eye socket, the long upper
 * and lower jaws and the palate's bar between them, all set with many small,
 * close teeth leaning back, and the thin bone the jaws swing on.
 */
const BONE = '#dcc594';

const bar = (pts: readonly V3[], r: (u: number) => number, squash = 0.8, col = BONE): Mesh =>
  ({ ...tube(even(spline3(pts), 60).pts, (u) => r(u) * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 10)) + 0.002, { mat: MAT.bone, col, sides: 18, squash, up: [0, 0, 1], level: 0 }) });

function row(pts: readonly V3[], n: number, size: number, down: number, skip: readonly number[] = []): Mesh[] {
  const path = even(spline3(pts), n).pts;
  return path.flatMap((p, i) => {
    if (skip.includes(i)) return [];
    const l = size * (0.75 + 0.35 * Math.sin((i / n) * Math.PI));
    return [cone([p[0], p[1], p[2]], [p[0] - l * 0.5, p[1] + down * l, p[2] + 0.02], 0.0155, { mat: MAT.tooth, sides: 8 })];
  });
}

export function skullMesh(): Mesh {
  const maxilla: V3[] = [[-0.2, 0.16, 0.1], [0.1, 0.13, 0.13], [0.5, 0.15, 0.13], [0.8, 0.17, 0.1], [0.95, 0.2, 0.05]];
  const palate: V3[] = [[-0.32, 0.06, 0.03], [0, 0.06, 0.05], [0.4, 0.1, 0.06], [0.76, 0.15, 0.04]];
  const low: V3[] = [[-0.78, -0.36, 0.08], [-0.5, -0.36, 0.12], [-0.1, -0.31, 0.14], [0.4, -0.22, 0.13], [0.78, -0.12, 0.09], [0.92, -0.06, 0.05]];
  const down = (p: readonly V3[], d: number): V3[] => p.map((q): V3 => [q[0], q[1] + d, q[2] + 0.03]);
  return join(
    // Braincase, roof of the skull and snout.
    bar([[-0.62, 0.3, 0.02], [-0.42, 0.36, 0.06], [-0.1, 0.37, 0.08], [0.1, 0.36, 0.08]], (u) => 0.1 + 0.045 * Math.sin(u * 3), 0.9),
    bar([[0.05, 0.37, 0.07], [0.3, 0.39, 0.08], [0.6, 0.36, 0.07], [0.82, 0.29, 0.05], [0.94, 0.22, 0.03]], (u) => 0.075 - 0.02 * u, 0.8),
    ball([0.92, 0.2, 0.04], [0.075, 0.06, 0.07], { mat: MAT.bone, col: BONE }),
    // Behind and before the eye: the bones that ring the socket.
    bar([[0.02, 0.36, 0.1], [-0.06, 0.27, 0.13], [-0.02, 0.17, 0.12]], () => 0.034),
    bar([[0.3, 0.38, 0.1], [0.36, 0.29, 0.13], [0.32, 0.18, 0.13]], () => 0.04),
    bar(maxilla, (u) => 0.05 + 0.022 * Math.sin(u * Math.PI)),
    bar(palate, (u) => 0.03 + 0.012 * Math.sin(u * Math.PI), 0.8, '#c9b07c'),
    // The bar from the palate back to the jaw's joint.
    bar([[-0.24, 0.05, 0.02], [-0.45, 0.02, 0.03], [-0.66, -0.1, 0.05], [-0.8, -0.26, 0.07]], (u) => 0.04 - 0.008 * u, 0.7, '#c9b07c'),
    // The long bones the jaw hangs from.
    bar([[-0.36, 0.4, 0.08], [-0.6, 0.38, 0.1], [-0.86, 0.3, 0.08]], (u) => 0.04 - 0.008 * u),
    bar([[-0.84, 0.31, 0.08], [-0.86, 0.02, 0.1], [-0.8, -0.3, 0.1]], (u) => 0.048 - 0.014 * Math.sin(u * 3)),
    bar(low, (u) => 0.066 - 0.026 * u),
    bar([[-0.62, -0.28, 0.12], [-0.44, -0.2, 0.13], [-0.3, -0.27, 0.13]], () => 0.034),
    ...row(down(palate, -0.03), 15, 0.06, -1),
    ...row(down(maxilla, -0.055), 21, 0.085, -1, [9]),
    ...row(down(low, 0.045), 24, 0.08, 1, [0, 1, 2, 3, 4, 5, 13]),
  );
}

/** The slab of sandstone it lies in, with a shallow hollow round the skull and grains left by the brush. */
export function slabMesh(): Mesh {
  const c = hex('#b98a52');
  return grid(80, 120, (u, v) => {
    const x = (u - 0.5) * 4.4;
    const y = (v - 0.5) * 7;
    const d = Math.hypot(x / 1.25, (y - 0.02) / 0.72);
    const hollow = -0.06 * Math.exp(-(d ** 4));
    const z = hollow + 0.05 * Math.sin(x * 2.1 + y * 1.3) + 0.03 * Math.sin(y * 4.7 - x * 1.7) + 0.09 * Math.max(0, d - 1.2);
    return { p: [x, y, z - 0.04], col: c };
  }, { mat: MAT.rock });
}

/** Heaps of sand over the skull at first, swept away from left to right: `swept` 0..1. */
export function sandMesh(swept: number): Mesh {
  const c = hex('#cda064');
  const edge = -1.3 + 2.7 * swept;
  return grid(70, 46, (u, v) => {
    const x = (u - 0.5) * 2.7;
    const y = (v - 0.5) * 1.5 + 0.02;
    const over = Math.min(1, Math.max(0, (x - edge) / 0.22 + 0.12 * Math.sin(y * 17)));
    const rim = Math.max(0, 1 - Math.hypot(x / 1.32, y / 0.72) ** 4);
    const h = 0.24 * Math.min(1, rim * 2.2) * over;
    return { p: lerp3([x, y, -0.5], [x, y, h + 0.012 * Math.sin(x * 23 + y * 11) * over - 0.02], Math.min(1, over * 1.6) * Math.min(1, rim * 4)), col: c };
  }, { mat: MAT.rock });
}
