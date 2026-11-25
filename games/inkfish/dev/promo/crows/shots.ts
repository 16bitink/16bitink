import { type Pt } from '../../../src/art/pen';
import { dab, softLine, taper } from '../seal/art/paint';
import { clamp01, lerp, ramp, VIDEO } from '../short';
import { drawCarCorner, drawCarFront, drawWheel, type Paint, PAINTS } from './art/car';
import { drawCrow } from './art/crow';
import { fillShape, groundShadow, inkLine, linear, P, spline } from './art/ink';
import { drawBack, drawFallen, drawPavement, drawRoad, drawStripe, type Ground, project } from './art/street';
import { drawHalfShell, drawKernel, drawShellBits, drawWalnut } from './art/walnut';
import {
  AT, burstAt, CRUNCH_NUT, CRUNCH_GROUND, CRUNCH_NUT_R, CRUNCH_WHEEL, crunchWheel, DROP_NUT_R, dropNut, dropPose, hardNut, HARD_NUT_R,
  hardPose, HOOK_NUT, HOOK_NUT_R, HOOK_WHEEL, hookNutDown, hookPose, hookWheelX, IMPACT, kernelAt, shellAt, laughPose, MISS_CROW_Y, MISS_NUT, missAt, missPose, MOVE_NUT, MOVE_WHEEL,
  moveNut, movePose, peckAt, sceneFrom, sendaiPose, WAIT_NUT, waitPose, WIRE_Y, wrap,
} from './story';
import { better, crossing, traffic } from './streetShots';

/** The shots of the short, each painted from its state in story.ts (the street-wide ones are in streetShots.ts). */

const W = VIDEO.width;
type Ctx = CanvasRenderingContext2D;
export type Shot = (ctx: Ctx, t: number, boil: number) => void;

const LOW: Ground = { vx: 640, hy: 860, f: 1400, h: 0.55 };

/** The close-ups' place: the street out of focus, the pale road under the bird. */
function lowRoad(ctx: Ctx, g: Ground, vx: number, dx: number, k = 1.5): void {
  drawBack(ctx, vx, g.hy + 30, k, true);
  drawRoad(ctx, g, dx);
  // Haze over the line where the road meets the street.
  softLine(ctx, P(-100, g.hy, W + 100, g.hy), 170, '#f3e2bd', 0.95, 18);
}

/** A big wheel under its corner of car, the car's nose towards `side`. */
function bigWheel(ctx: Ctx, c: Pt, r: number, depth: number, side: 1 | -1, spin: number, paint: Paint, ground: number, boil: number): void {
  groundShadow(ctx, c.x - side * 120, ground + 6, 620, 56, 0.75);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale((side * r) / 100, r / 100);
  drawCarCorner(ctx, paint, boil);
  ctx.restore();
  drawWheel(ctx, c, r, spin, depth, side, boil);
  groundShadow(ctx, c.x + side * 40, ground - 2, 210, 18, 0.8);
}

const hook: Shot = (ctx, t, boil) => {
  lowRoad(ctx, LOW, 720, 0);
  drawStripe(ctx, LOW, -0.62, -0.34, 0.62, 9, 4, boil);
  drawFallen(ctx, LOW, 12, 8, -0.6, 0.9, 1, 3.4);
  const x = hookWheelX(t);
  bigWheel(ctx, { x, y: HOOK_WHEEL.y }, HOOK_WHEEL.r, HOOK_WHEEL.depth, 1, x / HOOK_WHEEL.r, PAINTS.red, HOOK_WHEEL.y + HOOK_WHEEL.r, boil);
  if (hookNutDown(t)) {
    groundShadow(ctx, HOOK_NUT.x, HOOK_NUT.y + HOOK_NUT_R * 0.9, 90, 16, 0.6);
    drawWalnut(ctx, HOOK_NUT, HOOK_NUT_R, 0.25 - 0.92, boil);
  }
  drawCrow(ctx, hookPose(t), boil);
};

