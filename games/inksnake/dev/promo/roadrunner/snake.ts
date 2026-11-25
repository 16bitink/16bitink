import { Pen } from '../../../src/art/pen';
import { across, clipTo, fillShape, hair, linear, loop, normals, pt, type Pt, rngOf, soft, underlay } from './paint';

/**
 * The young western diamondback, seen on its back along any spine: pale
 * tan-grey, darker diamonds edged pale down the back, rows of keeled scales,
 * a tail ringed black and white and a small rattle; and, before the bill
 * closes on it, its broad triangular head side on. Live, in screen px.
 */
export interface SnakeLook {
  /** Its width where it is fullest, px. */
  readonly width: number;
  /** How much of it is already swallowed (0..1 of its length): the pattern runs out of the bill as it goes. */
  readonly from?: number;
  /** The rattle's shake, radians. */
  readonly shake?: number;
  /** The free head (before the grab), at the spine's start; `gape` its mouth. */
  readonly head?: { readonly gape: number };
}

const S = {
  ink: '#1c1611', base: '#c3b08c', lit: '#e6d8b6', deep: '#8a7454', side: '#9c8660', belly: '#eee2c4',
  mark: '#57422f', markDeep: '#33251b', markMid: '#8a6b4b', rim: '#f2e7c9',
  white: '#f1ead9', black: '#26211f', rattle: '#d6b06c', rattleDeep: '#8f6a34', eye: '#c79a3c',
} as const;
const SEED = 5200;

/** Half width, as a share of the fullest, u along the whole snake (0 its neck). */
const half = (u: number): number => {
  if (u < 0.06) return 0.5 + 0.1 * (u / 0.06);
  if (u < 0.4) return 0.6 + 0.4 * Math.sin(((u - 0.06) / 0.34) * Math.PI * 0.5);
  if (u < 0.6) return 1;
  return Math.max(0.2, 1 - 0.62 * ((u - 0.6) / 0.28) ** 1.35 * (u < 0.88 ? 1 : 1 + (u - 0.88) * 0.6));
};

/** A spine `len` px long leaving `from` at `a(0)`, its direction at s (0..1) given by `a`. */
export function bendSpine(from: Pt, len: number, a: (s: number) => number, n = 64, floor = Infinity): Pt[] {
  const out: Pt[] = [from];
  for (let i = 1; i <= n; i++) {
    const p = out[i - 1]!;
    const t = a((i - 0.5) / n);
    out.push(pt(p.x + (Math.cos(t) * len) / n, Math.min(floor, p.y + (Math.sin(t) * len) / n)));
  }
  return out;
}

const TAIL = 0.87;
const DIAMONDS = 15;

export function drawSnake(ctx: CanvasRenderingContext2D, spine: readonly Pt[], o: SnakeLook, boil: number): void {
  const from = o.from ?? 0;
  const full = (u: number): number => from + (1 - from) * u;
  const local = (f: number): number => (f - from) / (1 - from);
  const W = o.width / 2;
  const hw = (u: number): number => W * half(full(u));
  const at = across(spine, hw);
  const N = 72;
  const side = (v: number, a = 0, b = 1): Pt[] => Array.from({ length: N + 1 }, (_, i) => at(a + ((b - a) * i) / N, v));
  const strip = (v0: number, v1: number, a = 0, b = 1): Pt[] => [...side(v0, a, b), ...side(v1, a, b).reverse()];
  const shape = strip(-1, 1);
  const line = Math.max(3.4, o.width * 0.052);
  rattle(ctx, spine, hw(1), o, boil);
  if (o.head) headUnder(ctx, spine, W, line);
  underlay(ctx, shape, line, S.ink);
  fillShape(ctx, shape, S.base);
  clipTo(ctx, shape, () => {
    fillShape(ctx, strip(-1.02, -0.8), S.belly, 0.75);
    fillShape(ctx, strip(0.8, 1.02), S.belly, 0.6);
    fillShape(ctx, strip(-0.82, -0.5), S.side, 0.4);
    fillShape(ctx, strip(0.5, 0.82), S.side, 0.5);
    for (let i = 0; i < DIAMONDS; i++) {
      const step = (TAIL - 0.03) / DIAMONDS;
      diamond(ctx, at, local(0.03 + step * (i + 0.5)), (step * 0.56) / (1 - from));
    }
    scales(ctx, at, spine, W, full);
    // The ringed tail, black and white.
    const rings = 7;
    for (let i = 0; i < rings; i++) {
      const a = local(TAIL + ((1 - TAIL) * i) / rings);
      const b = local(TAIL + ((1 - TAIL) * (i + 1)) / rings);
      fillShape(ctx, strip(-1.1, 1.1, Math.max(0, a), Math.max(0, b)), i % 2 === 0 ? S.black : S.white);
    }
    // Round: light along one side, shade along the other.
    fillShape(ctx, strip(0.36, 1.1), '#2a1a0e', 0.2);
    fillShape(ctx, strip(0.68, 1.1), '#2a1a0e', 0.26);
    fillShape(ctx, strip(-1.1, -0.84), '#2a1a0e', 0.2);
    fillShape(ctx, strip(-0.56, -0.2), '#fff6dc', 0.2);
    fillShape(ctx, strip(-0.46, -0.32), '#fffaf0', 0.28);
  });
  const pen = new Pen(ctx, SEED + boil * 19, 0.8);
  pen.stroke(side(-1), line * 0.8, S.ink, 0.9, false);
  pen.stroke(side(1), line * 1.2, S.ink, 0.95, false);
  if (o.head) head(ctx, spine, W, o.head.gape, line, boil);
}

