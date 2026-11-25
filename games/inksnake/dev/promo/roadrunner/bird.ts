import { Pen } from '../../../src/art/pen';
import { CORNER, GRIP, type HeadLook, headOver, headUnder, mouthInside } from './head';
import { type LegPose, legFill, legUnder } from './leg';
import { across, BIRD as B, clipTo, curve, coatOf, feather, fillShape, hair, lens, linear, loop, pathOf, pt, type Plume, type Pt, rngOf, scatter, soft, type Tone, underlay } from './paint';

/**
 * The greater roadrunner whole, side on and facing +x, in the head's units
 * (the bill about 340). The origin is the hip; the body pitches about it by
 * `tilt` (+ = chest down). Slim and level, streaked brown and buff above,
 * the breast streaked and the belly white, a short rounded wing folded along
 * the flank, the very long dark tail glossed green-bronze and tipped white,
 * long blue-grey legs (leg.ts). Drawn back to front around a snake held in
 * the bill: `birdBehind`, [the snake], `birdFront`.
 */
export interface BirdPose {
  readonly at: Pt;
  readonly scale: number;
  readonly tilt: number;
  /** The tail's angle off the body's line, + = raised. */
  readonly tail: number;
  /** 0 wing folded .. 1 half open, drooped for balance. */
  readonly wing: number;
  /** The eye's place (from the hip, unpitched) and the head's turn. */
  readonly head: { readonly at: Pt; readonly ang: number; readonly look: HeadLook };
  readonly near: LegPose;
  readonly far: LegPose;
  /** A gulp's bulge travelling down the neck: 0..1 along, and its size. */
  readonly gulp?: { readonly u: number; readonly size: number };
}

const SEED = 4700;
const LINE = 9;

/** Back, rump, vent, belly, breast (tilt 0). */
const BODY: readonly Pt[] = loop([
  pt(520, -262), pt(400, -262), pt(220, -236), pt(20, -206), pt(-180, -150), pt(-340, -92), pt(-430, -40), pt(-420, 20), pt(-320, 70), pt(-180, 128),
  pt(0, 168), pt(180, 178), pt(340, 146), pt(470, 80), pt(558, -20), pt(590, -120), pt(570, -216),
], 8);
const COAT = scatter(BODY, 44, SEED, Math.PI + 0.12);
const TAIL_ROOT = pt(-370, -62);
const WING_ROOT = pt(400, -150);
const NECK_BASE = pt(470, -150);

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** The held snake's root on screen: between the bill's tips. */
export function gripOf(p: BirdPose): { readonly at: Pt; readonly ang: number } {
  const g = rot(GRIP, p.head.ang);
  return { at: pt(p.at.x + (p.head.at.x + g.x) * p.scale, p.at.y + (p.head.at.y + g.y) * p.scale), ang: p.head.ang + 0.12 };
}

/** A held snake's length out of the bill and its width, in the bird's units. */
export const HELD = { out: 930, width: 133 } as const;

/**
 * The held snake's spine on screen: out of sight in the mouth, straight along
 * the gape to the bill's tips, then bending off in the directions `a(s)`
 * (s 0..1 along what hangs out, `out` units long).
 */
export function heldSpine(p: BirdPose, a: (s: number) => number, out: number = HELD.out, floor = Infinity): Pt[] {
  const m = mouthOf(p, 0.08);
  const g = gripOf(p);
  const inside = Array.from({ length: 18 }, (_, i) => pt(m.x + ((g.at.x - m.x) * i) / 18, m.y + ((g.at.y - m.y) * i) / 18));
  const bend = (s: number): number => {
    const k = Math.min(1, s / 0.17);
    const e = k * k * (3 - 2 * k);
    return g.ang + (a(s) - g.ang) * e;
  };
  const n = 56;
  const pts: Pt[] = [g.at];
  for (let i = 1; i <= n; i++) {
    const q = pts[i - 1]!;
    const t = bend((i - 0.5) / n);
    pts.push(pt(q.x + (Math.cos(t) * out * p.scale) / n, Math.min(floor, q.y + (Math.sin(t) * out * p.scale) / n)));
  }
  return [...inside, ...pts];
}