const sendai: Shot = (ctx, t, boil) => {
  const u = wrap(t);
  const z = 1 + 0.05 * ramp(u, sceneFrom('sendai'), AT.walnuts);
  const g: Ground = { vx: 600, hy: 985, f: 1400, h: 0.62 };
  ctx.save();
  ctx.translate(W / 2, 900);
  ctx.scale(z, z);
  ctx.translate(-W / 2, -900);
  drawRoad(ctx, g);
  for (let i = 0; i < 5; i++) drawStripe(ctx, g, -0.9 + i * 0.95, -0.42 + i * 0.95, 2.6, 4.4, 20 + i, boil);
  drawPavement(ctx, g, -1.25, -1, boil);
  drawPavement(ctx, g, 2.6, 1, boil);
  drawBack(ctx, 600, 985, 1.08, false);
  drawCarFront(ctx, { x: 792, y: project(g, 0.5, 16).y }, 0.92 + 0.1 * (u - sceneFrom('sendai')), PAINTS.cream, boil);
  ctx.restore();
  // The near pavement the crow stands on.
  fillShape(ctx, spline(P(-40, 1372, 300, 1352, 700, 1346, 1130, 1356, 1130, 2000, -40, 2000), 6, true), linear(ctx, 0, 1340, 0, 1900, [[0, '#d9c6a4'], [0.2, '#bfa988'], [1, '#85735e']]));
  softLine(ctx, spline(P(-40, 1368, 300, 1350, 700, 1345, 1130, 1354), 6), 16, '#f6ead0', 0.8, 4);
  for (let i = 0; i < 5; i++) softLine(ctx, P(-40, 1470 + i * i * 34, 1130, 1462 + i * i * 34), 5, '#6f5c48', 0.4, 2);
  for (let i = -2; i < 9; i++) softLine(ctx, P(200 + i * 110, 1356, 80 + (i - 2) * 190, 1930), 5, '#6f5c48', 0.4, 2);
  drawFallen(ctx, { ...g, hy: 900 }, 16, 31, -0.5, 0.6, 0.9, 1.7);
  drawCrow(ctx, sendaiPose(t), boil);
};

const hard: Shot = (ctx, t, boil) => {
  const g: Ground = { vx: 420, hy: 840, f: 1400, h: 0.55 };
  lowRoad(ctx, g, 360, 0.2, 1.6);
  drawFallen(ctx, g, 14, 12, -0.5, 0.8, 1, 3);
  const n = hardNut(t);
  groundShadow(ctx, n.at.x, n.at.y + HARD_NUT_R * 0.92, 120, 20, 0.6);
  drawCrow(ctx, hardPose(t), boil);
  drawWalnut(ctx, n.at, HARD_NUT_R, n.a, boil);
  // Sparks of effort off the shell.
  const k = peckAt(t);
  if (k > 0.25) {
    const c = { x: n.at.x - 46, y: n.at.y - 62 };
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + i * 0.36;
      taper(ctx, [{ x: c.x + Math.cos(a) * 46, y: c.y + Math.sin(a) * 46 }, { x: c.x + Math.cos(a) * (46 + 80 * k), y: c.y + Math.sin(a) * (46 + 80 * k) }], 11, 1, '#fff3cf', 0.95);
    }
  }
};

