import { createRng } from '../../../../src/logic/rng';
import { even, knots, lerp3, norm, spline3, sub, type V3 } from '../gl/math';
import { ball, cone, grid, join, MAT, type Mesh, mirrorZ, tube } from '../gl/mesh';

/**
 * Cerrejonisuchus: a small crocodile relative, about 2 m, with a short blunt
 * snout. Metres: snout tip at x = 1, tail tip at x = -1, belly near y = 0,
 * facing +x; armour plates along the back, a crested tail, sprawling legs
 * with elbows, webbed toes and claws.
 */
const WIDE: readonly (readonly [number, number])[] = [[0.18, 0.112], [0.3, 0.122], [0.36, 0.13], [0.44, 0.15], [0.55, 0.15], [0.62, 0.12], [0.7, 0.075], [0.8, 0.05], [0.9, 0.03], [1, 0.006]];
const HIGH: readonly (readonly [number, number])[] = [[0.18, 0.086], [0.3, 0.092], [0.36, 0.1], [0.44, 0.112], [0.55, 0.108], [0.62, 0.092], [0.7, 0.07], [0.8, 0.052], [0.9, 0.034], [1, 0.006]];
const MID: readonly (readonly [number, number])[] = [[0.18, 0.162], [0.3, 0.166], [0.42, 0.155], [0.58, 0.145], [0.7, 0.11], [0.85, 0.07], [1, 0.035]];
const B0 = 0.2;

export interface CrocPose {
  /** The jaws' opening, radians. */
  readonly gape?: number;
  /** The tail's sideways swing, and its lift off the ground. */
  readonly swing?: number;
  readonly lift?: number;
  /** 0 standing on its feet .. 1 legs folded back along the body. */
  readonly fold?: number;
}

const mid = (u: number, o: CrocPose): V3 => {
  const t = Math.max(0, (u - 0.6) / 0.4);
  return [1 - 2 * u, knots(MID, u) + (o.lift ?? 0) * t * t, (o.swing ?? 0) * Math.sin(t * 2.4) * t];
};

function bodyMesh(o: CrocPose): Mesh {
  const parts: Mesh[] = [grid(90, 30, (a, v) => {
    const u = B0 - 0.03 + (1 - B0 + 0.03) * a;
    const c = mid(u, o);
    const ang = (v - 0.5) * Math.PI * 2;
    const w = knots(WIDE, u) * Math.sign(Math.sin(ang)) * Math.abs(Math.sin(ang)) ** 0.85;
    const y = Math.cos(ang);
    const h = knots(HIGH, u) * (y > 0 ? 1 : 0.92) * Math.sign(y) * Math.abs(y) ** 0.85;
    return { p: [c[0], c[1] + h, c[2] + w], uv: [u, ang] };
  }, { mat: MAT.croc, wrap: true })];
  // The plates along the back, then the tail's saw of crests.
  // Low keels standing along the rows, uneven in size and spacing.
  const rng = createRng(414);
  for (const k of [-0.74, -0.46, -0.16, 0.16, 0.46, 0.74]) {
    for (let u = 0.225 + rng() * 0.02; u < 0.72; u += 0.024 + rng() * 0.016) {
      const c = mid(u, o);
      const x = knots(WIDE, u) * k;
      const y = c[1] + knots(HIGH, u) * Math.sqrt(1 - k * k * 0.85);
      const size = (0.011 + 0.011 * rng()) * (1 - Math.abs(k) * 0.4);
      parts.push(ball([c[0], y - 0.004, c[2] + x], [0.021 + 0.008 * rng(), size, 0.011], { mat: MAT.paint, col: ['#6b5230', '#5a4426', '#7a6038'][Math.floor(rng() * 3)]!, n: 8 }));
    }
  }
  for (let i = 0; i < 14; i++) {
    const u = 0.73 + i * 0.0185;
    const c = mid(u, o);
    const y = c[1] + knots(HIGH, u);
    const size = (0.044 + 0.014 * Math.abs(Math.sin(i * 2.7))) * (1 - Math.max(0, (u - 0.85) / 0.17) * 0.6);
    parts.push(cone([c[0] + 0.008, y - 0.015, c[2]], [c[0] - 0.02, y + size, c[2]], 0.026, { mat: MAT.paint, col: '#553d20', sides: 6 }));
  }
  return join(...parts);
}

