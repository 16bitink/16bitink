import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { withCredit } from '../credit';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { renderRoadrunnerAudio } from './audio';
import { bakeLand, type Land } from './desert';
import { drawRace } from './race';
import { drawGrab, drawHook, drawHour, drawLong, drawStrut } from './shots';
import { captionAt, CREDIT, HOOK_LINES, hookAlpha, hookWord, LINES, LOOP_S, sceneAt, SPEED_SIZE, SPEEDS, speedsAt, TEXT, wrap } from './story';
import type { Word } from './words';

/** Short #138, "The Real Roadrunner Eats Rattlesnakes": the frame, the captions, and (here, not in main.ts) the credit. */
const MAX_W = 980;
const HOT = '#ffd27a';
const DIM = 0.55;
const INK: TextInk = { fill: '#fff8ea', halo: '#2a130a' };

interface Spoken {
  readonly words: readonly Word[];
  readonly now: number;
  readonly y: number;
  readonly size: number;
  readonly unsaid: number;
  readonly alpha: number;
}

function drawLine(ctx: CanvasRenderingContext2D, s: Spoken): void {
  ctx.save();
  ctx.font = `700 ${s.size}px Caveat`;
  const space = ctx.measureText(' ').width;
  const widths = s.words.map((w) => ctx.measureText(w.text).width);
  ctx.restore();
  const total = widths.reduce((sum, w) => sum + w, 0) + space * (s.words.length - 1);
  const k = Math.min(1, MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  s.words.forEach((w, i) => {
    const ink = i === s.now ? { fill: HOT, halo: INK.halo } : INK;
    drawTextLine(ctx, w.text, x + (widths[i]! * k) / 2, s.y, s.size * k, 700, s.alpha * (i <= s.now ? 1 : s.unsaid), ink);
    x += (widths[i]! + space) * k;
  });
}

function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  const hook = hookAlpha(t);
  if (hook > 0) {
    let now = hookWord(t);
    LINES.slice(0, HOOK_LINES).forEach((l, i) => {
      drawLine(ctx, { words: l.words, now, y: TEXT.hook.y + i * TEXT.hook.gap, size: TEXT.hook.size, unsaid: 1, alpha: hook });
      now -= l.words.length;
    });
  }
  const c = captionAt(t);
  if (c) drawLine(ctx, { words: c.line.words, now: c.word, y: TEXT.line.y, size: TEXT.line.size, unsaid: DIM, alpha: 1 });
  const speeds = sceneAt(t) === 'race' ? speedsAt(t) : 0;
  if (speeds > 0) for (const s of SPEEDS) drawTextLine(ctx, s.text, VIDEO.width / 2, s.y, SPEED_SIZE, 700, speeds, INK);
}

function drawFrame(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number): void {
  const scene = sceneAt(t);
  if (scene === 'hook') drawHook(ctx, land, t, boil);
  else if (scene === 'grab') drawGrab(ctx, land, t, boil);
  else if (scene === 'long') drawLong(ctx, land, t, boil);
  else if (scene === 'strut') drawStrut(ctx, land, t, boil);
  else if (scene === 'hour') drawHour(ctx, land, t, boil);
  else drawRace(ctx, land, t, boil);
  drawWords(ctx, t);
}

export function createRoadrunner(ctx: CanvasRenderingContext2D): Short {
  const land = bakeLand();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.fillStyle = '#e9b27a';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    drawFrame(ctx, land, t, boilAt(t));
    ctx.restore();
  };
  return withCredit({ loopSeconds: LOOP_S, draw, audio: renderRoadrunnerAudio }, ctx, PAPER_ON_DARK, CREDIT);
}
