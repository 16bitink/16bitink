import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { drawGlobe } from '../everysize/maps';
import { smooth } from '../short';
import { drawStamp } from '../survival/hud';
import { drawCard, drawText, INK_ON_PAPER, RED, YELLOW } from '../swallowyou/text';
import type { SharkId } from './art/ids';
import { drawMeal } from './art/meals';
import { sharks } from './art/roster';
import { verdictInk } from './hud';
import { T } from './timeline';

/**
 * The cards that slide in over the stage's left side (where you stand) for a
 * few seconds each: the cookie bite, the dogfish's 24-month calendar, the
 * salinity dial, the mako's speedometer, the bunch of four 12–15 ft sharks,
 * the bite podium and the 2025 tally. Each has a window; `PANELS` lists them
 * for the pacing test.
 */

const ease = (u: number): number => smooth(Math.max(0, Math.min(1, u)));
const fade = (t: number, a: number, b: number): number => ease((t - a) / 0.35) * (1 - ease((t - b) / 0.35));

export interface Panel {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly draw: (ctx: CanvasRenderingContext2D, t: number, a: number) => void;
}

/** The left card: 560 x 620 at (60, 330), under the locked cards, sliding in from the left. */
const CARD = { x: 60, y: 330, w: 560, h: 620 } as const;

function card(ctx: CanvasRenderingContext2D, a: number, title: string): { x: number; y: number } {
  const slide = (1 - a) * -80;
  drawCard(ctx, CARD.x + slide, CARD.y, CARD.w, CARD.h, a * 0.95, PAPER);
  drawText(ctx, title, { x: CARD.x + CARD.w / 2 + slide, y: CARD.y + 50, size: 40, maxWidth: CARD.w - 40 }, 700, a, INK_ON_PAPER);
  return { x: CARD.x + CARD.w / 2 + slide, y: CARD.y };
}

function cookie(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const c = card(ctx, a, 'THE COOKIE BITE');
  ctx.save();
  ctx.globalAlpha = a;
  drawMeal(ctx, 'tuna', c.x, c.y + 260, 440, 1, t);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a;
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -t * 20;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c.x - 10, c.y + 262, 34 * ease((t - T.cookieBite - 0.3) / 0.3), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, 'A NEAT, ROUND, COOKIE-SHAPED BITE', { x: c.x, y: c.y + 420, size: 32, maxWidth: 500 }, 700, a * ease((t - T.cookieBite - 0.6) / 0.3), INK_ON_PAPER);
  drawText(ctx, '…FROM TUNA, AND EVEN WHALES', { x: c.x, y: c.y + 480, size: 34, maxWidth: 500 }, 700, a * ease((t - T.whales1) / 0.3), INK_ON_PAPER);
}

