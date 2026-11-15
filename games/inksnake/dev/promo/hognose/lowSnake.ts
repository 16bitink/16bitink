import { cub, makeDraw, pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { spineOf } from '../pythonbear/python';
import { clamp01, smooth } from '../short';
import { bodyWidth, drawTube, drawTubeShadow, type Tube, tubeSeed } from './lowBody';
import { HEAD_CANVAS, NECK_R, SNOUT, TONGUE_ROOT } from './lowHead';
import { HOG } from './lowPaint';
import type { SnakeState } from './stage';

/**
 * The hognose lying in the sand in the low shots: its body in a loose S
 * from the head (on the left of the middle, facing the fox) round to the
 * short tail, twisted when it plays dead (belly up behind the head, a coil
 * turned half over, the tail back up), all back up when alive. A roll runs
 * down the body from the head as a wave. The head at the front: side on,
 * shut, or upside down and gaping when dead, the tongue hanging limp out of
 * it into the sand; to peek it turns right side up and lifts.
 */
export interface LowCast {
  readonly skin: HTMLCanvasElement;
  readonly soft: HTMLCanvasElement;
  readonly shade: HTMLCanvasElement;
  readonly shut: readonly HTMLCanvasElement[];
  readonly gape: readonly HTMLCanvasElement[];
}

const PI = Math.PI;
/** The spine's knots from under the head back to the tail's tip; the head's middle is knot 1. */
const KNOTS: readonly Pt[] = [
  pt(372, 1268), pt(330, 1270), pt(190, 1290), pt(70, 1350), pt(0, 1450), pt(30, 1580), pt(210, 1676), pt(470, 1724), pt(720, 1704), pt(900, 1636), pt(982, 1548), pt(952, 1470),
];
/**
 * How far each knot is rolled over when it plays dead and when alive (lowBody.ts Tube.rolls: 0 back up,
 * π belly straight up; on the stretches running left to right about 0.6π turns the belly full to the low
 * camera, on the neck running right to left about 1.4π does).
 */
const DEAD: readonly number[] = [PI, PI, 1.3 * PI, 1.4 * PI, PI, 0.64 * PI, 0.62 * PI, 0.6 * PI, 0.5 * PI, 0.32 * PI, 0.25 * PI, 0.2 * PI];
const ALIVE: readonly number[] = [0, 0, 0, 0.04 * PI, 0.1 * PI, 0.1 * PI, 0, 0, 0.05 * PI, 0.1 * PI, 0.12 * PI, 0.12 * PI];

/** Nearer the camera (lower on screen) is bigger. */
const depthAt = (y: number): number => 1 + (y - 1270) * 0.0005;

const cumulative = (pts: readonly Pt[]): number[] => pts.reduce<number[]>((acc, p, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y)], []);

function interp(values: readonly number[], at: readonly number[], s: number): number {
  for (let i = 1; i < at.length; i++) {
    if (s <= at[i]!) {
      const u = (s - at[i - 1]!) / (at[i]! - at[i - 1]! || 1);
      return values[i - 1]! + (values[i]! - values[i - 1]!) * u;
    }
  }
  return values[values.length - 1]!;
}

export interface LowPlaced {
  readonly tube: Tube;
  /** The head's origin on screen, its facing (radians) and scale; flip is the vertical scale (−1 upside down). */
  readonly head: Pt;
  readonly angle: number;
  readonly scale: number;
  readonly flip: number;
}

export function placeLow(st: SnakeState, shake: Pt): LowPlaced {
  const lift = st.lift;
  const knots = KNOTS.map((p, i) => pt(p.x + shake.x, p.y + shake.y - (i === 0 ? 34 : i === 1 ? 28 : i === 2 ? 8 : 0) * lift));
  const at = cumulative(knots);
  const total = at[at.length - 1]!;
  const roll = KNOTS.map((_, i) => {
    const s = at[i]! / total;
    if (i === 0) return PI * st.headRoll;
    if (i === 1) return DEAD[1]! * st.headRoll;
    const w = smooth(clamp01(st.roll * 1.5 - 0.5 * s));
    return ALIVE[i]! + (DEAD[i]! - ALIVE[i]!) * w;
  });
  const spine = spineOf(knots, 5);
  const sAt = cumulative(spine);
  const sTotal = sAt[sAt.length - 1]!;
  const rolls = sAt.map((s) => interp(roll, at, (s / sTotal) * total));
  // The neck swells a little to meet the head, which is a touch wider than the body.
  const swell = (s: number): number => 1 + 0.12 * Math.max(0, 1 - s / (at[2]! * (sTotal / total)));
  const widths = spine.map((p, i) => bodyWidth(sAt[i]! / sTotal, depthAt(p.y)) * swell(sAt[i]!));
  const head = knots[1]!;
  const back = spine.find((_, i) => sAt[i]! > at[1]! + 40) ?? spine[spine.length - 1]!;
  const angle = Math.atan2(head.y - back.y, head.x - back.x) - lift * 0.14 + st.turn;
  const scale = (bodyWidth(0, depthAt(head.y)) / (NECK_R * 2)) * (1.1 + 0.06 * lift);
  const c = Math.cos(PI * st.headRoll);
  const flip = Math.sign(c || 1) * Math.max(0.06, Math.abs(c));
  return { tube: { spine, widths, rolls }, head, angle, scale, flip };
}

