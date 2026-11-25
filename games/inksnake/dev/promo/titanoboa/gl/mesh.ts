import { add, apply, cross, type M4, mul, norm, sub, turn, type V3 } from './math';

/**
 * Meshes for the painted models: every vertex has a place, a normal, (u, v)
 * along and round it, its place in the model (`loc`, for painting by place),
 * a colour and a material (MAT).
 */
export const MAT = {
  paint: 0, boa: 1, head: 2, mouth: 3, tooth: 4, eye: 5, croc: 6, fish: 7, glass: 8, bone: 9, rock: 10, cloth: 11, gloss: 12, glow: 13, bus: 14, fin: 15, rubber: 16, swamp: 17,
} as const;
export type Mat = (typeof MAT)[keyof typeof MAT];

export interface Mesh {
  readonly pos: readonly V3[];
  readonly nor: readonly V3[];
  readonly uv: readonly (readonly [number, number])[];
  readonly loc: readonly V3[];
  readonly col: readonly V3[];
  readonly mat: readonly number[];
  readonly tri: readonly number[];
}

export const hex = (c: string): V3 => {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export interface Vert {
  readonly p: V3;
  readonly uv?: readonly [number, number];
  readonly loc?: V3;
  readonly col?: V3;
}

export interface GridOpts {
  readonly mat: Mat;
  readonly col?: string;
  /** The last column is the first again (its normals are joined). */
  readonly wrap?: boolean;
  readonly flip?: boolean;
}

/** A sheet of (nu + 1) × (nv + 1) points, with smooth normals. */
export function grid(nu: number, nv: number, at: (u: number, v: number) => Vert, o: GridOpts): Mesh {
  const base = hex(o.col ?? '#888888');
  const verts: Vert[] = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) verts.push(at(i / nu, j / nv));
  const tri: number[] = [];
  const id = (i: number, j: number): number => i * (nv + 1) + j;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const [a, b, c, d] = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
      if (o.flip) tri.push(a, c, b, a, d, c);
      else tri.push(a, b, c, a, c, d);
    }
  }
  const acc = verts.map((): [number, number, number] => [0, 0, 0]);
  for (let k = 0; k < tri.length; k += 3) {
    const [a, b, c] = [tri[k]!, tri[k + 1]!, tri[k + 2]!];
    const n = cross(sub(verts[b]!.p, verts[a]!.p), sub(verts[c]!.p, verts[a]!.p));
    for (const q of [a, b, c]) for (let x = 0; x < 3; x++) acc[q]![x]! += n[x]!;
  }
  if (o.wrap) {
    for (let i = 0; i <= nu; i++) {
      const s = add(acc[id(i, 0)]!, acc[id(i, nv)]!);
      acc[id(i, 0)] = [...s] as [number, number, number];
      acc[id(i, nv)] = [...s] as [number, number, number];
    }
  }
  // Points that fall together (poles) share a normal.
  for (const row of [0, nu]) {
    const first = verts[id(row, 0)]!.p;
    const same = Array.from({ length: nv + 1 }, (_, j) => id(row, j)).every((q) => Math.hypot(...sub(verts[q]!.p, first)) < 1e-6);
    if (!same) continue;
    const s = Array.from({ length: nv + 1 }, (_, j) => acc[id(row, j)]!).reduce((x, y) => add(x, y) as [number, number, number], [0, 0, 0] as [number, number, number]);
    for (let j = 0; j <= nv; j++) acc[id(row, j)] = [...s] as [number, number, number];
  }
  return {
    pos: verts.map((x) => x.p), nor: acc.map((n) => norm(n)), uv: verts.map((x) => x.uv ?? [0, 0]), loc: verts.map((x) => x.loc ?? x.p),
    col: verts.map((x) => x.col ?? base), mat: verts.map(() => o.mat), tri,
  };
}

