import { softLine } from '../seal/art/paint';
import { clamp01, lerp, ramp, VIDEO } from '../short';
import { drawCarFront, drawCarSide, type Paint, PAINTS } from './art/car';
import { drawCrow } from './art/crow';
import { fillShape, groundShadow, inkLine, linear, P } from './art/ink';
import { drawChild, drawGrown, type Grown } from './art/people';
import { drawBack, drawPavement, drawPedestrianLight, drawRoad, drawStripe, type Ground, project, pxPerM } from './art/street';
import { drawCracked, drawKernel } from './art/walnut';
import { AT, betterPose, crossPose, CROSS_NUT, greenAt, lastCarAt, PASSES, passAt, REACH, stopAt, trafficPose, walkerAt, wrap } from './story';

/** The shots out in the street: the traffic, the crosswalk and the phone walker. */

const W = VIDEO.width;
const H = VIDEO.height;
type Ctx = CanvasRenderingContext2D;

export function traffic(ctx: Ctx, t: number, boil: number): void {
  const g: Ground = { vx: 540, hy: 800, f: 1400, h: 0.6 };
  drawBack(ctx, 620, 880, 1.45, true);
  // The far pavement, then the two lanes, seen across from the near kerb.
  ctx.fillStyle = linear(ctx, 0, 850, 0, 930, [[0, '#e9d9b8'], [1, '#c4b294']]);
  ctx.fillRect(0, 850, W, 80);
  ctx.fillStyle = '#8b8172';
  ctx.fillRect(0, 926, W, 14);
  // A white guard rail along the far kerb.
  for (let i = 0; i < 9; i++) softLine(ctx, P(30 + i * 136, 790, 30 + i * 136, 924), 15, '#efe8da', 1, 2);
  for (const y of [806, 862]) {
    softLine(ctx, P(-40, y + 7, W + 40, y + 7), 12, '#8d8578', 0.8, 3);
    softLine(ctx, P(-40, y, W + 40, y), 14, '#f8f2e4', 1, 2);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 938, W, H);
  ctx.clip();
  drawRoad(ctx, g);
  ctx.restore();
  for (let i = 0; i < 4; i++) fillShape(ctx, P(-60 + i * 330, 1128, 130 + i * 330, 1128, 136 + i * 330, 1144, -60 + i * 330, 1144), '#f4ecda', 0.85);
  const cars = (lane: 'near' | 'far'): void => PASSES.filter((p) => p.lane === lane).forEach((p) => {
    const v = passAt(p, t);
    if (v < 0 || v > 1) return;
    const k = lane === 'near' ? 2.15 : 1.5;
    const x = p.dir > 0 ? lerp(-420, W + 420, v) : lerp(W + 520, -520, v);
    const y = lane === 'near' ? 1310 : 1058;
    ctx.save();
    for (const [back, a] of [[90, 0.16], [45, 0.28]] as const) {
      ctx.globalAlpha = a;
      drawCarSide(ctx, { x: x - p.dir * back, y }, k, p.dir, PAINTS[p.colour], x / 70, boil);
    }
    ctx.globalAlpha = 1;
    drawCarSide(ctx, { x, y }, k, p.dir, PAINTS[p.colour], x / 70, boil);
    for (let i = 0; i < 6; i++) softLine(ctx, P(x - p.dir * k * 190, y - k * (30 + i * 22), x - p.dir * (k * 300 + 60 * (i % 3)), y - k * (30 + i * 22)), 7, '#fff8e6', 0.5, 3);
    ctx.restore();
  });
  cars('far');
  groundShadow(ctx, 862, 1204, 230, 22, 0.5);
  drawCracked(ctx, { x: 862, y: 1148 }, 76, boil);
  cars('near');
  // The near kerb.
  fillShape(ctx, P(-20, 1418, W + 20, 1400, W + 20, 1440, -20, 1462), linear(ctx, 0, 1400, 0, 1462, [[0, '#f4e9d2'], [1, '#d7cbb4']]));
  fillShape(ctx, P(-20, 1456, W + 20, 1434, W + 20, H, -20, H), linear(ctx, 0, 1430, 0, H, [[0, '#cdb999'], [1, '#85735e']]));
  softLine(ctx, P(-20, 1420, W + 20, 1402), 8, '#fffaf0', 0.9, 3);
  inkLine(ctx, P(-20, 1418, W + 20, 1400), 1.8, 0.7, boil);
  for (let i = 0; i < 7; i++) softLine(ctx, P(60 + i * 180, 1446, -120 + i * 230, H), 5, '#6f5c48', 0.35, 2);
  drawCrow(ctx, trafficPose(t), boil);
}

