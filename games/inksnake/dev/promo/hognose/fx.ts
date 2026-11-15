import { INK, PAPER } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import type { Pt } from '../sprites';
import type { Placed } from './snake';
import type { Cam, Fx } from './stage';

const STINK = '#7f9a3e';

/** Faint stink lines rising off the body in lazy waves: a musk, nothing gross. */
export function drawStink(ctx: CanvasRenderingContext2D, p: Placed, cam: Cam, t: number, a: number): void {
  if (a <= 0.01) return;
  const k = cam.s / 9;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [at, lean] of [[0.24, -1], [0.38, 1], [0.52, -1], [0.66, 1]] as const) {
    const base = p.spine[Math.min(p.spine.length - 1, Math.floor(p.spine.length * at))]!;
    for (let j = 0; j < 3; j++) {
      const x0 = base.x + (j - 1) * 46 * k + lean * 10 * k;
      const phase = t * 2.2 + at * 9 + j * 1.7;
      const rise = 190 * k;
      const pts: Pt[] = Array.from({ length: 14 }, (_, i) => {
        const u = i / 13;
        return { x: x0 + Math.sin(phase + u * 7) * 17 * k * (0.5 + u), y: base.y - 40 * k - u * rise };
      });
      for (const [w, col, al] of [[10 * k, PAPER, 0.35], [4.5 * k, STINK, 0.7]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.globalAlpha = a * al * (j === 1 ? 1 : 0.8);
        ctx.beginPath();
        pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** The hiss: short curved dashes fanning out from the snout. */
export function drawHiss(ctx: CanvasRenderingContext2D, head: Pt, dir: number, cam: Cam, a: number, t: number): void {
  if (a <= 0.01) return;
  const k = cam.s / 9;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  for (const [da, r0, r1] of [[-0.6, 250, 340], [-0.3, 290, 420], [0, 320, 460], [0.3, 290, 420], [0.6, 250, 340]] as const) {
    const wob = Math.sin(t * 30 + da * 9) * 0.04;
    const ang = dir + da + wob;
    ctx.globalAlpha = a * 0.8;
    ctx.lineWidth = 9 * k;
    ctx.beginPath();
    ctx.moveTo(head.x + Math.cos(ang) * r0 * k, head.y + Math.sin(ang) * r0 * k);
    ctx.lineTo(head.x + Math.cos(ang + 0.05) * r1 * k, head.y + Math.sin(ang + 0.05) * r1 * k);
    ctx.stroke();
  }
  ctx.restore();
}

/** A "!" or "?" popped up over the fox's head. */
export function drawMark(ctx: CanvasRenderingContext2D, mark: '!' | '?', at: Pt, a: number): void {
  if (a <= 0.01) return;
  const pop = 0.8 + 0.2 * Math.min(1, a * 3);
  drawTextLine(ctx, mark, at.x, at.y, 230 * pop, 700, Math.min(1, a * 2), { fill: '#e2452f', halo: '#fffaf0' });
}

/** The thud as the body lands: short ink strokes thrown out round where it hit. */
export function drawDust(ctx: CanvasRenderingContext2D, centre: Pt, cam: Cam, a: number): void {
  if (a <= 0.01) return;
  const k = cam.s / 9;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9 * k;
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + 0.25;
    const r0 = (150 + (1 - a) * 70) * k;
    const r1 = r0 + (70 + 40 * a) * k;
    ctx.globalAlpha = Math.min(1, a * 1.6) * 0.75;
    ctx.beginPath();
    ctx.moveTo(centre.x + Math.cos(ang) * r0, centre.y + Math.sin(ang) * r0 * 0.9);
    ctx.lineTo(centre.x + Math.cos(ang) * r1, centre.y + Math.sin(ang) * r1 * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

export type { Fx };