export function join(...ms: readonly Mesh[]): Mesh {
  const tri: number[] = [];
  let n = 0;
  for (const m of ms) {
    for (const t of m.tri) tri.push(t + n);
    n += m.pos.length;
  }
  return {
    pos: ms.flatMap((m) => m.pos), nor: ms.flatMap((m) => m.nor), uv: ms.flatMap((m) => m.uv), loc: ms.flatMap((m) => m.loc),
    col: ms.flatMap((m) => m.col), mat: ms.flatMap((m) => m.mat), tri,
  };
}

/** A mesh moved by m; its `loc` stays where it was painted. */
export const place = (m: M4, x: Mesh): Mesh => ({ ...x, pos: x.pos.map((p) => apply(m, p)), nor: x.nor.map((n) => norm(turn(m, n))) });
/** The other side's copy, z turned over. */
export const mirrorZ = (x: Mesh): Mesh => {
  const f = (p: V3): V3 => [p[0], p[1], -p[2]];
  const tri: number[] = [];
  for (let k = 0; k < x.tri.length; k += 3) tri.push(x.tri[k]!, x.tri[k + 2]!, x.tri[k + 1]!);
  return { ...x, pos: x.pos.map(f), nor: x.nor.map(f), loc: x.loc.map(f), tri };
};

/** A signed power; the sines that should be 0 are 0, or a box would crack along its seam. */
const spow = (x: number, e: number): number => (Math.abs(x) < 1e-9 ? 0 : Math.sign(x) * Math.abs(x) ** e);

/** A ball (e = 1) or a rounded box (e → 0), half sizes r, round `c`. */
export function ball(c: V3, r: V3, o: GridOpts & { readonly e?: number; readonly ez?: number; readonly n?: number; readonly poleX?: boolean }): Mesh {
  if (o.poleX) {
    // The same ball made lying down, so its poles are fore and aft.
    const m = ball([c[1], c[0], c[2]], [r[1], r[0], r[2]], { ...o, poleX: false });
    const s = (p: V3): V3 => [p[1], p[0], p[2]];
    return { ...m, pos: m.pos.map(s), nor: m.nor.map(s), loc: m.loc.map(s) };
  }
  const e = o.e ?? 1;
  const n = o.n ?? (e < 0.6 ? 36 : 20);
  // Spread the points to the corners of a box.
  const warp = (a: number): number => (e < 0.6 ? a - (0.22 * Math.sin(4 * a)) / 1 : a);
  const nor: V3[] = [];
  const ez = o.ez ?? e;
  const m = grid(n, n * 2, (u, v) => {
    const a = warp((u - 0.5) * Math.PI);
    const b = warp(v * Math.PI * 2);
    const cb = Math.abs(Math.cos(a)) ** (2 - e);
    nor.push(norm([(cb * spow(Math.cos(b), 2 - ez)) / r[0], spow(Math.sin(a), 2 - e) / r[1], (cb * spow(Math.sin(b), 2 - ez)) / r[2]]));
    const ca = spow(Math.cos(a), e);
    const p: V3 = [c[0] + r[0] * ca * spow(Math.cos(b), o.ez ?? e), c[1] + r[1] * spow(Math.sin(a), e), c[2] + r[2] * ca * spow(Math.sin(b), o.ez ?? e)];
    return { p, uv: [u, v] };
  }, { ...o, wrap: true, flip: !o.flip });
  return { ...m, nor };
}

export interface TubeOpts extends GridOpts {
  readonly sides?: number;
  /** Which way the back of the tube is at its first point. */
  readonly up?: V3;
  /** How hard the back is pulled towards `up` along the way (0 never). */
  readonly level?: number;
  /** The section's height against its width. */
  readonly squash?: number;
  /** Paint u along the tube starts here. */
  readonly u0?: number;
  readonly cap?: boolean;
}

