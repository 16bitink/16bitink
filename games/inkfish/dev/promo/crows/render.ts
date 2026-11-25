import { PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawGrain } from '../penguin/scenery';
import { VIDEO, type Short } from '../short';
import { renderCrowsAudio } from './audio';
import { drawCredit } from './credit';
import { captionAt, HOOK_ROWS, hookAt, TEXT } from './script';
import { SHOTS } from './shots';
import { boilAt, LOOP_S, sceneAt, shakeAt, wrap } from './story';
import { type Word } from './words';

/** Draws "These crows use cars as nutcrackers!" (story.ts has the choreography, shots.ts the pictures). */

const W = VIDEO.width;
const H = VIDEO.height;
const SPOKEN = '#ffd34d';
const DARK_HALO = '#1a120c';
const ON_DARK: TextInk = { fill: PAPER, halo: DARK_HALO };
const CAPTION_MAX_W = 1000;

function drawRow(ctx: CanvasRenderingContext2D, words: readonly Word[], said: number, y: number, size: number): void {
  const texts = words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = texts.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = natural.reduce((s, w) => s + w, 0) + space * (texts.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / total);
  let x = W / 2 - (total * k) / 2;
  texts.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, y, size * k, 700, 1, i === said ? { fill: SPOKEN, halo: DARK_HALO } : ON_DARK);
    x += (natural[i]! + space) * k;
  });
}

function drawCaptions(ctx: CanvasRenderingContext2D, t: number): void {
  const hook = hookAt(t);
  if (hook !== null) {
    drawRow(ctx, HOOK_ROWS[0]!, hook, TEXT.hook1.y, TEXT.hook1.size);
    drawRow(ctx, HOOK_ROWS[1]!, hook - HOOK_ROWS[0]!.length, TEXT.hook2.y, TEXT.hook2.size);
    return;
  }
  const now = captionAt(t);
  if (!now) return;
  const [first, second] = now.line.rows;
  if (!second) return drawRow(ctx, first!, now.word, TEXT.caption.y, now.line.words.length === 1 ? TEXT.shout.size : TEXT.caption.size);
  drawRow(ctx, first!, now.word, TEXT.row1.y, TEXT.row1.size);
  drawRow(ctx, second, now.word - first!.length, TEXT.row2.y, TEXT.row2.size);
}

/** Warm autumn light: a soft darkening at the edges. */
function drawEdges(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.48, H * 0.8);
  g.addColorStop(0, 'rgba(40,22,12,0)');
  g.addColorStop(1, 'rgba(40,22,12,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function createCrows(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const jolt = shakeAt(t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e9dcc0';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (jolt.x || jolt.y) {
      // Overscanned a touch, so the shake never bares an edge.
      ctx.translate(W / 2 + jolt.x, H / 2 + jolt.y);
      ctx.scale(1.07, 1.07);
      ctx.translate(-W / 2, -H / 2);
    }
    SHOTS[sceneAt(t).name](ctx, t, boil);
    ctx.restore();
    drawGrain(ctx, paper, 0.16);
    drawEdges(ctx);
    drawCaptions(ctx, t);
    drawCredit(ctx, t, LOOP_S);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderCrowsAudio };
}
