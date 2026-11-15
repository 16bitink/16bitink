import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { renderHognoseAudio } from './audio';
import { bakeCast, type Cast } from './cast';
import { drawCta } from './cta';
import { drawFox, foxHead } from './fox';
import { drawHiss, drawMark } from './fx';
import { bakeLow, drawLowFrame, type LowArt } from './lowRender';
import { drawSnake } from './snake';
import { type Stage, stageAt } from './stage';
import { captionAt, CREDIT, HOOK_LINES, hookAlpha, hookWord, LINES, LOOP_S, TEXT, wrap } from './story';
import type { Word } from './words';

/** The credit for this short, as main.ts wants it. */
export const HOGNOSE_CREDIT = CREDIT;

const MAX_W = 980;
const HOT = '#ffd27a';
const DIM = 0.55;

interface Spoken {
  readonly words: readonly Word[];
  readonly now: number;
  readonly y: number;
  readonly size: number;
  readonly unsaid: number;
  readonly alpha: number;
  readonly ink: TextInk;
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
    const ink = i === s.now ? { fill: HOT, halo: s.ink.halo } : s.ink;
    drawTextLine(ctx, w.text, x + (widths[i]! * k) / 2, s.y, s.size * k, 700, s.alpha * (i <= s.now ? 1 : s.unsaid), ink);
    x += (widths[i]! + space) * k;
  });
}

function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  const hook = hookAlpha(t);
  if (hook > 0) {
    let now = hookWord(t);
    LINES.slice(0, HOOK_LINES).forEach((l, i) => {
      drawLine(ctx, { words: l.words, now, y: TEXT.hook.y + i * TEXT.hook.gap, size: TEXT.hook.size, unsaid: 1, alpha: hook, ink: PAPER_ON_DARK });
      now -= l.words.length;
    });
  }
  const c = captionAt(t);
  if (c) drawLine(ctx, { words: c.line.words, now: c.word, y: TEXT.line.y, size: TEXT.line.size, unsaid: DIM, alpha: 1, ink: PAPER_ON_DARK });
}

/** The ground under the camera: the painted window, scaled to the camera's px per board unit. */
function drawGround(ctx: CanvasRenderingContext2D, cast: Cast, cx: number, cy: number, s: number, shake: { x: number; y: number }): void {
  const k = s / 9;
  const w = cast.ground.width * k;
  const h = cast.ground.height * k;
  ctx.drawImage(cast.ground, 540 - cx * s + shake.x, 960 - cy * s + shake.y, w, h);
}

/** From above, as in the game: the arrival and the bluff. */
function drawTop(ctx: CanvasRenderingContext2D, cast: Cast, st: Stage, t: number, boil: number, shake: { x: number; y: number }): void {
  drawGround(ctx, cast, st.cam.cx, st.cam.cy, st.cam.s, shake);
  const snake = drawSnake(ctx, cast, st.snake, st.cam, boil, shake);
  drawHiss(ctx, snake.head, snake.dir, st.cam, st.fx.hiss, t);
  drawFox(ctx, cast, st.fox, st.cam, boil, shake);
  const head = foxHead(st.fox, st.cam, shake);
  const mark = { x: Math.max(150, Math.min(930, head.x - 200)), y: Math.max(300, head.y - 150) };
  drawMark(ctx, '!', mark, st.fx.bangFox);
  drawMark(ctx, '?', mark, st.fx.question);
}

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, low: LowArt, t: number): void {
  const boil = boilAt(t);
  const st = stageAt(t);
  const shake = { x: Math.sin(t * 90) * 9 * st.fx.shake, y: Math.cos(t * 70) * 9 * st.fx.shake };
  if (st.view === 'top') drawTop(ctx, cast, st, t, boil, shake);
  else drawLowFrame(ctx, low, st, t, boil, shake);
  drawCta(ctx, t);
  drawWords(ctx, t);
}

export function createHognose(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  const low = bakeLow();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    drawFrame(ctx, cast, low, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderHognoseAudio };
}
