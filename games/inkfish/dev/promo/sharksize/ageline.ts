import { INK, PAPER } from '../../../src/art/pen';
import { smooth } from '../short';
import { drawStamp } from '../survival/hud';
import { drawCard, drawText, PAPER_ON_INK, RED, YELLOW, YELLOW_ON_INK } from '../swallowyou/text';
import { sharks } from './art/roster';
import { verdictInk } from './hud';
import { T } from './timeline';

/**
 * Spectacle 2 (~5:25): the Greenland shark's age. Its pale eye close up, a
 * lens lifting out of it (the dating method: radiocarbon in the eye lens,
 * Nielsen et al. 2016); an age counter that spins up and splits into the
 * range for ONE shark, 272–392–512 years; and a painted timeline running
 * back from 2016 past 1776 to the birth range, 1504–1744 ("probably born
 * before 1750"). Then the ~150-year maturity, and the "lives 500 years"
 * folklore corrected.
 */

const W = 1920;
const H = 1080;
const ease = (u: number): number => smooth(Math.max(0, Math.min(1, u)));

export const AGELINE = { from: T.lenses - 0.4, to: T.waiting - 0.3 } as const;

const AXIS = { x0: 160, x1: 1760, y: 900, y0: 2016, y1: 1480 } as const;
const yearX = (year: number): number => AXIS.x0 + ((AXIS.y0 - year) / (AXIS.y0 - AXIS.y1)) * (AXIS.x1 - AXIS.x0);

function drawTimeline(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const run = ease((t - T.y1750 + 1.2) / 1.4);
  if (run <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * run;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(AXIS.x0, AXIS.y);
  ctx.lineTo(AXIS.x0 + (AXIS.x1 - AXIS.x0) * run, AXIS.y);
  ctx.stroke();
  ctx.restore();
  for (const year of [2016, 1900, 1800, 1776, 1700, 1600, 1500]) {
    const x = yearX(year);
    if (x > AXIS.x0 + (AXIS.x1 - AXIS.x0) * run) continue;
    drawText(ctx, `${year}`, { x, y: AXIS.y + 44, size: 32, maxWidth: 120 }, 700, a, year === 1776 ? YELLOW_ON_INK : PAPER_ON_INK);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, AXIS.y - 12);
    ctx.lineTo(x, AXIS.y + 12);
    ctx.stroke();
    ctx.restore();
  }
  // The birth range, 1504–1744, and the pin before 1750.
  const born = ease((t - T.y1750) / 0.5);
  ctx.save();
  ctx.globalAlpha = a * born * 0.85;
  ctx.fillStyle = '#e7a33a';
  ctx.fillRect(yearX(1744), AXIS.y - 34, yearX(1504) - yearX(1744), 22);
  ctx.restore();
  drawText(ctx, 'PROBABLY BORN BEFORE 1750', { x: (yearX(1744) + yearX(1504)) / 2, y: AXIS.y - 70, size: 40, maxWidth: 700 }, 700, a * born, YELLOW_ON_INK);
  // 1776: a small flag.
  const flag = ease((t - T.unitedStates) / 0.4);
  if (flag > 0) {
    const x = yearX(1776);
    ctx.save();
    ctx.globalAlpha = a * flag;
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, AXIS.y - 14);
    ctx.lineTo(x, AXIS.y - 120);
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k % 2 ? PAPER : RED;
      ctx.fillRect(x, AXIS.y - 120 + k * 10, 70, 10);
    }
    ctx.fillStyle = '#2b4a8c';
    ctx.fillRect(x, AXIS.y - 120, 28, 30);
    ctx.restore();
    drawText(ctx, 'THE USA', { x: x + 36, y: AXIS.y - 146, size: 30, maxWidth: 200 }, 700, a * flag, PAPER_ON_INK);
  }
}

function drawEye(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  // The shark huge, its head in the frame's left half.
  const len = 3400;
  const x = 120;
  const y = 430;
  ctx.save();
  ctx.globalAlpha = a;
  sharks().greenland.draw(ctx, { x, y, length: len, gulp: 0, t });
  ctx.restore();
  const eye = { x: x + len * 0.07, y: y - len * 0.03 };
  const lift = ease((t - T.lenses - 0.2) / 0.8);
  const lens = { x: eye.x + 120 * lift, y: eye.y - 170 * lift };
  ctx.save();
  ctx.globalAlpha = a * lift;
  const g = ctx.createRadialGradient(lens.x - 8, lens.y - 8, 2, lens.x, lens.y, 46);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#cfe8f2');
  g.addColorStop(1, 'rgba(160,200,220,0.4)');
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(lens.x, lens.y, 46, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, 'EYE LENS', { x: lens.x, y: lens.y - 70, size: 34, maxWidth: 260 }, 700, a * lift, PAPER_ON_INK);
}

