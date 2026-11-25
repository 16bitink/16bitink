import { add, basis, cross, even, knots, type M4, mul, norm, spline3, sub, type V3 } from '../gl/math';
import { ball, cone, frames, grid, join, MAT, type Mesh, mirrorZ, tube } from '../gl/mesh';

/**
 * Titanoboa: a head in head lengths (joint with the neck near x = 0, snout
 * tip at x = 1, the lips at LIP), broad and flat like a boa's, no heat pits,
 * jaws that open about a hinge near the back; and a body, a tube along a
 * path from the neck to the tail's tip.
 */
export const LIP = -0.06;
const HINGE = 0.13;
const EYE: V3 = [0.655, 0.085, 0.19];

const HALF: readonly (readonly [number, number])[] = [[-0.16, 0.2], [0, 0.235], [0.13, 0.298], [0.26, 0.325], [0.4, 0.305], [0.55, 0.262], [0.7, 0.212], [0.82, 0.18], [0.92, 0.16], [1, 0.15]];
const TOP: readonly (readonly [number, number])[] = [[-0.16, 0.17], [0, 0.19], [0.15, 0.215], [0.32, 0.215], [0.5, 0.19], [0.62, 0.185], [0.75, 0.145], [0.88, 0.105], [1, 0.085]];
const DEEP: readonly (readonly [number, number])[] = [[-0.16, 0.14], [0, 0.17], [0.15, 0.175], [0.35, 0.145], [0.6, 0.105], [0.85, 0.075], [1, 0.06]];
const round = (x: number): number => (x <= 0.88 ? 1 : Math.sqrt(Math.max(0, 1 - ((x - 0.88) / 0.12) ** 2)));
const half = (x: number): number => knots(HALF, x) * round(x);
const pow = (x: number, e: number): number => Math.sign(x) * Math.abs(x) ** e;
const xAt = (u: number): number => -0.16 + 1.16 * (1 - (1 - u) ** 1.7);

function upper(u: number, v: number): V3 {
  const x = xAt(u);
  const a = v * Math.PI;
  const top = knots(TOP, x) - LIP;
  const brow = 0.034 * Math.exp(-(((x - 0.64) / 0.07) ** 2)) * Math.exp(-(((Math.abs(a - Math.PI / 2) - 0.82) / 0.22) ** 2));
  const dip = 0.02 * Math.exp(-(((x - 0.78) / 0.1) ** 2)) * Math.exp(-(((a - Math.PI / 2) / 0.5) ** 2));
  return [x, LIP + top * Math.sqrt(round(x)) * pow(Math.sin(a), 0.72) + brow - dip, (half(x) + brow * 0.6) * pow(Math.cos(a), 0.66)];
}

/** A point of the lower jaw (before it turns), x as long as the skull. */
function lower(u: number, v: number): V3 {
  // Shaped by the skull's own x, so it closes at the chin.
  const x = xAt(u);
  const a = v * Math.PI;
  return [-0.16 + (x + 0.16) * 0.998, LIP - knots(DEEP, x) * Math.sqrt(round(x)) * pow(Math.sin(a), 0.8), half(x) * 0.985 * pow(Math.cos(a), 0.72)];
}

/** How far round from the middle line a point of a section is, in head lengths. */
function arc(at: (u: number, v: number) => V3, u: number, v: number): number {
  let sum = 0;
  let a = at(u, 0.5);
  for (let i = 1; i <= 8; i++) {
    const b = at(u, 0.5 + ((v - 0.5) * i) / 8);
    sum += Math.hypot(...sub(b, a));
    a = b;
  }
  return sum;
}

const opened = (p: V3, gape: number, k = 1): V3 => {
  const g = gape * k;
  const [c, s] = [Math.cos(g), Math.sin(g)];
  const [x, y] = [p[0] - HINGE, p[1] - LIP];
  return [HINGE + x * c + y * s, LIP + y * c - x * s, p[2]];
};

/** How far each part of the lower jaw turns: the neck end stays, so the throat stretches. */
const turnAt = (x: number): number => {
  const t = Math.min(1, Math.max(0, (x + 0.16) / 0.36));
  return t * t * (3 - 2 * t);
};

