import { type CoyotePose } from './coyoteGait';
import { coyoteHead, coyoteHeadUnder } from './coyoteHead';
import { add, C, joints, type Joints, LINE, paintCoyoteLeg, upperOf } from './coyoteLeg';
import { across, clipTo, coatOf, curve, fillShape, hair, linear, loop, type Plume, pt, type Pt, rngOf, scatter, soft, underlay } from './paint';

/**
 * A coyote side on, facing +x, painted in fur: a grizzled grey-tan back with
 * black-tipped guard hairs, a thick ruff running from the cheeks into the
 * shoulders, a deep chest and tucked belly in cream, long jointed legs
 * (coyoteLeg.ts) and a bushy black-tipped tail. Units: shoulder to hip about
 * 280, withers to paw about 330; the origin is the middle of the back.
 */
const SEED = 8300;
const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

interface Skeleton {
  readonly shoulder: Pt;
  readonly hip: Pt;
  /** Trunk and neck in one: nothing seams. */
  readonly trunk: Pt[];
  readonly headAt: Pt;
  readonly tail: Pt[];
}

/** The trunk for this stretch: the loin arches when it bunches and flattens when it stretches. */
function skeleton(p: CoyotePose): Skeleton {
  const s = p.stretch;
  const L = 136 + 24 * s;
  const arch = -30 * Math.max(0, -s) + 6 * Math.max(0, s);
  const r = (x: number, y: number): Pt => rot(pt(x, y), p.pitch);
  const n = p.neck + p.pitch * 0.5;
  const headAt = add(r(L + 18, -44), pt(Math.cos(n) * 122, Math.sin(n) * 122));
  const h = (x: number, y: number): Pt => add(headAt, rot(pt(x, y), n * 0.6));
  const trunk = loop([
    h(4, -52), h(-46, -58), r(L + 4, -96), r(L - 50, -92), r(L - 120, -78 + arch * 0.4), r(0 - 20, -78 + arch), r(-L + 74, -86 + arch * 0.8), r(-L - 8, -84), r(-L - 60, -56), r(-L - 84, -6),
    r(-L - 62, 52), r(-L + 6, 52), r(-L + 78, 18 + arch * 0.4), r(-10, 38 + arch * 0.3), r(L - 78, 84), r(L + 2, 108), r(L + 58, 84), r(L + 88, 34), h(-14, 84), h(22, 50),
  ], 7);
  const ta = Math.PI - p.tail;
  const root = r(-L - 62, -46);
  const out = (l: number, t: number): Pt => add(root, pt(Math.cos(ta + t) * l, Math.sin(ta + t) * l));
  const tail = curve([r(-L - 16, -50), root, out(86, 0.04), out(176, -0.02), out(262, 0.06), out(318, 0.1)], 8);
  return { shoulder: r(L + 12, 24), hip: r(-L - 10, -2), trunk, headAt, tail };
}

// ---------------------------------------------------------------- tail

const tailHalf = (u: number): number => 18 + 34 * Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.75) * (u > 0.8 ? Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2)) : 1);

function tailPlumes(spine: readonly Pt[]): Plume[] {
  const at = across(spine, tailHalf);
  const rng = rngOf(SEED + 9);
  return Array.from({ length: 230 }, (_, i) => {
    const u = 0.97 - (i / 230) * 0.95;
    const v = rng() * 2 - 1;
    const p = at(u, v * 0.88);
    const q = at(Math.min(1, u + 0.08), v);
    const r = rng();
    const colour = u > 0.78 ? (r < 0.75 ? C.black : C.guard) : v > 0.35 && r < 0.6 ? C.guard : r < 0.3 ? C.grey : r < 0.65 ? C.tan : C.tanLit;
    return { x: p.x, y: p.y, ang: Math.atan2(q.y - p.y, q.x - p.x) + v * -0.16 + (rng() - 0.5) * 0.3, len: 46 + r * 26, w: 13, tone: { edge: colour, core: C.ink, k: 0 }, bend: 0.06, edge: Math.abs(v) > 0.6 };
  });
}

// ---------------------------------------------------------------- trunk

