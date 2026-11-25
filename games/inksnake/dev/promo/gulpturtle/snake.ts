import { INK } from '../../../src/art/palette';
import { ANACONDA_ART } from '../../../src/art/chapters/floodedSnake';
import { ramp } from '../short';
import { bakeSprite, bakeStrip, drawSprite, type Pt, type Sprite, type Strip, taper } from '../sprites';
import { pathAt } from '../gulphen/path';
import { toScreen, type View } from '../gulpcapy/camera';
import { ANA_INSIDE, ANA_JAW_ART, ANA_LOWER, ANA_UPPER } from '../gulpcapy/anacondaSide';
import { drawJawInNeck, edgeDistance, seamWeight } from '../headSeam';
import { drawLip, drawLipShade, lipCurve } from './lip';
import { drawSkin } from './lump';
import {
  along, axisOf, HEAD_TIP, HEAD_W, headAxis, type HeadRoom, headRoom, type JawPlace, neckAt, neckOf, SEAM_EASE, SEAM_OVER_BACK, TOP_CHORD, TOP_D0,
} from './neck';
import { drawSoftShadow } from './shadow';
import { BODY_LEN, type EyeState, headU, type JawFrame, jawsAt, lumpSize, mealRim, NECK_W, sideView, snakeEye, swellBottom, swellTop, tongue } from './story';

/** Draws the green anaconda, as the capybara short does (../gulpcapy/render.ts), swollen to the turtle's shape. */

const ART = ANACONDA_ART!;
/** The game's head with its neck faded short: on a tight bend the long stiff one would stick out past the body's curve. */
const SHORT_HEAD: typeof ART.head = {
  ...ART.head,
  draw: (d, pose) => {
    ART.head.draw(d, pose);
    const { ctx } = d.pen;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createLinearGradient(-13, 0, -5, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-80, -40, 75, 80);
    ctx.restore();
  },
};

export interface SnakeCast {
  readonly strip: Strip;
  readonly head: Sprite;
  readonly tongue: Sprite;
  readonly upper: Readonly<Record<EyeState, Sprite>>;
  readonly lower: Sprite;
  readonly roof: Sprite;
  readonly floor: Sprite;
}

export function bakeSnake(): SnakeCast {
  const upper = (eye: EyeState): Sprite => bakeSprite(ANA_UPPER, eye, 7, 340);
  return {
    strip: bakeStrip(ART, 9),
    head: bakeSprite(SHORT_HEAD, 'shut', 9, 300),
    tongue: bakeSprite(ART.tongue, 'flick', 9, 320),
    upper: { open: upper('open'), squeeze: upper('squeeze'), happy: upper('happy') },
    lower: bakeSprite(ANA_LOWER, 'jaw', 7, 350),
    roof: bakeSprite(ANA_INSIDE, 'roof', 7, 360),
    floor: bakeSprite(ANA_INSIDE, 'floor', 7, 360),
  };
}

interface BodyShape {
  readonly spine: readonly Pt[];
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
  readonly widths: readonly number[];
  /** Where on the turtle each point is, and the way up. */
  readonly places: readonly { readonly a: number; readonly up: Pt; readonly top: number; readonly bottom: number }[];
}

/** The body from `d0` behind the rim back to the tail, swollen round the meal to its outline. */
function bodyWorld(t: number, d0: number, head: HeadRoom): BodyShape {
  const h = headU(t);
  const neck = neckOf(t, head);
  const rim = mealRim(t);
  const size = lumpSize(t);
  // Where the head's edges stand at the hinges.
  const at0 = neckAt(neck, h, head.reach);
  const up0 = axisOf(at0.heading).up;
  const over = {
    top: 4 + Math.max(swellTop(rim - head.reach, size), edgeDistance(at0, up0, head.skull) ?? 0),
    bottom: 4 + Math.max(swellBottom(rim - head.reach, size), edgeDistance(at0, { x: -up0.x, y: -up0.y }, head.chin) ?? 0),
  };
  const spine: Pt[] = [];
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  const widths: number[] = [];
  const places: { a: number; up: Pt; top: number; bottom: number }[] = [];
  for (let d = d0; d <= BODY_LEN; d += 4) {
    const p = neckAt(neck, h, d);
    const a = rim - d;
    const thin = taper(d / BODY_LEN, 0.55, 0.04);
    // Under the jaws' faded backs the neck keeps to the skull's top and the chin's underside, then eases to its own outline.
    const room = head.side * seamWeight(d, head.hold, SEAM_EASE);
    const swellT = swellTop(a, size) * thin;
    const swellB = swellBottom(a, size) * thin;
    const axis = axisOf(p.heading);
    const floor = (NECK_W / 2) * thin;
    // Once behind the hinges, no higher than the meal pushes them: a steep head's own lines would run up past it into a peak.
    const ease = 1 - ramp(d, head.reach, head.reach + SEAM_OVER_BACK);
    const cap = (edge: number, own: number): number => (d < head.reach ? Infinity : own + (Math.max(edge, own) - own) * ease);
    const skull = room > 0 ? Math.min(cap(over.top, swellT), Math.max(floor, edgeDistance(p, axis.up, head.skull) ?? swellT)) : swellT;
    const chin = room > 0 ? Math.min(cap(over.bottom, swellB), Math.max(floor, edgeDistance(p, { x: -axis.up.x, y: -axis.up.y }, head.chin) ?? swellB)) : swellB;
    const top = swellT + room * (skull - swellT);
    const bottom = swellB + room * (chin - swellB);
    spine.push(p);
    upper.push(along(p, axis, 0, top));
    lower.push(along(p, axis, 0, -bottom));
    // The strip is laid a little wide, so its own contour falls outside the clip and only the one drawn round the body shows.
    const wide = Math.max(top, bottom);
    widths.push(2 * wide * (1.07 + 0.11 * Math.min(1, Math.max(0, wide / floor - 1) * 8)));
    places.push({ a, up: axis.up, top, bottom });
  }
  return { spine, upper, lower, widths, places };
}

