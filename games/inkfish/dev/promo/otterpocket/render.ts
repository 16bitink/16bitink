import { Pen, PAPER, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawGrain, drawVignette } from '../penguin/scenery';
import { ramp, VIDEO, type Short } from '../short';
import { renderOtterPocketAudio } from './audio';
import { rngOf } from './brush';
import { drawCredit } from './credit';
import { drawArm, drawOtter } from './otter';
import { drawClam, drawMussel, drawShellBits, drawSplash, drawStone } from './props';
import { captionAt, HOOK_ROWS, hookAt, TEXT } from './script';
import {
  AT, boilAt, hookPose, chestStoneAt, CHEST_STONE, clamAt, grabAt, IMPACT, LOOP_S, MUSSELS, musselsAt, pileAlphaAt, sceneFrom, sceneTo,
  shakeAt, STONES, stonesAt, type View, viewAt, wrap,
} from './story';
import { drawBubbles, drawRings, drawSeaBase, drawSeaFloorFromAbove, drawSurface } from './water';
import { type Word } from './words';

/** Draws "Sea otters have POCKETS!" (story.ts has the choreography). */

const W = VIDEO.width;
const H = VIDEO.height;
const SPOKEN = '#f5c84a';
const DARK_HALO = '#06120f';
const ON_DARK: TextInk = { fill: PAPER, halo: DARK_HALO };
const CAPTION_MAX_W = 980;

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
  if (now) drawRow(ctx, now.line.words, now.word, TEXT.caption.y, TEXT.caption.size);
}

/** The count's labels at the top: the shells as they pile up, then the stones. */
function drawCount(ctx: CanvasRenderingContext2D, t: number): void {
  const n = musselsAt(t);
  const a = pileAlphaAt(t);
  if (n <= 0 || a <= 0) return;
  drawTextLine(ctx, `${n} mussels`, W / 2, TEXT.count1.y, TEXT.count1.size, 700, a, n === MUSSELS ? { fill: SPOKEN, halo: DARK_HALO } : ON_DARK);
  const s = stonesAt(t);
  if (s > 0) drawTextLine(ctx, `${s} stone${s > 1 ? 's' : ''}`, W / 2, TEXT.count2.y, TEXT.count2.size, 700, a, s === STONES ? { fill: SPOKEN, halo: DARK_HALO } : ON_DARK);
}

/** Where the 44 shells land (local units): in heaps either side of the otter, a few on its belly. */
const SHELLS: readonly { readonly at: Pt; readonly a: number }[] = (() => {
  const rng = rngOf(4444);
  return Array.from({ length: MUSSELS }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const onBelly = i % 7 === 3;
    const at = onBelly
      ? { x: (rng() - 0.5) * 260, y: 120 + rng() * 160 }
      : { x: side * (330 + rng() * 170), y: -320 + (i / MUSSELS) * 760 + (rng() - 0.5) * 120 };
    return { at, a: rng() * Math.PI * 2 };
  });
})();
const ROW: readonly Pt[] = Array.from({ length: STONES }, (_, i) => ({ x: -215 + i * 86, y: 25 + 12 * Math.sin(i * 1.3) }));