/** A diamond centred at u, `l` half its length along: a pale rim, dark edge, warmer middle. */
function diamond(ctx: CanvasRenderingContext2D, at: (u: number, v: number) => Pt, u: number, l: number): void {
  if (u + l < 0) return;
  for (const [k, kv, colour] of [[1.0, 0.84, S.rim], [0.82, 0.68, S.markDeep], [0.64, 0.53, S.mark], [0.34, 0.28, S.markMid]] as const) {
    const ring: Pt[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      // A rounded diamond: |x| + |y| softened.
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const r = 1 / (Math.abs(c) ** 1.25 + Math.abs(s) ** 1.25) ** (1 / 1.25);
      ring.push(at(u + c * r * l * k, s * r * kv));
    }
    fillShape(ctx, ring, colour, 0.94);
  }
}

function scales(ctx: CanvasRenderingContext2D, at: (u: number, v: number) => Pt, spine: readonly Pt[], W: number, full: (u: number) => number): void {
  let len = 0;
  for (let i = 1; i < spine.length; i++) len += Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y);
  const size = W * 0.2;
  const rows = Math.max(8, Math.round(len / (size * 1.25)));
  for (let i = 0; i < rows; i++) {
    const u = (i + 0.5) / rows;
    if (full(u) > TAIL) break;
    for (let j = -4; j <= 4; j++) {
      const v = (j + (i % 2) * 0.5) / 4.6;
      if (Math.abs(v) > 0.92) continue;
      const p = at(u, v);
      const q = at(Math.min(1, u + 0.01), v);
      const a = Math.atan2(q.y - p.y, q.x - p.x);
      hair(ctx, p.x, p.y, a, size * 1.05, size * 0.5, '#2a1c10', 0.2, 0);
      hair(ctx, p.x + 1, p.y - size * 0.12, a, size * 0.8, size * 0.14, '#fff4d8', 0.35, 0);
    }
  }
}

/** The rattle: a few horny segments off the tail's end. */
function rattle(ctx: CanvasRenderingContext2D, spine: readonly Pt[], w: number, o: SnakeLook, boil: number): void {
  const e = spine[spine.length - 1]!;
  const b = spine[spine.length - 4]!;
  const r = Math.max(w * 1.05, o.width * 0.12);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(Math.atan2(e.y - b.y, e.x - b.x) + (o.shake ?? 0));
  for (let i = 4; i >= 0; i--) {
    const x = r * (0.5 + i * 0.86);
    const h = r * (1.18 - i * 0.13);
    const seg = loop([pt(x - r * 0.5, -h * 0.55), pt(x, -h), pt(x + r * 0.5, -h * 0.72), pt(x + r * 0.62, 0), pt(x + r * 0.5, h * 0.72), pt(x, h), pt(x - r * 0.5, h * 0.55)], 4);
    underlay(ctx, seg, Math.max(2.4, o.width * 0.03), S.ink);
    fillShape(ctx, seg, linear(ctx, pt(0, -h), pt(0, h), [[0, '#f0d79a'], [0.45, S.rattle], [1, S.rattleDeep]]));
    hair(ctx, x + r * 0.1, -h * 0.6, 1.57, h * 1.2, r * 0.14, S.rattleDeep, 0.8, 0.1);
  }
  ctx.restore();
  if ((o.shake ?? 0) !== 0) {
    const pen = new Pen(ctx, SEED + 7 + boil, 0.6);
    for (const s of [-1, 1]) for (const d of [2.4, 3.3]) {
      pen.stroke(Array.from({ length: 6 }, (_, i) => {
        const a = Math.atan2(e.y - b.y, e.x - b.x) + s * (0.5 + i * 0.1);
        return pt(e.x + Math.cos(a) * r * (d + 1.6), e.y + Math.sin(a) * r * (d + 1.6));
      }), Math.max(3, o.width * 0.035), S.ink, 0.7, false);
    }
  }
}