const LOCKS = scatter(loop([pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, 1)], 10), 0.04, SEED, Math.PI, 0.8);

function lockColour(u: number, v: number, r: number): string {
  // Over the ruff (u past the shoulder) the grizzle is thick; below, cream.
  const dark = u > 0.7 ? 0.34 : 0.28;
  if (v < dark) return r < 0.42 ? C.guard : r < 0.72 ? C.grey : C.tanLit;
  if (v < 0.6) return r < 0.16 ? C.deep : r < 0.6 ? C.tan : C.tanLit;
  return r < 0.6 ? C.cream : r < 0.8 ? C.tanLit : C.creamDeep;
}

function furTrunk(ctx: CanvasRenderingContext2D, trunk: readonly Pt[]): void {
  const xs = trunk.map((q) => q.x);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const edge = (x: number): readonly [number, number] => {
    const ys = trunk.filter((q) => Math.abs(q.x - x) < 30).map((q) => q.y);
    return ys.length ? [Math.min(...ys), Math.max(...ys)] : [-60, 60];
  };
  clipTo(ctx, trunk, () => {
    for (const l of LOCKS) {
      const u = (l.x + 1) / 2;
      const v = (l.y + 1) / 2;
      const x = x0 + (x1 - x0) * u;
      const [t, b] = edge(x);
      const ruff = u > 0.66 ? 1 : 0;
      hair(ctx, x, t + (b - t) * v, Math.PI - 0.12 - v * 0.4 - ruff * (0.15 + v * 0.35) + (l.r2 - 0.5) * 0.35, 24 + l.r * 18 + ruff * 12, 5.2 + ruff * 1.4, lockColour(u, v, l.r), v < 0.3 ? 0.62 : 0.55, 0.14);
    }
  });
}

/** Loose fur on the contour: the ruff's throat and nape, the chest, the seat of the thighs. */
function contourPlumes(k: Skeleton): Plume[] {
  const rng = rngOf(SEED + 60);
  const n = k.trunk.length;
  const out: Plume[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / n;
    const p = k.trunk[i]!;
    const q = k.trunk[(i + 1) % n]!;
    const along = Math.atan2(q.y - p.y, q.x - p.x);
    const nape = f < 0.16;
    const chest = f > 0.75 && f < 0.97;
    const seat = f > 0.4 && f < 0.54;
    if (!nape && !chest && !seat) continue;
    // The contour runs back along the top and forward underneath; fur always lies back, lifting a little off it.
    const ang = nape ? along - 0.22 : along + Math.PI + (chest ? -0.35 : 0.2);
    const r = rng();
    const colour = nape ? (r < 0.5 ? C.guard : C.grey) : seat ? (r < 0.5 ? C.tan : C.tanLit) : r < 0.75 ? C.cream : C.tanLit;
    out.push({ x: p.x, y: p.y, ang: ang + (rng() - 0.5) * 0.25, len: (chest ? 44 : 30) + r * 16, w: 14, tone: { edge: colour, core: C.ink, k: 0 }, bend: 0.08 });
  }
  return out;
}

const clipAll = (ctx: CanvasRenderingContext2D, shapes: readonly (readonly Pt[])[], draw: () => void): void => {
  ctx.save();
  ctx.beginPath();
  for (const s of shapes) {
    s.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
  }
  ctx.clip();
  draw();
  ctx.restore();
};

/** Short fur over a limb's root, so the leg runs up into the trunk. */
function blendRoot(ctx: CanvasRenderingContext2D, at: Pt, rx: number, ry: number, n: number, seed: number): void {
  const rng = rngOf(seed);
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(rng());
    const a = rng() * 6.28;
    const y = Math.sin(a) * r * ry;
    hair(ctx, at.x + Math.cos(a) * r * rx, at.y + y, Math.PI - 0.55 - y * 0.005 + (rng() - 0.5) * 0.5, 26 + rng() * 10, 5.2, y < -24 ? (rng() < 0.35 ? C.guard : C.grey) : rng() < 0.5 ? C.tan : C.tanLit, 0.55, 0.12);
  }
}

