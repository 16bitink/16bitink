import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { PAPER_ON_DARK, withCredit } from '../credit';
import { prepare as prepareOrca } from '../foodchain/art/orca';
import { VIDEO, type Short } from '../short';
import { prepareSalmon } from './art/salmon';
import { renderOrcaHatAudio } from './audio';
import { drawHook, drawJ27, drawRow, drawTags } from './scenes';
import { captionAt, TEXT } from './script';
import { LOOP_S, type SceneId, sceneAlpha, SCENE_IDS, wrap } from './story';

/** Draws the "orcas started wearing salmon as hats" short (story.ts has the choreography). */

export const RED = '#c8281e';
const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;

/** The spoken phrase, the word being said in red. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : UNSPOKEN);
    x += (natural[i]! + space) * k;
  });
}

function createOrcaHatShort(ctx: CanvasRenderingContext2D): Short {
  void prepareOrca();
  void prepareSalmon();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const drawScene = (id: SceneId, t: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'hook': return drawHook(c, t);
      case 'row': return drawRow(c, t, false);
      case 'vanish': return drawRow(c, t, true);
      case 'j27': return drawJ27(c, t);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#56706a';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    for (const id of SCENE_IDS) {
      const alpha = sceneAlpha(id, t);
      if (alpha <= 0.005) continue;
      layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      drawScene(id, t);
      ctx.globalAlpha = alpha;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.globalAlpha = 1;
    }
    drawTags(ctx, t);
    drawCaption(ctx, t);
    ctx.restore();
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOrcaHatAudio };
}

/** The short with the standard "InkFish · 16bit.ink" credit. */
export function createOrcaHat(ctx: CanvasRenderingContext2D): Short {
  return withCredit(createOrcaHatShort(ctx), ctx, PAPER_ON_DARK);
}