const GREY: Omit<Grown, 'x' | 'y' | 'k' | 'face'> = { coat: ['#8d95a6', '#474e60'], legs: ['#5c5f6c', '#2c2e38'], shoe: '#3b2a22', hair: '#2a201c', step: 1.4, walk: 0.12, phone: false, bag: '#8a5c3c' };
const PLUM: Omit<Grown, 'x' | 'y' | 'k' | 'face'> = { coat: ['#c98f6c', '#7c4f3a'], legs: ['#6e5f78', '#3c3246'], shoe: '#4a2a2a', hair: '#3a2820', step: 1.9, walk: 0.1, phone: false };

export function crossing(ctx: Ctx, t: number, boil: number): void {
  const g: Ground = { vx: 760, hy: 800, f: 1400, h: 0.58 };
  const u = wrap(t);
  drawRoad(ctx, g);
  for (let i = 0; i < 5; i++) drawStripe(ctx, g, -0.08 + i * 0.5, 0.2 + i * 0.5, 1.12, 2.7, 80 + i, boil);
  drawStripe(ctx, g, -0.16, 3.4, 3.5, 3.85, 95, boil);
  drawPavement(ctx, g, -0.2, -1, boil);
  drawBack(ctx, 760, 800, 1.05, false);
  // The cars: one more through on red, then two that slow and stop behind the line.
  const front = (X: number, Z: number, paint: Paint, dip: number): void => {
    const p = project(g, X, Z);
    drawCarFront(ctx, p, (pxPerM(g, Z) * 1.36) / 176, paint, boil, dip, Z * 2);
  };
  // The light on the far side of the crossing.
  drawPedestrianLight(ctx, 1012, 470, 1.1, 880, greenAt(t), boil);
  const s = stopAt(t);
  const dip = Math.sin(Math.PI * ramp(u, AT.stop - 0.25, AT.stop + 0.35));
  if (s > 0) {
    front(1.75, lerp(30, 8.4, s), PAINTS.yellow, dip);
    front(0.52, lerp(20, 5.2, s), PAINTS.red, dip);
  }
  const last = lastCarAt(t);
  if (last < 1) front(0.9 + 0.5 * last, lerp(9, 0.75, clamp01(last) ** 0.8), PAINTS.teal, 0);
  // The kernel waits on the stripes until the crow picks it up.
  groundShadow(ctx, CROSS_NUT.x, CROSS_NUT.y + 44, 150, 18, 0.5);
  drawCracked(ctx, CROSS_NUT, 44, boil, u < REACH);
  drawGrown(ctx, { ...GREY, x: 20, y: 1296, k: 1.92, face: 1 }, boil);
  drawGrown(ctx, { ...PLUM, x: 232, y: 1312, k: 1.9, face: 1 }, boil);
  const pt = ramp(u, AT.crosswalk - 0.25, AT.crosswalk + 0.25);
  drawChild(ctx, { x: 236, y: 1334, k: 0.86, look: 0.35 + 0.65 * pt, smile: pt }, boil);
  // Picked up: the kernel behind the bill's tips, so they close round it.
  if (u >= REACH) drawKernel(ctx, { x: CROSS_NUT.x + 2, y: CROSS_NUT.y - 10 }, 40, 0.2, boil);
  drawCrow(ctx, crossPose(t), boil);
}

export function better(ctx: Ctx, t: number, boil: number): void {
  const g: Ground = { vx: 620, hy: 820, f: 1400, h: 0.58 };
  drawRoad(ctx, g);
  drawPavement(ctx, g, -1.3, -1, boil);
  drawBack(ctx, 620, 820, 1.08, false);
  const u = wrap(t);
  const v = walkerAt(t);
  const p = project(g, 1.5, 5.2);
  drawCarFront(ctx, { x: p.x - 60, y: p.y + 8 }, 2.5, PAINTS.blue, boil, Math.sin(Math.PI * ramp(u, AT.better - 0.1, AT.better + 0.4)));
  // Someone walks straight over, eyes on the phone.
  drawGrown(ctx, { x: lerp(1020, 850, v), y: 1236, k: 0.74, face: -1, coat: ['#d8b46a', '#8a6328'], legs: ['#56688c', '#2a3550'], shoe: '#ece8e0', hair: '#33231c', step: v * 10, walk: 0.75, phone: true }, boil);
  drawCrow(ctx, betterPose(t), boil);
}
