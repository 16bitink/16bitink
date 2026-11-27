/**
 * Reeds–Shepp paths: the shortest ways a car with a smallest turning radius can get from one pose to another going
 * forward and in reverse (Reeds & Shepp 1990). Used for parking, driveways and three-point turns.
 *
 * Ported to TypeScript from PythonRobotics, PathPlanning/ReedsSheppPath/reeds_shepp_path_planning.py
 * (Atsushi Sakai, Videh Patel), MIT License, Copyright (c) 2016 - now Atsushi Sakai and other contributors,
 * https://github.com/AtsushiSakai/PythonRobotics. The word functions and their four symmetries (time flip,
 * reflection) are theirs, unchanged; the sampling is ours (rear axle, our heading convention, curvature per sample).
 *
 * Lengths in a word are in units of the radius (arcs: radians); negative = reverse. Pure.
 */
import { STEP, type Pose, type Pt5 } from './path';

export type Steer = 'L' | 'S' | 'R';
export interface RsPath {
  /** Signed lengths in radius units (arcs in radians), one per element. */
  readonly lengths: readonly number[];
  readonly ctypes: readonly Steer[];
  /** Sum of |lengths|, radius units. */
  readonly total: number;
}

type Word = (x: number, y: number, phi: number) => [number[], Steer[]] | null;

const PI = Math.PI;

/** As C's fmod-based mod2pi in the reference: into -π..π. */
function mod2pi(x: number): number {
  const m = Math.sign(x) * 2 * PI || 2 * PI;
  let v = x - m * Math.floor(x / m);
  if (v < -PI) v += 2 * PI;
  else if (v > PI) v -= 2 * PI;
  return v;
}

const polar = (x: number, y: number): [number, number] => [Math.hypot(x, y), Math.atan2(y, x)];

const LSL: Word = (x, y, phi) => {
  const [u, t] = polar(x - Math.sin(phi), y - 1 + Math.cos(phi));
  if (t >= 0 && t <= PI) {
    const v = mod2pi(phi - t);
    if (v >= 0 && v <= PI) return [[t, u, v], ['L', 'S', 'L']];
  }
  return null;
};

const LSR: Word = (x, y, phi) => {
  const [r, t1] = polar(x + Math.sin(phi), y - 1 - Math.cos(phi));
  const u1 = r * r;
  if (u1 >= 4) {
    const u = Math.sqrt(u1 - 4);
    const t = mod2pi(t1 + Math.atan2(2, u));
    const v = mod2pi(t - phi);
    if (t >= 0 && v >= 0) return [[t, u, v], ['L', 'S', 'R']];
  }
  return null;
};

const LxRxL: Word = (x, y, phi) => {
  const [u1, theta] = polar(x - Math.sin(phi), y - 1 + Math.cos(phi));
  if (u1 <= 4) {
    const A = Math.acos(0.25 * u1);
    const t = mod2pi(A + theta + PI / 2);
    const u = mod2pi(PI - 2 * A);
    const v = mod2pi(phi - t - u);
    return [[t, -u, v], ['L', 'R', 'L']];
  }
  return null;
};

const LxRL: Word = (x, y, phi) => {
  const [u1, theta] = polar(x - Math.sin(phi), y - 1 + Math.cos(phi));
  if (u1 <= 4) {
    const A = Math.acos(0.25 * u1);
    const t = mod2pi(A + theta + PI / 2);
    const u = mod2pi(PI - 2 * A);
    const v = mod2pi(-phi + t + u);
    return [[t, -u, -v], ['L', 'R', 'L']];
  }
  return null;
};

const LRxL: Word = (x, y, phi) => {
  const [u1, theta] = polar(x - Math.sin(phi), y - 1 + Math.cos(phi));
  if (u1 <= 4) {
    const u = Math.acos(1 - u1 * u1 * 0.125);
    const A = Math.asin((2 * Math.sin(u)) / u1);
    const t = mod2pi(-A + theta + PI / 2);
    const v = mod2pi(t - u - phi);
    return [[t, u, -v], ['L', 'R', 'L']];
  }
  return null;
};