/** A point inside the mouth on screen, `k` 0 the corner .. 1 the tips: the snake starts here, out of sight. */
export function mouthOf(p: BirdPose, k: number): Pt {
  const g = rot(pt(CORNER.x + (GRIP.x - CORNER.x) * k, CORNER.y + 4 + (GRIP.y - CORNER.y - 4) * k), p.head.ang);
  return pt(p.at.x + (p.head.at.x + g.x) * p.scale, p.at.y + (p.head.at.y + g.y) * p.scale);
}

function neckSpine(p: BirdPose): Pt[] {
  const base = rot(NECK_BASE, p.tilt);
  const h = p.head;
  const nape = rot(pt(-84, 40), h.ang);
  const top = pt(h.at.x + nape.x, h.at.y + nape.y);
  const out = rot(pt(150, -120), p.tilt);
  const back = rot(pt(-110, 120), h.ang);
  const root = rot(pt(330, -90), p.tilt);
  return curve([root, pt(base.x + out.x * 0.2, base.y + out.y * 0.2), pt((base.x + out.x * 0.6 + top.x + back.x * 0.5) / 2, (base.y + out.y * 0.6 + top.y + back.y * 0.5) / 2), top], 14);
}

const neckHalf = (p: BirdPose) => (u: number): number => {
  const g = p.gulp;
  const bulge = g ? g.size * Math.exp(-(((u - g.u) / 0.24) ** 2)) : 0;
  // Its root lies inside the body.
  return (215 - 88 * Math.min(1, u * 1.15) ** 0.8) * (0.7 + 0.3 * Math.min(1, u / 0.3)) * (1 - 0.14 * Math.max(0, (u - 0.82) / 0.18)) + bulge;
};

function bodyTone(p: Pt, r: number): Tone {
  if (p.y > 60 + p.x * 0.02 - (p.x > 420 ? (p.x - 420) * 0.4 : 0)) return { edge: r < 0.7 ? B.belly : B.throat, core: B.bellyShade, k: r < 0.25 ? 0.2 : 0 };
  if (p.x > 330 && p.y > -90) return { edge: r < 0.6 ? B.edge : B.throat, core: B.core, k: r < 0.75 ? 0.34 : 0.14 };
  return { edge: r < 0.5 ? B.edge : B.brown, core: r < 0.55 ? B.core : B.brownDeep, k: 0.58 };
}

// ---------------------------------------------------------------- tail

const BLADES = [
  { off: 0.085, len: 1060, w: 92, y: 24, tip: true }, { off: 0.052, len: 1180, w: 98, y: 15, tip: true }, { off: 0.022, len: 1260, w: 102, y: 5, tip: true },
  { off: -0.006, len: 1310, w: 106, y: -6, tip: true }, { off: -0.028, len: 1330, w: 110, y: -16, tip: false },
] as const;

function blade(root: Pt, ang: number, len: number, w: number): { shape: Pt[]; at: (t: number, n: number) => Pt } {
  const [c, s] = [Math.cos(ang), Math.sin(ang)];
  const at = (t: number, n: number): Pt => pt(root.x + c * len * t - s * n, root.y + s * len * t + c * n);
  const half = (t: number): number => (w / 2) * (t < 0.2 ? 0.42 + 0.58 * Math.sin((t / 0.2) * 1.57) : t < 0.9 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)));
  const ts = Array.from({ length: 33 }, (_, i) => i / 32);
  return { shape: [...ts.map((t) => at(t, half(t))), ...[...ts].reverse().map((t) => at(t, -half(t)))], at };
}

function tailBlades(p: BirdPose): readonly ReturnType<typeof blade>[] {
  return BLADES.map((b) => blade(pt(TAIL_ROOT.x, TAIL_ROOT.y + b.y), Math.PI + p.tail - b.off * 1.4 * (1 + 0.5 * Math.max(0, p.tail)), b.len, b.w));
}

