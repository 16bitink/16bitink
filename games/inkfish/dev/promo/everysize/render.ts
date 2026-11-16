import { makeCanvas } from '../../../src/art/pen';
import { createGameCard } from '../bitecomp/gameCard';
import { drawEndCard } from '../foodchain/inserts';
import { createWater } from '../foodchain/water';
import type { Short } from '../short';
import { smooth } from '../short';
import { vignette } from '../swallowyou/sea';
import { prepareDolphin } from './art/dolphin';
import { prepareGannet } from './art/gannet';
import { prepareJelly } from './art/jelly';
import { renderEverysizeAudio } from './audio';
import { drawCounters, drawDays, drawDigest, drawGlobeCard, drawJump, drawMaps, drawPrey, drawTigerLabel, drawWarm } from './callouts';
import { caughtAt, drawCrowdsBehind, drawCrowdsFront, jellyAt, tigerOnScreen } from './crowds';
import { drawBody, drawCloud, drawSweep, heroPlacing, LENGTH, prepareHeroes, whaleAlpha } from './heroes';
import { drawForecasts, drawLocks, drawReplay, drawRuleCard, drawScaleBar, drawStepCard, drawStopwatch, drawYou, fadeIn } from './hud';
import { cameraAt, scaleOf, stepAt, STEPS, toScreen, WHALE, zoomOf, type Camera, type Pt } from './ladder';
import { drawHunt, drawLine, drawWhaleHunt, drawWhaling, HUNT, LINE, WHALE_HUNT, WHALING } from './scenes';
import { LAST_WORD_S, T, VIDEO_S } from './timeline';

/**
 * Draws "How Long You'd Last at Every Size in the Ocean", the ninth
 * long-form video (script.md has the words, timeline.ts the beats). One
 * climb all through: foodchain's water and its log-space zoom from a 0.2 in
 * larva to a 100 ft blue whale, the hero always under the fat yellow YOU
 * arrow, the stopwatch and its forecast stamps on the right. The cut-ins
 * (the game card, the orcas' hunts, the whaling ship, the whole ladder in
 * one line, the end card) are the only other pictures.
 */

const W = 1920;
const H = 1080;
const FADE = 0.45;

const GAME_1 = { from: T.game - 0.2, to: T.foot - 0.5 } as const;
const GAME_2 = { from: T.climb - 0.2, to: LAST_WORD_S + 0.4 } as const;

const TONES = [0.12, 0.22, 0.32, 0.45, 0.58, 0.62, 0.74, 0.9] as const;
const HALF_HEIGHT: Readonly<Record<string, number>> = { larva: 0.14, young: 0.17, sardine: 0.17, mackerel: 0.16, tuna: 0.16, person: 0.1, white: 0.15, whale: 0.06 };

function toneAt(t: number): number {
  const i = stepAt(t);
  if (i < 0) return 0.9;
  const prev = i === 0 ? 0.9 : TONES[i - 1]!;
  return prev + (TONES[i]! - prev) * zoomOf(i, t);
}

/** The YOU arrow's tip for hero i (just over its back). */
function youTip(i: number, t: number, cam: Camera): Pt {
  const st = STEPS[i]!;
  const p = heroPlacing(i, t);
  const s = toScreen(cam, p.at);
  const len = st.length * scaleOf(cam) * (p.size ?? 1);
  const up = st.kind === 'whale' ? len * HALF_HEIGHT.whale! + 10 : Math.max(26, len * HALF_HEIGHT[st.kind]!);
  return { x: s.x + (st.kind === 'whale' ? -len * 0.12 : 0), y: s.y - up - 14 };
}