export function coyoteJoints(p: CoyotePose): { front: readonly [Joints, Joints]; hind: readonly [Joints, Joints]; k: Skeleton } {
  const k = skeleton(p);
  const leg = (root: Pt, l: CoyotePose['front'][0], hind: boolean, dx: number, dy: number): Joints => joints(add(root, pt(dx, dy)), l, hind);
  return {
    k,
    front: [leg(k.shoulder, p.front[0], false, 0, 0), leg(k.shoulder, p.front[1], false, 22, -8)],
    hind: [leg(k.hip, p.hind[0], true, 0, 0), leg(k.hip, p.hind[1], true, 24, -6)],
  };
}

export function drawCoyote(ctx: CanvasRenderingContext2D, p: CoyotePose, boil: number): void {
  const { k, front, hind } = coyoteJoints(p);
  ctx.save();
  ctx.translate(p.at.x, p.at.y);
  ctx.scale(p.scale, p.scale);
  paintCoyoteLeg(ctx, front[1], true, boil, SEED + 100);
  paintCoyoteLeg(ctx, hind[1], true, boil, SEED + 110);
  const tp = tailPlumes(k.tail);
  const tail = ((): Pt[] => {
    const at = across(k.tail, (u) => tailHalf(u) * 0.9);
    const ts = Array.from({ length: 25 }, (_, i) => i / 24);
    return [...ts.map((t) => at(t, 1)), ...[...ts].reverse().map((t) => at(t, -1))];
  })();
  const fringe = contourPlumes(k);
  const thigh = upperOf(hind[0]);
  const arm = upperOf(front[0]);
  underlay(ctx, tail, LINE, C.ink);
  coatOf(ctx, tp.filter((f) => f.edge), LINE * 0.8);
  underlay(ctx, k.trunk, LINE, C.ink);
  underlay(ctx, thigh, LINE, C.ink);
  coatOf(ctx, fringe, LINE * 0.8);
  coyoteHeadUnder(ctx, k.headAt, p, LINE);
  fillShape(ctx, tail, linear(ctx, k.tail[0]!, k.tail[k.tail.length - 1]!, [[0, C.tan], [0.55, C.grey], [0.74, C.deep], [0.86, C.black], [1, C.black]]));
  coatOf(ctx, tp, 0);
  fillShape(ctx, thigh, C.tan);
  fillShape(ctx, k.trunk, linear(ctx, rot(pt(0, -96), p.pitch), rot(pt(0, 108), p.pitch), [[0, C.deep], [0.2, C.grey], [0.45, C.tan], [0.7, C.tanLit], [1, C.cream]]));
  furTrunk(ctx, k.trunk);
  coatOf(ctx, fringe, 0);
  clipTo(ctx, k.trunk, () => {
    // Volume: the belly and the hollow of the flank in shade, the rib cage and shoulder lit.
    soft(ctx, (k.shoulder.x + k.hip.x) / 2 + 20, 74, 150, 44, 0, C.deep, 0.42);
    soft(ctx, k.hip.x + 104, 6, 64, 76, 0, C.deep, 0.36);
    soft(ctx, k.shoulder.x - 88, -8, 60, 66, 0.3, C.deep, 0.24);
    soft(ctx, k.shoulder.x - 4, -20, 64, 70, 0.3, '#fff0d2', 0.22);
    soft(ctx, (k.shoulder.x + k.hip.x) / 2, -66, 170, 20, 0, '#fff0cf', 0.22);
  });
  paintCoyoteLeg(ctx, hind[0], false, boil, SEED + 120);
  clipAll(ctx, [k.trunk, thigh], () => blendRoot(ctx, pt(k.hip.x + 4, k.hip.y + 4), 92, 74, 260, SEED + 41));
  paintCoyoteLeg(ctx, front[0], false, boil, SEED + 130);
  clipAll(ctx, [k.trunk, arm], () => blendRoot(ctx, pt(k.shoulder.x - 4, k.shoulder.y + 6), 66, 64, 170, SEED + 43));
  coyoteHead(ctx, k.headAt, p, boil);
  ctx.restore();
}
