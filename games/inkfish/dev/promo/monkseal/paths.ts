import type { Pt } from '../../../src/art/pen';
import { lerp } from '../short';

/** Pieces of smooth paths, for the eel to lie along. */

const along = (pts: readonly Pt[]): number[] => pts.reduce<number[]>((a, p, i) => [...a, i ? a[i - 1]! + Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y) : 0], []);
/** The piece of a path between two distances along it, evenly resampled. */
export function piece(path: readonly Pt[], from: number, to: number, n = 40): Pt[] {
  const len = along(path);
  const at = (s: number): Pt => {
    const c = Math.max(0, Math.min(len[len.length - 1]!, s));
    let i = 1;
    while (i < len.length - 1 && len[i]! < c) i++;
    const v = (c - len[i - 1]!) / (len[i]! - len[i - 1]! || 1);
    return { x: lerp(path[i - 1]!.x, path[i]!.x, v), y: lerp(path[i - 1]!.y, path[i]!.y, v) };
  };
  return Array.from({ length: n + 1 }, (_, i) => at(from + ((to - from) * i) / n));
}
export const lengthOf = (path: readonly Pt[]): number => along(path)[path.length - 1]!;

/** Catmull-Rom through points, for paths. */
export function smoothPath(pts: readonly Pt[], n = 14): Pt[] {
  const at = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))]!;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const s = k / n;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
      const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      out.push({ x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) });
    }
  }
  return [...out, at(pts.length - 1)];
}
