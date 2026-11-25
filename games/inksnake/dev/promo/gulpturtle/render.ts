import { RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { pathAt } from '../gulphen/path';
import { groundAt, shakeAt, toScreen, type View, viewAt } from '../gulpcapy/camera';
import { renderGulpTurtleAudio } from './audio';
import { drawGround, type Ground, paintGround } from './ground';
import { bakeSnake, drawSnake, type SnakeCast } from './snake';
import { headU, LOOP_S, turtleAt, wrap } from './story';
import { bakeTurtle, drawAlarm, drawDrops, drawKnock, drawTurtle, drawTurtleShadow, type TurtleCast } from './turtleDraw';
import { biggerAt, CAPTIONS, captionAlpha, CREDIT_TEXT, scoreAt, SCORE_TEXT } from './words';

/** Draws the green anaconda and the river turtle short (story.ts has the beats). */

interface Cast {
  readonly ground: Ground;
  readonly snake: SnakeCast;
  readonly turtle: TurtleCast;
}

function drawWords(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  const head = toScreen(view, pathAt(headU(t)));
  const score = scoreAt(t);
  if (score) drawTextLine(ctx, SCORE_TEXT, Math.max(220, head.x + 120), head.y - 160 - 90 * score.rise, 128, 700, score.alpha);
  const bigger = biggerAt(t);
  if (bigger) drawTextLine(ctx, 'Bigger!', 540, 1120 - 120 * bigger.rise, 140, 700, bigger.alpha, { fill: RED, halo: '#fffaf0' });
  for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  drawTextLine(ctx, CREDIT_TEXT.text, VIDEO.width / 2, CREDIT_TEXT.y, CREDIT_TEXT.size, 700, CREDIT_TEXT.alpha);
}

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const shake = shakeAt(t);
  const view = viewAt(t);
  const turtle = turtleAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.fillStyle = '#5a4026';
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
  drawGround(ctx, cast.ground, groundAt(t));
  if (turtle) drawTurtleShadow(ctx, turtle, view);
  drawSnake(ctx, cast.snake, t, boil, view, () => {
    if (turtle) drawTurtle(ctx, cast.turtle, turtle, boil, view);
  });
  drawDrops(ctx, cast.turtle, t, boil, view);
  drawKnock(ctx, t, turtle, view);
  drawAlarm(ctx, t, turtle, view);
  ctx.restore();
  drawWords(ctx, t, view);
}

export function createGulpTurtle(ctx: CanvasRenderingContext2D): Short {
  const cast: Cast = { ground: paintGround(), snake: bakeSnake(), turtle: bakeTurtle() };
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, wrap(seconds)), audio: renderGulpTurtleAudio };
}