/** The body's contour along one side, thinning towards the tail. */
function strokeEdge(ctx: CanvasRenderingContext2D, edge: readonly Pt[], from: number, width: number): void {
  const CHUNK = from > 0 ? 3 : 12;
  const START = 24;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  for (let i = from; i + 1 < edge.length; i += CHUNK) {
    // It grows out of the jaw's own contour, and thins down the tail.
    const start = from > 0 ? 0.35 + 0.65 * Math.min(1, (i - from) / START) : 1;
    ctx.lineWidth = width * start * (0.25 + 0.75 * taper(i / edge.length, 0.55, 0.04));
    ctx.beginPath();
    edge.slice(i, i + CHUNK + 1).forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
}

/** The snake's outline for its shadow: the body no higher than it is thick, then the lower jaw (or the head) out to its tip. */
function shadowOutline(body: BodyShape, view: View, t: number, d0: number, head: HeadRoom, q: JawPlace): readonly Pt[] {
  const back = head.side > 0.5 ? Math.max(0, Math.round((head.reach - d0) / 4)) : 0;
  const thick = (i: number): number => Math.min(body.places[i]!.top, (NECK_W / 2) * taper((d0 + 4 * i) / BODY_LEN, 0.55, 0.04));
  const top = body.spine.slice(back).map((p, k) => ({ x: p.x + body.places[back + k]!.up.x * thick(back + k), y: p.y + body.places[back + k]!.up.y * thick(back + k) }));
  const tip = head.side > 0.5 ? q.tipL : pathAt(headU(t));
  const start = head.side > 0.5 ? [along(q.tipL, axisOf(headAxis(t, head.reach).heading), 0, -18)] : [];
  return [tip, ...top, ...body.lower.slice(back).reverse(), ...start].map((p) => toScreen(view, p));
}

/** The corner of the mouth: its curve from the lower jaw to the upper, and how much of a lip it shows. */
interface Corner {
  readonly curve: readonly Pt[];
  readonly alpha: number;
}

/** Along the jaws from the hinges (0) to the tips (1): where the lip joins them, and where its middle is pulled back to. */
const LIP_JOIN = 0.36;
const LIP_PULL = -0.22;

/** Round the meal only: not on the open strike of frame 1, nor once the jaws have shut. */
function mouthCorner(t: number, q: JawPlace, view: View): Corner {
  const on = t < 7 ? ramp(t, 0.35, 0.85) : 0;
  const gap = Math.hypot(q.tipU.x - q.tipL.x, q.tipU.y - q.tipL.y);
  const mix = (h: Pt, e: Pt, f: number): Pt => ({ x: h.x + (e.x - h.x) * f, y: h.y + (e.y - h.y) * f });
  const [join, pull] = [0.14 + (LIP_JOIN - 0.14) * on, 0.14 + (LIP_PULL - 0.14) * on];
  const [u, l, cu, cl] = [mix(q.hingeU, q.tipU, join), mix(q.hingeL, q.tipL, join), mix(q.hingeU, q.tipU, pull), mix(q.hingeL, q.tipL, pull)];
  const curve = lipCurve(l, { x: (cu.x + cl.x) / 2, y: (cu.y + cl.y) / 2 }, u).map((p) => toScreen(view, p));
  return { curve, alpha: on * ramp(gap, 30, 110) };
}

function drawSnakeBody(ctx: CanvasRenderingContext2D, cast: SnakeCast, t: number, boil: number, view: View, d0: number, head: HeadRoom, body: BodyShape, corner: Corner): readonly Pt[] {
  const upper = body.upper.map((p) => toScreen(view, p));
  const lower = body.lower.map((p) => toScreen(view, p));
  const pose = {
    spine: body.spine.map((p) => toScreen(view, p)),
    widths: body.widths.map((w) => w * view.zoom),
    along: (NECK_W * view.zoom) / 24,
    offset: d0 / (NECK_W / 24),
  };
  if (corner.alpha > 0) drawLipShade(ctx, corner.curve, view.zoom, corner.alpha);
  ctx.save();
  ctx.beginPath();
  // In front, the body ends at the corner of the mouth, between the jaws' lines.
  const hinge = head.side >= 1 ? Math.max(0, Math.round((head.reach - d0) / 4)) : 0;
  const front = head.side >= 1 ? corner.curve : [];
  const neck = [...upper.slice(hinge), ...lower.slice(hinge).reverse(), ...front];
  neck.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const skin = body.places.map((s, i) => ({
    a: s.a, p: pose.spine[i]!, up: { x: s.up.x * view.zoom, y: s.up.y * view.zoom }, top: s.top, bottom: s.bottom,
  }));
  drawSkin(ctx, cast.strip, boil, pose, skin, lumpSize(t), view.zoom, { a: mealRim(t) - head.reach, alpha: corner.alpha });
  ctx.restore();
  if (corner.alpha > 0) drawLip(ctx, corner.curve, axisOf(headAxis(t, head.reach).heading).e, view.zoom, corner.alpha);
  // The jaws' own contours run up to their hinges.
  const from = head.side > 0.5 ? Math.max(0, Math.round((head.reach + 8 - d0) / 4)) : 0;
  strokeEdge(ctx, upper, from, 6.5 * view.zoom);
  strokeEdge(ctx, lower, from, 7.5 * view.zoom);
  return neck;
}

function jawPlace(t: number, j: JawFrame): JawPlace {
  const { p, q: back, heading } = headAxis(t, j.reach);
  const a = axisOf(heading);
  // Shut, the lips meet back to the hinge; open, the jaws spring from the top and bottom of the neck.
  const hinge = 0.04 + 0.68 * Math.min(1, (j.tipTop + j.tipBottom) / 120);
  const offU = Math.max(j.hingeTop - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  const offL = Math.max(j.hingeBottom - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  return {
    offU, offL,
    hingeU: along(back, a, 0, offU),
    hingeL: along(back, a, 0, -offL),
    tipU: along(p, a, 0, j.tipTop),
    tipL: along(p, a, 0, -j.tipBottom),
  };
}

/** The inside of the mouth, behind whatever is in it. */
function drawMouth(ctx: CanvasRenderingContext2D, view: View, q: JawPlace, alpha: number): void {
  const [hu, hl, tu, tl] = [q.hingeU, q.hingeL, q.tipU, q.tipL].map((p) => toScreen(view, p)) as [Pt, Pt, Pt, Pt];
  const back = { x: (hu.x + hl.x) / 2, y: (hu.y + hl.y) / 2 };
  const front = { x: (tu.x + tl.x) / 2, y: (tu.y + tl.y) / 2 };
  const g = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  g.addColorStop(0, '#4a1c22');
  g.addColorStop(0.16, '#9a4a54');
  g.addColorStop(0.5, '#d89a9a');
  g.addColorStop(1, '#f0c8bc');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(hu.x, hu.y);
  ctx.lineTo(tu.x, tu.y);
  ctx.quadraticCurveTo(front.x + (back.x - front.x) * 0.28, front.y + (back.y - front.y) * 0.28, tl.x, tl.y);
  ctx.lineTo(hl.x, hl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawJaw(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, view: View, hinge: Pt, tip: Pt, alpha: number, neck: readonly Pt[]): void {
  const [h, e] = [toScreen(view, hinge), toScreen(view, tip)];
  const rotation = Math.atan2(e.y - h.y, e.x - h.x);
  drawJawInNeck(ctx, h, e, neck, () => drawSprite(ctx, sprite, boil, { x: h.x, y: h.y, rotation, flip: -1, scale: Math.hypot(e.x - h.x, e.y - h.y) / ANA_JAW_ART, alpha }));
}

function drawTopHead(ctx: CanvasRenderingContext2D, cast: SnakeCast, t: number, boil: number, view: View, alpha: number): void {
  const k = (NECK_W * view.zoom) / HEAD_W;
  // The sprite's origin sits this far behind the tip; its neck fades out about as far again behind that.
  const reach = HEAD_TIP * (NECK_W / HEAD_W);
  const { p, heading } = headAxis(t, TOP_CHORD);
  const c = toScreen(view, along(p, axisOf(heading), -reach, 0));
  drawSprite(ctx, cast.head, boil, { x: c.x, y: c.y, rotation: heading, scale: k, alpha });
}

function drawTongue(ctx: CanvasRenderingContext2D, cast: SnakeCast, t: number, boil: number, view: View): void {
  const out = tongue(t);
  if (out <= 0) return;
  const { p, heading } = headAxis(t, TOP_CHORD);
  const k = (NECK_W * view.zoom) / HEAD_W;
  const tip = toScreen(view, along(p, axisOf(heading), -6 + 100 * out - 60, 0));
  drawSprite(ctx, cast.tongue, boil, { x: tip.x, y: tip.y, rotation: heading, scale: k * 0.9 });
}

/**
 * Keeps the meal where it can be seen: between the jaws (below the upper
 * one's line, above the lower one's) and past their tips; never over the
 * upper jaw or behind the hinge.
 */
function clipToMouth(ctx: CanvasRenderingContext2D, view: View, q: JawPlace): void {
  const hinge = { x: (q.hingeU.x + q.hingeL.x) / 2, y: (q.hingeU.y + q.hingeL.y) / 2 };
  const tip = { x: (q.tipU.x + q.tipL.x) / 2, y: (q.tipU.y + q.tipL.y) / 2 };
  const gap = { x: q.tipU.x - q.tipL.x, y: q.tipU.y - q.tipL.y };
  const fwd = { x: tip.x - hinge.x, y: tip.y - hinge.y };
  const up = Math.hypot(gap.x, gap.y) > 20 ? gap : { x: fwd.y, y: -fwd.x };
  const len = Math.hypot(up.x, up.y) || 1;
  const n = { x: (up.x / len) * 4000, y: (up.y / len) * 4000 };
  const square = { x: -n.y, y: n.x };
  const out = square.x * fwd.x + square.y * fwd.y > 0 ? square : { x: -square.x, y: -square.y };
  // From the hinges out along the jaws, then everything past the tips.
  const corners = [
    q.hingeU, q.tipU, { x: q.tipU.x + n.x, y: q.tipU.y + n.y }, { x: q.tipU.x + n.x + out.x, y: q.tipU.y + n.y + out.y },
    { x: q.tipL.x - n.x + out.x, y: q.tipL.y - n.y + out.y }, { x: q.tipL.x - n.x, y: q.tipL.y - n.y }, q.tipL, q.hingeL,
  ].map((p) => toScreen(view, p));
  ctx.beginPath();
  corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

// ---------------------------------------------------------------- the whole snake, round its meal

/** Draws the mouth, then the meal in it (`meal`), then the rest of the snake over it. */
export function drawSnake(ctx: CanvasRenderingContext2D, cast: SnakeCast, t: number, boil: number, view: View, meal: () => void): void {
  const side = sideView(t);
  const j = jawsAt(t);
  const q = jawPlace(t, j);
  // One head is always whole while the two views change over: the side view comes in under the top-down one, then that one goes.
  const [sideIn, topOut] = [ramp(side, 0, 0.5), ramp(side, 0.5, 1)];
  const d0 = TOP_D0 + topOut * (j.reach * (1 - LIP_JOIN) - TOP_D0);
  const room = headRoom(q, j.reach, side, headAxis(t, j.reach).heading);
  const body = bodyWorld(t, d0, room);
  drawSoftShadow(ctx, shadowOutline(body, view, t, d0, room, q), NECK_W * view.zoom);
  if (side > 0 && j.tipTop + j.tipBottom > 8) drawMouth(ctx, view, q, side);
  ctx.save();
  if (t < 6) clipToMouth(ctx, view, q);
  meal();
  ctx.restore();
  const neck = drawSnakeBody(ctx, cast, t, boil, view, d0, room, body, mouthCorner(t, q, view));
  if (side > 0) {
    const open = sideIn * Math.min(1, Math.max(0, (j.tipTop + j.tipBottom - 12) / 70));
    drawJaw(ctx, cast.floor, boil, view, q.hingeL, q.tipL, open, neck);
    drawJaw(ctx, cast.lower, boil, view, q.hingeL, q.tipL, sideIn, neck);
    drawJaw(ctx, cast.roof, boil, view, q.hingeU, q.tipU, open, neck);
    drawJaw(ctx, cast.upper[snakeEye(t)], boil, view, q.hingeU, q.tipU, sideIn, neck);
  }
  if (side < 1) drawTopHead(ctx, cast, t, boil, view, 1 - topOut);
  drawTongue(ctx, cast, t, boil, view);
}
