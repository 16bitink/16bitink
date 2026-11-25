/** The little vector and matrix maths the painted 3D models need (matrices are column-major 4×4). */
export type V3 = readonly [number, number, number];
export type M4 = readonly number[];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const IDENTITY: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function mm(a: M4, b: M4): M4 {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r]! += a[k * 4 + r]! * b[c * 4 + k]!;
  return out;
}
export const chain = (...ms: readonly M4[]): M4 => ms.reduce((a, b) => mm(a, b), IDENTITY);
export const move = (x: number, y: number, z: number): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
export const scale = (x: number, y = x, z = x): M4 => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
export const rotX = (a: number): M4 => [1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1];
export const rotY = (a: number): M4 => [Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1];
export const rotZ = (a: number): M4 => [Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/** The frame whose x, y, z axes are given, at `o`. */
export const basis = (x: V3, y: V3, z: V3, o: V3): M4 => [...x, 0, ...y, 0, ...z, 0, ...o, 1];
export const apply = (m: M4, p: V3): V3 => [
  m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!,
  m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!,
  m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2] + m[14]!,
];
export const turn = (m: M4, p: V3): V3 => sub(apply(m, p), apply(m, [0, 0, 0]));

/** A pinhole camera in screen terms: focal length and principal point in px of the 1080 × 1920 frame. */
export interface Camera {
  readonly eye: V3;
  readonly at: V3;
  readonly f: number;
  readonly cx: number;
  readonly cy: number;
}

export function viewOf(c: Camera): M4 {
  const z = norm(sub(c.eye, c.at));
  const x = norm(cross([0, 1, 0], z));
  const y = cross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, c.eye), -dot(y, c.eye), -dot(z, c.eye), 1];
}

export function projOf(c: Camera, w: number, h: number, near: number, far: number): M4 {
  return [
    (2 * c.f) / w, 0, 0, 0,
    0, (2 * c.f) / h, 0, 0,
    1 - (2 * c.cx) / w, (2 * c.cy) / h - 1, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ];
}

/** Where a point lands on screen, and px per unit there. */
export function project(c: Camera, p: V3): { readonly x: number; readonly y: number; readonly k: number } {
  const v = apply(viewOf(c), p);
  const k = c.f / -v[2];
  return { x: c.cx + v[0] * k, y: c.cy - v[1] * k, k };
}

/** A Catmull-Rom curve through `pts`, sampled `per` times a stretch. */
export function spline3(pts: readonly V3[], per = 12): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[Math.max(0, i - 1)]!, pts[i]!, pts[i + 1]!, pts[Math.min(pts.length - 1, i + 2)]!];
    for (let j = 0; j < per; j++) {
      const t = j / per;
      const c = (a: 0 | 1 | 2): number => 0.5 * (2 * p1[a] + (p2[a] - p0[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t * t + (3 * p1[a] - p0[a] - 3 * p2[a] + p3[a]) * t ** 3);
      out.push([c(0), c(1), c(2)]);
    }
  }
  return [...out, pts[pts.length - 1]!];
}

/** `n + 1` points evenly along a polyline, and its length; with `reach`, only its first `reach` units (the curve is run straight on if too short). */
export function even(pts: readonly V3[], n: number, reach?: number): { readonly pts: V3[]; readonly length: number } {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1]! + len(sub(pts[i]!, pts[i - 1]!)));
  const total = s[s.length - 1]!;
  const L = reach ?? total;
  const last = norm(sub(pts[pts.length - 1]!, pts[pts.length - 2]!));
  let k = 1;
  const out = Array.from({ length: n + 1 }, (_, i): V3 => {
    const d = (i / n) * L;
    if (d >= total) return add(pts[pts.length - 1]!, mul(last, d - total));
    while (k < pts.length - 1 && s[k]! < d) k++;
    const u = (d - s[k - 1]!) / (s[k]! - s[k - 1]! || 1);
    return lerp3(pts[k - 1]!, pts[k]!, u);
  });
  return { pts: out, length: L };
}

/** Piecewise-smooth value through [x, value] knots. */
export function knots(table: readonly (readonly [number, number])[], x: number): number {
  if (x <= table[0]![0]) return table[0]![1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]!;
    const [x0, y0] = table[i - 1]!;
    if (x <= x1) {
      const before = table[i - 2] ?? table[i - 1]!;
      const after = table[i + 1] ?? table[i]!;
      const m0 = i >= 2 ? (y1 - before[1]) / (x1 - before[0]) : (y1 - y0) / (x1 - x0);
      const m1 = i + 1 < table.length ? (after[1] - y0) / (after[0] - x0) : (y1 - y0) / (x1 - x0);
      const h = x1 - x0;
      const t = (x - x0) / h;
      return (2 * t ** 3 - 3 * t * t + 1) * y0 + (t ** 3 - 2 * t * t + t) * h * m0 + (3 * t * t - 2 * t ** 3) * y1 + (t ** 3 - t * t) * h * m1;
    }
  }
  return table[table.length - 1]![1];
}
