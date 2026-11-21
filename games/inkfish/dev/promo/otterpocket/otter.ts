import { Pen, type Pt } from '../../../src/art/pen';
import { smoothLoop } from '../seal/art/paint';
import { dab, fur, limb, lwOf, path, radialFill, rngOf, through } from './brush';
import { drawHead, type FaceLook } from './face';
import { drawOpening, foldOf, inkUnion, inside, unionPath } from './pouch';

/**
 * The painted sea otter, floating on its back seen from above, head up the
 * frame: a dense dark-brown body, the paler grizzled head (face.ts), small
 * front paws on arms that move, big webbed hind flippers held up out of the
 * water, and a thick flat tail trailing under the surface. Under each arm is
 * the pouch: a loose fold of skin that shows when the arm is raised, the right
 * one holding a round stone. Local units: the chest at 0,0, about 1,100 from
 * the top of the head to the tail tip.
 */

export interface Arm {
  readonly elbow: Pt;
  readonly paw: Pt;
}

export interface OtterPose {
  /** The arms, screen left and screen right. */
  readonly armL: Arm;
  readonly armR: Arm;
  readonly face: FaceLook;
  /** The right pouch's flap pulled open, 0..1. */
  readonly pouchOpen: number;
  /** The stone in the right pouch: how much of it there is (0 none, 1 there), and how far it's lifted out. */
  readonly stone: number;
  readonly stoneLift: number;
  /** The toes spread, 0..1. */
  readonly toes: number;
  /** The pouches shown under raised arms (0 when the arms are busy with the clam). */
  readonly pouch: number;
  /** Seen from behind (diving), no face or arms. */
  readonly back: boolean;
}

export const SHOULDER_L: Pt = { x: -196, y: -228 };
export const SHOULDER_R: Pt = { x: 196, y: -228 };
/** Where the stone sits on the chest for the smash. */
export const CHEST_STONE: Pt = { x: 0, y: -62 };

const BODY: readonly Pt[] = smoothLoop([
  { x: 0, y: -322 }, { x: 150, y: -300 }, { x: 226, y: -238 }, { x: 258, y: -120 }, { x: 270, y: 20 }, { x: 262, y: 160 },
  { x: 222, y: 272 }, { x: 160, y: 342 }, { x: 76, y: 380 }, { x: 0, y: 390 }, { x: -76, y: 380 }, { x: -160, y: 342 },
  { x: -222, y: 272 }, { x: -262, y: 160 }, { x: -270, y: 20 }, { x: -258, y: -120 }, { x: -226, y: -238 }, { x: -150, y: -300 },
], 6);

const DARK = '#2b1a12';
const BROWN_INKS: readonly (readonly [string, number])[] = [['#a47b55', 0.3], ['#1e120c', 0.38], ['#7c5638', 0.3], ['#c9a57e', 0.18]];

/** How far an arm is raised off the chest, 0..1 (the pouch under it shows as it goes up). */
export const raisedOf = (a: Arm): number => Math.max(0, Math.min(1, (-a.elbow.y - 60) / 260));

function drawTail(ctx: CanvasRenderingContext2D, pen: Pen, lw: number): void {
  const spine = through({ x: 0, y: 300 }, { x: 18, y: 500 }, { x: -10, y: 700 }, 16);
  const shape = limb(spine, 150, 92);
  radialFill(ctx, shape, { x: -20, y: 460 }, 260, [[0, '#5a3b27'], [0.7, '#34221a'], [1, '#1f140e']]);
  fur(ctx, rngOf(51), shape, { count: 160, dir: () => Math.PI / 2, len: [12, 22], width: 3, inks: BROWN_INKS });
  pen.closed(shape, 3 * lw);
  // Under the surface: a cool wash over it, deeper towards the tip.
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 380, 0, 720);
  g.addColorStop(0, 'rgba(24,70,62,0.15)');
  g.addColorStop(1, 'rgba(18,58,52,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(-120, 300, 240, 440);
  ctx.restore();
}

const SKIN_STOPS = {
  front: [[0, '#80583a'], [0.55, '#5c3b27'], [1, '#2a1a12']],
  back: [[0, '#5e3e2a'], [0.6, '#3e281b'], [1, '#22150e']],
} as const;

/**
 * The body's paint (wash, light and shade, fur) inside `clip`: laid over the
 * whole body and its skin folds at once, and again over a fold's lower lip,
 * so a fold is the same fur as the body round it.
 */