function teeth(gape: number): Mesh {
  const out: Mesh[] = [];
  const row = (n: number, from: number, to: number, size: number, at: (x: number) => V3, down: number, low: boolean): void => {
    for (let i = 0; i < n; i++) {
      const x = from + ((to - from) * i) / (n - 1);
      const p = at(x);
      const l = size * (0.8 + 0.35 * Math.sin((i / n) * Math.PI));
      const tip: V3 = [p[0] - l * 0.5, p[1] + down * l, p[2] * 0.97];
      const [a, b] = low ? [opened(p, gape, turnAt(x)), opened(tip, gape, turnAt(x))] : [p, tip];
      const t = cone(a, b, 0.013, { mat: MAT.tooth, sides: 7 });
      out.push(t, mirrorZ(t));
    }
  };
  row(12, 0.36, 0.97, 0.062, (x) => [x, LIP + 0.012, half(x) * 0.84], -1, false);
  row(11, 0.36, 0.95, 0.055, (x) => [x, LIP - 0.016, half(x) * 0.8], 1, true);
  row(8, 0.35, 0.8, 0.04, (x) => [x, LIP + 0.02, half(x) * 0.34], -1, false);
  return join(...out);
}

/** The eye: its `loc` is the way each point of it faces, its colour the way the eye looks. */
function eye(): Mesh {
  const b = ball(EYE, [0.056, 0.056, 0.056], { mat: MAT.eye, n: 22 });
  const axis = norm([0.7, 0.1, 0.71]);
  return { ...b, loc: b.pos.map((p) => norm(sub(p, EYE))), col: b.pos.map((): V3 => [axis[0] * 0.5 + 0.5, axis[1] * 0.5 + 0.5, axis[2] * 0.5 + 0.5]) };
}
function farEye(): Mesh {
  const b = ball([EYE[0], EYE[1], -EYE[2]], [0.056, 0.056, 0.056], { mat: MAT.eye, n: 22 });
  const axis = norm([0.7, 0.1, -0.71]);
  return { ...b, loc: b.pos.map((p) => norm(sub(p, [EYE[0], EYE[1], -EYE[2]]))), col: b.pos.map((): V3 => [axis[0] * 0.5 + 0.5, axis[1] * 0.5 + 0.5, axis[2] * 0.5 + 0.5]) };
}

/** The pink roof and floor of the mouth. */
function inside(g: number): Mesh[] {
  return [
    grid(40, 14, (u, v) => {
      const p = upper(u, v > 0.5 ? 1 : 0);
      const z = Math.abs(p[2]) * (1 - 2 * v) * 0.985;
      return { p: [p[0] * 0.995, LIP - 0.002 + 0.05 * Math.sin(v * Math.PI) * Math.sqrt(round(p[0])), z] };
    }, { mat: MAT.mouth }),
    grid(40, 14, (u, v) => {
      const p = lower(u, v > 0.5 ? 1 : 0);
      const q: V3 = [p[0] * 0.99, LIP + 0.001 - 0.04 * Math.sin(v * Math.PI) * Math.sqrt(round(p[0])), Math.abs(p[2]) * (1 - 2 * v) * 0.96];
      return { p: opened(q, g, turnAt(q[0])), loc: q };
    }, { mat: MAT.mouth }),
  ];
}

const heads = new Map<number, Mesh>();

/** The head with its jaws open by `gape` radians (the skull tips up by a share of it with `headAt`). */
export function headMesh(gape: number): Mesh {
  const key = Math.round(gape * 100);
  const have = heads.get(key);
  if (have) return have;
  const g = key / 100;
  const parts: Mesh[] = [
    grid(56, 40, (u, v) => ({ p: upper(u, v), uv: [xAt(u), arc(upper, u, v)] }), { mat: MAT.head }),
    grid(50, 34, (u, v) => {
      const p = lower(u, v);
      return { p: opened(p, g, turnAt(p[0])), loc: p, uv: [p[0], arc(lower, u, v)] };
    }, { mat: MAT.head }),
    eye(), farEye(),
    // A shut mouth shows nothing inside.
    ...(g > 0.015 ? [teeth(g), ...inside(g)] : []),
  ];
  if (g > 0.06) {
    // The corner of the mouth: skin stretched between the lips.
    const cheek = grid(16, 12, (u, v) => {
      const x = 0.0 + 0.33 * u;
      const a: V3 = [x, LIP, half(x) * 0.985];
      const b = opened([x, LIP, half(x) * 0.95], g, turnAt(x));
      const m = Math.sin(v * Math.PI);
      const p: V3 = [a[0] + (b[0] - a[0]) * v - 0.1 * m * u * Math.min(1, g * 1.5), a[1] + (b[1] - a[1]) * v, a[2] + (b[2] - a[2]) * v - 0.03 * m];
      return { p, loc: [0.24 + 0.3 * u, p[1], p[2]] };
    }, { mat: MAT.mouth });
    parts.push(cheek, mirrorZ(cheek));
  }
  const mesh = join(...parts);
  heads.set(key, mesh);
  return mesh;
}