function calendar(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const c = card(ctx, a, 'PREGNANCY');
  const filled = Math.floor(24 * ease((t - T.time2 - 0.4) / (T.twoYears + 0.8 - T.time2)));
  ctx.save();
  ctx.globalAlpha = a;
  for (let k = 0; k < 24; k++) {
    const x = c.x - 240 + (k % 6) * 82;
    const y = c.y + 100 + Math.floor(k / 6) * 82;
    ctx.fillStyle = k < filled ? '#e7a33a' : '#efe6d2';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, 68, 68, 8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  drawText(ctx, `${filled} MONTHS`, { x: c.x, y: c.y + 470, size: 56, maxWidth: 500 }, 700, a, INK_ON_PAPER);
  drawText(ctx, 'UP TO 2 YEARS', { x: c.x, y: c.y + 530, size: 34, maxWidth: 500 }, 700, a, INK_ON_PAPER);
}

/** A needle dial from `lo` to `hi`, the needle at `v`. */
function dial(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, lo: number, hi: number, v: number, ticks: readonly (readonly [number, string])[], a: number): void {
  const ang = (x: number): number => Math.PI + (Math.PI * (x - lo)) / (hi - lo);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  for (const [x, label] of ticks) {
    const p = ang(x);
    drawText(ctx, label, { x: cx + Math.cos(p) * (r + 34), y: cy + Math.sin(p) * (r + 34), size: 26, maxWidth: 140 }, 700, a, INK_ON_PAPER);
  }
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  const p = ang(Math.max(lo, Math.min(hi, v)));
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(p) * r * 0.9, cy + Math.sin(p) * r * 0.9);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function salinity(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const c = card(ctx, a, 'HOW SALTY?');
  const v = 53 * ease((t - T.saltier) / 1.2);
  dial(ctx, c.x, c.y + 360, 190, 0, 60, v, [[0, 'FRESH'], [35, 'SEA'], [53, '53']], a);
  drawText(ctx, 'PARTS SALT PER THOUSAND', { x: c.x, y: c.y + 440, size: 30, maxWidth: 500 }, 700, a, INK_ON_PAPER);
  drawText(ctx, 'FRESH · SALTY · EXTRA SALTY', { x: c.x, y: c.y + 520, size: 34, maxWidth: 500 }, 700, a * ease((t - T.extra) / 0.3), INK_ON_PAPER);
}

function speed(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const c = card(ctx, a, 'TOP SPEED');
  const up = ease((t - T.sixtyMph) / 0.6);
  const down = ease((t - T.burst) / 0.7);
  const v = 67 * up + (43 - 67) * down;
  dial(ctx, c.x, c.y + 330, 190, 0, 80, v, [[0, '0'], [40, '40 MPH'], [80, '80']], a);
  const myth = '60–74 MPH · 97–119 KM/H';
  drawText(ctx, myth, { x: c.x, y: c.y + 420, size: 34, maxWidth: 500 }, 700, a * up * (1 - 0.5 * down), INK_ON_PAPER);
  drawStamp(ctx, 'NO SOURCE FOUND', verdictInk('NO SOURCE FOUND'), c.x, c.y + 470, 28, t, T.noStudy, a * (1 - down), -0.06);
  drawText(ctx, '43 MPH · 70 KM/H BURST', { x: c.x, y: c.y + 520, size: 40, maxWidth: 500 }, 700, a * down, INK_ON_PAPER);
  drawStamp(ctx, 'REPORTED', verdictInk('REPORTED'), c.x, c.y + 576, 28, t, T.burst + 0.6, a, -0.06);
}

/** Four sharks of 12–15 ft on one ruler: nearly the same length. */
function bunch(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const box = { x: 680, y: 210, w: 1180, h: 700 };
  drawCard(ctx, box.x, box.y, box.w, box.h, a * 0.95, '#173a5a');
  drawText(ctx, 'THE BUNCH: 12–15 FT · 3.7–4.6 M', { x: box.x + box.w / 2, y: box.y + 50, size: 44, maxWidth: box.w - 60 }, 700, a);
  const px = 160;
  const rows: readonly (readonly [SharkId, number, string])[] = [['hammerhead', 3.7, '12.1 FT · 3.7 M'], ['tiger', 4, '13.1 FT · 4 M'], ['greenland', 4.3, '14.1 FT · 4.3 M'], ['greatWhite', 4.6, '15.1 FT · 4.6 M']];
  rows.forEach(([id, m, label], k) => {
    const u = ease((t - T.bunch - 0.3 - k * 0.25) / 0.4);
    const y = box.y + 190 + k * 150;
    ctx.save();
    ctx.globalAlpha = a * u;
    sharks()[id].draw(ctx, { x: box.x + 300, y, length: m * px, gulp: 0, t });
    ctx.restore();
    drawText(ctx, label, { x: box.x + 150, y, size: 32, maxWidth: 260 }, 700, a * u);
  });
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 4;
  for (const m of [3.7, 4.6]) {
    ctx.beginPath();
    ctx.moveTo(box.x + 300 + m * px, box.y + 110);
    ctx.lineTo(box.x + 300 + m * px, box.y + box.h - 40);
    ctx.stroke();
  }
  ctx.restore();
}

interface Place {
  readonly id: SharkId;
  readonly rank: number;
  readonly bites: number;
  readonly at: number;
}

function podium(ctx: CanvasRenderingContext2D, t: number, a: number, places: readonly Place[], stampAt: number): void {
  const c = card(ctx, a, 'CONFIRMED BITES ON PEOPLE');
  const H = [200, 140, 100];
  const X = [c.x, c.x - 175, c.x + 175];
  for (let r = 0; r < 3; r++) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = r === 0 ? '#e7b53a' : r === 1 ? '#c4ccd4' : '#c98a4e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.fillRect(X[r]! - 80, c.y + 520 - H[r]!, 160, H[r]!);
    ctx.strokeRect(X[r]! - 80, c.y + 520 - H[r]!, 160, H[r]!);
    ctx.restore();
    drawText(ctx, `${r + 1}`, { x: X[r]!, y: c.y + 560 - H[r]! / 2 - 30, size: 56, maxWidth: 120 }, 700, a, INK_ON_PAPER);
  }
  for (const p of places) {
    const u = ease((t - p.at) / 0.35);
    const r = p.rank - 1;
    const top = c.y + 520 - H[r]!;
    ctx.save();
    ctx.globalAlpha = a * u;
    sharks()[p.id].draw(ctx, { x: X[r]! - 75, y: top - 40 - (1 - u) * 60, length: 150, gulp: 0, t });
    ctx.restore();
    drawText(ctx, `${p.bites}`, { x: X[r]!, y: top - 100, size: 40, maxWidth: 150 }, 700, a * u, INK_ON_PAPER);
  }
  drawStamp(ctx, 'REPORTED', verdictInk('REPORTED'), c.x, c.y + 575, 28, t, stampAt, a, -0.05);
}