function drawPile(ctx: CanvasRenderingContext2D, pen: Pen, t: number): void {
  const n = musselsAt(t);
  const s = stonesAt(t);
  const a = pileAlphaAt(t);
  if ((n <= 0 && s <= 0) || a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  SHELLS.slice(0, n).forEach((m, i) => drawMussel(ctx, pen, m.at, 100 + (i % 3) * 10, m.a));
  ROW.slice(0, s).forEach((p, i) => drawStone(ctx, pen, p, 34, i * 0.7, 1, 11 + i));
  ctx.restore();
}

/** The surface shots: water, the otter on its back, what it holds, the smash. */
function drawSurfaceShot(ctx: CanvasRenderingContext2D, t: number, v: View, boil: number): void {
  const u = wrap(t);
  drawSeaBase(ctx, v.depth);
  const jolt = shakeAt(t);
  const { cam } = v;
  ctx.save();
  ctx.translate(W / 2 + jolt.x, cam.sy + jolt.y);
  ctx.rotate(cam.rot);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.cx, -cam.cy);
  drawSurface(ctx, u, LOOP_S, boil);
  drawRings(ctx, u, 1 - v.depth);
  const pen = new Pen(ctx, 9100 + boil * 977, 0.8 / cam.zoom);
  ctx.save();
  ctx.scale(Math.max(0.04, Math.abs(v.flip)), 1);
  drawOtter(ctx, v.pose, boil, (p) => {
    const stone = chestStoneAt(t);
    if (stone > 0) drawStone(ctx, p, CHEST_STONE, 50, 0.3, stone, 9);
    const clam = clamAt(t);
    if (clam) drawClam(ctx, p, clam.at, 190 * clam.scale, 0, clam.crack);
  });
  ctx.restore();
  drawPile(ctx, pen, t);
  const hit = { x: 0, y: CHEST_STONE.y - 40 };
  drawSplash(ctx, pen, hit, 340, (u - IMPACT) / 0.7);
  drawShellBits(ctx, pen, hit, 300, (u - IMPACT) / 0.8);
  if (v.scene.name === 'float') drawSplash(ctx, pen, { x: 0, y: 0 }, 420, (u - sceneFrom('float')) / 0.6);
  ctx.restore();
  if (v.depth > 0) {
    // Sinking out of sight: the water closes over it, bubbles come up.
    ctx.fillStyle = `rgba(20,52,46,${(0.8 * v.depth).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    drawBubbles(ctx, { x: W / 2, y: 1150 }, 260, ramp(u, AT.dive, sceneTo('dive') + 0.2), 61, 20);
  }
}

/** The diver on the sea floor: its size, its heading (head down-left, towards the clam) and how far its paws reach past its chest (local units). */
const DIVER = { scale: 0.9, heading: Math.PI + 0.35, reach: 710 } as const;

/**
 * "grab a clam," on the sea floor, seen from above: the otter itself swims
 * down head first (its back, the back of its pale head, the hind flippers
 * kicking), its front paws reaching past its head to close on a clam lying on
 * the sand, bubbles trailing up off it and its shadow on the sand under it.
 * Then it pushes off with the clam, rising towards us.
 */
function drawClamShot(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const u = wrap(t);
  drawSeaFloorFromAbove(ctx, u, boil);
  const g = grabAt(t);
  const clamRest = { x: 500, y: 1030 };
  const ahead = { x: Math.sin(DIVER.heading), y: -Math.cos(DIVER.heading) };
  const scale = DIVER.scale * (1 + 0.18 * g.lift);
  // The chest: coming in along its heading until the paws reach the clam, then up and away with it.
  const back = 320 * (1 - g.reach);
  const chest = {
    x: clamRest.x - ahead.x * (DIVER.reach * DIVER.scale + back) + 140 * g.lift,
    y: clamRest.y - ahead.y * (DIVER.reach * DIVER.scale + back) - 240 * g.lift,
  };
  const toes = 0.5 + 0.5 * Math.sin(u * 18);
  const pen = new Pen(ctx, 9300 + boil * 977, 0.7);
  const held = g.reach >= 1;
  // Shadows on the sand: the otter's long and soft, offset more as it rises.
  ctx.save();
  ctx.translate(chest.x + 70 + 60 * g.lift, chest.y + 90 + 80 * g.lift);
  ctx.rotate(DIVER.heading - Math.PI);
  ctx.fillStyle = `rgba(8,24,22,${(0.3 - 0.1 * g.lift).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(0, 40, 230 * scale, 560 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (!held) drawClam(ctx, pen, clamRest, 250, -0.08);
  ctx.save();
  ctx.translate(chest.x, chest.y);
  ctx.rotate(DIVER.heading);
  ctx.scale(scale, scale);
  const lw = 1 / scale;
  // The front paws reach out past the head, wide open, closing on the clam.
  for (const s of [-1, 1]) {
    const open = 1 - g.reach;
    drawArm(ctx, pen, lw, { x: s * 165, y: -250 }, { elbow: { x: s * (190 + 70 * open), y: -480 }, paw: { x: s * (96 + 130 * open), y: -DIVER.reach + 30 + 40 * open } }, 40 + s);
  }
  drawOtter(ctx, { ...hookPose(0), back: true, toes }, boil);
  if (held) {
    // In its paws now: the clam (kept the same way round on screen), the paw tips over its edges.
    drawClam(ctx, pen, { x: 0, y: -DIVER.reach }, 250 / scale, -0.08 - DIVER.heading);
    for (const s of [-1, 1]) {
      const tip = Array.from({ length: 14 }, (_, i) => ({ x: s * 132 + 28 * Math.cos((i / 14) * Math.PI * 2), y: -DIVER.reach + 10 + 36 * Math.sin((i / 14) * Math.PI * 2) }));
      ctx.fillStyle = '#2a1b14';
      ctx.beginPath();
      tip.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.fill();
      pen.closed(tip, 2.6 * lw);
    }
  }
  ctx.restore();
  // Bubbles trailing up off its back and out of its fur.
  drawBubbles(ctx, { x: chest.x + 60, y: chest.y }, 320, ramp(u, sceneFrom('clam') - 0.2, sceneTo('clam') + 0.3), 71, 18);
  drawBubbles(ctx, { x: chest.x - 120, y: chest.y + 260 }, 200, ramp(u, sceneFrom('clam'), sceneTo('clam') + 0.4), 73, 8);
}

export function createOtterPocket(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const v = viewAt(t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (v.scene.name === 'clam') drawClamShot(ctx, t, boil);
    else drawSurfaceShot(ctx, t, v, boil);
    drawGrain(ctx, paper, 0.2);
    drawVignette(ctx, 0.5);
    drawCount(ctx, t);
    drawCaptions(ctx, t);
    drawCredit(ctx, t, LOOP_S);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderOtterPocketAudio };
}

