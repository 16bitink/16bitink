import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT } from '../captions';
import { clamp01, smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW, YELLOW_ON_INK } from '../swallowyou/text';
import { drawStamp } from '../survival/hud';
import { STEPS, type Evidence, type Readout } from './ladder';
import { T, VIDEO_S } from './timeline';

/**
 * The readouts over the climb: the fat yellow YOU arrow on the hero, the
 * stopwatch top right (fast at the bottom of the ladder, slow at the top),
 * the forecast stamps under it with their evidence tags, the step card and
 * the locked "?" cards top left, the size and weight tag bottom left, the
 * scale bar bottom centre, and from step 4 the rule card bottom right.
 */

export const fadeIn = (t: number, at: number, s = 0.3): number => smooth((t - at) / s);
export const window01 = (t: number, from: number, to: number, s = 0.3): number => fadeIn(t, from, s) * (1 - smooth((t - to) / s));

export const EVIDENCE_INK: Readonly<Record<Evidence, string>> = {
  MODEL: '#ffcf33',
  'MODEL, STRETCHED': '#ffb347',
  REPORTED: '#9fd8ff',
  ESTIMATED: '#f2ead7',
};

const RED = '#d8312b';

// ---------------------------------------------------------------- the YOU arrow

/** The fat yellow arrow pointing down at (x, y) (its tip), "YOU" on its shaft. */
export function drawYou(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alpha: number, scale = 1, font = `700 46px ${CAPTION_FONT}`): void {
  if (alpha <= 0) return;
  const bob = 9 * Math.sin(t * 3.2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y - bob * scale);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-70, -78);
  ctx.lineTo(-34, -78);
  ctx.lineTo(-34, -170);
  ctx.lineTo(34, -170);
  ctx.lineTo(34, -78);
  ctx.lineTo(70, -78);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.save();
  ctx.translate(6, 7);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = YELLOW;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.save();
  ctx.translate(0, -122);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('YOU', 0, 2);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- the stopwatch

/** Turns a second at t: slow in the cold open, each step's own rate, held still before every stamp. */
function rateAt(t: number): number {
  const stamps = STEPS.flatMap((s) => s.readouts.map((r) => r.at));
  if (stamps.some((a) => t > a - 1.2 && t < a + 0.15)) return 0;
  let rate = 0.35;
  for (const s of STEPS) if (t >= s.from) rate = s.tick;
  return rate;
}

const DT = 1 / 30;
const TURNS: readonly number[] = (() => {
  const out = [0];
  for (let i = 1; i * DT <= VIDEO_S + 1; i++) out.push(out[i - 1]! + rateAt(i * DT) * DT);
  return out;
})();
export const turnsAt = (t: number): number => TURNS[Math.max(0, Math.min(TURNS.length - 1, Math.round(t / DT)))]!;
/** Whether the stopwatch is running at t (the soundtrack's tick). */
export const running = (t: number): boolean => rateAt(t) > 0;