/** The moving frame along a path: forward, up (the back) and side at each point. */
export function frames(path: readonly V3[], up: V3 = [0, 1, 0], level = 0.25): { readonly t: V3; readonly b: V3; readonly s: V3 }[] {
  const out: { t: V3; b: V3; s: V3 }[] = [];
  let back = up;
  path.forEach((_, i) => {
    const t = norm(sub(path[Math.min(path.length - 1, i + 1)]!, path[Math.max(0, i - 1)]!));
    const flat = 1 - Math.abs(t[0] * up[0] + t[1] * up[1] + t[2] * up[2]);
    back = norm(add(back, mul(up, level * flat)));
    const s = norm(cross(t, back));
    back = cross(s, t);
    out.push({ t, b: back, s });
  });
  return out;
}

/** A tube along a path: u = ∫ds / r (so scales keep their shape), v = the angle from the back, −π..π. */
export function tube(path: readonly V3[], radius: (u: number, i: number) => number, o: TubeOpts): Mesh {
  const n = path.length - 1;
  const fr = frames(path, o.up, o.level);
  const rs = path.map((_, i) => Math.max(0.0005, radius(i / n, i)));
  const us = [o.u0 ?? 0];
  for (let i = 1; i <= n; i++) us.push(us[i - 1]! + Math.hypot(...sub(path[i]!, path[i - 1]!)) / Math.max(0.02, (rs[i]! + rs[i - 1]!) / 2));
  const sq = o.squash ?? 1;
  return grid(n, o.sides ?? 24, (uu, vv) => {
    const i = Math.round(uu * n);
    const a = (vv - 0.5) * Math.PI * 2;
    const f = fr[i]!;
    const p = add(path[i]!, add(mul(f.b, rs[i]! * Math.cos(a) * sq), mul(f.s, rs[i]! * Math.sin(a))));
    return { p, uv: [us[i]!, a], loc: [uu, Math.cos(a), Math.sin(a)] };
  }, { ...o, wrap: true, flip: !o.flip });
}

/** A cone from `a` to its tip `b`. */
export function cone(a: V3, b: V3, r: number, o: GridOpts & { readonly sides?: number }): Mesh {
  return tube([a, [a[0] + (b[0] - a[0]) * 0.5, a[1] + (b[1] - a[1]) * 0.5, a[2] + (b[2] - a[2]) * 0.5], b], (u) => r * (1 - u), { ...o, sides: o.sides ?? 8, up: [0.13, 0.2, 0.97], level: 0 });
}

/** A flat outline (x, y) pushed out from z0 to z1, with square edges. */
export function slab(outline: readonly (readonly [number, number])[], z0: number, z1: number, o: GridOpts): Mesh {
  const n = outline.length;
  const base = hex(o.col ?? '#888888');
  const pos: V3[] = [];
  const nor: V3[] = [];
  const tri: number[] = [];
  const quad = (a: V3, b: V3, c: V3, d: V3, nn: V3): void => {
    const s = pos.length;
    pos.push(a, b, c, d);
    nor.push(nn, nn, nn, nn);
    tri.push(s, s + 1, s + 2, s, s + 2, s + 3);
  };
  for (let i = 0; i < n; i++) {
    const [p, q] = [outline[i]!, outline[(i + 1) % n]!];
    quad([p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], norm([q[1] - p[1], -(q[0] - p[0]), 0]));
  }
  // Fan from the middle: the outlines used are all star-shaped round it.
  const mid: readonly [number, number] = [outline.reduce((s, p) => s + p[0], 0) / n, outline.reduce((s, p) => s + p[1], 0) / n];
  for (const [z, s] of [[z0, -1], [z1, 1]] as const) {
    for (let i = 0; i < n; i++) {
      const [p, q] = [outline[i]!, outline[(i + 1) % n]!];
      const k = pos.length;
      pos.push([mid[0], mid[1], z], [p[0], p[1], z], [q[0], q[1], z]);
      nor.push([0, 0, s], [0, 0, s], [0, 0, s]);
      tri.push(k, k + 1, k + 2);
    }
  }
  return { pos, nor, uv: pos.map((p) => [p[0], p[1]]), loc: pos, col: pos.map(() => base), mat: pos.map(() => o.mat), tri };
}
