import { INK, Pen } from '../../../src/art/pen';
import { lerp, ramp, VIDEO } from '../short';
import { type Pt, spline } from '../octopus/geom';
import { drawTrail } from './floor';
import { drawLid, drawTankBack, drawTankFront, type Tank } from './hall';
import { drawHand, drawHead, drawLegs, drawMop, drawSleevedArm, drawTorso } from './keeper';
import { drawFloorAndPlinth } from './night';
import { glow, poly, wash } from './paint';
import { EMPTY_AT, LEAVE_AT, MANAGER_AT, MESSAGE_AT, NEXT_AT, said } from './story';

/** "Next morning: an empty tank… and a trail." and "he didn't even leave a MESSAGE!": the keeper, the tank, the blank note. */

/** The hall by day: warm light through a high window, pale tiles. */
function drawDayHall(ctx: CanvasRenderingContext2D, boil: number, floor: number): void {
  const { width: W } = VIDEO;
  ctx.fillStyle = wash(ctx, 0, -100, 0, floor, [[0, '#f6dfb4'], [0.45, '#e2bd8c'], [1, '#b58f6c']]);
  ctx.fillRect(-300, -200, W + 600, floor + 220);
  const pen = new Pen(ctx, 171 + (boil % 3) * 977, 0.8);
  for (let r = 0; r * 96 < floor - 60; r++) {
    pen.hair([{ x: -300, y: floor - r * 96 }, { x: W + 300, y: floor - r * 96 }], 2, '#8f6b4c', 0.32);
    for (let x = -212 + (r % 2) * 66; x < W + 300; x += 132) pen.hair([{ x, y: floor - r * 96 }, { x, y: floor - (r + 1) * 96 }], 2, '#8f6b4c', 0.24);
  }
  // Sunlight slanting in.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, w] of [[60, 190], [330, 120], [560, 220]] as const) poly(ctx, [{ x, y: -120 }, { x: x + w, y: -120 }, { x: x + w + 560, y: 1500 }, { x: x + 460, y: 1500 }], wash(ctx, 0, -100, 0, 1400, [[0, 'rgba(255,238,190,0.3)'], [1, 'rgba(255,220,160,0)']]));
  ctx.restore();
}

