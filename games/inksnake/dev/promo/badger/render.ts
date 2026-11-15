import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt, drawSprite } from '../sprites';
import { drawAdder, drawBadger, smoothSpine } from './actors';
import { bakeCast, type Cast } from './cast';
import { drawAdderShot } from './adderShot';
import { renderBadgerAudio } from './audio';
import { drawDown, drawLater } from './down';
import { drawGrab } from './grab';
import { drawHook } from './hook';
import { drawLunch } from './lunch';
import { drawRest } from './rest';
import { captionAt, CREDIT, HOOK_LINES, hookAlpha, hookWord, LINES, LOOP_S, sceneAt, TEXT, wrap } from './story';
import type { Word } from './words';

/** This short's credit (main.ts draws it): it comes in with the call to action. */
export const BADGER_CREDIT = CREDIT;

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

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const scene = sceneAt(t);
  if (scene === 'hook') drawHook(ctx, cast, t, boil);
  else if (scene === 'adder') drawAdderShot(ctx, cast, t, boil);
  else if (scene === 'grab') drawGrab(ctx, cast, t, boil);
  else if (scene === 'down') drawDown(ctx, cast, t, boil);
  else if (scene === 'later') drawLater(ctx, cast, t, boil);
  else if (scene === 'lunch') drawLunch(ctx, cast, t, boil);
  else drawRest(ctx, cast, t, boil);
  drawWords(ctx, t);
}

/** ?kit: the badger in each pose and head, and the adder, side by side. */
function drawKit(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const b = boilAt(t);
  ctx.drawImage(cast.bg.grab, 0, 0);
  drawBadger(ctx, cast.badger, b, { at: { x: 470, y: 620 }, scale: 2.6, body: 'stand', head: 'shut' });
  drawBadger(ctx, cast.badger, b, { at: { x: 300, y: 1000 }, scale: 1.6, body: 'lunge', head: 'lunge' });
  drawBadger(ctx, cast.badger, b, { at: { x: 780, y: 1000 }, scale: 1.6, body: 'flop', head: 'out' });
  (['shut', 'grip', 'wince', 'wide', 'smug', 'out', 'lunge', 'gripTop'] as const).forEach((p, i) => drawSprite(ctx, cast.badger.head[p], b, { x: 90 + (i % 4) * 255, y: 1200 + Math.floor(i / 4) * 190, scale: 1.9 }));
  const spine = smoothSpine([{ x: 120, y: 1760 }, { x: 300, y: 1700 }, { x: 480, y: 1800 }, { x: 640, y: 1720 }, { x: 760, y: 1760 }]);
  drawAdder(ctx, cast.adder, b, { spine, base: 92 });
  drawSprite(ctx, cast.adder.head.strike, b, { x: 900, y: 1700, scale: 3.4 });
  drawSprite(ctx, cast.adder.head.top, b, { x: 860, y: 1860, scale: 2.2 });
}

export function createBadger(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  const kit = new URLSearchParams(location.search).has('kit');
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    if (kit) drawKit(ctx, cast, t);
    else drawFrame(ctx, cast, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderBadgerAudio };
}