function paintTail(ctx: CanvasRenderingContext2D, p: BirdPose, boil: number): void {
  const blades = tailBlades(p);
  blades.forEach((f, i) => {
    const b = BLADES[i]!;
    underlay(ctx, f.shape, LINE * 0.75, B.ink);
    fillShape(ctx, f.shape, linear(ctx, f.at(0, -b.w / 2), f.at(0, b.w / 2), [[0, '#75663f'], [0.25, '#4c5238'], [0.55, B.tailDeep], [1, '#17150f']]));
    clipTo(ctx, f.shape, () => {
      // Green-bronze gloss along the vane, barbs, and the white tip.
      for (let t = 0.1; t < 0.95; t += 0.14) {
        const g = f.at(t, -b.w * 0.16);
        soft(ctx, g.x, g.y, 150, 34, Math.PI + p.tail, t > 0.5 ? B.bronze2 : B.gloss, 0.36);
      }
      for (let t = 0.06; t < 0.98; t += 0.02) {
        for (const s of [-1, 1]) {
          const a = f.at(t, s * 4);
          const e = f.at(t + 0.03, (s * b.w) / 2);
          hair(ctx, a.x, a.y, Math.atan2(e.y - a.y, e.x - a.x), Math.hypot(e.x - a.x, e.y - a.y), 6, s < 0 ? '#93a27a' : '#0c0b08', 0.22, 0);
        }
      }
      if (b.tip) {
        fillShape(ctx, [f.at(0.91, -b.w), f.at(0.87, 0), f.at(0.91, b.w), f.at(1.1, b.w), f.at(1.1, -b.w)], '#f4ecda', 0.95);
        const e = f.at(0.99, b.w * 0.2);
        soft(ctx, e.x, e.y, 60, 50, 0, B.bellyShade, 0.5);
      }
    });
    const pen = new Pen(ctx, SEED + i * 5 + boil * 11, 1);
    pen.stroke([f.at(0.02, 0), f.at(0.5, 0), f.at(0.95, 0)], 6, '#0f0d09', 0.8, false);
  });
}

// ---------------------------------------------------------------- wing

function paintWing(ctx: CanvasRenderingContext2D, p: BirdPose, boil: number): void {
  const droop = p.wing;
  ctx.save();
  ctx.translate(WING_ROOT.x, WING_ROOT.y);
  ctx.rotate(-droop * 0.62);
    // The long flight feathers, the lowest first, sliding back over the rump.
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const root = pt(-120 - u * 110, 96 - u * 70);
    const ang = Math.PI - 0.2 + u * 0.16 - droop * (1 - u) * 0.75;
    const len = 600 - u * 60 - (i === 0 ? 120 : 0);
    ctx.save();
    ctx.lineWidth = 11;
    ctx.strokeStyle = B.ink;
    ctx.lineJoin = 'round';
    lens(ctx, root.x, root.y, ang, len, 98, 0.03);
    ctx.stroke();
    ctx.restore();
    feather(ctx, root.x, root.y, ang, len, 98, { edge: i % 3 === 2 ? B.edge : '#cbb68c', core: i % 2 ? '#332c22' : '#3f3628', k: 0.74 }, 1, 0.03);
    const g = pt(root.x + Math.cos(ang) * len * 0.55, root.y + Math.sin(ang) * len * 0.55);
    soft(ctx, g.x, g.y - 8, 170, 22, ang, B.gloss, 0.5);
    hair(ctx, root.x, root.y, ang, len * 0.92, 5, '#120f0b', 0.9, 0.03);
  }
  // The coverts: long dark-centred, pale-edged feathers in loose overlapping drifts.
  const shape = loop([pt(60, -70), pt(-90, -92), pt(-280, -62), pt(-390, 0), pt(-330, 74), pt(-160, 130), pt(20, 110), pt(100, 20)], 8);
  for (const s of scatter(shape, 58, SEED + 320, Math.PI, 0.5)) {
    const far = Math.min(1, Math.max(0, (60 - s.x) / 420));
    const len = 92 + far * 120 + s.r * 30;
    feather(ctx, s.x, s.y, Math.PI - 0.14 + s.y * -0.0009 + (s.r2 - 0.5) * 0.22 - droop * 0.2, len, 40 + far * 20, { edge: s.r < 0.65 ? B.edge : B.edgeLit, core: s.r2 < 0.7 ? B.core : B.brownDeep, k: 0.66 }, 0.96, 0.06);
    hair(ctx, s.x, s.y, Math.PI - 0.14, len * 0.6, 3.6, '#120f0b', 0.5, 0.06);
  }
  soft(ctx, -120, -50, 250, 54, -0.06, '#ffeec4', 0.22);
  new Pen(ctx, SEED + 340 + boil * 9, 1.4).stroke(curve([pt(100, 24), pt(30, 112), pt(-150, 134), pt(-300, 92)], 8), 9, B.ink, 0.75, false);
  ctx.restore();
}

