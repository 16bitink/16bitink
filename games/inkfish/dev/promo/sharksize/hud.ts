import { PAPER } from '../../../src/art/pen';
import { CAPTION_FONT } from '../captions';
import { smooth } from '../short';
import { drawStamp } from '../survival/hud';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, RED, YELLOW, YELLOW_ON_INK } from '../swallowyou/text';
import { traceShark } from './art/contract';
import { TAG_MAX_W, TAG_ROW, TAG_ROWS, TAG_X, TAGS, type Tag, type TagInk } from './facts';
import { STEPS, youOf, type Verdict } from './ladder';
import { T } from './timeline';

/**
 * The readouts over the stage: the step card top left (STEP N OF 12 and the
 * name), the size and "= N YOU" on the sand bottom left, the step's stamp
 * bottom right, the tag band along the top (every other number, stamped),
 * the two locked "?" cards, and the cold open's extras (the twelve fins, the
 * stamp sampler).
 */

const W = 1920;
const ease = (u: number): number => smooth(Math.max(0, Math.min(1, u)));
const window01 = (t: number, a: number, b: number, s = 0.3): number => ease((t - a) / s) * (1 - ease((t - b) / s));

const GREEN = '#7fe38c';
const ORANGE = '#ffb347';

export function verdictInk(v: Verdict | '?'): string {
  switch (v) {
    case 'MEASURED': return YELLOW;
    case 'ESTIMATED': return '#f2ead7';
    case 'REPORTED': return '#9fd8ff';
    case 'PROBABLY':
    case 'THOUGHT TO BE': return ORANGE;
    default: return '#ff6a5c';
  }
}

const TEXT_INK: Readonly<Record<TagInk, typeof PAPER_ON_INK>> = {
  paper: PAPER_ON_INK,
  yellow: YELLOW_ON_INK,
  green: { fill: GREEN, halo: '#06140a' },
  red: { fill: '#ff6a5c', halo: '#1a0604' },
};

