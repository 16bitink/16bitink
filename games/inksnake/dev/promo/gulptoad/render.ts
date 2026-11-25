import { HOGNOSE_ART } from '../../../src/art/chapters/barrensSnake';
import { INK, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { drawJawInNeck, jawEdge } from '../headSeam';
import { type Short, VIDEO } from '../short';
import { bakeSprite, bakeStrip, boilAt, drawSprite, type Pt, type Sprite, type Strip } from '../sprites';
import { renderGulpToadAudio } from './audio';
import { along, axisOf, drawSnakeBody, drawSnakeShadow, HEAD_W, headAxis, type HeadRoom, TOP_BACK, TOP_CHORD } from './body';
import { groundAt, shakeAt, toScreen, type View, viewAt } from './camera';
import { drawSand, paintSand, type Sand } from './ground';
import { CHIN_DROP_ART, HOG_INSIDE, HOG_JAW_ART, HOG_LOWER, HOG_UPPER, JAW_FADE_ART, SKULL_RISE_ART } from './hogSide';
import { type JawFrame, jawsAt } from './jaws';
import { drawLipCorner, type JawPlace, lipCorner } from './lips';
import { pathAt } from './path';
import { BODY_LEN, type EyeState, headU, LOOP_S, NECK_W, sideView, snakeEye, toadAt, tongue, wrap } from './story';
import { trimNeck, warmSprite, warmStrip } from './strip';
import { bakeToad, drawAlarm, drawSwell, drawToad, drawToadShadow, type ToadCast } from './toadDraw';
import { airPuffs, biggerAt, CAPTIONS, captionAlpha, CREDIT_TEXT, PFFFT_TEXT, pffftAt, scoreAt, SCORE_TEXT } from './words';

/** Draws the eastern hognose and the puffed-up toad short (story.ts has the beats). */

const ART = HOGNOSE_ART!;

interface Cast {
  readonly sand: Sand;
  readonly strip: Strip;
  readonly head: Sprite;
  readonly tongue: Sprite;
  readonly upper: Readonly<Record<EyeState, Sprite>>;
  readonly lower: Sprite;
  readonly roof: Sprite;
  readonly floor: Sprite;
  readonly toad: ToadCast;
}

function bakeCast(): Cast {
  return {
    sand: paintSand(),
    strip: warmStrip(bakeStrip(ART, 9)),
    head: trimNeck(warmSprite(bakeSprite(ART.head, 'shut', 9, 300)), -9, -19),
    tongue: bakeSprite(ART.tongue, 'flick', 9, 320),
    upper: {
      open: bakeSprite(HOG_UPPER, 'open', 7, 340),
      squeeze: bakeSprite(HOG_UPPER, 'squeeze', 7, 340),
      happy: bakeSprite(HOG_UPPER, 'happy', 7, 340),
    },
    lower: bakeSprite(HOG_LOWER, 'jaw', 7, 350),
    roof: bakeSprite(HOG_INSIDE, 'roof', 7, 360),
    floor: bakeSprite(HOG_INSIDE, 'floor', 7, 360),
    toad: bakeToad(),
  };
}

// ---------------------------------------------------------------- the head

/** Once the ball's widest is past them the hinges stay near the tips' line, and the ball bulges the cheeks behind. */
const MAX_FALL = 70;

function jawPlace(t: number, j: JawFrame): JawPlace {
  const { p, q: back, heading } = headAxis(t, j.reach);
  const a = axisOf(heading);
  // Shut, the lips meet back to the hinge; open, the jaws spring from the top and bottom of the neck.
  const open = Math.min(1, (j.tipTop + j.tipBottom) / 120);
  const hinge = 0.04 + 0.68 * open;
  const offU = Math.min(Math.max(j.hingeTop - NECK_W / 2, 0) + (NECK_W / 2) * hinge, j.tipTop + 4 + MAX_FALL * open);
  const offL = Math.min(Math.max(j.hingeBottom - NECK_W / 2, 0) + (NECK_W / 2) * hinge, j.tipBottom + 4 + MAX_FALL * open);
  return { hingeU: along(back, a, 0, offU), hingeL: along(back, a, 0, -offL), tipU: along(p, a, 0, j.tipTop), tipL: along(p, a, 0, -j.tipBottom) };
}

function headRoom(q: JawPlace, reach: number, side: number, heading: number): HeadRoom {
  const up = axisOf(heading).up;
  const down = { x: -up.x, y: -up.y };
  const k = Math.hypot(q.tipU.x - q.hingeU.x, q.tipU.y - q.hingeU.y) / HOG_JAW_ART;
  return {
    reach, side,
    skull: jawEdge(q.hingeU, q.tipU, HOG_JAW_ART, SKULL_RISE_ART, up),
    chin: jawEdge(q.hingeL, q.tipL, HOG_JAW_ART, CHIN_DROP_ART, down),
    hold: reach + JAW_FADE_ART * k,
  };
}

/** The inside of the mouth, behind whatever is in it. */
function drawMouth(ctx: CanvasRenderingContext2D, view: View, q: JawPlace, alpha: number): void {
  const [hu, hl, tu, tl] = [q.hingeU, q.hingeL, q.tipU, q.tipL].map((p) => toScreen(view, p)) as [Pt, Pt, Pt, Pt];
  const back = { x: (hu.x + hl.x) / 2, y: (hu.y + hl.y) / 2 };
  const front = { x: (tu.x + tl.x) / 2, y: (tu.y + tl.y) / 2 };
  const g = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  g.addColorStop(0, '#4a1620');
  g.addColorStop(0.16, '#984050');
  g.addColorStop(0.5, '#dc9298');
  g.addColorStop(1, '#f3c4c0');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(hu.x, hu.y);
  ctx.lineTo(tu.x, tu.y);
  ctx.quadraticCurveTo(front.x + (back.x - front.x) * 0.28, front.y + (back.y - front.y) * 0.28, tl.x, tl.y);
  ctx.lineTo(hl.x, hl.y);
  for (const p of [...lipCorner(q)].reverse().map((c) => toScreen(view, c))) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawJaw(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, view: View, hinge: Pt, tip: Pt, alpha: number, neck: readonly Pt[]): void {
  const [h, e] = [toScreen(view, hinge), toScreen(view, tip)];
  const rotation = Math.atan2(e.y - h.y, e.x - h.x);
  drawJawInNeck(ctx, h, e, neck, () => drawSprite(ctx, sprite, boil, { x: h.x, y: h.y, rotation, flip: -1, scale: Math.hypot(e.x - h.x, e.y - h.y) / HOG_JAW_ART, alpha }));
}

function drawTopHead(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, alpha: number): void {
  const k = (NECK_W * view.zoom) / HEAD_W;
  const { p, heading } = headAxis(t, TOP_CHORD);
  const c = toScreen(view, along(p, axisOf(heading), -TOP_BACK, 0));
  drawSprite(ctx, cast.head, boil, { x: c.x, y: c.y, rotation: heading, flip: -1, scale: k, alpha });
}

function drawTongue(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View): void {
  const out = tongue(t);
  if (out <= 0) return;
  const { p, heading } = headAxis(t, TOP_CHORD);
  const k = (NECK_W * view.zoom) / HEAD_W;
  const tip = toScreen(view, along(p, axisOf(heading), -6 + 100 * out - 60, 0));
  drawSprite(ctx, cast.tongue, boil, { x: tip.x, y: tip.y, rotation: heading, scale: k * 0.9 });
}

/** The toad shows only between the jaws and past their tips: never behind the hinges, above the upper jaw or under the lower. */
function clipToMouth(ctx: CanvasRenderingContext2D, view: View, q: JawPlace): void {
  const dir = (a: Pt, b: Pt): Pt => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  };
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const fwd = dir(mid(q.hingeU, q.hingeL), mid(q.tipU, q.tipL));
  const gap = { x: q.tipU.x - q.tipL.x, y: q.tipU.y - q.tipL.y };
  const up = Math.hypot(gap.x, gap.y) > 20 ? dir(q.tipL, q.tipU) : { x: -fwd.y, y: fwd.x };
  const off = (p: Pt, f: number, u: number): Pt => ({ x: p.x + fwd.x * f + up.x * u, y: p.y + fwd.y * f + up.y * u });
  // A little into the jaws' own depth, so their lips overlap its edge.
  const lip = 24;
  const corners = [
    off(q.hingeU, -10, lip), off(q.tipU, -8, lip), off(q.tipU, -8, 3000), off(q.tipU, 5000, 3000),
    off(q.tipL, 5000, -3000), off(q.tipL, -8, -3000), off(q.tipL, -8, -lip), off(q.hingeL, -10, -lip),
    ...[...lipCorner(q)].reverse().map((p) => off(p, -10, 0)),
  ].map((p) => toScreen(view, p));
  ctx.beginPath();
  corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

// ---------------------------------------------------------------- air and words

/** Little clouds of air from the lips. */
function drawAir(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  const p = pathAt(headU(t));
  const axis = axisOf(p.heading);
  for (const a of airPuffs(t)) {
    const c = toScreen(view, along(p, axis, a.out, a.up - 8));
    const r = a.r * view.zoom;
    // A cloud of round lobes, inked round, then filled, so only its outline shows.
    const lobes = Array.from({ length: 6 }, (_, i) => {
      const th = (i / 6) * Math.PI * 2 + a.out * 0.01;
      return { x: c.x + Math.cos(th) * r * 0.62, y: c.y + Math.sin(th) * r * 0.5, r: r * (0.42 + 0.08 * (i % 2)) };
    });
    const pass = (grow: number, fill: string): void => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (const l of [...lobes, { x: c.x, y: c.y, r: r * 0.6 }]) {
        ctx.moveTo(l.x + l.r + grow, l.y);
        ctx.arc(l.x, l.y, l.r + grow, 0, Math.PI * 2);
      }
      ctx.fill();
    };
    ctx.save();
    ctx.globalAlpha = a.alpha;
    pass(3.6 * view.zoom, INK);
    pass(0, '#fffaf0');
    ctx.restore();
  }
}

function drawWords(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  const head = toScreen(view, pathAt(headU(t)));
  const score = scoreAt(t);
  if (score) drawTextLine(ctx, SCORE_TEXT, Math.max(220, head.x + 60), head.y - 190 - 90 * score.rise, 128, 700, score.alpha);
  const bigger = biggerAt(t);
  if (bigger) drawTextLine(ctx, 'Bigger!', 540, 1170 - 70 * bigger.rise, 140, 700, bigger.alpha, { fill: RED, halo: '#fffaf0' });
  const air = pffftAt(t);
  if (air) drawTextLine(ctx, PFFFT_TEXT, Math.max(200, head.x + 10), head.y - 190 - 60 * air.rise, 120, 700, air.alpha);
  for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  drawTextLine(ctx, CREDIT_TEXT.text, VIDEO.width / 2, CREDIT_TEXT.y, CREDIT_TEXT.size, 700, CREDIT_TEXT.alpha);
}

// ---------------------------------------------------------------- a frame

/** How far behind the tip the body passes under the toad rather than over it. */
const UNDER_FROM = 900;

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const shake = shakeAt(t);
  const view = viewAt(t);
  const side = sideView(t);
  const toad = toadAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.fillStyle = '#d9d0bb';
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
  drawSand(ctx, cast.sand, groundAt(t));
  const j = jawsAt(t);
  const q = jawPlace(t, j);
  const room = headRoom(q, j.reach, side, headAxis(t, j.reach).heading);
  // The ball past the hinges' line bulges the cheeks between the jaws' backs.
  const bulge = Math.min(1, Math.max(0, (Math.max(j.hingeTop - j.tipTop, j.hingeBottom - j.tipBottom) - MAX_FALL) / 80));
  const d0 = 60 + side * (j.reach * (0.86 - 0.36 * bulge) - 60);
  drawSnakeShadow(ctx, t, view, d0, room);
  if (toad) {
    // The far loop of the body lies under the toad; the neck over it.
    drawSnakeBody(ctx, cast.strip, t, boil, view, d0, { from: UNDER_FROM, to: BODY_LEN }, room, []);
    drawToadShadow(ctx, toad, view);
  }
  if (side > 0 && j.tipTop + j.tipBottom > 8) drawMouth(ctx, view, q, side);
  if (toad) {
    ctx.save();
    if (t < 6) clipToMouth(ctx, view, q);
    drawSwell(ctx, t, toad, view);
    drawToad(ctx, cast.toad, toad, boil, view);
    ctx.restore();
  }
  const mouth = side > 0.5 ? [q.tipU, ...lipCorner(q), q.tipL].map((p) => toScreen(view, p)) : [];
  const neck = drawSnakeBody(ctx, cast.strip, t, boil, view, d0, { from: 0, to: toad ? UNDER_FROM + 4 : BODY_LEN }, room, mouth);
  if (side > 0.5) drawLipCorner(ctx, view, q, side);
  if (side > 0) {
    const open = side * Math.min(1, Math.max(0, (j.tipTop + j.tipBottom - 12) / 70));
    drawJaw(ctx, cast.floor, boil, view, q.hingeL, q.tipL, open, neck);
    drawJaw(ctx, cast.lower, boil, view, q.hingeL, q.tipL, side, neck);
    drawJaw(ctx, cast.roof, boil, view, q.hingeU, q.tipU, open, neck);
    drawJaw(ctx, cast.upper[snakeEye(t)], boil, view, q.hingeU, q.tipU, side, neck);
  }
  if (side < 1) drawTopHead(ctx, cast, t, boil, view, 1 - side);
  drawTongue(ctx, cast, t, boil, view);
  drawAir(ctx, t, view);
  drawAlarm(ctx, t, toad, view);
  ctx.restore();
  drawWords(ctx, t, view);
}

export function createGulpToad(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, wrap(seconds)), audio: renderGulpToadAudio };
}
