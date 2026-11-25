import { PAPER_ON_DARK } from '../captions';
import { withCredit } from '../credit';
import type { Short } from '../short';
import { bakeSprite, boilAt, type Sprite } from '../sprites';
import { renderTitanoboaAudio } from './audio';
import { drawWords } from './captions';
import { makePainter, type Painter } from './gl/engine';
import { SCIENTIST, SWIMMER } from './people';
import { vignette } from './scenes/backs';
import { drawDig } from './scenes/dig';
import { drawHook } from './scenes/hook';
import { drawLounge } from './scenes/lounge';
import { drawRiver } from './scenes/river';
import { drawSeesaw } from './scenes/seesaw';
import { drawBubble, drawStrike } from './scenes/strike';
import { drawSwim } from './scenes/swim';
import { drawWhich } from './scenes/which';
import { drawWipe } from './scenes/wipe';
import * as S from './story';

/** Draws "This snake was as long as a school BUS!" (story.ts has the beats): painted 3D models (gl/, models/) over painted backdrops, two people in pen and wash. */
interface Cast {
  readonly p: Painter;
  readonly scientist: Sprite;
  readonly calm: Sprite;
  readonly nope: Sprite;
}

function drawScene(ctx: CanvasRenderingContext2D, c: Cast, t: number): void {
  const b = boilAt(t);
  const { p } = c;
  const hook = (): void => {
    drawHook(ctx, p, S.hookClock(t), S.hookPose(t), b);
    vignette(ctx, 0.3);
  };
  switch (S.sceneAt(t)) {
    case 'hook': return hook();
    case 'boa': drawRiver(ctx, p, { t: t - S.CUT.boa, rise: S.rise(t), tape: S.tapeAt(t) }, b); break;
    case 'car': drawSeesaw(ctx, p, { t, tilt: S.tilt(t), thud: S.carThud(t) }, b); break;
    case 'couch':
    case 'think':
      drawLounge(ctx, p, { t, croc: S.crocIn(t), couch: S.couchIn(t), bar: S.couchBar(t), scientist: S.scientistIn(t) }, b, c.scientist);
      drawBubble(ctx, p, t, S.strikeAt(t), b, S.bubbleAt(t), S.bubbleOpen(t));
      break;
    case 'strike': drawStrike(ctx, p, t, S.strikeAt(t), b); break;
    case 'dig': drawDig(ctx, p, { t, swept: S.sweptAt(t), brushOff: S.brushOff(t), push: S.teethPush(t), fish: S.fishIn(t) }, b); break;
    case 'which': drawWhich(ctx, p, { t, up: S.headUp(t), croc: S.crocPlate(t), fish: S.fishPlate(t), glance: S.glance(t), lick: S.lick(t) }, b); break;
    case 'swim': drawSwim(ctx, p, { t, surface: S.surface(t), scared: S.scared(t), back: S.back(t) }, b, c.calm, c.nope); break;
  }
  vignette(ctx, 0.5);
  const w = S.wipeAt(t);
  if (w > 0) drawWipe(ctx, p, w, b, hook);
}

export function createTitanoboa(ctx: CanvasRenderingContext2D): Short {
  const cast: Cast = {
    p: makePainter(),
    scientist: bakeSprite(SCIENTIST, 'think', SCIENTIST.res, 71),
    calm: bakeSprite(SWIMMER, 'calm', SWIMMER.res, 81),
    nope: bakeSprite(SWIMMER, 'nope', SWIMMER.res, 91),
  };
  const draw = (seconds: number): void => {
    const t = S.wrap(seconds);
    ctx.save();
    drawScene(ctx, cast, t);
    drawWords(ctx, t);
    ctx.restore();
  };
  return withCredit({ loopSeconds: S.LOOP_S, draw, audio: renderTitanoboaAudio }, ctx, PAPER_ON_DARK, S.CREDIT);
}