function headAng(spine: readonly Pt[]): number {
  const a = spine[0]!;
  const b = spine[5]!;
  return Math.atan2(a.y - b.y, a.x - b.x);
}

function headFrame(ctx: CanvasRenderingContext2D, spine: readonly Pt[], W: number): void {
  const a = headAng(spine);
  ctx.translate(spine[0]!.x, spine[0]!.y);
  ctx.rotate(a);
  if (Math.cos(a) < 0) ctx.scale(1, -1);
  ctx.scale(W / 50, W / 50);
}

/** Units: the head is about 150 long, the snake's fullest half width 50. Side on, facing +x. */
const UPPER: readonly Pt[] = loop([pt(-24, -26), pt(8, -46), pt(50, -52), pt(96, -38), pt(124, -22), pt(134, -2), pt(128, 12), pt(80, 12), pt(30, 12), pt(-20, 14)], 6);
const LOWER: readonly Pt[] = loop([pt(-28, 4), pt(30, 8), pt(80, 10), pt(124, 12), pt(112, 26), pt(60, 36), pt(10, 44), pt(-22, 34)], 6);

function headUnder(ctx: CanvasRenderingContext2D, spine: readonly Pt[], W: number, line: number): void {
  ctx.save();
  headFrame(ctx, spine, W);
  underlay(ctx, UPPER, (line / W) * 50, S.ink);
  ctx.restore();
}

function head(ctx: CanvasRenderingContext2D, spine: readonly Pt[], W: number, gape: number, line: number, boil: number): void {
  ctx.save();
  headFrame(ctx, spine, W);
  const l = (line / W) * 50;
  ctx.save();
  ctx.translate(-10, 8);
  ctx.rotate(gape);
  ctx.translate(10, -8);
  underlay(ctx, LOWER, l, S.ink);
  fillShape(ctx, LOWER, linear(ctx, pt(0, 6), pt(0, 44), [[0, S.lit], [1, S.deep]]));
  ctx.restore();
  if (gape > 0.1) fillShape(ctx, [pt(-6, 8), pt(118, 10), pt(112, 10 + gape * 110), pt(40, 10 + gape * 50)], '#c76a62');
  underlay(ctx, UPPER, l * 0.9, S.ink);
  fillShape(ctx, UPPER, linear(ctx, pt(0, -52), pt(0, 16), [[0, S.lit], [0.45, S.base], [1, S.side]]));
  clipTo(ctx, UPPER, () => {
    // The dark band from the eye to the jaw's corner, edged pale.
    const band = [pt(84, -24), pt(20, 6), pt(-30, 18), pt(-30, 4), pt(16, -14), pt(60, -32)];
    fillShape(ctx, band.map((p) => pt(p.x, p.y - 5)), S.rim, 0.9);
    fillShape(ctx, band, S.mark, 0.95);
    fillShape(ctx, [pt(94, -24), pt(104, -24), pt(96, 14), pt(82, 14)], S.rim, 0.6);
    const rng = rngOf(SEED + 33);
    for (let i = 0; i < 70; i++) hair(ctx, -20 + rng() * 140, -50 + rng() * 60, 0.1, 9, 4.5, '#2a1c10', 0.22, 0);
    soft(ctx, 50, -46, 60, 14, 0, '#fff8e0', 0.5);
  });
  // The eye under its brow ridge: a slit pupil; the heat pit and nostril.
  ctx.fillStyle = S.ink;
  ctx.beginPath();
  ctx.ellipse(76, -27, 12.5, 11.5, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = S.eye;
  ctx.beginPath();
  ctx.ellipse(76, -27, 10, 9, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#0d0905';
  ctx.beginPath();
  ctx.ellipse(77, -27, 2.8, 8.6, 0.08, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#fffdf2';
  ctx.beginPath();
  ctx.arc(72, -31, 2.6, 0, 7);
  ctx.fill();
  const pen = new Pen(ctx, SEED + 50 + boil * 7, 0.5);
  pen.stroke([pt(56, -36), pt(74, -42), pt(94, -34)], l * 1.2, S.ink, 1, false);
  ctx.fillStyle = S.ink;
  ctx.beginPath();
  ctx.arc(102, -14, 4, 0, 7);
  ctx.arc(120, -16, 3, 0, 7);
  ctx.fill();
  pen.stroke([pt(130, 8), pt(80, 12), pt(20, 10), pt(-14, 14)], l * 0.8, S.ink, 0.9, false);
  ctx.restore();
}

export { normals };
