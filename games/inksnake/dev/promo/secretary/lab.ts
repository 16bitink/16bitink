import { createRng } from '../../../src/logic/rng';
import { pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { hitStar } from '../badger/fx';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import { drawBird } from './bird';
import { RUBBER } from './paint';
import { drawSnake } from './snake';
import { msLabelAt, TARGET, timedPose, watchAt } from './story';
import { kickBird, kickSnake, vignette } from './world';

/**
 * "Scientists timed it: fifteen milliseconds.": the experiment as it was
 * run, close on the leg: a plain grey lab, a steel force plate with its
 * cable, a toy rubber snake on it, the bird's long leg coming down from
 * above and stamping on "timed", and a stopwatch in a lab-coat hand
 * stopping on "milliseconds", a small "15 ms" under it.
 */
const SCALE = 14;
const FOOT: Pt = pt(560, 1262);
const PLACE = { at: pt(FOOT.x - TARGET.x * SCALE, FOOT.y - TARGET.y * SCALE), scale: SCALE };
const WATCH: Pt = pt(860, 700);
const WATCH_R = 122;
export const MS_LABEL = { text: '15 ms', x: 680, y: 1000, size: 66 } as const;

function room(ctx: CanvasRenderingContext2D): void {
  const wall = ctx.createLinearGradient(0, 0, 0, 1240);
  wall.addColorStop(0, '#aeb6bc');
  wall.addColorStop(1, '#d9dcda');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, VIDEO.width, 1240);
  const floor = ctx.createLinearGradient(0, 1240, 0, VIDEO.height);
  floor.addColorStop(0, '#8e959a');
  floor.addColorStop(1, '#5d6468');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 1240, VIDEO.width, VIDEO.height - 1240);
}

function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], fill: string | CanvasGradient, line = '#1b1a1f', w = 6): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = w;
  ctx.strokeStyle = line;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function plate(ctx: CanvasRenderingContext2D, flash: number): void {
  const top = ctx.createLinearGradient(0, 1236, 0, 1340);
  top.addColorStop(0, flash > 0 ? '#fff4d0' : '#c9ced2');
  top.addColorStop(1, '#8b9298');
  poly(ctx, [pt(130, 1236), pt(990, 1236), pt(1050, 1340), pt(70, 1340)], top);
  poly(ctx, [pt(70, 1340), pt(1050, 1340), pt(1050, 1400), pt(70, 1400)], '#5a6166');
  for (const p of [pt(170, 1252), pt(950, 1252), pt(120, 1322), pt(1000, 1322)]) {
    ctx.fillStyle = '#3b4146';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // The cable to the recorder, off to the right.
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#22262a';
  ctx.beginPath();
  ctx.moveTo(1050, 1372);
  ctx.bezierCurveTo(1090, 1380, 1060, 1480, 1100, 1520);
  ctx.stroke();
}

/** A chrome stopwatch, its hand at `turns`, held up in a lab-coat hand from the right. */
function stopwatch(ctx: CanvasRenderingContext2D, turns: number): void {
  ctx.save();
  ctx.translate(WATCH.x - 840, WATCH.y - 790);
  const [x, y] = [840, 790];
  const r = WATCH_R;
  // The sleeve and cuff, then the hand round the watch's lower right.
  poly(ctx, [pt(1100, 840), pt(960, 860), pt(930, 1010), pt(1100, 1080)], '#f4f2ec', '#1b1a1f', 6);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#b9b6ae';
  ctx.beginPath();
  ctx.moveTo(985, 880);
  ctx.lineTo(965, 1000);
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#1b1a1f';
  ctx.fillStyle = '#e8b896';
  ctx.beginPath();
  ctx.ellipse(918, 900, 70, 92, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.stroke();
  // The crown and button.
  poly(ctx, [pt(x - 20, y - r - 40), pt(x + 20, y - r - 40), pt(x + 16, y - r + 4), pt(x - 16, y - r + 4)], '#c8ccd0');
  const caseG = ctx.createRadialGradient(x - 40, y - 50, 10, x, y, r);
  caseG.addColorStop(0, '#f6f8fa');
  caseG.addColorStop(0.7, '#b8bec4');
  caseG.addColorStop(1, '#7c848a');
  ctx.fillStyle = caseG;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#1b1a1f';
  ctx.stroke();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = r * (i % 5 === 0 ? 0.62 : 0.7);
    ctx.lineWidth = i % 5 === 0 ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r * 0.77, y + Math.sin(a) * r * 0.77);
    ctx.stroke();
  }
  const a = turns * Math.PI * 2 - Math.PI / 2;
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#b3322b';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(a) * 18, y - Math.sin(a) * 18);
  ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
  ctx.stroke();
  ctx.fillStyle = '#1b1a1f';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  // The thumb on the button side, the fingers' curl below.
  ctx.fillStyle = '#e8b896';
  ctx.strokeStyle = '#1b1a1f';
  ctx.lineWidth = 6;
  for (const [fx, fy, fr] of [[x + 96, y + 70, 30], [x + 70, y + 102, 30], [x + 34, y + 120, 28]] as const) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, fr * 1.2, fr, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const glint = createRng(3);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(x - 50 + glint() * 4, y - 70, 26, 10, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawLab(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const k = timedPose(t);
  room(ctx);
  ctx.save();
  ctx.translate(540, 1100);
  ctx.scale(k.zoom, k.zoom);
  ctx.translate(-540, -1100);
  plate(ctx, k.impact);
  drawSnake(ctx, kickSnake({ ...k, stomp: Math.max(k.stomp, 0.7) }, FOOT, 1.05, RUBBER), boil);
  drawBird(ctx, { ...kickBird(k, PLACE), ground: (1290 - PLACE.at.y) / SCALE }, boil);
  hitStar(ctx, pt(FOOT.x + 10, FOOT.y + 24), k.impact, 110);
  ctx.restore();
  stopwatch(ctx, watchAt(t));
  const a = msLabelAt(t);
  if (a > 0) drawTextLine(ctx, MS_LABEL.text, MS_LABEL.x, MS_LABEL.y, MS_LABEL.size, 700, a);
  vignette(ctx, 0.3, '10,14,20');
}