const LRxLR: Word = (x, y, phi) => {
  const [u1, theta] = polar(x + Math.sin(phi), y - 1 - Math.cos(phi));
  if (u1 <= 2) {
    const A = Math.acos((u1 + 2) * 0.25);
    const t = mod2pi(theta + A + PI / 2);
    const u = mod2pi(A);
    const v = mod2pi(phi - t + 2 * u);
    if (t >= 0 && u >= 0 && v >= 0) return [[t, u, -u, -v], ['L', 'R', 'L', 'R']];
  }
  return null;
};

const LxRLxR: Word = (x, y, phi) => {
  const [u1, theta] = polar(x + Math.sin(phi), y - 1 - Math.cos(phi));
  const u2 = (20 - u1 * u1) / 16;
  if (u2 >= 0 && u2 <= 1) {
    const u = Math.acos(u2);
    const A = Math.asin((2 * Math.sin(u)) / u1);
    const t = mod2pi(theta + A + PI / 2);
    const v = mod2pi(t - phi);
    if (t >= 0 && v >= 0) return [[t, -u, -u, v], ['L', 'R', 'L', 'R']];
  }
  return null;
};

const LxR90SL: Word = (x, y, phi) => {
  const [u1, theta] = polar(x - Math.sin(phi), y - 1 + Math.cos(phi));
  if (u1 >= 2) {
    const u = Math.sqrt(u1 * u1 - 4) - 2;
    const A = Math.atan2(2, Math.sqrt(u1 * u1 - 4));
    const t = mod2pi(theta + A + PI / 2);
    const v = mod2pi(t - phi + PI / 2);
    if (t >= 0 && v >= 0) return [[t, -PI / 2, -u, -v], ['L', 'R', 'S', 'L']];
  }
  return null;
};

const LSR90xL: Word = (x, y, phi) => {
  const [u1, theta] = polar(x - Math.sin(phi), y - 1 + Math.cos(phi));
  if (u1 >= 2) {
    const u = Math.sqrt(u1 * u1 - 4) - 2;
    const A = Math.atan2(Math.sqrt(u1 * u1 - 4), 2);
    const t = mod2pi(theta - A + PI / 2);
    const v = mod2pi(t - phi - PI / 2);
    if (t >= 0 && v >= 0) return [[t, u, PI / 2, -v], ['L', 'S', 'R', 'L']];
  }
  return null;
};

const LxR90SR: Word = (x, y, phi) => {
  const [u1, theta] = polar(x + Math.sin(phi), y - 1 - Math.cos(phi));
  if (u1 >= 2) {
    const t = mod2pi(theta + PI / 2);
    const u = u1 - 2;
    const v = mod2pi(phi - t - PI / 2);
    if (t >= 0 && v >= 0) return [[t, -PI / 2, -u, -v], ['L', 'R', 'S', 'R']];
  }
  return null;
};

const LSL90xR: Word = (x, y, phi) => {
  const [u1, theta] = polar(x + Math.sin(phi), y - 1 - Math.cos(phi));
  if (u1 >= 2) {
    const t = mod2pi(theta);
    const u = u1 - 2;
    const v = mod2pi(phi - t - PI / 2);
    if (t >= 0 && v >= 0) return [[t, u, PI / 2, -v], ['L', 'S', 'L', 'R']];
  }
  return null;
};

const LxR90SL90xR: Word = (x, y, phi) => {
  const [u1, theta] = polar(x + Math.sin(phi), y - 1 - Math.cos(phi));
  if (u1 >= 4) {
    const u = Math.sqrt(u1 * u1 - 4) - 4;
    const A = Math.atan2(2, Math.sqrt(u1 * u1 - 4));
    const t = mod2pi(theta + A + PI / 2);
    const v = mod2pi(t - phi);
    if (t >= 0 && v >= 0) return [[t, -PI / 2, -u, -PI / 2, v], ['L', 'R', 'S', 'L', 'R']];
  }
  return null;
};

/** In the reference's order (CSC, CCC, CCCC, CCSC, CSCC, CCSCC). */
const WORDS: readonly Word[] = [LSL, LSR, LxRxL, LxRL, LRxL, LRxLR, LxRLxR, LxR90SL, LxR90SR, LSR90xL, LSL90xR, LxR90SL90xR];

const flipSteer = (c: Steer): Steer => (c === 'L' ? 'R' : c === 'R' ? 'L' : 'S');