// ---------------------------------------------------------------- body and neck

function paintBody(ctx: CanvasRenderingContext2D): void {
  fillShape(ctx, BODY, linear(ctx, pt(0, -260), pt(40, 190), [[0, B.brownDeep], [0.34, B.brown], [0.6, B.face], [0.8, B.belly], [1, B.bellyShade]]));
  coatOf(ctx, COAT.map((s): Plume => ({
    x: s.x, y: s.y, ang: Math.PI + 0.12 - (s.y + 40) * 0.0011 + (s.r2 - 0.5) * 0.3, len: 92 + s.r * 40, w: 36 + s.r2 * 10, tone: bodyTone(s, s.r), bend: 0.06,
  })), 0);
  clipTo(ctx, BODY, () => {
    soft(ctx, 60, 210, 480, 120, 0, '#8a7a6a', 0.42);
    soft(ctx, 120, -230, 360, 60, -0.1, '#ffeec4', 0.2);
    soft(ctx, 600, 40, 120, 200, 0.2, B.bellyShade, 0.35);
  });
}

/** The neck's feathers, the lowest last to first up to the head. */
function neckPlumes(spine: readonly Pt[], half: (u: number) => number, still: (u: number) => number, body: number): Plume[] {
  const at = across(spine, half);
  // The feathers lie along the neck at rest, whatever bulges under them.
  const calm = across(spine, still);
  // v +1 is the neck's back (its left going up and forward), −1 its front.
  const rng = rngOf(SEED + 500);
  const plumes: Plume[] = [];
  for (let i = 0; i < 26; i++) {
    const u = 1.02 - i / 25;
    const n = 9;
    for (let j = 0; j <= n; j++) {
      const v = -1 + (2 * j) / n + (rng() - 0.5) * 0.2;
      const p = at(u + (rng() - 0.5) * 0.05, v);
      const p0 = calm(u, v);
      const q = calm(Math.max(0, u - 0.08), v * 0.98);
      const ang = Math.atan2(q.y - p0.y, q.x - p0.x) + (rng() - 0.5) * 0.2;
      const r = rng();
      const bend = (rng() - 0.5) * 0.12;
      const w = 29 + rng() * 9;
      if (u < 0.05) continue;
      // Low down, the neck's feathers turn to lie along the back and breast.
      const low = Math.max(0, 1 - u / 0.42);
      const turned = ang + Math.atan2(Math.sin(body - ang), Math.cos(body - ang)) * low * (v > 0 ? 1 : 0.6);
      const front = v < -0.15;
      const loose = front ? 0.88 : 0.62;
      const tone: Tone = v > 0.35
        ? { edge: r < 0.5 ? B.edge : B.brown, core: r < 0.7 ? B.core : B.crest, k: 0.62 }
        : front ? { edge: r < 0.7 ? B.throat : B.edge, core: B.core, k: r < 0.62 ? 0.34 : 0.14 } : { edge: B.edge, core: B.core, k: 0.48 };
      plumes.push({ x: p.x, y: p.y, ang: turned, len: 74 + r * 34, w, tone, bend, edge: Math.abs(v) > 0.6 && u > loose, inner: u <= loose });
    }
  }
  return plumes;
}

