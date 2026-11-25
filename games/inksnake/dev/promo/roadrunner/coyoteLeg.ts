import { Pen } from '../../../src/art/pen';
import { rgba } from '../../../src/art/wash';
import { type Limb } from './coyoteGait';
import { across, fillShape, hair, linear, loop, pt, type Pt, rngOf, soft, underlay } from './paint';

/**
 * The coyote's legs: shoulder, elbow, wrist; hip, stifle, hock with its
 * heel; slim pasterns and oval paws with four toes and claws. Near legs melt
 * into the trunk at the top; far ones are in its shade.
 */
export const C = {
  ink: '#1d1713', tan: '#c6a780', tanLit: '#e6d2ae', grey: '#978a76', deep: '#6b5a46', rust: '#b0825a', rustLit: '#d3ac82', rustDeep: '#84603f',
  cream: '#f5ead2', creamDeep: '#d3bf9e', guard: '#3a3029', black: '#221c19',
} as const;
export const LINE = 6;

const NEAR = { top: C.tan, grey: C.grey, mid: C.rust, lit: C.rustLit, deep: C.rustDeep, paw: C.cream } as const;
const FAR = { top: '#86715a', grey: '#6c6153', mid: '#7d6047', lit: '#957759', deep: '#5c4635', paw: '#ad9c84' } as const;

const dir = (a: number, l: number): Pt => pt(Math.sin(a) * l, Math.cos(a) * l);
export const add = (p: Pt, q: Pt): Pt => pt(p.x + q.x, p.y + q.y);

export interface Joints {
  /** Root, elbow or stifle, wrist or hock, the paw's joint. */
  readonly pts: readonly [Pt, Pt, Pt, Pt];
  readonly toe: Pt;
  readonly hind: boolean;
}

export function joints(root: Pt, l: Limb, hind: boolean): Joints {
  const len = hind ? [104, 146, 100] as const : [96, 148, 60] as const;
  const a = add(root, dir(l.a, len[0]));
  const b = add(a, dir(l.b, len[1]));
  const c = add(b, dir(l.c, len[2]));
  // The paw bends forward off the pastern when it bears weight, trails when the leg is thrown back.
  const t = add(c, dir(l.c + 0.35 + 0.75 * Math.max(0, Math.min(1, (l.c + 0.8) / 0.9)), 44));
  return { pts: [root, a, b, c], toe: t, hind };
}

function taper(a: Pt, b: Pt, w: (u: number) => number): Pt[] {
  const at = across([a, b], (u) => w(u) / 2);
  const ts = Array.from({ length: 13 }, (_, i) => i / 12);
  return [...ts.map((t) => at(t, 1)), ...[...ts].reverse().map((t) => at(t, -1))];
}

const disc = (p: Pt, r: number): Pt[] => Array.from({ length: 16 }, (_, i) => pt(p.x + Math.cos((i / 16) * 6.2832) * r, p.y + Math.sin((i / 16) * 6.2832) * r));

interface PawFrame {
  readonly along: (l: number, n: number) => Pt;
}
function pawFrame(j: Joints): PawFrame {
  const c = j.pts[3];
  const a = Math.atan2(j.toe.y - c.y, j.toe.x - c.x);
  return { along: (l, n) => pt(c.x + Math.cos(a) * l - Math.sin(a) * n, c.y + Math.sin(a) * l + Math.cos(a) * n) };
}

/** Upper mass first, paw last. */
function parts(j: Joints): { upper: Pt[]; rest: Pt[][] } {
  const [r, a, b, c] = j.pts;
  const { along } = pawFrame(j);
  const paw = loop([along(-16, 0), along(-6, -17), along(20, -19), along(42, -14), along(54, 0), along(46, 13), along(18, 15), along(-8, 13)], 5);
  if (!j.hind) {
    return {
      upper: [...taper(r, a, (u) => 112 - 46 * u)],
      rest: [taper(a, b, (u) => 62 - 28 * Math.min(1, u * 1.5) + 5 * Math.sin(u * 3.1)), disc(a, 31), disc(b, 18.5), taper(b, c, (u) => 35 - 6 * Math.sin(u * 3.1)), disc(c, 16), paw],
    };
  }
  // The heel: the point of the hock sticks out behind, its tendon running up the shank.
  const back = Math.atan2(b.y - a.y, b.x - a.x);
  const shin = Math.atan2(c.y - b.y, c.x - b.x);
  const heel = pt(b.x + Math.cos(shin + Math.PI) * 24, b.y + Math.sin(shin + Math.PI) * 24);
  const up = pt(b.x - Math.cos(back) * 66, b.y - Math.sin(back) * 66);
  return {
    upper: [...taper(r, a, (u) => 148 - 50 * u)],
    rest: [taper(a, b, (u) => 96 - 62 * Math.min(1, u * 1.12)), disc(a, 47), loop([heel, up, b, c, pt(heel.x + (c.x - b.x) * 0.3, heel.y + (c.y - b.y) * 0.3)], 5), disc(b, 18), taper(b, c, (u) => 35 - 5 * Math.sin(u * 3.1)), disc(c, 16), paw],
  };
}

