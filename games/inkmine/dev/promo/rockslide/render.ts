import { drawSpokenLine, drawTextLine, PAPER_ON_DARK, SPOKEN } from '../captions';
import { VIDEO, type Short } from '../short';
import { drawCta } from '../leviathan/cta';
import { renderRockslideAudio } from './audio';
import { captionAt } from './captions';
import { makeCaveScene } from './caveScene';
import { makeEyeScene } from './eyeScene';
import { makeFigures } from './figures';
import { arrowAt, boilAt, ctaAt, darkAt, hookAt, LOOP_S, sceneAt, shakeAt, wrap } from './story';

/** The credit for this short only: it names the game's own page. */
export const ROCKSLIDE_CREDIT = 'InkMine · 16bit.ink/mine';

/** The word being said, in a warm orange that holds up on the dark cave. */
const HOT = '#ffa070';
/** In the chase the spoken line sits up where the hook does: the CTA has the lower lines. */
const CHASE_CAPTION_Y = 420;

/** Draws the Rockslide short (story.ts has the choreography): the scene up now, the hook, the CTA. */
export function createRockslide(ctx: CanvasRenderingContext2D): Short {
  const world = makeCaveScene(makeFigures());
  const eye = makeEyeScene();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    const shake = shakeAt(t);
    const scene = sceneAt(t);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    (scene === 'eye' ? eye : world)(ctx, t, boil);
    ctx.restore();
    const dark = darkAt(t);
    if (dark > 0) {
      ctx.save();
      ctx.globalAlpha = dark;
      ctx.fillStyle = '#0a0404';
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      ctx.restore();
    }
    const hook = hookAt(t);
    drawTextLine(ctx, 'THESE ROCKS', 540, 385, 156, 700, hook, PAPER_ON_DARK);
    drawTextLine(ctx, 'ARE ALIVE!', 540, 505, 140, 700, hook, PAPER_ON_DARK);
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, PAPER_ON_DARK, HOT, scene === 'chase' ? CHASE_CAPTION_Y : SPOKEN.y);
    drawCta(ctx, ctaAt(t), arrowAt(t), boil);
  };
  return { loopSeconds: LOOP_S, draw, audio: renderRockslideAudio };
}
