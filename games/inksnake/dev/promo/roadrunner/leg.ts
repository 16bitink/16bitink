import { Pen } from '../../../src/art/pen';
import { BIRD as B, clipTo, curve, feather, fillShape, hair, linear, pt, type Pt, rngOf, soft, underlay } from './paint';

/**
 * A roadrunner's leg: the knee hidden in the flank, a feathered drumstick
 * down and back to the ankle (which bends backwards), the long bare
 * blue-grey tarsus with its scutes, and the zygodactyl foot: two toes
 * forward, two back, an X on the ground.
 */
export interface LegPose {
  /** The foot's joint (where the toes meet) from the hip, unpitched. */
  readonly foot: Pt;
  /** 0 flat on the ground .. 1 hanging, toes drooped and together. */
  readonly lift: number;
}

const TIBIA = 430;
const TARSUS = 440;
const KNEE_NEAR = pt(120, 80);
const KNEE_FAR = pt(150, 70);
const SEED = 4900;

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** The ankle, bending backwards, for a knee and a foot (both reached for as far as the bones go). */
export function ankleOf(knee: Pt, foot: Pt): Pt {
  const d = Math.min(TIBIA + TARSUS - 4, Math.hypot(foot.x - knee.x, foot.y - knee.y));
  const a = Math.atan2(foot.y - knee.y, foot.x - knee.x);
  const k = Math.acos(Math.max(-1, Math.min(1, (TIBIA * TIBIA + d * d - TARSUS * TARSUS) / (2 * TIBIA * d))));
  return pt(knee.x + Math.cos(a + k) * TIBIA, knee.y + Math.sin(a + k) * TIBIA);
}

interface Bones {
  readonly knee: Pt;
  readonly ankle: Pt;
  readonly foot: Pt;
}

export function bones(l: LegPose, tilt: number, far: boolean): Bones {
  const knee = rot(far ? KNEE_FAR : KNEE_NEAR, tilt);
  const ankle = ankleOf(knee, l.foot);
  return { knee, ankle, foot: l.foot };
}

/** A tapered limb with curved sides. */
function limb(a: Pt, b: Pt, w0: number, w1: number, bulge: number): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const [nx, ny] = [-Math.sin(ang), Math.cos(ang)];
  const at = (t: number, s: number): Pt => {
    const w = (w0 + (w1 - w0) * t) / 2 + bulge * Math.sin(Math.PI * Math.min(1, t * 1.35) ** 0.8);
    return pt(a.x + (b.x - a.x) * t + nx * w * s, a.y + (b.y - a.y) * t + ny * w * s);
  };
  const ts = Array.from({ length: 13 }, (_, i) => i / 12);
  return [...ts.map((t) => at(t, 1)), ...[...ts].reverse().map((t) => at(t, -1))];
}

const drum = (b: Bones): Pt[] => limb(b.knee, b.ankle, 210, 62, 22);

function tarsus(b: Bones): Pt[] {
  const s = limb(b.ankle, b.foot, 58, 44, -2);
  return s;
}

/** A knob at the ankle and at the foot's joint. */
function knob(p: Pt, r: number): Pt[] {
  return Array.from({ length: 16 }, (_, i) => pt(p.x + Math.cos((i / 16) * 6.2832) * r, p.y + Math.sin((i / 16) * 6.2832) * r));
}

interface Toe {
  readonly shape: Pt[];
  readonly line: Pt[];
  readonly claw: Pt[];
}

/** One toe: jointed, thick at its root, its claw hooked. `dir` +1 forward, −1 back. */
function toe(foot: Pt, dir: number, len: number, drop: number, lift: number, spread: number): Toe {
  const bend = lift * 1.25;
  const pts: Pt[] = [foot];
  let a = dir > 0 ? 0.32 + spread : Math.PI - 0.32 - spread;
  a += dir * bend * 0.55;
  for (let i = 0; i < 3; i++) {
    const l = len * [0.4, 0.33, 0.27][i]!;
    const p = pts[pts.length - 1]!;
    pts.push(pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l));
    a += dir * (lift > 0.05 ? bend * 0.35 : 0) - (lift > 0.05 ? 0 : (dir > 0 ? 1 : -1) * (0.3 + spread * 0.5) * (i === 0 ? 0.9 : 0.1));
  }
  const line = curve(pts.map((p, i) => pt(p.x, p.y + (i > 0 ? drop : 0))), 8);
  const n = line.length - 1;
  const half = (i: number): number => 21 - 9 * (i / n) + 3.5 * Math.abs(Math.sin((i / n) * Math.PI * 3));
  const ang = (i: number): number => Math.atan2(line[Math.min(n, i + 1)]!.y - line[Math.max(0, i - 1)]!.y, line[Math.min(n, i + 1)]!.x - line[Math.max(0, i - 1)]!.x);
  const sideOf = (s: number): Pt[] => line.map((p, i) => pt(p.x - Math.sin(ang(i)) * half(i) * s, p.y + Math.cos(ang(i)) * half(i) * s));
  const e = line[n]!;
  const ea = ang(n);
  const hook = (l: number, m: number): Pt => pt(e.x + Math.cos(ea) * l - Math.sin(ea) * m * dir, e.y + Math.sin(ea) * l + Math.cos(ea) * m * dir);
  return { shape: [...sideOf(1), ...sideOf(-1).reverse()], line, claw: [...curve([hook(-4, -11), hook(26, -9), hook(50, 16)], 5), ...curve([hook(50, 16), hook(24, 8), hook(-4, 11)], 5)] };
}