function paintSkin(ctx: CanvasRenderingContext2D, clip: () => void, bounds: readonly Pt[], back: boolean, seed: number, count: number): void {
  ctx.save();
  clip();
  ctx.clip();
  const g = ctx.createRadialGradient(-50, -30, 0, -50, -30, 330);
  for (const [at, colour] of back ? SKIN_STOPS.back : SKIN_STOPS.front) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(-500, -500, 1000, 1000);
  if (!back) {
    // The chest grizzled paler towards the head.
    dab(ctx, 0, -250, 230, '186,160,124', 0.55);
    dab(ctx, -60, -40, 200, '150,112,78', 0.25);
  }
  // Shade down the right flank and the hips, light on the left.
  dab(ctx, 250, 120, 210, '20,12,8', 0.5);
  dab(ctx, 0, 380, 190, '20,12,8', 0.35);
  dab(ctx, -230, -80, 140, '200,160,118', 0.18);
  ctx.restore();
  const within = (): void => {
    clip();
    ctx.clip();
  };
  // The fur runs down the body, fanning out to the sides.
  fur(ctx, rngOf(seed), bounds, { count, dir: (p) => Math.atan2(1, p.x / 420), len: [16, 30], width: 3.4, inks: BROWN_INKS, clip: within });
  if (!back) {
    fur(ctx, rngOf(seed + 1), bounds, {
      count: Math.round(count * 0.24), dir: (p) => Math.atan2(1, p.x / 300), len: [10, 18], width: 2.4, inks: [['#e6d6b8', 0.35], ['#cdb48e', 0.3]],
      density: (p) => Math.max(0, 1 - Math.hypot(p.x, p.y + 260) / 230), clip: within,
    });
  }
}

/** The body, with a skin fold (the pouch) grown out under each raised arm, and the right fold's opening. */
function drawBody(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, pose: OtterPose): void {
  const back = pose.back;
  const shownL = back ? 0 : pose.pouch * raisedOf(pose.armL);
  const shownR = back ? 0 : pose.pouch * raisedOf(pose.armR);
  const folds = ([[-1, shownL], [1, shownR]] as const).filter(([, k]) => k > 0.01).map(([s, k]) => ({ s, k, fold: foldOf(s, k) }));
  const shapes = [BODY, ...folds.map((f) => f.fold)];
  const bounds = shapes.flat();
  paintSkin(ctx, () => unionPath(ctx, shapes), bounds, back, back ? 77 : 7, 1250);
  // Rim light along the left flank.
  ctx.save();
  unionPath(ctx, shapes);
  ctx.clip();
  ctx.strokeStyle = 'rgba(214,180,138,0.22)';
  ctx.lineWidth = 26;
  ctx.beginPath();
  BODY.filter((p) => p.x < -120).forEach((p, i) => (i ? ctx.lineTo(p.x + 10, p.y) : ctx.moveTo(p.x + 10, p.y)));
  ctx.stroke();
  ctx.restore();
  inkUnion(pen, shapes, 3.6 * lw);
  // Little tufts breaking the outline.
  const rng = rngOf(91);
  for (let i = 0; i < BODY.length; i += 3) {
    const p = BODY[i]!;
    const a = Math.atan2(p.y - 20, p.x) + (rng() - 0.5) * 0.6;
    if (folds.some((f) => inside(f.fold, p))) continue;
    pen.hair([p, { x: p.x + Math.cos(a) * 9, y: p.y + Math.sin(a) * 9 }], 1.6 * lw, DARK, 0.8);
  }
  for (const f of folds) {
    const right = f.s > 0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.k * 1.5);
    drawOpening(ctx, pen, lw, f.s, f.fold, right ? pose.pouchOpen : 0.2, right ? pose.stone : 0, pose.stoneLift, (clip) => {
      paintSkin(ctx, clip, f.fold, back, 300 + f.s, 260);
    });
    ctx.restore();
  }
}