export function drawStopwatch(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const x = 1790;
  const y = 158;
  const r = 82;
  const a = turnsAt(t) * Math.PI * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  // Crown and side button.
  ctx.fillStyle = '#c9ccd2';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x - 15, y - r - 34, 30, 26, 6);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.75);
  ctx.beginPath();
  ctx.roundRect(-9, -r - 22, 18, 20, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // The case: steel, then the paper face.
  const steel = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  steel.addColorStop(0, '#eef0f3');
  steel.addColorStop(1, '#8d939c');
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.arc(x, y, r + 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 60; i++) {
    const q = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    ctx.lineWidth = long ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(q) * r * (long ? 0.78 : 0.86), y - Math.cos(q) * r * (long ? 0.78 : 0.86));
    ctx.lineTo(x + Math.sin(q) * r * 0.94, y - Math.cos(q) * r * 0.94);
    ctx.stroke();
  }
  // The elapsed part of this turn as a red wedge, and the hand.
  const part = (a % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  ctx.fillStyle = 'rgba(216,49,43,0.22)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r * 0.74, -Math.PI / 2, -Math.PI / 2 + part);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - Math.sin(a) * r * 0.16, y + Math.cos(a) * r * 0.16);
  ctx.lineTo(x + Math.sin(a) * r * 0.82, y - Math.cos(a) * r * 0.82);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- the forecast column

const COL_X = 1560;
const ROW_Y = [292, 520] as const;

/** A readout: its small label, the stamp, and its evidence tag under it. */
function drawReadout(ctx: CanvasRenderingContext2D, r: Readout, row: 0 | 1, t: number, alpha: number): void {
  if (alpha <= 0 || t < r.at) return;
  const y = ROW_Y[row];
  const a = alpha * fadeIn(t, r.at, 0.15);
  drawText(ctx, r.label, { x: COL_X, y, size: 27, maxWidth: 600 }, 700, a, PAPER_ON_INK);
  const size = r.stamp.length > 12 ? 44 : 58;
  drawStamp(ctx, r.stamp, YELLOW, COL_X, y + 62, size, t, r.at, alpha, -0.06);
  drawStamp(ctx, r.tag, EVIDENCE_INK[r.tag], COL_X + 40, y + 128, 25, t, r.at + 0.35, alpha, -0.06);
  if (r.note) drawText(ctx, r.note, { x: COL_X, y: y + 170, size: 24, maxWidth: 620 }, 500, alpha * fadeIn(t, r.at + 0.6), PAPER_ON_INK);
}

export function drawForecasts(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  // The cold open's open question, and the promise's stamp.
  const q = window01(t, -1, T.youreThis - 0.2, 0.3);
  if (q > 0) {
    drawText(ctx, 'YOUR FORECAST', { x: COL_X, y: ROW_Y[0], size: 34, maxWidth: 600 }, 700, alpha * q, PAPER_ON_INK);
    drawStamp(ctx, '?', YELLOW, COL_X, ROW_Y[0] + 70, 80, t, -1, alpha * q, -0.06);
  }
  drawStamp(ctx, 'MODEL', EVIDENCE_INK.MODEL, 1620, 300, 34, t, T.real + 0.1, alpha * (1 - smooth((t - T.okay + 0.4) / 0.4)), -0.1);
  drawText(ctx, 'real measurements, scaled to each size', { x: 1600, y: 362, size: 26, maxWidth: 560 }, 500, alpha * window01(t, T.real + 0.4, T.okay - 0.4), PAPER_ON_INK);
  STEPS.forEach((st, i) => {
    const end = STEPS[i + 1]?.from ?? Infinity;
    const a = alpha * (1 - smooth((t - end) / 0.4));
    if (a <= 0) return;
    drawReadout(ctx, st.readouts[0], 0, t, a);
    drawReadout(ctx, st.readouts[1], 1, t, a);
  });
}

// ---------------------------------------------------------------- the step card, the size tag, the scale bar

export function drawStepCard(ctx: CanvasRenderingContext2D, i: number, t: number, alpha: number): void {
  if (i < 0 || alpha <= 0) return;
  const st = STEPS[i]!;
  const a = alpha * fadeIn(t, st.from + st.zoom * 0.5, 0.4);
  drawText(ctx, `STEP ${i + 1} OF 8`, { x: 60, y: 62, size: 34, maxWidth: 500, left: true }, 700, a * 0.9, PAPER_ON_INK);
  drawText(ctx, st.name, { x: 60, y: 122, size: 74, maxWidth: 680, left: true }, 700, a, i === 5 ? YELLOW_ON_INK : PAPER_ON_INK);
  drawText(ctx, st.size, { x: 60, y: 990, size: 64, maxWidth: 760, left: true }, 700, a, PAPER_ON_INK);
  drawText(ctx, st.weight, { x: 62, y: 1046, size: 42, maxWidth: 760, left: true }, 500, a * 0.95, PAPER_ON_INK);
}

const NICE = [1, 2, 5] as const;

function usOf(m: number): string {
  const inches = m * 39.37;
  if (inches < 12) return `${inches < 1 ? inches.toFixed(2).replace(/0$/, '') : Math.round(inches * 10) / 10} in`;
  return `${Math.round(m * 3.281 * 10) / 10} ft`;
}

function metricOf(m: number): string {
  if (m < 0.01) return `${Math.round(m * 1000 * 10) / 10} mm`;
  if (m < 1) return `${Math.round(m * 100 * 10) / 10} cm`;
  return `${Math.round(m * 10) / 10} m`;
}

/** A scale bar bottom centre: the nicest round length that comes out 160–400 px at this zoom. */
export function drawScaleBar(ctx: CanvasRenderingContext2D, pxPerM: number, alpha: number): void {
  if (alpha <= 0) return;
  let best = 1;
  for (let e = -4; e <= 2; e++) for (const n of NICE) {
    const m = n * 10 ** e;
    if (m * pxPerM >= 160 && m * pxPerM <= 400) best = m;
  }
  const w = best * pxPerM;
  const x = 1000 - w / 2;
  const y = 1040;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y - 14);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, `${metricOf(best)} · ${usOf(best)}`, { x: 1000, y: y - 34, size: 32, maxWidth: 420 }, 700, alpha * 0.95, PAPER_ON_INK);
}

// ---------------------------------------------------------------- the locked cards and the rule card

