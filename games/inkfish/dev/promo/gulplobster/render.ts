import { PAPER } from '../../../src/art/pen';
import { halo } from '../../../src/art/glowArt';
import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine, type TextInk } from '../captions';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, GROWTH_INK, SCORE_INK } from '../gameplay/hud';
import type { MarkField } from '../gameplay/marks';
import { CHALK, drawChomp, drawExclaim, drawSuction } from '../gape/effects';
import { drawLights, drawPlayerLight, makeWater } from '../gape/render';
import { drawSnow } from '../gape/snow';
import { clipToGape, drawSwimmer, lipsOf, pointOn, type SwimLook } from '../gape/swimmer';
import { ramp, VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { renderGulpLobsterAudio } from './audio';
import { drawBellyLobster, makeBellyLayers } from './belly';
import { bodyPoint, drawClaw, drawWhip, paintLobster, type LobsterPose } from './lobster';
import { bracing, poseAt } from './moves';
import { EYE_FAR, EYE_NEAR, makeLobsterParts } from './parts';
import { cubic, type Pt } from './shell';
import {
  BAR_MARKS, BITE_AT, biggerText, CAPTIONS, captionAlpha, CLACK_AT, FLICKS, flick, glint, GULP_AT, growthBar, gulpSnap, isDessert, jawTips, lobsterAlarm, lobsterGone, LOOP_S,
  mouthFrame, murk, poke, POKE_POP, pullAt, SCALE, SCORE_TEXT, scoreText, seam, shake, suction, toWorld, viewAt, viperBelly, viperEyes, viperFish, viperJaw, viperLureGlow,
  type Frame, type View, type WorldFish,
} from './story';

/** Draws "how did that fit 139" (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;
const EYE_GLOW = '#ffb27a';

/** Enters the mouth's frame: body units of the lobster, x out of the mouth, drawn where the camera shows it. */
function enterFrame(ctx: CanvasRenderingContext2D, f: Frame, v: View): void {
  ctx.translate(FOCUS.x + v.zoom * (f.origin.x - v.x), FOCUS.y + v.zoom * (f.origin.y - v.y));
  ctx.rotate(Math.atan2(f.ex.y, f.ex.x));
  const s = v.zoom * f.k;
  ctx.scale(s, s);
}

export function createGulpLobster(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const icon = makeSprite('viperfish', 2);
  const parts = makeLobsterParts();
  const belly = makeBellyLayers();
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const seen = (f: Frame, v: View, q: Pt): Pt => {
    const w = toWorld(f, q);
    return { x: FOCUS.x + v.zoom * (w.x - v.x), y: FOCUS.y + v.zoom * (w.y - v.y) };
  };

  /** The lobster in the dark, darkened; its eyes glint first. */
  const drawMurky = (t: number, boil: number, v: View, f: Frame, pose: LobsterPose, dark: number): void => {
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
    layer.save();
    enterFrame(layer, f, v);
    paintLobster(layer, parts, pose, boil);
    layer.restore();
    layer.save();
    layer.globalCompositeOperation = 'source-atop';
    layer.fillStyle = `rgba(5,10,30,${(0.95 * dark).toFixed(3)})`;
    layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
    layer.restore();
    ctx.save();
    ctx.globalAlpha = 1 - 0.4 * dark;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
    const g = glint(t);
    if (g <= 0.01) return;
    const k = v.zoom * f.k;
    for (const e of [EYE_FAR, EYE_NEAR]) {
      const p = seen(f, v, bodyPoint(pose, { x: e.x + 18, y: e.y - 13 }));
      halo(ctx, p.x, p.y, 44 * k, EYE_GLOW, 0.55 * g);
      ctx.save();
      ctx.globalAlpha = g;
      ctx.fillStyle = '#ffe9d0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  /** Pain lines off the lip as the claw snaps shut on it. */
  const drawClack = (t: number, v: View, f: Frame): void => {
    const u = (t - CLACK_AT) / 0.3;
    if (u < 0 || u > 1) return;
    const tip = seen(f, v, jawTips(t).lower);
    ctx.save();
    ctx.strokeStyle = CHALK;
    ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = 0.9 + i * 0.42;
      const r0 = 128 + 34 * u;
      const r1 = r0 + (i % 2 ? 26 : 44) * (1 - 0.3 * u);
      ctx.lineWidth = 8 * (1 - 0.5 * u);
      ctx.beginPath();
      ctx.moveTo(tip.x + r0 * Math.cos(a), tip.y + r0 * Math.sin(a));
      ctx.lineTo(tip.x + r1 * Math.cos(a), tip.y + r1 * Math.sin(a));
      ctx.stroke();
    }
    ctx.restore();
  };

  /** The water its tail throws forward as it flicks. */
  const drawSwish = (t: number, v: View, f: Frame, pose: LobsterPose): void => {
    const s = FLICKS.map((x) => t - x).find((x) => x >= 0 && x < 0.4);
    if (s === undefined) return;
    const u = s / 0.4;
    ctx.save();
    enterFrame(ctx, f, v);
    ctx.translate(pose.joint.x - 60, pose.joint.y + 90);
    ctx.strokeStyle = CHALK;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.7 * (1 - u) * (1 - 0.6 * murk(t));
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = 5 - 3 * u;
      ctx.beginPath();
      ctx.arc(0, -60, 110 + i * 26 + 90 * u, 0.5 + i * 0.12, 0.5 + i * 0.12 + 0.55);
      ctx.stroke();
    }
    ctx.restore();
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, FIELD, v, pullAt(t), t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const you = onScreen(viperFish(t), v);
    const snap = gulpSnap(t);
    const look: SwimLook = {
      jaw: viperJaw(t), belly: viperBelly(t), eyes: viperEyes(t), lid: VIPER_LID, squash: 1 - 0.08 * snap, stretch: 1 + 0.05 * snap,
    };
    drawPlayerLight(ctx, you);
    const drawViper = (): void => {
      drawSwimmer(ctx, viper, you, boil, look);
      drawLights(ctx, viper, you, look, viperLureGlow(t));
    };

    const f = mouthFrame(t);
    const alive = !lobsterGone(t);
    const pose = alive ? poseAt(t) : null;
    if (pose && isDessert(t) && flick(t) > 0) drawSwish(t, v, f, pose);
    if (pose && murk(t) > 0.005) {
      drawMurky(t, boil, v, f, pose, murk(t));
      drawViper();
    } else if (pose && isDessert(t) && seam(t) < -0.5) {
      // Out in the water, its tail towards the lips.
      ctx.save();
      enterFrame(ctx, f, v);
      paintLobster(ctx, parts, pose, boil);
      ctx.restore();
      drawViper();
    } else if (pose) {
      // The inside of the mouth, the lobster going in (only where the open mouth and the water in front of it are), then the viper over it.
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
      ctx.save();
      clipToGape(ctx, viper, you, look);
      enterFrame(ctx, f, v);
      paintLobster(ctx, parts, pose, boil);
      ctx.restore();
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
      drawLights(ctx, viper, you, look, viperLureGlow(t));
      // The crusher's grip is round the lower lip: over it.
      if (bracing(t) > 0.001) {
        ctx.save();
        enterFrame(ctx, f, v);
        drawClaw(ctx, parts, 1, pose.claws[1], boil);
        ctx.restore();
      }
      drawClack(t, v, f);
    } else {
      drawViper();
      drawBellyLobster(ctx, belly, parts, viper, you, look, t, boil, t < GULP_AT + 0.05 ? 0 : 1, Math.max(0, 1 - Math.abs(t - 6.72) / 0.09));
    }

    // The last antenna out of the closed lips.
    const left = poke(t);
    if (left) {
      const lips = pointOn(viper, you, look, { x: lipsOf('viperfish', look.jaw ?? 0).mid.x - 2, y: lipsOf('viperfish', look.jaw ?? 0).mid.y });
      ctx.save();
      ctx.translate(lips.x, lips.y);
      const k = v.zoom * f.k;
      ctx.scale(k, k);
      const o = left.out;
      const w = left.wiggle;
      drawWhip(ctx, cubic({ x: 0, y: 0 }, { x: o * 0.4, y: -6 + w * 0.4 }, { x: o * 0.75, y: -30 - w }, { x: o * 0.95, y: -o * 0.36 + w }, 26), boil, 0, 1.25);
      ctx.restore();
    }

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    drawChomp(ctx, you, (t - POKE_POP) / 0.12);
    // The lobster's "!" over its face as it sees the teeth.
    const pop = lobsterAlarm(t);
    if (pose && pop > 0 && (isDessert(t) || t < 0.8)) {
      const e = seen(f, v, bodyPoint(pose, { x: 96, y: -176 }));
      drawExclaim(ctx, e.x, e.y, 135 * pop, 0.1);
    }
    ctx.restore();

    const score = scoreText(t);
    if (score) drawFloatText(ctx, SCORE_TEXT, you.x + you.length * 0.12, Math.max(560, you.y - you.length * 0.25 - 30 - 70 * score.rise), 84, score.alpha, SCORE_INK);
    const bigger = biggerText(t);
    if (bigger) drawFloatText(ctx, 'Bigger!', Math.max(200, you.x), Math.max(560, you.y - you.length * 0.3 - 40 - 70 * bigger.rise), 92, bigger.alpha, GROWTH_INK);
    drawGrowthBar(ctx, icon, 'viperfish', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) {
      const alpha = captionAlpha(c, t);
      c.text.split('\n').forEach((row, i) => drawTextLine(ctx, row, VIDEO.width / 2, c.y + i * c.size * CAPTION_LINE, c.size, 700, alpha, PAPER_ON_INK));
    }
    drawCredit(ctx, PAPER_ON_INK);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGulpLobsterAudio };
}