function neckShape(spine: readonly Pt[], half: (u: number) => number): Pt[] {
  const at = across(spine, half);
  const ts = Array.from({ length: 31 }, (_, i) => i / 30);
  return [...ts.map((u) => at(u, -1)), ...[...ts].reverse().map((u) => at(u, 1))];
}

function inBird(ctx: CanvasRenderingContext2D, p: BirdPose, draw: () => void): void {
  ctx.save();
  ctx.translate(p.at.x, p.at.y);
  ctx.scale(p.scale, p.scale);
  draw();
  ctx.restore();
}

function inHead(ctx: CanvasRenderingContext2D, p: BirdPose, draw: () => void): void {
  ctx.save();
  ctx.translate(p.head.at.x, p.head.at.y);
  ctx.rotate(p.head.ang);
  draw();
  ctx.restore();
}

const pitched = (ctx: CanvasRenderingContext2D, p: BirdPose, draw: () => void): void => {
  ctx.save();
  ctx.rotate(p.tilt);
  draw();
  ctx.restore();
};

/** Line weight for this scale: thin enough close up, firm enough far off. */
const weight = (scale: number): number => Math.max(1, Math.min(2.4, 0.62 / scale ** 0.9));

/** Everything behind the held snake: legs, tail, body, wing, neck, the inside of the mouth. */
export function birdBehind(ctx: CanvasRenderingContext2D, p: BirdPose, boil: number): void {
  const k = weight(p.scale);
  inBird(ctx, p, () => {
    const spine = neckSpine(p);
    const half = neckHalf(p);
    const neck = neckShape(spine, half);
    legUnder(ctx, p.far, p.tilt, LINE * k, true);
    legFill(ctx, p.far, p.tilt, boil, true, k);
    pitched(ctx, p, () => paintTail(ctx, p, boil));
    const plumes = neckPlumes(spine, half, neckHalf({ ...p, gulp: undefined }), Math.PI + 0.2 + p.tilt);
    pitched(ctx, p, () => underlay(ctx, BODY, LINE * k, B.ink));
    coatOf(ctx, plumes.filter((f) => f.edge), LINE * 0.8 * k);
    underlay(ctx, neck, LINE * k, B.ink);
    inHead(ctx, p, () => headUnder(ctx, p.head.look, k));
    legUnder(ctx, p.near, p.tilt, LINE * k, false);
    fillShape(ctx, neck, B.face);
    pitched(ctx, p, () => paintBody(ctx));
    legFill(ctx, p.near, p.tilt, boil, false, k);
    // The low ones stay inside the neck and body, so none sticks out of the contour.
    ctx.save();
    ctx.beginPath();
    for (const s of [neck, BODY.map((q) => rot(q, p.tilt))]) {
      s.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
    }
    ctx.clip();
    coatOf(ctx, plumes.filter((f) => f.inner).reverse(), 0);
    ctx.restore();
    coatOf(ctx, plumes.filter((f) => !f.inner).reverse(), 0);
    pitched(ctx, p, () => paintWing(ctx, p, boil));
    ctx.save();
    pathOf(ctx, neck);
    ctx.clip();
    const at = across(spine, half);
    for (let i = 0; i < 6; i++) {
      const f = at(0.1 + i * 0.16, -0.95);
      soft(ctx, f.x, f.y, 110, 80, 0, '#7a6448', 0.2);
    }
    ctx.restore();
    inHead(ctx, p, () => mouthInside(ctx, p.head.look));
  });
}

/** What lies over the held snake: the bill, the head, the crest. */
export function birdFront(ctx: CanvasRenderingContext2D, p: BirdPose, boil: number): void {
  inBird(ctx, p, () => inHead(ctx, p, () => headOver(ctx, p.head.look, boil, weight(p.scale))));
}
