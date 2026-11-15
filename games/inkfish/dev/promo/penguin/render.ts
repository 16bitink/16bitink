import { INK, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { ramp, VIDEO, window01, type Short } from '../short';
import { type Camera, NEAR, project, pxPerCm, unplace } from './geo';
import { drawPenguin, makeLayer } from './figure';
import { BILL_L, lowerEdge, onJaw, type Rigs, THROAT_Z, throatOf, tonguePath, upperEdge } from './model';
import { drawNailBeat } from './nail';
import { hull, type Item } from './paint';
import { drawDark, drawFish, drawGlint, drawGrain, drawIce, drawRed, drawShadow, drawVignette } from './scenery';
import { renderPenguinAudio } from './audio';
import { captionAt, HOOK_ROWS, hookAt, TEXT } from './script';
import { AT, boilAt, fishWriggleAt, fishZAt, glowAt, LOOP_S, shakeAt, sheenAt, spineInAt, type View, viewAt, wrap } from './story';
import { type Word } from './words';

/** Draws "Never look inside a penguin's mouth!" (story.ts has the choreography). */

const W = VIDEO.width;
const SPOKEN = '#f5c84a';
const DARK_HALO = '#070a14';
const ON_DARK: TextInk = { fill: PAPER, halo: DARK_HALO };
const ON_LIGHT: TextInk = { fill: INK, halo: '#fbf7ee' };
const CAPTION_MAX_W = 980;

/** One row of words, centred, the word being said in yellow. */
function drawRow(ctx: CanvasRenderingContext2D, words: readonly Word[], said: number, y: number, size: number, ink: TextInk): void {
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
    const colours: TextInk = i === said ? { fill: SPOKEN, halo: ink === ON_LIGHT ? INK : DARK_HALO } : ink;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, y, size * k, 700, 1, colours);
    x += (natural[i]! + space) * k;
  });
}

function drawCaptions(ctx: CanvasRenderingContext2D, t: number, light: boolean): void {
  const hook = hookAt(t);
  if (hook !== null) {
    drawRow(ctx, HOOK_ROWS[0]!, hook, TEXT.hook1.y, TEXT.hook1.size, ON_DARK);
    drawRow(ctx, HOOK_ROWS[1]!, hook - HOOK_ROWS[0]!.length, TEXT.hook2.y, TEXT.hook2.size, ON_DARK);
    return;
  }
  const now = captionAt(t);
  if (now) drawRow(ctx, now.line.words, now.word, TEXT.caption.y, TEXT.caption.size, light ? ON_LIGHT : ON_DARK);
}

/** The fish sliding in along the tongue, head first, hidden by the face once it's past the throat. */
function fishItems(t: number, cam: Camera, rigs: Rigs): Item[] {
  const zHead = fishZAt(t);
  const zTail = zHead + 5.4;
  const head = tonguePath(rigs, zHead, 0.6);
  const tail = tonguePath(rigs, zTail, 0.6);
  const ph = project(cam, head);
  const pt = project(cam, tail);
  if (ph.z < NEAR || pt.z < NEAR || zTail < THROAT_Z - 0.6) return [];
  const mid = tonguePath(rigs, (zHead + zTail) / 2, 0.6);
  const h = 1.25 * pxPerCm(cam, mid);
  // Past the throat it's inside the bird: show it only through the open mouth.
  const mouth = hull([
    ...throatOf(rigs),
    ...[0, 0.25, 0.5, 0.75, 1].flatMap((s) => [-1, 1].flatMap((side) => [onJaw(rigs.upper, upperEdge(s * BILL_L, side)), onJaw(rigs.lower, lowerEdge(s * BILL_L * 0.95, side))])),
  ].map((p) => project(cam, p)));
  const dim = ramp(zHead, THROAT_Z - 1.5, THROAT_Z + 1.2);
  return [{
    depth: project(cam, mid).z - 0.05,
    draw(ctx) {
      ctx.save();
      if (zHead < THROAT_Z + 0.6) {
        ctx.beginPath();
        mouth.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();
      }
      drawFish(ctx, ph, pt, h, fishWriggleAt(t), wrap(t), 1);
      if (dim < 1) {
        // Into the dark of the throat.
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(8,2,4,${(0.85 * (1 - dim)).toFixed(3)})`;
        ctx.fillRect(0, 0, W, VIDEO.height);
      }
      ctx.restore();
    },
  }];
}

/** The glint along the bill's near cutting edges, tip to base, on "teeth.". */
function drawEdgeGlint(ctx: CanvasRenderingContext2D, t: number, v: View): void {
  const u = wrap(t);
  const a = window01(u, AT.teeth - 0.12, AT.penguins + 0.1, 0.12);
  if (a <= 0) return;
  const side = unplace(v.rigs.bill, v.cam.eye).x >= 0 ? 1 : -1;
  const k = ramp(u, AT.teeth - 0.1, AT.penguins);
  const zs = Array.from({ length: 24 }, (_, i) => BILL_L * (1 - i / 23));
  const upper = zs.map((z) => project(v.cam, onJaw(v.rigs.upper, upperEdge(z, side))));
  const lower = zs.map((z) => project(v.cam, onJaw(v.rigs.lower, lowerEdge(z * 0.95, side))));
  drawGlint(ctx, upper, k, a);
  drawGlint(ctx, lower, Math.max(0, k - 0.1), a);
}

export function createPenguin(ctx: CanvasRenderingContext2D): Short {
  const layer = makeLayer();
  const paper = makePaper();

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const v = viewAt(t);
    const name = v.scene.name;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (name === 'nails') {
      drawNailBeat(ctx, spineInAt(t), sheenAt(t));
      drawGrain(ctx, paper, 0.25);
      drawVignette(ctx, 0.55);
      drawCaptions(ctx, t, false);
      ctx.restore();
      return;
    }
    if (v.dark >= 0.999) drawDark(ctx, v.red);
    else drawIce(ctx, v.cam, v.dark);
    if (name === 'cute') drawShadow(ctx, v.cam, v.pose.at, 1);
    const jolt = shakeAt(t);
    ctx.translate(jolt.x, jolt.y);
    drawPenguin(ctx, layer, v.cam, v.pose, v.light, boil, {
      glow: glowAt(t),
      extra: name === 'fish' ? (rigs) => fishItems(t, v.cam, rigs) : undefined,
      soft: name === 'cute' ? 1.4 : 1.1,
    });
    if (name === 'noteeth') drawEdgeGlint(ctx, t, v);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawRed(ctx, v.red * 0.55);
    drawGrain(ctx, paper, 0.22);
    drawVignette(ctx, 0.35 + 0.4 * v.dark);
    drawCaptions(ctx, t, v.dark < 0.5);
    ctx.restore();
  };

  return { loopSeconds: LOOP_S, draw, audio: renderPenguinAudio };
}