const drop: Shot = (ctx, t, boil) => {
  const g: Ground = { vx: 600, hy: 1120, f: 1400, h: 0.5 };
  drawRoad(ctx, g);
  drawPavement(ctx, g, -0.95, -1, boil);
  drawPavement(ctx, g, 1.5, 1, boil);
  for (let i = 0; i < 3; i++) drawStripe(ctx, g, 0.08, 0.2, 1.6 + i * 2.4, 2.8 + i * 2.4, 60 + i, boil);
  drawBack(ctx, 600, 1120, 1.28, false);
  softLine(ctx, P(-100, g.hy, W + 100, g.hy), 50, '#f3e2bd', 0.6, 8);
  // A veil of haze over the street, so the bird and the nut stand clear.
  ctx.fillStyle = linear(ctx, 0, 0, 0, 1200, [[0, 'rgba(250,240,214,0.35)'], [1, 'rgba(250,240,214,0.1)']]);
  ctx.fillRect(0, 0, W, 1200);
  drawFallen(ctx, g, 18, 14, -0.8, 1.3, 0.9, 3);
  const u = wrap(t);
  const sway = 4 * Math.sin(u * 5);
  for (const [dy, w] of [[-2, 7], [150, 5]] as const) {
    const line = spline(P(-60, WIRE_Y - 60 + dy, 200, WIRE_Y - 10 + dy + sway * 0.6, 400, WIRE_Y + dy + sway, 700, WIRE_Y - 14 + dy + sway * 0.6, 1140, WIRE_Y - 96 + dy), 8);
    softLine(ctx, line, w + 5, '#2a2622', 0.95, 2);
    softLine(ctx, line.map((q) => ({ x: q.x, y: q.y - 2 })), 2, '#9a8f82', 0.7, 1);
  }
  const n = dropNut(t);
  if (n) {
    const h = clamp01(1 - (1428 - n.at.y) / 480);
    groundShadow(ctx, n.at.x, 1428 + DROP_NUT_R * 0.9, 50 + 34 * h, 14, 0.2 + 0.4 * h);
    if (n.a < 5) softLine(ctx, [{ x: n.at.x - 8, y: n.at.y - 190 }, { x: n.at.x, y: n.at.y - 40 }], 26, '#fff8e4', 0.6, 5);
    drawWalnut(ctx, n.at, DROP_NUT_R, n.a, boil);
  }
  drawCrow(ctx, dropPose(t), boil);
};

const wait: Shot = (ctx, t, boil) => {
  const g: Ground = { vx: 700, hy: 830, f: 1400, h: 0.6 };
  lowRoad(ctx, g, 640, -0.1, 1.5);
  drawStripe(ctx, g, 0.4, 0.62, 1.3, 9, 5, boil);
  groundShadow(ctx, WAIT_NUT.x, WAIT_NUT.y + 64, 110, 18, 0.6);
  drawWalnut(ctx, WAIT_NUT, 76, 0.35, boil);
  drawPavement(ctx, g, -0.1, -1, boil);
  softLine(ctx, P(-100, g.hy, W + 100, g.hy), 120, '#f3e2bd', 0.6, 16);
  drawCrow(ctx, waitPose(t), boil);
};

const crunch: Shot = (ctx, t, boil) => {
  const g: Ground = { vx: 540, hy: 870, f: 1400, h: 0.55 };
  lowRoad(ctx, g, 560, 0.1, 1.6);
  drawFallen(ctx, g, 12, 18, -0.6, 0.7, 1, 3);
  const b = burstAt(t);
  const c = crunchWheel(t);
  const d = wrap(t) - IMPACT;
  if (b <= 0) {
    groundShadow(ctx, CRUNCH_NUT.x, CRUNCH_GROUND + 10, 160, 24, 0.6);
    drawWalnut(ctx, CRUNCH_NUT, CRUNCH_NUT_R, 0.2, boil);
  }
  bigWheel(ctx, c, CRUNCH_WHEEL.r, CRUNCH_WHEEL.depth, 1, c.x / CRUNCH_WHEEL.r, PAINTS.blue, CRUNCH_GROUND, boil);
  if (b <= 0) return;
  const patch = { x: CRUNCH_NUT.x, y: CRUNCH_GROUND - 12 };
  // Dust and a flash squeezed out along the road from under the tyre.
  const flash = Math.exp(-d * 10);
  const puff = Math.exp(-d * 4.5);
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    dab(ctx, patch.x + side * (40 + i * 26 + 320 * (1 - puff)), patch.y - 6 - (i % 3) * 22 * (1 - puff), 70 + 90 * (1 - puff), '226,200,158', 0.5 * puff);
  }
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * (0.02 + (0.96 * i) / 13);
    const r0 = 70 + 200 * (1 - flash);
    const at = (r: number, off: number): Pt => ({ x: patch.x + (Math.cos(a) * r - Math.sin(a) * off) * 1.5, y: patch.y + (Math.sin(a) * r + Math.cos(a) * off) * 0.7 });
    const r1 = r0 + 320 * flash;
    fillShape(ctx, [at(r0, 0), at(r0 + (r1 - r0) * 0.3, 15 * flash), at(r1, 0), at(r0 + (r1 - r0) * 0.3, -15 * flash)], '#fff3cf', 0.9 * flash);
  }
  drawShellBits(ctx, patch, 270, b, boil);
  for (const side of [-1, 1] as const) {
    const s = shellAt(t, side);
    groundShadow(ctx, s.at.x, CRUNCH_GROUND + 100, s.r * 1.3, 20, 0.4 * Math.min(1, b * 2));
    drawHalfShell(ctx, s.at, s.r, s.a, boil);
  }
  const k = kernelAt(t);
  groundShadow(ctx, k.at.x, CRUNCH_GROUND + 130, k.r * 0.9, 22, 0.4 * Math.min(1, b * 2));
  drawKernel(ctx, k.at, k.r, k.a, boil);
};