/** The near upper leg's mass, for the trunk's outline. */
export const upperOf = (j: Joints): Pt[] => parts(j).upper;

function fur(ctx: CanvasRenderingContext2D, j: Joints, far: boolean, rng: () => number): void {
  const pal = far ? FAR : NEAR;
  const w = j.hind ? [[74, 46], [46, 17], [17, 14]] : [[54, 31], [30, 17], [17, 14]];
  for (let i = 0; i < 3; i++) {
    const [a, b] = [j.pts[i]!, j.pts[i + 1]!];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) * [2.2, 1.7, 0.9][i]!);
    for (let q = 0; q < n; q++) {
      const t = i === 0 && !far ? 0.35 + 0.65 * rng() : rng();
      const v = rng() * 2 - 1;
      const ww = w[i]![0]! + (w[i]![1]! - w[i]![0]!) * t;
      const down = (i + t) / 3;
      const r = rng();
      const col = r > down * 2.2 ? (r > 0.78 ? pal.grey : pal.top) : v < -0.25 ? pal.lit : v > 0.4 ? pal.deep : pal.mid;
      hair(ctx, a.x + (b.x - a.x) * t - Math.sin(ang) * v * ww, a.y + (b.y - a.y) * t + Math.cos(ang) * v * ww, ang + (rng() - 0.5) * 0.4, 15 + rng() * 13, 3.8, col, 0.55, 0.1);
    }
  }
}

export function paintCoyoteLeg(ctx: CanvasRenderingContext2D, j: Joints, far: boolean, boil: number, seed: number): void {
  const { upper, rest } = parts(j);
  const pal = far ? FAR : NEAR;
  for (const s of far ? [upper, ...rest] : rest) underlay(ctx, s, LINE, C.ink);
  const [r, a, , c] = j.pts;
  const g = linear(ctx, r, c, [[0, pal.top], [0.34, pal.top], [0.6, pal.mid], [0.8, pal.lit], [1, pal.paw]]);
  fillShape(ctx, upper, far ? g : linear(ctx, r, a, [[0, rgba(pal.top, 0)], [0.3, rgba(pal.top, 0.15)], [0.85, pal.top], [1, pal.top]]));
  for (const s of rest) fillShape(ctx, s, g);
  ctx.save();
  ctx.beginPath();
  for (const s of [upper, ...rest]) {
    s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.clip();
  fur(ctx, j, far, rngOf(seed));
  // Muscle: lit on the front of the thigh or forearm, shaded behind; the joint's hollow.
  const [, e, f] = j.pts;
  soft(ctx, (e.x + f.x) / 2 - 26, (e.y + f.y) / 2, 60, 22, Math.atan2(f.y - e.y, f.x - e.x), '#3a2a1c', 0.3);
  soft(ctx, (e.x + f.x) / 2 + 20, (e.y + f.y) / 2 - 6, 60, 13, Math.atan2(f.y - e.y, f.x - e.x), '#fff0d0', far ? 0.12 : 0.34);
  soft(ctx, f.x, f.y, 24, 18, 0, '#3a2a1c', 0.28);
  ctx.restore();
  toes(ctx, j, boil, seed, far);
}

function toes(ctx: CanvasRenderingContext2D, j: Joints, boil: number, seed: number, far: boolean): void {
  const { along } = pawFrame(j);
  const pen = new Pen(ctx, seed + boil * 5, 0.4);
  // Two toes forward on this side, parted by dark lines; claws off their tips; the pad beneath.
  for (const [n0, n1, l] of [[-8, -3, 50], [3, 7, 52]] as const) pen.stroke([along(22, n0), along(38, (n0 + n1) / 2), along(l, n1)], 4, C.ink, 0.9, false);
  for (const [l, n] of [[47, -9], [54, 2], [47, 10]] as const) fillShape(ctx, [along(l - 3, n - 4), along(l + 13, n + 4), along(l - 3, n + 4)], C.black);
  pen.stroke([along(-4, 12), along(18, 15), along(42, 12)], 4.5, C.black, far ? 0.6 : 0.8, false);
}