/** Adds a candidate unless the same word of about the same length is in, or it is too short (the reference's set_path). */
function add(out: RsPath[], lengths: number[], ctypes: Steer[], step: number): void {
  const total = lengths.reduce((s, l) => s + Math.abs(l), 0);
  if (total <= step) return;
  if (out.some((p) => p.ctypes.join('') === ctypes.join('') && p.total - total <= step)) return;
  out.push({ lengths, ctypes, total });
}

/**
 * Every Reeds–Shepp candidate from q0 to q1 with curvature `kappa` (1/radius), in radius units; `step` (px) is the
 * reference's step size. As the reference's generate_path: each word, then its time flip, reflection and both.
 */
export function rsCandidates(q0: Pose, q1: Pose, kappa: number, step = STEP): RsPath[] {
  const dx = q1.x - q0.x, dy = q1.y - q0.y, dth = q1.th - q0.th;
  const c = Math.cos(q0.th), s = Math.sin(q0.th);
  const x = (c * dx + s * dy) * kappa, y = (-s * dx + c * dy) * kappa;
  const st = step * kappa;
  const out: RsPath[] = [];
  const ok = (l: number[]): boolean => !l.some((d) => 0.1 * l.reduce((a, b) => a + Math.abs(b), 0) < Math.abs(d) && Math.abs(d) < st);
  for (const w of WORDS) {
    const a = w(x, y, dth);
    if (a && ok(a[0])) add(out, a[0], a[1], st);
    const b = w(-x, y, -dth);
    if (b && ok(b[0])) add(out, b[0].map((d) => -d), b[1], st);
    const r = w(x, -y, -dth);
    if (r && ok(r[0])) add(out, r[0], r[1].map(flipSteer), st);
    const br = w(-x, -y, dth);
    if (br && ok(br[0])) add(out, br[0].map((d) => -d), br[1].map(flipSteer), st);
  }
  return out;
}

/** The shortest candidate, or null. */
export function rsShortest(q0: Pose, q1: Pose, kappa: number, step = STEP): RsPath | null {
  const all = rsCandidates(q0, q1, kappa, step);
  return all.length === 0 ? null : all.reduce((a, b) => (b.total < a.total ? b : a));
}

/** One gear's run of samples, as `pathOf` (path.ts) takes them. */
export interface Run { readonly dir: 1 | -1; readonly pts: readonly Pt5[] }

/**
 * Samples a candidate from q0 in plan px (radius 1/kappa): one run per element (pathOf merges same-gear runs).
 * `vcap`: the speed cap for each sample by gear.
 */
export function rsSample(q0: Pose, p: RsPath, kappa: number, vcap: { fwd: number; rev: number }): Run[] {
  const runs: Run[] = [];
  let x = q0.x, y = q0.y, th = q0.th;
  p.lengths.forEach((len, i) => {
    const type = p.ctypes[i]!;
    const dir: 1 | -1 = len >= 0 ? 1 : -1;
    const dist = Math.abs(len) / kappa;
    const k = type === 'L' ? kappa : type === 'R' ? -kappa : 0;
    const n = Math.max(1, Math.ceil(dist / STEP));
    const pts: Pt5[] = [];
    for (let j = 0; j <= n; j++) pts.push({ ...advance(x, y, th, k, (dir * dist * j) / n), k, vcap: dir === 1 ? vcap.fwd : vcap.rev });
    const end = pts[pts.length - 1]!;
    x = end.x; y = end.y; th = end.th;
    runs.push({ dir, pts });
  });
  return runs;
}

/** The rear axle after a signed distance d on curvature k (exact arc). */
export function advance(x: number, y: number, th: number, k: number, d: number): { x: number; y: number; th: number } {
  // The chord of the arc, along its middle heading: no cancellation when k is tiny (a nearly straight wheel).
  const half = (k * d) / 2;
  const chord = Math.abs(half) < 1e-8 ? d : (d * Math.sin(half)) / half;
  return { x: x + chord * Math.cos(th + half), y: y + chord * Math.sin(th + half), th: th + k * d };
}

/** Where a candidate ends (for checks). */
export function rsEnd(q0: Pose, p: RsPath, kappa: number): Pose {
  let q = { x: q0.x, y: q0.y, th: q0.th };
  p.lengths.forEach((len, i) => {
    const t = p.ctypes[i]!;
    q = advance(q.x, q.y, q.th, t === 'L' ? kappa : t === 'R' ? -kappa : 0, len / kappa);
  });
  return q;
}