/** A leg on the near (+z) side, hip at `hip`, knee, ankle and foot; `toes` long. */
function leg(hip: V3, knee: V3, ankle: V3, foot: V3, r: number, toes: number): Mesh {
  const path = even(spline3([hip, lerp3(hip, knee, 0.5), knee, lerp3(knee, ankle, 0.6), ankle]), 18).pts;
  const limb = tube(path, (u) => r * (u < 0.5 ? 1.15 - 0.6 * u : 0.85 - 0.5 * (u - 0.5)), { mat: MAT.croc, sides: 14, level: 0.1 });
  const skin = (m: Mesh): Mesh => ({ ...m, uv: m.uv.map((x): [number, number] => [0.5 + x[0] * 0.012, 1.62 + 0.3 * Math.sin(x[1])]) });
  const parts: Mesh[] = [skin(limb), skin(tube([ankle, lerp3(ankle, foot, 0.5), foot], (u) => r * (0.55 - 0.12 * u), { mat: MAT.croc, sides: 12, squash: 0.7 }))];
  const f = norm(sub(foot, ankle));
  for (let i = 0; i < toes; i++) {
    const a = ((i / (toes - 1)) - 0.5) * 1.5;
    const d: V3 = [f[0] * Math.cos(a) - f[2] * Math.sin(a), 0, f[0] * Math.sin(a) + f[2] * Math.cos(a)];
    const tip: V3 = [foot[0] + d[0] * 0.085, Math.max(0.012, foot[1] - 0.012), foot[2] + d[2] * 0.085];
    const t = tube([foot, lerp3(foot, tip, 0.55), tip], (u) => r * (0.3 - 0.12 * u), { mat: MAT.croc, sides: 8 });
    parts.push({ ...t, uv: t.uv.map((): [number, number] => [0.53, 1.6]) });
    parts.push(cone([tip[0] - d[0] * 0.01, tip[1], tip[2] - d[2] * 0.01], [tip[0] + d[0] * 0.034, tip[1] - 0.008, tip[2] + d[2] * 0.034], 0.009, { mat: MAT.paint, col: '#1f1a10', sides: 6 }));
  }
  return join(...parts);
}

function legs(fold: number): Mesh {
  const l = (a: V3, b: V3): V3 => lerp3(a, b, fold);
  const front = leg([0.3, 0.15, 0.09], l([0.2, 0.15, 0.27], [0.12, 0.13, 0.17]), l([0.31, 0.045, 0.31], [-0.04, 0.12, 0.17]), l([0.37, 0.016, 0.33], [-0.1, 0.12, 0.17]), 0.052, 5);
  const hind = leg([-0.2, 0.13, 0.08], l([-0.09, 0.18, 0.27], [-0.33, 0.12, 0.13]), l([-0.25, 0.06, 0.3], [-0.52, 0.11, 0.12]), l([-0.17, 0.018, 0.36], [-0.62, 0.1, 0.12]), 0.066, 4);
  return join(front, hind, mirrorZ(front), mirrorZ(hind));
}

const HW: readonly (readonly [number, number])[] = [[0, 0.104], [0.06, 0.128], [0.13, 0.13], [0.2, 0.1], [0.26, 0.082], [0.32, 0.076], [0.36, 0.074], [0.4, 0.07]];
const HT: readonly (readonly [number, number])[] = [[0, 0.078], [0.08, 0.096], [0.15, 0.085], [0.2, 0.06], [0.27, 0.046], [0.35, 0.044], [0.4, 0.04]];
const HB: readonly (readonly [number, number])[] = [[0, 0.074], [0.08, 0.074], [0.18, 0.05], [0.3, 0.036], [0.4, 0.03]];
const HEAD_X = 0.6;
const LIPY = 0.158;
const cap = (x: number): number => (x < 0.345 ? 1 : Math.sqrt(Math.max(0, 1 - ((x - 0.345) / 0.055) ** 2)));
/** The croc's smile: the tooth line waves. */
const wave = (x: number): number => 0.012 * Math.sin(x * 26 + 0.6) * Math.min(1, x / 0.1) + 0.022 * Math.max(0, 1 - x / 0.12);