interface LockCard {
  readonly shut: string;
  readonly open: string;
  readonly from: number;
  readonly opens: number;
}

const LOCKS: readonly LockCard[] = [
  { shut: '? THE SAFE SIZE', open: 'THE SAFE SIZE: YOURS', from: T.oneSize, opens: T.yours },
  { shut: '? THE TOP', open: "THE TOP'S PREDATOR: US", from: T.veryTop, opens: T.people },
  { shut: '? THE RULE', open: 'THE RULE: SEE BELOW', from: T.rule, opens: T.tenTimes },
];

export function drawLocks(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  let row = 0;
  for (const c of LOCKS) {
    const shown = fadeIn(t, c.from, 0.3);
    // The rule's card hands over to the rule card once it opens.
    const gone = c.shut === '? THE RULE' ? 1 - smooth((t - c.opens - 1.2) / 0.4) : 1;
    const a = alpha * shown * gone;
    if (a <= 0) continue;
    const open = t >= c.opens;
    const pop = open ? 1 + 0.25 * Math.max(0, 1 - (t - c.opens) / 0.35) : 1;
    const x = 60;
    const y = 176 + row * 70;
    row++;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    drawCard(ctx, 0, 0, open ? 470 : 330, 56, a, open ? YELLOW : PAPER);
    ctx.restore();
    drawText(ctx, open ? c.open : c.shut, { x: x + 18, y: y + 31, size: 34, maxWidth: open ? 440 : 300, left: true }, 700, a, INK_ON_PAPER);
  }
}

/** Powers of ten heavier than the larva by t (the rule card's pips). */
function powersAt(t: number): number {
  let p = 0;
  for (const s of STEPS) if (t >= s.from + s.zoom * 0.5) p = Math.log10(s.grams / STEPS[0]!.grams);
  return p;
}

export function drawRuleCard(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  const a = alpha * fadeIn(t, T.tenTimes + 0.2, 0.4);
  if (a <= 0) return;
  const x = 1390;
  const y = 892;
  const pulse = STEPS.some((s) => t > s.from + s.zoom * 0.5 && t < s.from + s.zoom * 0.5 + 0.4 && s.from > T.tenTimes) ? 1.06 : 1;
  ctx.save();
  ctx.translate(x + 250, y + 75);
  ctx.scale(pulse, pulse);
  ctx.translate(-250, -75);
  drawCard(ctx, 0, 0, 500, 150, a);
  ctx.restore();
  drawText(ctx, '×10 HEAVIER → ×½ THE RISK', { x: x + 250, y: y + 52, size: 46, maxWidth: 470 }, 700, a, INK_ON_PAPER);
  const n = Math.round(powersAt(t));
  for (let i = 0; i < 11; i++) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = i < n ? RED : 'rgba(27,26,31,0.18)';
    ctx.beginPath();
    ctx.arc(x + 48 + i * 30, y + 104, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawText(ctx, `×10s since the larva: ${n}`, { x: x + 400, y: y + 106, size: 24, maxWidth: 170 }, 700, a, INK_ON_PAPER);
  drawText(ctx, 'an average of many studies · MODEL', { x: x + 250, y: y + 136, size: 22, maxWidth: 470 }, 500, a * 0.8, INK_ON_PAPER);
}

/** The replay strip along the bottom, step 4: every chance so far and the weight jump between them. */
export function drawReplay(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  const a = alpha * window01(t, T.reason - 0.2, STEPS[4]!.from - 0.3, 0.4);
  if (a <= 0) return;
  const items = ['3 in 10 billion', '1.4%', '21%', '56%'];
  const jumps = ['×300', '×33', '×30'];
  const xs = [440, 760, 1020, 1270];
  items.forEach((s, i) => {
    const ai = a * fadeIn(t, T.reason + i * 0.45, 0.25);
    drawCard(ctx, xs[i]! - (i === 0 ? 150 : 80), 770, i === 0 ? 300 : 160, 70, ai, i === 3 ? YELLOW : PAPER);
    drawText(ctx, s, { x: xs[i]!, y: 807, size: i === 0 ? 38 : 46, maxWidth: i === 0 ? 290 : 150 }, 700, ai, INK_ON_PAPER);
    if (i < 3) {
      const mid = (xs[i]! + xs[i + 1]!) / 2 + (i === 0 ? 40 : 0);
      drawText(ctx, '→', { x: mid, y: 807, size: 50, maxWidth: 80 }, 700, ai, PAPER_ON_INK);
      drawText(ctx, `${jumps[i]} heavier`, { x: mid, y: 866, size: 26, maxWidth: 200 }, 700, ai, YELLOW_ON_INK);
    }
  });
}

export const clamp = clamp01;