/** The forked tongue, out by `k` (0..1), in head lengths. */
export function tongueMesh(k: number, wag: number): Mesh {
  const L = 0.06 + 0.46 * k;
  const root: V3 = [0.86, LIP, 0];
  const fork: V3 = [0.86 + L * 0.72, LIP - 0.03 + wag * 0.06 * k, 0];
  const parts = [tube(even(spline3([root, [Math.min(1.004, 0.86 + L * 0.6), LIP, 0], fork]), 12).pts, () => 0.014, { mat: MAT.paint, col: '#1c0d13', sides: 10 })];
  for (const s of [-1, 1]) {
    const tip: V3 = [0.86 + L, LIP + 0.02 + wag * 0.12 * k, s * 0.07];
    parts.push(tube(even(spline3([fork, [fork[0] + L * 0.14, fork[1] + wag * 0.02, s * 0.018], tip]), 8).pts, (u) => 0.011 * (1 - u * 0.85), { mat: MAT.paint, col: '#1c0d13', sides: 8 }));
  }
  return join(...parts);
}

export interface BodyOpts {
  /** The thickest radius, metres. */
  readonly girth: number;
  /** The neck's radius, metres. */
  readonly neck: number;
  readonly sides?: number;
  readonly rings?: number;
  /** A swallowed meal: where along (0..1), half its length, how much wider. */
  readonly lump?: { readonly at: number; readonly half: number; readonly more: number };
  readonly up?: V3;
  readonly level?: number;
  /** Where the body ends in the picture: it is cut off there (no taper), for a body that runs out of frame. */
  readonly endless?: boolean;
}

/** The body's radius at u (0 neck .. 1 tail's tip). */
export function girthAt(u: number, o: BodyOpts): number {
  const k = o.endless
    ? knots([[0, 0], [0.12, 0.2], [0.5, 1], [1, 1]], u)
    : knots([[0, 0], [0.06, 0.12], [0.2, 0.62], [0.42, 1], [0.6, 0.92], [0.8, 0.42], [0.92, 0], [1, 0]], u);
  let r = o.neck + (o.girth - o.neck) * k;
  if (!o.endless && u > 0.8) r *= knots([[0.8, 1], [0.9, 0.78], [0.97, 0.36], [1, 0.02]], u);
  if (o.lump) {
    const d = (u - o.lump.at) / o.lump.half;
    if (Math.abs(d) < 1) r *= 1 + o.lump.more * (0.5 + 0.5 * Math.cos(d * Math.PI)) ** 0.8;
  }
  return r;
}

export interface Boa {
  readonly body: Mesh;
  /** Puts the head (in head lengths) on the neck. */
  readonly head: M4;
  readonly length: number;
}

/**
 * A boa along `pts` (neck first). `reach` cuts the path to a length (metres).
 * The head, `size` metres long, points along the neck turned by yaw and
 * pitch, or straight at `face`.
 */
export function boaOn(pts: readonly V3[], size: number, o: BodyOpts & { readonly reach?: number; readonly face?: V3; readonly roll?: number }): Boa {
  const rings = o.rings ?? 220;
  const path = even(spline3(pts, 14), rings, o.reach);
  const total = path.length;
  const fr = frames([...path.pts].reverse(), o.up, o.level);
  const first = fr[fr.length - 1]!;
  const fwd = o.face ? norm(o.face) : first.t;
  let side = norm(cross(fwd, first.b));
  let up = cross(side, fwd);
  if (o.roll) {
    const [c, s] = [Math.cos(o.roll), Math.sin(o.roll)];
    [up, side] = [add(mul(up, c), mul(side, s)), add(mul(side, c), mul(up, -s))];
  }
  // The joint sits a little inside the head.
  const joint = path.pts[0]!;
  const m = basis(mul(fwd, size), mul(up, size), mul(side, size), sub(joint, mul(fwd, 0.1 * size)));
  // Built tail to head so the back stays up along the ground, then painted head to tail.
  const body = tube([...path.pts].reverse(), (u) => {
    // Slimmer where it starts inside the head, so head and neck cross without a rim.
    const d = ((1 - u) * total) / (size * 0.3);
    return girthAt(1 - u, o) * (d < 1 ? 0.7 + 0.3 * d * d * (3 - 2 * d) : 1);
  }, { mat: MAT.boa, sides: o.sides ?? 36, up: o.up, level: o.level });
  return { body, head: m, length: path.length };
}