function drawAge(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const cx = 1340;
  drawText(ctx, '28 SHARKS, DATED BY THEIR EYE LENSES', { x: cx, y: 90, size: 44, maxWidth: 1000 }, 700, a * ease((t - T.lenses) / 0.3), PAPER_ON_INK);
  drawStamp(ctx, 'MEASURED', verdictInk('MEASURED'), cx, 150, 28, t, T.lenses + 0.6, a, -0.05);
  const spin = ease((t - T.biggest7) / (T.y512 - T.biggest7 + 0.4));
  if (spin <= 0) return;
  drawText(ctx, 'THE BIGGEST: 16.5 FT · 5 M', { x: cx, y: 240, size: 44, maxWidth: 900 }, 700, a, PAPER_ON_INK);
  const split = ease((t - T.y512 - 0.2) / 0.6);
  if (split < 1) drawText(ctx, `${Math.round(392 * spin)} YEARS`, { x: cx, y: 370, size: 110, maxWidth: 900 }, 700, a * (1 - split), YELLOW_ON_INK);
  if (split > 0) {
    const half = 330 * split;
    drawCard(ctx, cx - half, 345, half * 2, 36, a * 0.9, YELLOW);
    for (const [k, label] of [[-1, '272'], [0, '392'], [1, '512']] as const) {
      drawText(ctx, label, { x: cx + k * half, y: 440, size: 64, maxWidth: 200 }, 700, a * split, YELLOW_ON_INK);
    }
    drawText(ctx, 'YEARS OLD', { x: cx, y: 510, size: 40, maxWidth: 400 }, 700, a * split, PAPER_ON_INK);
    drawStamp(ctx, 'ESTIMATED', verdictInk('ESTIMATED'), cx, 570, 32, t, T.y512 + 0.8, a, -0.05);
    drawText(ctx, 'ONE SHARK', { x: cx + 260, y: 575, size: 34, maxWidth: 300 }, 700, a * ease((t - T.y512 - 1) / 0.3), PAPER_ON_INK);
  }
  const grown = ease((t - T.growUp7) / 0.3) * (1 - ease((t - T.live500 + 0.3) / 0.3));
  drawText(ctx, 'GROWN UP AT ~150 YEARS', { x: cx, y: 670, size: 46, maxWidth: 800 }, 700, a * grown, PAPER_ON_INK);
  drawStamp(ctx, 'ESTIMATED', verdictInk('ESTIMATED'), cx, 728, 28, t, T.growUp7 + 0.6, a * grown, -0.05);
  const folk = ease((t - T.live500) / 0.3);
  if (folk > 0) {
    drawText(ctx, '"LIVES 500 YEARS"', { x: cx, y: 670, size: 50, maxWidth: 800 }, 700, a * folk, PAPER_ON_INK);
    if (t > T.careful) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 9;
      const w = 420 * ease((t - T.careful) / 0.25);
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, 676);
      ctx.lineTo(cx + w / 2, 664);
      ctx.stroke();
      ctx.restore();
    }
    drawText(ctx, "THAT'S THE RANGE FOR ONE SHARK", { x: cx, y: 735, size: 38, maxWidth: 800 }, 700, a * ease((t - T.careful - 0.4) / 0.3), YELLOW_ON_INK);
    drawText(ctx, 'EVEN THE LOW END: 272 YEARS', { x: cx, y: 790, size: 38, maxWidth: 800 }, 700, a * ease((t - T.lowEnd) / 0.3), PAPER_ON_INK);
  }
}

export function drawAgeline(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#22405a');
  g.addColorStop(1, '#0b1a29');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const a = 1;
  drawEye(ctx, t, a * (1 - 0.55 * ease((t - T.y1750 + 1.2) / 0.6)));
  drawAge(ctx, t, a);
  drawTimeline(ctx, t, a);
}
