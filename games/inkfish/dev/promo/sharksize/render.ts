import { makeCanvas } from '../../../src/art/pen';
import { createGameCard } from '../bitecomp/gameCard';
import { drawEndCard } from '../foodchain/inserts';
import type { Short } from '../short';
import { smooth } from '../short';
import { vignette } from '../swallowyou/sea';
import { AGELINE, drawAgeline } from './ageline';
import { prepareMeals } from './art/meals';
import { prepareSharks } from './art/roster';
import { renderSharksizeAudio } from './audio';
import { drawCounter, drawFlash, drawLocks, drawOpenExtras, drawTags } from './hud';
import { stepAt } from './ladder';
import { drawMaps, MAPS } from './maps';
import { drawPanels } from './panels';
import { drawStage } from './stage';
import { T, LAST_WORD_S, VIDEO_S } from './timeline';
import { drawFeeding, drawLineup, LINEUP } from './twist';

/**
 * Draws "Shark Size Comparison… But Every Shark Is Real", the tenth
 * long-form video (script.md has the words, timeline.ts the beats). One
 * stage all through (stage.ts): deep-blue water, the sand, you at 5 ft 9 in,
 * each shark gliding in from the right at true scale while the camera zooms
 * out step by step; the readouts over it (hud.ts, panels.ts). The cut-ins
 * are the only other pictures: the game card, the bull shark's river map,
 * the Greenland shark's age line, the line-up and the end card.
 */

const W = 1920;
const H = 1080;
const FADE = 0.45;

export const GAME_1 = { from: T.game - 0.2, to: T.fastest4 + 0.2 } as const;
export const GAME_2 = { from: T.start11 - 0.3, to: LAST_WORD_S + 0.4 } as const;

interface Insert {
  readonly from: number;
  readonly to: number;
  readonly draw: (ctx: CanvasRenderingContext2D, t: number) => void;
}

function drawLadder(ctx: CanvasRenderingContext2D, t: number): void {
  drawStage(ctx, t);
  drawFeeding(ctx, t);
  drawPanels(ctx, t);
  drawTags(ctx, t);
  drawCounter(ctx, stepAt(t), t, 0);
  drawLocks(ctx, t, 0);
  drawOpenExtras(ctx, t);
  drawFlash(ctx, t);
}

export async function createSharksize(ctx: CanvasRenderingContext2D): Promise<Short> {
  await prepareSharks();
  await prepareMeals();
  const game = createGameCard();
  const layer = makeCanvas(W, H).ctx;
  const inserts: readonly Insert[] = [
    { ...GAME_1, draw: (c, t) => game.draw(c, t, GAME_1.from, T.eat4, T.site, 1) },
    { ...MAPS, draw: drawMaps },
    { ...AGELINE, draw: drawAgeline },
    { ...LINEUP, draw: drawLineup },
    { ...GAME_2, draw: (c, t) => game.draw(c, t, GAME_2.from, GAME_2.from + 1.2, T.site2, 1) },
  ];
  const faded = (alpha: number, paint: (c: CanvasRenderingContext2D) => void): void => {
    if (alpha <= 0) return;
    if (alpha >= 1) return paint(ctx);
    layer.clearRect(0, 0, W, H);
    paint(layer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  };
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const end = smooth((t - GAME_2.to) / FADE);
    if (end >= 1) {
      drawEndCard(ctx, 1);
      ctx.restore();
      return;
    }
    const live = inserts.filter((s) => t >= s.from && t < s.to + FADE);
    const on = live[live.length - 1];
    if (!on) drawLadder(ctx, t);
    else {
      const under = live.length > 1 ? live[live.length - 2] : undefined;
      const fadeInA = smooth((t - on.from) / FADE);
      const fadeOutA = on === inserts[inserts.length - 1] ? 1 : 1 - smooth((t - on.to) / FADE);
      if (fadeInA < 1 || fadeOutA < 1) {
        if (under) under.draw(ctx, t);
        else drawLadder(ctx, t);
      }
      faded(Math.min(fadeInA, fadeOutA), (c) => on.draw(c, t));
    }
    vignette(ctx, 0.2);
    if (end > 0) drawEndCard(ctx, end);
    ctx.restore();
  };
  return { loopSeconds: VIDEO_S, draw, audio: renderSharksizeAudio };
}
