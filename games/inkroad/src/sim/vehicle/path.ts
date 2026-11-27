/**
 * Reference paths for the rear axle (docs/inkroad-vehicle-model.md "Reference paths"). A path is a list of legs; a
 * leg is driven in one gear (dir +1 forward, -1 reverse) and ends with a stop (a cusp, or the end). Each leg is
 * sampled densely: position, the car's heading (the body's, also in reverse), the steering curvature κ (θ̇ = v·κ for
 * a signed v, so a left arc is κ > 0 in both gears) and the unsigned length along. Pure and immutable.
 */

export interface Pose { readonly x: number; readonly y: number; readonly th: number }

export interface Leg {
  readonly dir: 1 | -1;
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  readonly ths: Float64Array;
  readonly ks: Float64Array;
  /** Length along at each sample, from 0. */
  readonly ss: Float64Array;
  readonly len: number;
  /** Speed cap at each sample, played px/s (the lane's limit, the manoeuvre pace). */
  readonly vcap: Float64Array;
}

export interface RefPath { readonly legs: readonly Leg[] }

/** A sample being built. */
export interface Pt5 { readonly x: number; readonly y: number; readonly th: number; readonly k: number; readonly vcap: number }

/** Px between samples of a reference leg. */
export const STEP = 0.5;

export function legOf(dir: 1 | -1, pts: readonly Pt5[]): Leg {
  const n = pts.length;
  const xs = new Float64Array(n), ys = new Float64Array(n), ths = new Float64Array(n), ks = new Float64Array(n), ss = new Float64Array(n), vcap = new Float64Array(n);
  pts.forEach((p, i) => {
    xs[i] = p.x; ys[i] = p.y; ths[i] = p.th; ks[i] = p.k; vcap[i] = p.vcap;
    ss[i] = i === 0 ? 0 : ss[i - 1]! + Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y);
  });
  return { dir, xs, ys, ths, ks, ss, len: n > 0 ? ss[n - 1]! : 0, vcap };
}

export const unwrapTo = (ref: number, a: number): number => ref + Math.atan2(Math.sin(a - ref), Math.cos(a - ref));

/** Samples of a polyline (heading from its direction of travel, curvature from heading change), every STEP px. */
export function samplePolyline(line: readonly { x: number; y: number }[], vcap: number, dir: 1 | -1 = 1): Pt5[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / STEP));
    for (let j = i === 1 ? 0 : 1; j <= n; j++) out.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n });
  }
  return withHeadings(out, vcap, dir);
}

/** Heading and curvature of dense points: heading from a centred difference, κ from heading change over a window. */
function withHeadings(pts: readonly { x: number; y: number }[], vcap: number, dir: 1 | -1): Pt5[] {
  const n = pts.length;
  if (n < 2) return pts.map((p) => ({ ...p, th: 0, k: 0, vcap }));
  const th: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!, b = pts[Math.min(n - 1, i + 1)]!;
    const travel = Math.atan2(b.y - a.y, b.x - a.x);
    const h = dir === 1 ? travel : travel + Math.PI;
    th.push(i === 0 ? h : unwrapTo(th[i - 1]!, h));
  }
  const W = 4;
  return pts.map((p, i) => {
    const i0 = Math.max(0, i - W), i1 = Math.min(n - 1, i + W);
    const ds = Math.hypot(pts[i1]!.x - pts[i0]!.x, pts[i1]!.y - pts[i0]!.y);
    // dθ/ds along travel is dir·κ.
    const k = ds > 1e-9 ? (dir * (th[i1]! - th[i0]!)) / ds : 0;
    return { x: p.x, y: p.y, th: th[i]!, k, vcap };
  });
}