/** Sucker rings left on the glass. */
function drawPrints(ctx: CanvasRenderingContext2D, pts: readonly Pt[], r: number): void {
  pts.forEach((p, i) => {
    ctx.strokeStyle = 'rgba(244,255,255,0.75)';
    ctx.lineWidth = r * 0.24;
    ctx.beginPath();
    ctx.arc(p.x + (i % 2 ? r * 1.5 : 0), p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
}

const TANK: Tank = { xL: 46, xR: 640, rim: 520, base: 930, inset: 70, rise: 50, water: 34, frame: 24 };
const FLOOR = TANK.base + 260;
/** The camera draws back and down, from the tank to the floor, on "and a trail". */
const DOWN_FROM = said('and', 2) - 0.1;
export function cameraAt(t: number): { readonly zoom: number; readonly y: number } {
  const u = ramp(t, DOWN_FROM, DOWN_FROM + 0.42);
  return { zoom: lerp(1, 0.8, u), y: lerp(0, 250, u) };
}

export function drawMorning(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const { width: W, height: H } = VIDEO;
  ctx.save();
  const cam = cameraAt(t);
  ctx.translate(540, 0);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-540, -cam.y);
  drawDayHall(ctx, boil, FLOOR);
  drawFloorAndPlinth(ctx, TANK, boil, 1);
  // Floor tiles.
  const pen = new Pen(ctx, 173 + (boil % 3) * 977, 0.8);
  ctx.fillStyle = wash(ctx, 0, FLOOR, 0, H + 900, [[0, '#b9a78f'], [0.5, '#9a8a78'], [1, '#6e6258']]);
  ctx.fillRect(-300, FLOOR, W + 600, H + 900 - FLOOR);
  for (let i = 0; i < 11; i++) pen.hair([{ x: -300, y: FLOOR + 16 * i + 11 * i * i }, { x: W + 300, y: FLOOR + 16 * i + 11 * i * i }], 2.4, '#5d5045', 0.5);
  for (let i = -9; i <= 9; i++) pen.hair([{ x: 540 + i * 110, y: FLOOR }, { x: 540 + i * 330, y: FLOOR + 1500 }], 2.6, '#5d5045', 0.5);
  glow(ctx, 420, FLOOR + 320, 520, 260, [255, 232, 186], 0.35, 'lighter');
  // The plinth again, over the floor's back edge.
  const box: Pt[] = [{ x: TANK.xL - 26, y: TANK.base }, { x: TANK.xR + 26, y: TANK.base }, { x: TANK.xR + 14, y: FLOOR + 24 }, { x: TANK.xL - 14, y: FLOOR + 24 }];
  glow(ctx, 350, FLOOR + 34, 360, 40, [40, 26, 18], 0.6);
  poly(ctx, box, wash(ctx, 0, TANK.base, 0, FLOOR + 24, [[0, '#7f9098'], [0.1, '#5c6c76'], [1, '#3a474f']]));
  pen.closed(box, 3, INK);
  drawTankBack(ctx, TANK, t, boil, { rocks: true, day: 1 });
  drawLid(ctx, { x: 650, y: 508 }, { x: 60, y: 438 }, { x: 78, y: -52 }, 22, boil, 1);
  drawTankFront(ctx, TANK, t, boil);
  // Out over the rim, down the glass and the plinth, across the floor to the drain.
  drawPrints(ctx, spline([{ x: 250, y: 560 }, { x: 236, y: 680 }, { x: 262, y: 800 }, { x: 250, y: 900 }], 4), 11);
  drawPrints(ctx, spline([{ x: 380, y: 570 }, { x: 404, y: 700 }, { x: 388, y: 840 }], 4), 10);
  drawTrail(ctx, spline([{ x: 316, y: 534 }, { x: 310, y: 700 }, { x: 322, y: 880 }, { x: 316, y: 1040 }, { x: 322, y: FLOOR + 20 }], 5).map((p) => ({ ...p, w: 40 })), true);
  drawTrail(ctx, spline([{ x: 322, y: FLOOR + 22 }, { x: 350, y: FLOOR + 100 }, { x: 440, y: FLOOR + 160 }, { x: 400, y: FLOOR + 230 }, { x: 450, y: FLOOR + 290 }, { x: 500, y: FLOOR + 326 }], 6).map((p) => ({ ...p, w: 40 + (p.y - FLOOR) * 0.12 })), true);
  drawDrain(ctx, { x: 520, y: FLOOR + 372 }, boil);
  drawKeeperStanding(ctx, t, boil);
  ctx.restore();
}

function drawDrain(ctx: CanvasRenderingContext2D, c: Pt, boil: number): void {
  const pen = new Pen(ctx, 175 + (boil % 3) * 977, 0.8);
  const ring = (k: number): Pt[] => Array.from({ length: 41 }, (_, i) => ({ x: c.x + Math.cos((i / 40) * Math.PI * 2) * 128 * k, y: c.y + Math.sin((i / 40) * Math.PI * 2) * 62 * k }));
  poly(ctx, ring(1.3).map((p) => ({ x: p.x, y: p.y + 6 })), 'rgba(40,26,18,0.4)');
  poly(ctx, ring(1.24), wash(ctx, c.x - 130, c.y - 60, c.x + 130, c.y + 60, [[0, '#f0f3f2'], [0.5, '#8f9a9e'], [1, '#e2e8e8']]));
  pen.closed(ring(1.24), 3, INK);
  poly(ctx, ring(1), wash(ctx, 0, c.y - 62, 0, c.y + 62, [[0, '#0a1216'], [0.7, '#142a32'], [1, '#2e5360']]));
  pen.closed(ring(1), 3.4, INK);
}

function drawKeeperStanding(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const k = 0.76;
  const h = 280 * k;
  const gasp = ramp(t, EMPTY_AT - 0.1, EMPTY_AT + 0.2);
  const down = ramp(t, DOWN_FROM - 0.05, DOWN_FROM + 0.25);
  const step = ramp(t, NEXT_AT - 0.34, NEXT_AT + 0.35);
  const x = lerp(1040, 838, step);
  const bob = 7 * Math.abs(Math.sin(step * Math.PI * 2)) * (1 - step) + 3 * Math.sin(t * 4);
  const neck = { x, y: 690 + bob };
  const hip = { x, y: neck.y + 2.3 * h };
  const foot = 3.35 * h;
  glow(ctx, x, hip.y + foot * 0.98, 250, 44, [40, 26, 18], 0.6);
  drawLegs(ctx, hip, foot, h, boil);
  const mopTop = { x: x + 186, y: neck.y - 40 };
  const mopFoot = { x: x + 150, y: hip.y + foot * 0.94 };
  drawMop(ctx, mopTop, mopFoot, 15, boil);
  // Right hand on the mop; left hand up in alarm.
  const grip = { x: x + 178, y: neck.y + 1.15 * h };
  drawSleevedArm(ctx, { shoulder: { x: x + 0.56 * h, y: neck.y + 0.36 * h }, elbow: { x: x + 0.86 * h, y: neck.y + 1.32 * h }, wrist: { x: grip.x - 6, y: grip.y + 26 } }, 0.2 * h, boil, 1701);
  const wrist = { x: lerp(x - 0.95 * h, x - 1.0 * h, gasp), y: lerp(neck.y + 1.9 * h, neck.y + 0.62 * h, gasp) };
  drawSleevedArm(ctx, { shoulder: { x: x - 0.56 * h, y: neck.y + 0.36 * h }, elbow: { x: x - lerp(0.92, 1.08, gasp) * h, y: neck.y + 1.3 * h }, wrist }, 0.2 * h, boil, 1711);
  drawTorso(ctx, neck, h, 0.25 * gasp, boil, 2.4);
  drawHand(ctx, { x: grip.x, y: grip.y + 6 }, -1.5, 0.62 * h, -1, boil, 1.6);
  drawHand(ctx, { x: wrist.x - 4, y: wrist.y - lerp(-30, 34, gasp) }, lerp(1.5, -1.75, gasp), 0.66 * h, gasp > 0.5 ? -1 : 1, boil, 0.15);
  drawHead(ctx, { x: x - 6, y: neck.y - 0.74 * h }, k, -0.05 - 0.06 * down, { yaw: -0.8, look: { x: -0.85, y: lerp(0, 0.8, down) }, brow: gasp, open: gasp * (0.75 + 0.1 * Math.sin(t * 9)), smile: 0, lid: 0 }, boil);
}

// ---------------------------------------------------------------- "…he didn't even leave a MESSAGE!"

const CLOSE_TANK: Tank = { xL: -420, xR: 440, rim: 330, base: 2000, inset: 120, rise: 80, water: 60, frame: 44 };
export const NOTE = { x: 214, y: 640, size: 250 } as const;

function drawNote(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = new Pen(ctx, 181 + (boil % 3) * 977, 0.7);
  const s = NOTE.size / 2;
  // Its bottom corner lifts as he checks behind it.
  const lift = ramp(t, LEAVE_AT - 0.5, LEAVE_AT - 0.2) * (1 - ramp(t, MESSAGE_AT - 0.05, MESSAGE_AT + 0.2));
  ctx.save();
  ctx.translate(NOTE.x, NOTE.y);
  ctx.rotate(-0.07);
  poly(ctx, [{ x: -s + 10, y: -s + 14 }, { x: s + 12, y: -s + 14 }, { x: s + 14, y: s + 16 }, { x: -s + 10, y: s + 14 }], 'rgba(8,40,52,0.38)');
  const fold = 34 + 74 * lift;
  const sheet = [{ x: -s, y: -s }, { x: s, y: -s }, { x: s, y: s - fold }, { x: s - fold, y: s }, { x: -s, y: s }];
  poly(ctx, sheet, wash(ctx, -s, -s, s, s, [[0, '#fff6b8'], [0.6, '#fbe57c'], [1, '#e9c64f']]));
  pen.closed(sheet, 3.4, INK);
  const curl = [{ x: s, y: s - fold }, { x: s - fold, y: s }, { x: s - fold * 0.92, y: s - fold * 0.86 }];
  poly(ctx, curl, wash(ctx, s - fold, s - fold, s, s, [[0, '#fffbe0'], [1, '#d8b545']]));
  pen.closed(curl, 3, INK);
  const tape = [{ x: -54, y: -s - 22 }, { x: 54, y: -s - 26 }, { x: 56, y: -s + 24 }, { x: -52, y: -s + 28 }];
  poly(ctx, tape, 'rgba(240,248,246,0.78)');
  pen.closed(tape, 2, INK);
  ctx.restore();
}

export function drawMessage(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawDayHall(ctx, boil, 2100);
  drawTankBack(ctx, CLOSE_TANK, t, boil, { rocks: true, day: 1 });
  drawTankFront(ctx, CLOSE_TANK, t, boil);
  drawPrints(ctx, spline([{ x: 70, y: 880 }, { x: 130, y: 980 }, { x: 100, y: 1090 }, { x: 170, y: 1180 }], 4), 17);
  drawNote(ctx, t, boil);
  const peer = ramp(t, MANAGER_AT, MANAGER_AT + 0.35) * (1 - ramp(t, MESSAGE_AT - 0.2, MESSAGE_AT + 0.05));
  const shrug = ramp(t, MESSAGE_AT - 0.12, MESSAGE_AT + 0.16);
  const k = 1.14;
  const h = 280 * k;
  const x = lerp(lerp(740, 700, peer), 606, shrug);
  const neck = { x, y: 900 + 5 * Math.sin(t * 4) + 22 * peer };
  glow(ctx, x + 40, 1300, 460, 700, [60, 34, 20], 0.35);
  const headAt = { x: x - 14 - 34 * peer, y: neck.y - 0.74 * h + 30 * shrug };
  // One hand on the note's corner, the other down; then both palms up.
  const lift = -0.1 * shrug;
  const armL = { shoulder: { x: x - 0.56 * h, y: neck.y + (0.36 + lift) * h }, elbow: { x: x - lerp(0.96, 0.88, shrug) * h, y: neck.y + lerp(1.1, 1.22, shrug) * h }, wrist: { x: lerp(396, x - 1.22 * h, shrug), y: lerp(856, neck.y + 0.74 * h, shrug) } };
  const armR = { shoulder: { x: x + 0.56 * h, y: neck.y + (0.36 + lift) * h }, elbow: { x: x + lerp(0.8, 0.88, shrug) * h, y: neck.y + lerp(1.5, 1.22, shrug) * h }, wrist: { x: x + lerp(0.72, 1.06, shrug) * h, y: neck.y + lerp(2.3, 0.76, shrug) * h } };
  drawSleevedArm(ctx, armR, 0.2 * h, boil, 1721);
  drawSleevedArm(ctx, armL, 0.2 * h, boil, 1731);
  drawTorso(ctx, neck, h, shrug, boil, 3.6, headAt);
  drawHand(ctx, { x: armR.wrist.x + 12 * shrug, y: armR.wrist.y + lerp(36, -30, shrug) }, lerp(1.5, -0.9, shrug), 0.62 * h, -1, boil, -0.2);
  drawHead(ctx, headAt, k, lerp(-0.1 * peer, 0.1, shrug), {
    yaw: lerp(-0.85 * peer, -0.1, shrug), look: { x: lerp(-0.9, 0, shrug) * Math.max(peer, shrug), y: lerp(0.2 * peer, 0.05, shrug) }, brow: lerp(-0.1, 1, shrug), open: 0, smile: lerp(0, -1, shrug), lid: lerp(0.45 * peer, 0.05, shrug),
  }, boil);
  drawHand(ctx, { x: armL.wrist.x - lerp(8, 20, shrug), y: armL.wrist.y - lerp(50, 36, shrug) }, lerp(-1.75, -2.35, shrug), 0.62 * h, 1, boil, lerp(0.9, -0.2, shrug));
}