function toes(l: LegPose): Toe[] {
  const f = l.foot;
  return [toe(f, -1, 190, 4, l.lift, 0.22), toe(f, 1, 215, -2, l.lift, 0.05), toe(f, -1, 150, 12, l.lift, 0.02), toe(f, 1, 250, 14, l.lift, 0.2)];
}

export function legUnder(ctx: CanvasRenderingContext2D, l: LegPose, tilt: number, line: number, far: boolean): void {
  const b = bones(l, tilt, far);
  for (const t of toes(l)) {
    underlay(ctx, t.claw, line * 0.6, B.ink);
    underlay(ctx, t.shape, line * 0.8, B.ink);
  }
  underlay(ctx, tarsus(b), line * 0.9, B.ink);
  underlay(ctx, knob(b.ankle, 38), line * 0.9, B.ink);
  underlay(ctx, drum(b), line, B.ink);
}

export function legFill(ctx: CanvasRenderingContext2D, l: LegPose, tilt: number, boil: number, far: boolean, k: number): void {
  const b = bones(l, tilt, far);
  const pen = new Pen(ctx, SEED + boil * 7 + (far ? 50 : 0), 0.7);
  const ts = toes(l);
  const skin = (s: readonly Pt[], a: Pt, c: Pt): void => fillShape(ctx, s, linear(ctx, a, c, [[0, B.legLit], [0.5, B.legMid], [1, B.legDark]]));
  ts.forEach((t, i) => {
    // The inner toes sit behind: draw each with its own edge so the X reads.
    if (i >= 2) underlay(ctx, t.shape, 5 * k, B.ink);
    fillShape(ctx, t.claw, B.claw);
    skin(t.shape, pt(0, t.line[0]!.y - 24), pt(0, t.line[0]!.y + 70));
    clipTo(ctx, t.shape, () => {
      for (let j = 2; j < t.line.length - 1; j += 3) {
        const p = t.line[j]!;
        hair(ctx, p.x, p.y - 20, 1.57, 34, 5, B.legDark, 0.6, 0.1);
      }
    });
  });
  const tar = tarsus(b);
  const a = Math.atan2(b.foot.y - b.ankle.y, b.foot.x - b.ankle.x);
  const n = pt(-Math.sin(a), Math.cos(a));
  const shade = linear(ctx, pt(b.ankle.x - n.x * 30, b.ankle.y - n.y * 30), pt(b.ankle.x + n.x * 30, b.ankle.y + n.y * 30), [[0, B.legLit], [0.45, B.legMid], [1, B.legDark]]);
  fillShape(ctx, knob(b.foot, 26), shade);
  fillShape(ctx, knob(b.ankle, 38), shade);
  fillShape(ctx, tar, shade);
  clipTo(ctx, tar, () => {
    // The scutes down the shin.
    for (let t = 0.05; t < 0.98; t += 0.055) {
      const p = pt(b.ankle.x + (b.foot.x - b.ankle.x) * t - n.x * 30, b.ankle.y + (b.foot.y - b.ankle.y) * t - n.y * 30);
      hair(ctx, p.x, p.y, a + 1.15, 54, 5, B.legDark, 0.7, 0.2);
    }
  });
  const d = drum(b);
  fillShape(ctx, d, linear(ctx, pt(b.knee.x + 110, b.knee.y), pt(b.knee.x - 130, b.knee.y + 60), [[0, B.belly], [0.5, B.throat], [1, B.brown]]));
  const rng = rngOf(SEED + 20);
  const da = Math.atan2(b.ankle.y - b.knee.y, b.ankle.x - b.knee.x);
  for (let i = 0; i < 64; i++) {
    const t = 0.98 - (i / 64) * 1.05;
    const w = (105 - 74 * Math.max(0, t)) * 0.92;
    const v = (rng() - 0.5) * 2 * w;
    const p = pt(b.knee.x + Math.cos(da) * TIBIA * t - Math.sin(da) * v, b.knee.y + Math.sin(da) * TIBIA * t + Math.cos(da) * v);
    const r = rng();
    feather(ctx, p.x, p.y, da + (rng() - 0.5) * 0.3, 60 + r * 26, 24, { edge: r < 0.6 ? B.belly : B.edge, core: B.coreSoft, k: r < 0.3 ? 0.3 : 0 }, 0.9, 0.05);
  }
  clipTo(ctx, d, () => soft(ctx, b.ankle.x - 40, b.ankle.y - 60, 130, 170, 0, '#6d5a44', far ? 0.5 : 0.32));
  if (far) {
    // The far leg in the body's shade.
    for (const s of [d, tar, ...ts.map((t) => t.shape)]) fillShape(ctx, s, '#2a2230', 0.3);
  }
  void pen;
}