/** A hind flipper held up, sole to the sky: a broad webbed fan of five toes. */
function drawFoot(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, side: number, toes: number, back: boolean): void {
  const heel = { x: side * 92, y: 292 };
  const dir = Math.atan2(1, side * 0.42);
  const spread = 0.42 + 0.12 * toes;
  const reach = 190;
  const tips = Array.from({ length: 5 }, (_, i) => {
    const a = dir + spread * (i / 2 - 1);
    const r = reach * (1 - 0.06 * Math.abs(i - 2));
    return { x: heel.x + Math.cos(a) * r, y: heel.y + Math.sin(a) * r, a };
  });
  const outline: Pt[] = [];
  const wide = (a: number, r: number): Pt => ({ x: heel.x + Math.cos(a) * r, y: heel.y + Math.sin(a) * r });
  outline.push(wide(dir - spread * 1.35, 48));
  tips.forEach((t, i) => {
    outline.push(wide(t.a - 0.1, Math.hypot(t.x - heel.x, t.y - heel.y) - 6), { x: t.x, y: t.y }, wide(t.a + 0.1, Math.hypot(t.x - heel.x, t.y - heel.y) - 6));
    if (i < 4) outline.push(wide(t.a + spread / 4, reach * 0.8));
  });
  outline.push(wide(dir + spread * 1.35, 48), wide(dir + Math.PI, 40));
  const shape = smoothLoop(outline, 4);
  radialFill(ctx, shape, { x: heel.x - side * 10, y: heel.y + 70 }, 200, back
    ? [[0, '#5a3b28'], [1, '#2a1a12']]
    : [[0, '#4a3830'], [0.6, '#33241d'], [1, '#1b120e']]);
  if (back) fur(ctx, rngOf(60 + side), shape, { count: 120, dir: () => dir, len: [10, 18], width: 2.6, inks: BROWN_INKS });
  else {
    // The sole: a pad on each toe, a broad heel pad, webs between the toes.
    for (const t of tips) dab(ctx, heel.x + (t.x - heel.x) * 0.86, heel.y + (t.y - heel.y) * 0.86, 20, '110,92,82', 0.75);
    dab(ctx, heel.x + Math.cos(dir) * 70, heel.y + Math.sin(dir) * 70, 52, '96,78,68', 0.6);
    for (let i = 0; i < 4; i++) {
      const a = (tips[i]!.a + tips[i + 1]!.a) / 2;
      pen.hair([wide(a, 92), wide(a, reach * 0.74)], 1.2 * lw, '#0e0907', 0.45);
    }
  }
  pen.closed(shape, 3 * lw);
  // The ankle's fur over the heel.
  const ankle = limb(through({ x: side * 84, y: 282 }, { x: side * 90, y: 300 }, { x: heel.x + Math.cos(dir) * 34, y: heel.y + Math.sin(dir) * 34 }, 8), 84, 70);
  radialFill(ctx, ankle, { x: side * 70, y: 270 }, 120, [[0, '#6a4630'], [1, '#2e1d14']]);
  fur(ctx, rngOf(70 + side), ankle, { count: 90, dir: () => dir, len: [10, 18], width: 3, inks: BROWN_INKS });
}

/** One arm, shoulder to paw, and its small dark mitten of a paw. */
export function drawArm(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, shoulder: Pt, arm: Arm, seed: number): void {
  const spine = through(shoulder, arm.elbow, arm.paw, 18);
  const shape = limb(spine, 96, 60);
  const mid = spine[9]!;
  radialFill(ctx, shape, { x: mid.x - 30, y: mid.y - 30 }, 220, [[0, '#7a5338'], [0.6, '#4d3221'], [1, '#24170f']]);
  const along = (p: Pt): number => {
    let best = 0;
    let d = Infinity;
    spine.forEach((q, i) => {
      const e = Math.hypot(q.x - p.x, q.y - p.y);
      if (e < d) [d, best] = [e, i];
    });
    const a = spine[Math.max(0, best - 1)]!;
    const b = spine[Math.min(spine.length - 1, best + 1)]!;
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  fur(ctx, rngOf(seed), shape, { count: 260, dir: along, len: [12, 22], width: 3, inks: BROWN_INKS });
  pen.closed(shape, 3.2 * lw);
  // The paw: a rounded mitten, darker, toes creased across its end.
  const end = spine[spine.length - 1]!;
  const before = spine[spine.length - 4]!;
  const a = Math.atan2(end.y - before.y, end.x - before.x);
  ctx.save();
  ctx.translate(end.x, end.y);
  ctx.rotate(a);
  const paw = smoothLoop([{ x: -26, y: -34 }, { x: 22, y: -36 }, { x: 46, y: -18 }, { x: 52, y: 4 }, { x: 44, y: 26 }, { x: 18, y: 36 }, { x: -24, y: 32 }], 5);
  radialFill(ctx, paw, { x: 6, y: -6 }, 60, [[0, '#4a3328'], [0.7, '#2c1d15'], [1, '#160e0a']]);
  for (const y of [-20, -4, 12]) pen.hair([{ x: 30, y: y * 1.2 }, { x: 48, y: y * 1.1 + 2 }], 1.6 * lw, '#0b0705', 0.7);
  dab(ctx, 6, -12, 20, '170,140,120', 0.18);
  pen.closed(paw, 3 * lw);
  ctx.restore();
}

/**
 * The whole otter at the origin of the current transform. `held` is drawn
 * over the body and head and under the arms (the stone on the chest, a clam
 * in the paws).
 */
export function drawOtter(ctx: CanvasRenderingContext2D, pose: OtterPose, boil: number, held?: (pen: Pen) => void): void {
  const lw = lwOf(ctx);
  const pen = new Pen(ctx, 4100 + boil * 977, 0.9 * lw);
  drawTail(ctx, pen, lw);
  drawBody(ctx, pen, lw, pose);
  for (const s of [-1, 1]) drawFoot(ctx, pen, lw, s, pose.toes, pose.back);
  drawHead(ctx, pen, lw, pose.face, pose.back);
  held?.(pen);
  if (pose.back) return;
  drawArm(ctx, pen, lw, SHOULDER_L, pose.armL, 21);
  drawArm(ctx, pen, lw, SHOULDER_R, pose.armR, 22);
}
