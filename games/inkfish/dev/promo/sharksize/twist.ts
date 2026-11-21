import { INK } from '../../../src/art/pen';
import { drawAnimal } from '../foodchain/cast';
import { smooth } from '../short';
import { drawStamp } from '../survival/hud';
import { drawText, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { drawMeal } from './art/meals';
import { sharks } from './art/roster';
import { drawYouFigure } from './art/you';
import { cameraAt, toScreen } from './camera';
import { verdictInk } from './hud';
import { STEPS, YOU_M } from './ladder';
import { stepShark } from './stage';
import { T } from './timeline';

/**
 * The twist and the close: the whale shark's open mouth filtering a
 * glittering stream of plankton (a magnifier shows the tiny drifting
 * animals and shrimp-like crustaceans), then a little sardine ball gulped;
 * and the line-up of all twelve sharks to scale on the sand, with you.
 */

const W = 1920;
const H = 1080;
const ease = (u: number): number => smooth(Math.max(0, Math.min(1, u)));

const WHALE = STEPS.length - 1;

/** The whale shark's mouth on screen, and its length in px. */
function whaleMouth(t: number): { readonly x: number; readonly y: number; readonly len: number } | null {
  const s = stepShark(WHALE, t);
  if (!s) return null;
  const cam = cameraAt(t);
  const p = toScreen(cam, s.at);
  const pose = { x: p.x, y: p.y, length: s.length * cam.scale, gulp: 1, t };
  return { ...sharks().whaleShark.mouthAt(pose), len: pose.length };
}

/** A magnifier on the stream: a copepod and a krill, the tiny drifting animals and shrimp-like crustaceans. */
function drawMagnifier(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e8f1ee';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawAnimal(ctx, 'copepod', { x: x - r * 0.35, y: y - r * 0.25, length: r * 0.7, facing: 1, beat: t * 6, effort: 0.6 }, t, { kick: 0.5 + 0.5 * Math.sin(t * 8) });
  drawMeal(ctx, 'shrimp', x + r * 0.15, y + r * 0.3, r * 1.1, -1, t);
  ctx.restore();
  ctx.stroke();
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.72, y + r * 0.72);
  ctx.lineTo(x + r * 1.15, y + r * 1.15);
  ctx.stroke();
  ctx.restore();
}

/** Over the stage: the plankton stream and the sardine ball. */
export function drawFeeding(ctx: CanvasRenderingContext2D, t: number): void {
  if (t < T.plankton - 0.4 || t > T.born) return;
  const m = whaleMouth(t);
  if (!m) return;
  const a = ease((t - T.plankton + 0.4) / 0.4) * (1 - ease((t - T.born + 0.4) / 0.4));
  ctx.save();
  for (let k = 0; k < 140; k++) {
    // Each speck drifts from the left towards the mouth, wrapping round every 2.2 s.
    const u = (((t * 0.45 + k * 0.6180339) % 1) + 1) % 1;
    const sx = m.x - (1 - u) * 900 - ((k * 37) % 120);
    const sy = m.y + Math.sin(k * 1.7) * (1 - u) * 260 + Math.sin(t * 2 + k) * 6;
    ctx.globalAlpha = a * (0.35 + 0.5 * Math.abs(Math.sin(t * 6 + k)));
    ctx.fillStyle = k % 3 ? '#f6f0c8' : '#c9f2ff';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.4 + (k % 4) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawMagnifier(ctx, 1000, 400, 140, t, a * ease((t - T.tiny11) / 0.4) * (1 - ease((t - T.sardines + 0.2) / 0.3)));
  drawText(ctx, 'TINY DRIFTING ANIMALS', { x: 1000, y: 210, size: 40, maxWidth: 520 }, 700, a * ease((t - T.tiny11) / 0.3) * (1 - ease((t - T.sardines + 0.2) / 0.3)), PAPER_ON_INK);
  // The sardine ball: a swirl in front of the mouth, swallowed in one go.
  const ball = ease((t - T.sardines + 0.4) / 0.5);
  const gone = ease((t - T.sardines - 1.4) / 0.4);
  if (ball > 0 && gone < 1) {
    const cx = m.x - 260 + 220 * gone;
    const cy = m.y + 10;
    for (let k = 0; k < 30; k++) {
      const ang = k * 2.39996 + t * 2.4;
      const r = (20 + ((k * 13) % 70)) * (1 - gone);
      ctx.save();
      ctx.globalAlpha = a * ball * (1 - gone);
      drawMeal(ctx, 'herring', cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.6, Math.max(6, m.len * 0.01), Math.cos(ang + 1.57) > 0 ? 1 : -1, t + k);
      ctx.restore();
    }
    drawText(ctx, 'SARDINES · ANCHOVIES', { x: cx, y: cy - 110, size: 34, maxWidth: 420 }, 700, a * ball * (1 - gone), PAPER_ON_INK);
  }
}

// ---------------------------------------------------------------- the line-up

export const LINEUP = { from: T.every11 - 0.3, to: T.start11 - 0.3 } as const;

export function drawLineup(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a6a96');
  g.addColorStop(1, '#0f3250');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const ground = 860;
  ctx.fillStyle = '#a8946c';
  ctx.fillRect(0, ground, W, H - ground);
  drawText(ctx, 'ALL TWELVE, TO SCALE', { x: W / 2, y: 80, size: 64, maxWidth: 1600 }, 700, 1, PAPER_ON_INK);
  drawText(ctx, 'EVERY SIZE MEASURED… OR STAMPED WHEN IT WASN\'T', { x: W / 2, y: 150, size: 38, maxWidth: 1600 }, 700, ease((t - LINEUP.from - 0.6) / 0.4), YELLOW_ON_INK);
  const gap = 0.35;
  const total = STEPS.reduce((s, st) => s + st.length + gap, 0.9);
  const k = (W - 120) / total;
  let x = 60;
  let lastLabel = -Infinity;
  drawYouFigure(ctx, x + 0.25 * k, ground, YOU_M * k, t);
  x += 0.9 * k;
  STEPS.forEach((st, i) => {
    const u = ease((t - LINEUP.from - i * 0.1) / 0.4);
    const len = st.length * k;
    const y = ground - (0.08 + 0.12 * st.length) * k;
    ctx.save();
    ctx.globalAlpha = u;
    sharks()[st.id].draw(ctx, { x, y, length: len, gulp: 0, t });
    ctx.restore();
    // Labels in three staggered rows, pushed apart, each with a leader line down to its shark.
    const labelY = 250 + (i % 3) * 120;
    const mid = x + len / 2;
    const lx = Math.max(130, Math.min(W - 130, Math.max(mid, lastLabel + 150)));
    lastLabel = lx;
    ctx.save();
    ctx.globalAlpha = u * 0.6;
    ctx.strokeStyle = '#f4f1e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, labelY + 82);
    ctx.lineTo(mid, y - 0.12 * len - 6);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, st.name, { x: lx, y: labelY, size: 26, maxWidth: 230 }, 700, u, PAPER_ON_INK);
    drawText(ctx, st.size, { x: lx, y: labelY + 30, size: 22, maxWidth: 230 }, 500, u, PAPER_ON_INK);
    drawStamp(ctx, st.stamp, verdictInk(st.stamp), lx, labelY + 62, 16, t, LINEUP.from + 0.5 + i * 0.1, u, -0.05);
    x += len + gap * k;
  });
  drawText(ctx, 'WHICH SHARK SURPRISED YOU MOST?', { x: W / 2, y: 970, size: 56, maxWidth: 1600 }, 700, ease((t - T.which) / 0.3), YELLOW_ON_INK);
}
