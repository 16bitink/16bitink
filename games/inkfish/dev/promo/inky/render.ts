import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { PAPER_ON_DARK, withCredit } from '../credit';
import { VIDEO, type Short } from '../short';
import { renderInkyAudio } from './audio';
import { drawDrainScene, drawFloorScene } from './floor';
import { drawLidScene } from './gap';
import { drawHook } from './hook';
import { drawMessage, drawMorning } from './morning';
import { drawHallScene, drawMap } from './night';
import { CAPTION_SIZE, CAPTION_Y, captionAt, DRAIN_LABEL, drainLabelAlpha } from './script';
import { drawDeep, drawOcean, drawPipe } from './sea';
import { drawSqueeze } from './squeeze';
import { boilAt, flashAt, hookClock, LOOP_S, punchAt, type Scene, sceneAt, shakeAt, wrap } from './story';
import { drawWipe } from './wipe';

/** Draws the "this octopus broke out of an aquarium" short (story.ts has the beats). */

/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SPOKEN = '#ffcf52';
const HALO = '#05091a';
const PAPER_ON_INK: TextInk = { fill: '#f7f0df', halo: HALO };
/** How much of the sketchbook paper's grain shows through the paint. */
const GRAIN = 0.2;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: HALO } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.6, colours);
    x += (natural[i]! + space) * k;
  });
}

const SCENES: Readonly<Record<Scene, (ctx: CanvasRenderingContext2D, t: number, boil: number) => void>> = {
  hook: (ctx, t, boil) => drawHook(ctx, t, hookClock(t), boil),
  map: drawMap,
  hall: drawHallScene,
  lid: drawLidScene,
  squeeze: drawSqueeze,
  floor: drawFloorScene,
  drain: drawDrainScene,
  pipe: drawPipe,
  ocean: drawOcean,
  morning: drawMorning,
  message: drawMessage,
  deep: drawDeep,
};

export function createInky(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    const jolt = shakeAt(t);
    const punch = punchAt(t);
    ctx.save();
    ctx.translate(VIDEO.width / 2 + jolt.x, 800 + jolt.y);
    ctx.scale(punch, punch);
    ctx.translate(-VIDEO.width / 2, -800);
    SCENES[sceneAt(t).scene](ctx, t, boil);
    ctx.restore();
    drawWipe(ctx, t, boil);
    // The paper's grain through the paint.
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = GRAIN;
    ctx.drawImage(paper, 0, 0);
    ctx.restore();
    const flash = flashAt(t);
    if (flash > 0) {
      ctx.fillStyle = `rgba(240,255,255,${flash})`;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    }
    drawTextLine(ctx, DRAIN_LABEL.text, DRAIN_LABEL.x, DRAIN_LABEL.y, DRAIN_LABEL.size, 700, drainLabelAlpha(t), { fill: SPOKEN, halo: HALO });
    drawCaption(ctx, t);
  };

  return withCredit({ loopSeconds: LOOP_S, draw, audio: renderInkyAudio }, ctx, PAPER_ON_DARK);
}