function drawLadder(ctx: CanvasRenderingContext2D, water: ReturnType<typeof createWater>, t: number): void {
  const cam = cameraAt(t);
  water.draw(ctx, toneAt(t), cam.centre.x / cam.width, Math.log2(cam.width), t);
  const wa = whaleAlpha(t);
  if (wa > 0) drawBody(ctx, 'whale', { at: { x: WHALE.x, y: WHALE.y + 0.15 * Math.sin(t * 0.3) }, facing: -1, alpha: wa, beat: t * 1.1 }, cam, t);
  drawCrowdsBehind(ctx, t, cam);
  drawSweep(ctx, t, cam);
  drawCloud(ctx, t, cam, caughtAt);
  STEPS.forEach((st, i) => {
    if (st.kind === 'whale') return;
    const p = heroPlacing(i, t);
    if (p.alpha > 0) drawBody(ctx, st.kind, p, cam, t);
  });
  drawCrowdsFront(ctx, t, cam);
  const i = stepAt(t);
  const hero = i >= 0 ? toScreen(cam, heroPlacing(i, t).at) : { x: 0, y: 0 };
  const heroLen = i >= 0 ? STEPS[i]!.length * scaleOf(cam) : 0;
  if (i === 4) drawWarm(ctx, t, hero, heroLen);
  if (i === 3) drawPrey(ctx, t, hero);
  drawTigerLabel(ctx, t, tigerOnScreen(t, cam));
  const jelly = jellyAt(t);
  drawDigest(ctx, t, toScreen(cam, jelly.at));
  // The readouts.
  const hud = 1;
  drawStopwatch(ctx, t, hud);
  drawForecasts(ctx, t, hud);
  drawStepCard(ctx, i, t, hud);
  drawLocks(ctx, t, hud);
  drawRuleCard(ctx, t, hud);
  drawReplay(ctx, t, hud);
  if (i >= 0) drawScaleBar(ctx, scaleOf(cam), fadeIn(t, STEPS[0]!.from + 1.6, 0.4));
  if (i >= 0 && t > T.youreThis + 0.9) {
    let tip = youTip(i, t, cam);
    if (i > 0 && zoomOf(i, t) < 1) {
      const from = youTip(i - 1, t, cam);
      const u = smooth(zoomOf(i, t));
      tip = { x: from.x + (tip.x - from.x) * u, y: from.y + (tip.y - from.y) * u };
    }
    drawYou(ctx, tip.x, Math.max(190, tip.y), t, fadeIn(t, T.youreThis + 0.9, 0.25), 0.9);
  }
  drawDays(ctx, t);
  drawJump(ctx, t);
  drawMaps(ctx, t);
  drawCounters(ctx, t);
  drawGlobeCard(ctx, t);
}

interface Insert {
  readonly from: number;
  readonly to: number;
  readonly draw: (ctx: CanvasRenderingContext2D, t: number) => void;
}

export async function createEverysize(ctx: CanvasRenderingContext2D): Promise<Short> {
  await prepareHeroes();
  prepareJelly();
  prepareGannet();
  prepareDolphin();
  const water = createWater();
  const game = createGameCard();
  const layer = makeCanvas(W, H).ctx;
  const inserts: readonly Insert[] = [
    { ...GAME_1, draw: (c, t) => game.draw(c, t, GAME_1.from, T.eat, T.site, 1) },
    { from: HUNT.from, to: HUNT.to, draw: drawHunt },
    { from: WHALE_HUNT.from, to: WHALE_HUNT.to, draw: drawWhaleHunt },
    { from: WHALING.from, to: WHALING.to, draw: drawWhaling },
    { from: LINE.from, to: LINE.to, draw: drawLine },
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
    if (!on) drawLadder(ctx, water, t);
    else {
      const under = live.length > 1 ? live[live.length - 2] : undefined;
      const fadeInA = smooth((t - on.from) / FADE);
      const fadeOutA = on === inserts[inserts.length - 1] ? 1 : 1 - smooth((t - on.to) / FADE);
      if (fadeInA < 1 || fadeOutA < 1) {
        if (under) under.draw(ctx, t);
        else drawLadder(ctx, water, t);
      }
      faded(Math.min(fadeInA, fadeOutA), (c) => on.draw(c, t));
    }
    vignette(ctx, 0.2);
    if (end > 0) drawEndCard(ctx, end);
    ctx.restore();
  };
  return { loopSeconds: VIDEO_S, draw, audio: renderEverysizeAudio };
}

export { LENGTH };