const missed: Shot = (ctx, t, boil) => {
  const g: Ground = { vx: 400, hy: 850, f: 1400, h: 0.55 };
  lowRoad(ctx, g, 420, 0, 1.5);
  drawFallen(ctx, g, 14, 23, -0.3, 0.8, 1, 3);
  const m = missAt(t);
  const y = lerp(1060, 1760, m ** 1.6);
  const car = (): void => {
    if (m >= 1) return;
    // The car straight over it: a tyre passes either side, the nut between them.
    ctx.save();
    ctx.globalAlpha = 1 - ramp(m, 0.84, 0.98);
    drawCarFront(ctx, { x: MISS_NUT.x, y }, 2.3 + 11 * m ** 1.8, PAINTS.yellow, boil, 0, m * 9);
    ctx.restore();
  };
  if (y < MISS_CROW_Y) car();
  drawCrow(ctx, missPose(t), boil);
  if (y >= MISS_CROW_Y) car();
  groundShadow(ctx, MISS_NUT.x, MISS_NUT.y + 62, 100, 17, 0.6);
  drawWalnut(ctx, MISS_NUT, 74, 0.2 + (m < 1 ? 0.1 * Math.sin(m * 40) : 0), boil);
};

const move: Shot = (ctx, t, boil) => {
  const u = wrap(t);
  const z = 1 + 0.16 * ramp(u, AT.right, AT.tire + 0.25);
  const g: Ground = { vx: 420, hy: 860, f: 1400, h: 0.55 };
  ctx.save();
  ctx.translate(640, 1570);
  ctx.scale(z, z);
  ctx.translate(-640, -1420);
  lowRoad(ctx, g, 340, -0.2);
  drawFallen(ctx, g, 12, 29, -0.8, 0.5, 1, 3);
  bigWheel(ctx, { x: MOVE_WHEEL.x, y: MOVE_WHEEL.y }, MOVE_WHEEL.r, MOVE_WHEEL.depth, -1, 0.5, PAINTS.teal, MOVE_WHEEL.y + MOVE_WHEEL.r, boil);
  const n = moveNut(t);
  groundShadow(ctx, n.at.x, n.at.y + MOVE_NUT.r * 0.9, 92, 16, 0.6);
  drawCrow(ctx, movePose(t), boil);
  drawWalnut(ctx, n.at, MOVE_NUT.r, 0.2 + n.a, boil);
  ctx.restore();
};

const laugh: Shot = (ctx, t, boil) => {
  lowRoad(ctx, { vx: 800, hy: 1250, f: 1400, h: 0.55 }, 700, 0, 1.9);
  drawCrow(ctx, laughPose(t), boil);
};

export const SHOTS = { hook, sendai, hard, drop, wait, crunch, missed, move, traffic, laugh, crossing, better, again: hook } as const;