/** Joins sample runs into legs: a new leg wherever the gear flips; runs in the same gear are merged (no stop). */
export function pathOf(runs: readonly { readonly dir: 1 | -1; readonly pts: readonly Pt5[] }[]): RefPath {
  const legs: Leg[] = [];
  let cur: Pt5[] = [];
  let dir: 1 | -1 = 1;
  for (const r of runs) {
    if (r.pts.length === 0) continue;
    if (cur.length > 0 && r.dir !== dir) { legs.push(legOf(dir, cur)); cur = []; }
    dir = r.dir;
    const skip = cur.length > 0 && Math.hypot(cur[cur.length - 1]!.x - r.pts[0]!.x, cur[cur.length - 1]!.y - r.pts[0]!.y) < 1e-6 ? 1 : 0;
    const base = cur.length > 0 ? cur[cur.length - 1]!.th : r.pts[0]!.th;
    for (let i = skip; i < r.pts.length; i++) {
      const p = r.pts[i]!;
      const prev = cur.length > 0 ? cur[cur.length - 1]!.th : base;
      cur.push({ ...p, th: unwrapTo(prev, p.th) });
    }
  }
  if (cur.length > 0) legs.push(legOf(dir, cur));
  return { legs };
}

export const pathLength = (p: RefPath): number => p.legs.reduce((s, l) => s + l.len, 0);

/** Pose at a length along a leg (linear between samples; beyond the ends, straight on along the end heading). */
export function poseAt(l: Leg, s: number): Pose & { readonly k: number } {
  const n = l.xs.length;
  if (s <= 0) return extend(l, 0, s);
  if (s >= l.len) return extend(l, n - 1, s - l.len);
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (l.ss[m]! <= s) lo = m; else hi = m; }
  const t = (s - l.ss[lo]!) / Math.max(1e-9, l.ss[hi]! - l.ss[lo]!);
  return { x: l.xs[lo]! + (l.xs[hi]! - l.xs[lo]!) * t, y: l.ys[lo]! + (l.ys[hi]! - l.ys[lo]!) * t, th: l.ths[lo]! + (l.ths[hi]! - l.ths[lo]!) * t, k: l.ks[lo]! };
}

function extend(l: Leg, i: number, over: number): Pose & { readonly k: number } {
  const th = l.ths[i]!, d = over * l.dir;
  return { x: l.xs[i]! + d * Math.cos(th), y: l.ys[i]! + d * Math.sin(th), th, k: 0 };
}

/**
 * The length along the leg nearest a point, searched around a guess (the car's last s), so a path that crosses
 * itself is never jumped. `span` px each way.
 */
export function projectNear(l: Leg, x: number, y: number, guess: number, span: number): number {
  const n = l.xs.length;
  const i0 = Math.max(0, indexAt(l, guess - span)), i1 = Math.min(n - 1, indexAt(l, guess + span) + 1);
  let best = i0, bd = Infinity;
  for (let i = i0; i <= i1; i++) {
    const d = (l.xs[i]! - x) ** 2 + (l.ys[i]! - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return refine(l, best, x, y);
}

function indexAt(l: Leg, s: number): number {
  if (s <= 0) return 0;
  if (s >= l.len) return l.xs.length - 1;
  let lo = 0, hi = l.xs.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (l.ss[m]! <= s) lo = m; else hi = m; }
  return lo;
}

/** Projects onto the segment either side of sample i; beyond the ends, along the end tangent (may be < 0 or > len). */
function refine(l: Leg, i: number, x: number, y: number): number {
  const n = l.xs.length;
  const c = Math.cos(l.ths[i]!) * l.dir, s = Math.sin(l.ths[i]!) * l.dir;
  const along = (x - l.xs[i]!) * c + (y - l.ys[i]!) * s;
  if ((i === 0 && along < 0) || (i === n - 1 && along > 0)) return l.ss[i]! + along;
  const j = along >= 0 ? Math.min(n - 1, i + 1) : Math.max(0, i - 1);
  const seg = l.ss[j]! - l.ss[i]!;
  if (Math.abs(seg) < 1e-9) return l.ss[i]!;
  const t = Math.max(0, Math.min(1, along / seg));
  return l.ss[i]! + seg * t;
}