function tally(ctx: CanvasRenderingContext2D, t: number, a: number): void {
  const c = card(ctx, a, '2025 · THE WHOLE WORLD');
  drawGlobe(ctx, c.x, c.y + 190, 100, t, a);
  const n = Math.round(65 * ease((t - T.y2025) / 1.4));
  drawText(ctx, `${n} UNPROVOKED BITES`, { x: c.x, y: c.y + 350, size: 46, maxWidth: 520 }, 700, a * ease((t - T.y2025 + 0.2) / 0.3), INK_ON_PAPER);
  drawText(ctx, '9 FATAL', { x: c.x, y: c.y + 420, size: 40, maxWidth: 520 }, 500, a * ease((t - T.deadly) / 0.4), INK_ON_PAPER);
  drawText(ctx, '5-YEAR AVERAGE: 61 A YEAR', { x: c.x, y: c.y + 490, size: 36, maxWidth: 520 }, 700, a * ease((t - T.inLine) / 0.3), INK_ON_PAPER);
  drawStamp(ctx, 'REPORTED', verdictInk('REPORTED'), c.x, c.y + 565, 28, t, T.y2025 + 1.6, a, -0.05);
}

export const PANELS: readonly Panel[] = [
  { name: 'cookie', from: T.cookieBite - 0.2, to: T.teeth - 0.2, draw: cookie },
  { name: 'calendar', from: T.time2, to: T.step4 - 0.4, draw: calendar },
  { name: 'salinity', from: T.saltier - 0.3, to: T.remember, draw: salinity },
  { name: 'speed', from: T.howFast, to: T.called + 1.6, draw: speed },
  { name: 'bunch', from: T.bunch, to: T.hammer - 0.3, draw: bunch },
  {
    name: 'podium-tiger', from: T.second - 0.2, to: T.fourteen - 0.6,
    draw: (c, t, a) => podium(c, t, a, [{ id: 'tiger', rank: 2, bites: 142, at: T.second + 0.3 }], T.second + 0.8),
  },
  {
    name: 'podium', from: T.numberOne - 0.2, to: T.scared - 0.2,
    draw: (c, t, a) => podium(c, t, a, [
      { id: 'greatWhite', rank: 1, bites: 351, at: T.n351 },
      { id: 'tiger', rank: 2, bites: 142, at: T.numberTwo + 0.3 },
      { id: 'bull', rank: 3, bites: 119, at: T.bull8 },
    ], T.n351 + 1.6),
  },
  { name: 'tally', from: T.scared - 0.1, to: T.menu - 0.1, draw: tally },
];

let layer: CanvasRenderingContext2D | null = null;

/** Each live panel; while fading, drawn on a layer first (the game's sprites set their own alpha). */
export function drawPanels(ctx: CanvasRenderingContext2D, t: number): void {
  for (const p of PANELS) {
    const a = fade(t, p.from, p.to);
    if (a <= 0) continue;
    if (a >= 1) {
      p.draw(ctx, t, 1);
      continue;
    }
    layer ??= makeCanvas(1920, 1080).ctx;
    layer.clearRect(0, 0, 1920, 1080);
    p.draw(layer, t, a);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }
}

