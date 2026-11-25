import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { blob } from '../alvin/art/draw';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { creditAt, PAPER_ON_DARK, withCredit } from '../credit';
import { VIDEO, type Short } from '../short';
import { renderMonkSealAudio } from './audio';
import { drawExit, drawHide } from './cutaways';
import { drawFine, drawHook, drawPull, drawRow, drawTrend } from './scenes';
import { captionAt, TEXT } from './script';
import { LOOP_S, type SceneId, sceneAlpha, SCENE_IDS, wrap } from './story';

/** Draws the "this seal has an eel up its nose" short (story.ts has the choreography). */

export const RED = '#c8281e';
const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 1000;

/** The spoken phrase in one row or two, the word being said in red. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  let index = 0;
  now.line.rows.forEach((row, r) => {
    const words = row.map((w) => w.text);
    ctx.save();
    ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
    const space = ctx.measureText(' ').width;
    const natural = words.map((w) => ctx.measureText(w).width);
    ctx.restore();
    const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
    const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
    let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
    const y = r === 0 ? TEXT.caption.y : TEXT.caption2.y;
    for (const [i, w] of words.entries()) {
      const at = index++;
      drawTextLine(ctx, w, x + (natural[i]! * k) / 2, y, CAPTION_SIZE * k, 700, at <= now.word ? 1 : 0.55, at === now.word ? SPOKEN : UNSPOKEN);
      x += (natural[i]! + space) * k;
    }
  });
}

const SCENES: Readonly<Record<SceneId, (ctx: CanvasRenderingContext2D, t: number) => void>> = {
  hook: drawHook, row: drawRow, pull: drawPull, fine: drawFine, hide: drawHide, exit: drawExit, trend: drawTrend,
};

function createMonkSealShort(ctx: CanvasRenderingContext2D): Short {
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#a6d8ea';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    for (const id of SCENE_IDS) {
      const alpha = sceneAlpha(id, t);
      if (alpha <= 0.005) continue;
      layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      SCENES[id](layer.ctx, t);
      ctx.globalAlpha = alpha;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.globalAlpha = 1;
    }
    drawCaption(ctx, t);
    // A soft dark cloud under the credit (light on dark), so it reads on the seal's grey and on the sand.
    const credit = creditAt(t, LOOP_S);
    if (credit > 0) for (const [rx, ry] of [[330, 62], [270, 46]] as const) blob(ctx, VIDEO.width / 2, 1278, rx, ry, 0, '5,9,26', 0.8 * credit);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderMonkSealAudio };
}

/** The short with the standard "InkFish · 16bit.ink" credit. */
export function createMonkSeal(ctx: CanvasRenderingContext2D): Short {
  return withCredit(createMonkSealShort(ctx), ctx, PAPER_ON_DARK);
}