/** A point in head units (as painted, facing +x) on screen. */
export function headPoint(p: LowPlaced, q: Pt): Pt {
  const x = q.x * p.scale;
  const y = q.y * p.scale * p.flip;
  return pt(p.head.x + x * Math.cos(p.angle) - y * Math.sin(p.angle), p.head.y + x * Math.sin(p.angle) + y * Math.cos(p.angle));
}

function drawHead(ctx: CanvasRenderingContext2D, cast: LowCast, p: LowPlaced, gape: boolean, boil: number): void {
  const frames = gape ? cast.gape : cast.shut;
  const canvas = frames[((boil % frames.length) + frames.length) % frames.length]!;
  ctx.save();
  ctx.translate(p.head.x, p.head.y);
  ctx.rotate(p.angle);
  ctx.scale(p.scale, p.scale * p.flip);
  ctx.drawImage(canvas, -HEAD_CANVAS.ox, -HEAD_CANVAS.oy, HEAD_CANVAS.w, HEAD_CANVAS.h);
  ctx.restore();
}

/** The limp tongue: dark grey-black and slim, lying on the roof of the upside-down mouth, spilling over the front of the jaw that lies lowest and down onto the sand, its fork splayed there; `out` slides it out. */
const TONGUE = { body: '#2a292e', lit: '#5a5862' } as const;

function drawHanging(ctx: CanvasRenderingContext2D, p: LowPlaced, out: number, boil: number): void {
  if (out <= 0.02) return;
  const r = TONGUE_ROOT;
  // Head units as painted (headPoint flips them): down on screen is −y here.
  const path = [
    ...cub(r, pt(200, 8), pt(236, 4), pt(256, -8), 8),
    ...cub(pt(256, -8), pt(268, -20), pt(270, -52), pt(280, -80), 8).slice(1),
    ...cub(pt(280, -80), pt(288, -88), pt(300, -89), pt(314, -87), 5).slice(1),
  ];
  const n = Math.max(2, Math.round(path.length * out));
  const pts = path.slice(0, n).map((q) => headPoint(p, q));
  const pen = makeDraw(ctx, 53000 + boil * 3, 0, 0, HOG.line).pen;
  const w = 7 * p.scale;
  pen.stroke(pts, w + 2.6, HOG.line, 0.9, false);
  pen.stroke(pts, w, TONGUE.body, 1, false);
  pen.hair(pts.slice(1, -1).map((q) => pt(q.x - w * 0.15, q.y - w * 0.2)), w * 0.25, TONGUE.lit, 0.7);
  if (out < 0.85) return;
  const tip = pts[pts.length - 1]!;
  const prev = pts[Math.max(0, pts.length - 3)]!;
  const a = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  for (const s of [-0.3, 0.3]) {
    const end = pt(tip.x + Math.cos(a + s) * 20 * p.scale, tip.y + Math.sin(a + s) * 20 * p.scale);
    pen.stroke([tip, end], w * 0.5 + 1.6, HOG.line, 0.85, false);
    pen.stroke([tip, end], w * 0.5, TONGUE.body, 1, false);
  }
  // Its shadow in the sand.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#4a3820';
  ctx.beginPath();
  ctx.ellipse(tip.x - 8, tip.y + 6, 30 * p.scale, 5 * p.scale, a * 0.2, 0, PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A live flick: the forked tongue straight out of the notch under the snout and back. */
function drawFlick(ctx: CanvasRenderingContext2D, p: LowPlaced, f: number, boil: number): void {
  if (f <= 0.02) return;
  const from = headPoint(p, pt(SNOUT.x - 6, SNOUT.y + 4));
  const tip = headPoint(p, pt(SNOUT.x + 70 * f, SNOUT.y + 10));
  const pen = makeDraw(ctx, 53100 + boil, 0, 0, HOG.line).pen;
  const w = 7 * p.scale;
  pen.stroke([from, tip], w, HOG.tongue, 1, false);
  for (const s of [-0.4, 0.4]) pen.stroke([tip, pt(tip.x + Math.cos(p.angle + s) * 26 * f * p.scale, tip.y + Math.sin(p.angle + s) * 26 * f * p.scale)], w * 0.6, HOG.tongue, 1, false);
}

export function drawLowSnake(ctx: CanvasRenderingContext2D, cast: LowCast, st: SnakeState, boil: number, shake: Pt): LowPlaced {
  const p = placeLow(st, shake);
  drawTubeShadow(ctx, p.tube);
  drawTube(ctx, { sharp: cast.skin, soft: cast.soft }, cast.shade, p.tube, tubeSeed(boil));
  drawHead(ctx, cast, p, st.headRoll >= 0.5 && st.mouth === 'open', boil);
  if (st.headRoll >= 0.5) drawHanging(ctx, p, st.tongue, boil);
  else drawFlick(ctx, p, st.flick, boil);
  return p;
}

/** Points along the body for the stink lines and the dust (a share of its length from the head). */
export function bodyPoint(p: LowPlaced, share: number): Pt {
  const { spine } = p.tube;
  return spine[Math.min(spine.length - 1, Math.max(0, Math.round(share * (spine.length - 1))))]!;
}