function headMesh(gape: number): Mesh {
  const tip = (p: V3): V3 => {
    const [c, s] = [Math.cos(gape), Math.sin(gape)];
    const [x, y] = [p[0] - HEAD_X - 0.05, p[1] - LIPY];
    return [HEAD_X + 0.05 + x * c + y * s, LIPY + y * c - x * s, p[2]];
  };
  const raise = (p: V3): V3 => {
    const a = gape * 0.35;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const [x, y] = [p[0] - HEAD_X - 0.05, p[1] - LIPY];
    return [HEAD_X + 0.05 + x * c - y * s, LIPY + y * c + x * s, p[2]];
  };
  const xx = (u: number): number => 0.4 * (1 - (1 - u) ** 1.5);
  const up = (u: number, v: number, roof = false): V3 => {
    const x = xx(u);
    const a = v * Math.PI;
    const s = roof ? 0.15 : Math.sin(a) ** 0.7;
    const z = knots(HW, x) * cap(x) * Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.6;
    const nose = 0.012 * Math.exp(-(((x - 0.36) / 0.025) ** 2));
    return [HEAD_X + x, LIPY + wave(x) + (knots(HT, x) * Math.sqrt(cap(x)) + nose) * s, z];
  };
  const low = (u: number, v: number, floor = false): V3 => {
    const x = xx(u) * 0.98;
    const a = v * Math.PI;
    const s = floor ? 0.1 : Math.sin(a) ** 0.75;
    const z = knots(HW, x) * 0.94 * cap(x) * Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.7;
    return [HEAD_X + x, LIPY - 0.004 + wave(x) - knots(HB, x) * Math.sqrt(cap(x)) * s, z];
  };
  const skin = (m: Mesh, y: number): Mesh => ({ ...m, uv: m.uv.map((x): [number, number] => [0.1 + x[0] * 0.14, y > 0 ? x[1] : x[1]]) });
  const parts: Mesh[] = [
    skin(grid(40, 26, (u, v) => ({ p: raise(up(u, v)), uv: [u, (v - 0.5) * 3.2] }), { mat: MAT.croc }), 1),
    grid(30, 8, (u, v) => ({ p: raise(up(u, v, true)), loc: [0.5, v, u] }), { mat: MAT.mouth }),
    skin(grid(36, 22, (u, v) => ({ p: tip(low(u, v)), uv: [u, 2.0 + 1.1 * Math.sin(v * Math.PI)] }), { mat: MAT.croc }), 1),
    grid(30, 8, (u, v) => ({ p: tip(low(u, v, true)), loc: [0.5, v, u] }), { mat: MAT.mouth }),
  ];
  for (let i = 0; i < 11; i++) {
    const x = 0.1 + i * 0.027;
    const z = knots(HW, x) * cap(x) * 0.97;
    const y = LIPY + wave(x);
    const a = cone(raise([HEAD_X + x, y + 0.008, z]), raise([HEAD_X + x + 0.002, y - 0.026 - 0.008 * (i % 3), z * 1.03]), 0.0085, { mat: MAT.tooth, sides: 7 });
    const b = cone(tip([HEAD_X + x + 0.013, y - 0.008, z * 0.97]), tip([HEAD_X + x + 0.013, y + 0.02, z * 1.0]), 0.0075, { mat: MAT.tooth, sides: 7 });
    parts.push(a, mirrorZ(a), b, mirrorZ(b));
  }
  // The eyes, up on their bumps, and the nostrils.
  const e: V3 = raise([HEAD_X + 0.17, LIPY + 0.076, 0.07]);
  const eye = ball(e, [0.023, 0.023, 0.02], { mat: MAT.eye, n: 16 });
  const ax = norm([0.35, 0.1, 0.93]);
  const ey: Mesh = { ...eye, loc: eye.pos.map((p) => norm(sub(p, e))), col: eye.pos.map((): V3 => [ax[0] * 0.5 + 0.5, ax[1] * 0.5 + 0.5, ax[2] * 0.5 + 0.5]) };
  const other: Mesh = { ...mirrorZ(ey), loc: ey.loc.map((p): V3 => [p[0], p[1], -p[2]]), col: ey.col.map((c): V3 => [c[0], c[1], 1 - c[2]]) };
  const brow = ball([e[0] - 0.012, e[1] + 0.001, e[2] - 0.02], [0.05, 0.034, 0.033], { mat: MAT.croc, n: 14 });
  const bb: Mesh = { ...brow, uv: brow.uv.map((): [number, number] => [0.2, 0.4]) };
  const nos = ball(raise([HEAD_X + 0.365, LIPY + 0.058, 0.026]), [0.009, 0.005, 0.007], { mat: MAT.paint, col: '#120e08', n: 8 });
  return join(...parts, ey, other, bb, mirrorZ(bb), nos, mirrorZ(nos));
}

export function crocMesh(o: CrocPose = {}): Mesh {
  return join(bodyMesh(o), legs(o.fold ?? 0), headMesh(o.gape ?? 0.08));
}