function drawTag(ctx: CanvasRenderingContext2D, tg: Tag, row: number, t: number): void {
  const a = window01(t, tg.at, tg.until, 0.25);
  if (a <= 0) return;
  const y = TAG_ROWS[row]!;
  drawText(ctx, tg.text, { x: TAG_X, y, size: 50, maxWidth: TAG_MAX_W }, 700, a, TEXT_INK[tg.ink ?? 'paper']);
  if (tg.stamp) {
    const sx = tg.sub ? TAG_X - 300 : TAG_X;
    drawStamp(ctx, tg.stamp, verdictInk(tg.stamp), sx, y + 58, 28, t, tg.at + 0.35, a, -0.05);
    if (tg.sub) drawText(ctx, tg.sub, { x: TAG_X + 190, y: y + 60, size: 30, maxWidth: 720 }, 500, a * ease((t - tg.at - 0.5) / 0.3), PAPER_ON_INK);
  }
  if (tg.cross !== undefined && t >= tg.cross) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 50px ${CAPTION_FONT}`;
    const w = Math.min(TAG_MAX_W, ctx.measureText(tg.text).width + 20) * ease((t - tg.cross) / 0.25);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(TAG_X - w / 2, y + 6);
    ctx.lineTo(TAG_X + w / 2, y - 6);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawTags(ctx: CanvasRenderingContext2D, t: number): void {
  TAGS.forEach((tg, i) => {
    if (t >= tg.at && t < tg.until + 0.3 && TAG_ROW[i]! >= 0) drawTag(ctx, tg, TAG_ROW[i]!, t);
  });
}

/** The step card, the size on the sand and the step's stamp. */
export function drawCounter(ctx: CanvasRenderingContext2D, i: number, t: number, hidden: number): void {
  if (i < 0) return;
  const st = STEPS[i]!;
  const next = STEPS[i + 1]?.from ?? Infinity;
  const a = ease((t - st.from - 0.4) / 0.4) * (1 - ease((t - next + 0.3) / 0.3)) * (1 - hidden);
  if (a <= 0) return;
  drawText(ctx, `STEP ${i + 1} OF 12`, { x: 60, y: 46, size: 32, maxWidth: 540, left: true }, 700, a * 0.9, PAPER_ON_INK);
  drawText(ctx, st.name, { x: 60, y: 104, size: 64, maxWidth: 560, left: true }, 700, a, PAPER_ON_INK);
  drawText(ctx, st.size, { x: 60, y: 1034, size: 58, maxWidth: 520, left: true }, 700, a, PAPER_ON_INK);
  drawStamp(ctx, st.stamp, verdictInk(st.stamp), 130, 158, 24, t, st.from + 0.9, a, -0.05);
  drawText(ctx, st.basis, { x: 210, y: 160, size: 26, maxWidth: 420, left: true }, 500, a, PAPER_ON_INK);
  drawText(ctx, `= ${youOf(st.length)} YOU`, { x: 600, y: 1034, size: 50, maxWidth: 280 }, 700, a, YELLOW_ON_INK);
}

interface Lock {
  readonly shut: string;
  readonly open: string;
  readonly from: number;
  readonly opens: number;
  readonly shake?: number;
}

const LOCKS: readonly Lock[] = [
  { shut: '? THE REAL RECORDS', open: 'THE REAL RECORDS: STAMPED', from: T.survive, opens: T.australia },
  { shut: '? THE BIGGEST EATS…', open: 'THE BIGGEST EATS PLANKTON', from: T.smallest0, opens: T.plankton, shake: T.catching },
];

export function drawLocks(ctx: CanvasRenderingContext2D, t: number, hidden: number): void {
  LOCKS.forEach((l, k) => {
    const a = ease((t - l.from) / 0.4) * (1 - ease((t - l.opens - 7) / 0.5)) * (1 - hidden);
    if (a <= 0) return;
    const open = t >= l.opens;
    const pop = open ? 1 + 0.25 * Math.max(0, 1 - (t - l.opens) / 0.3) : 1;
    const shake = l.shake !== undefined && t > l.shake && t < l.shake + 1 ? 8 * Math.sin((t - l.shake) * 50) : 0;
    const x = 60 + shake;
    const y = 222 + k * 56;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    drawCard(ctx, -12, -24, 440, 48, a * 0.92, open ? YELLOW : PAPER);
    drawText(ctx, open ? l.open : l.shut, { x: 0, y: 2, size: 30, maxWidth: 416, left: true }, 700, a, INK_ON_PAPER);
    ctx.restore();
  });
}

/** The cold open: twelve fins flicking past, small to big, and the three stamps every number will carry. */
export function drawOpenExtras(ctx: CanvasRenderingContext2D, t: number): void {
  const fins = window01(t, T.twelve0, T.eight0 + 0.4, 0.25);
  if (fins > 0) {
    STEPS.forEach((st, k) => {
      const u = ease((t - T.twelve0 - k * 0.12) / 0.25);
      const len = 26 + 26 * Math.log2(st.length / 0.2 + 1);
      const x = 700 + k * 98 + (1 - u) * 120;
      ctx.save();
      ctx.globalAlpha = fins * u;
      ctx.translate(x + len, 300);
      ctx.scale(-1, 1);
      traceShark(ctx, len, { depth: 0.2 });
      ctx.fillStyle = '#e7eef5';
      ctx.fill();
      ctx.restore();
    });
  }
  const s = window01(t, T.source0, T.smallest0 - 0.2, 0.3);
  if (s > 0) {
    (['MEASURED', 'ESTIMATED', 'REPORTED'] as const).forEach((v, k) => drawStamp(ctx, v, verdictInk(v), 860 + k * 330, 300, 44, t, T.source0 + 0.15 + k * 0.22, s, -0.08));
  }
}

/** A white flash: the cut-away on the great white's seal (no gore). */
export function drawFlash(ctx: CanvasRenderingContext2D, t: number): void {
  const at = STEPS.find((s) => s.meal.id === 'seal')!.meal.at;
  const a = Math.max(0, 1 - Math.abs(t - at) / 0.18);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.85;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, 1080);
  ctx.restore();
}
