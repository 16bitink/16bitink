import { INK, RED } from '../../../src/art/palette';
import { ANACONDA_ART } from '../../../src/art/chapters/floodedSnake';
import { drawTextLine } from '../captions';
import { type Short, VIDEO } from '../short';
import { bakeSprite, bakeStrip, boilAt, drawBody, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip, taper } from '../sprites';
import { pathAt } from '../gulphen/path';
import { ANA_INSIDE, ANA_JAW_ART, ANA_LOWER, ANA_UPPER } from '../gulpcapy/anacondaSide';
import { drawJawInNeck, edgeDistance, type JawEdge, jawEdge, seamWeight } from '../headSeam';
import { renderGulpCaimanAudio } from './audio';
import { groundAt, shakeAt, toScreen, type View, viewAt } from './camera';
import { bakeCaiman, type CaimanCast, drawAlarm, drawCaiman, drawCaimanShadow, drawSplashes } from './caimanDraw';
import { caimanAt } from './caimanPose';
import { type Bank, drawBank, paintBank } from './ground';
import {
  BODY_LEN, headU, type JawFrame, jawsAt, LOOP_S, lumpSize, mealRim, NECK_W, ridgeBump, sideView, snakeEye, swellBottom, swellTop, tongue, wrap,
} from './story';
import { biggerAt, CAPTIONS, captionAlpha, CREDIT_TEXT, scoreAt, SCORE_TEXT } from './words';

/** Draws the green anaconda and the young caiman short (story.ts has the beats). */

const ART = ANACONDA_ART!;
/** The game's head is this many art units across the neck, and its snout tip this far before its origin. */
const HEAD_W = 21.6;
const HEAD_TIP = 24.6;

interface Cast {
  readonly bank: Bank;
  readonly strip: Strip;
  readonly head: Sprite;
  readonly tongue: Sprite;
  readonly upper: Readonly<Record<'open' | 'squeeze' | 'happy', Sprite>>;
  readonly lower: Sprite;
  readonly roof: Sprite;
  readonly floor: Sprite;
  readonly caiman: CaimanCast;
}

function bakeCast(): Cast {
  return {
    bank: paintBank(),
    strip: bakeStrip(ART, 9),
    head: bakeSprite(ART.head, 'shut', 9, 300),
    tongue: bakeSprite(ART.tongue, 'flick', 9, 320),
    upper: {
      open: bakeSprite(ANA_UPPER, 'open', 7, 340),
      squeeze: bakeSprite(ANA_UPPER, 'squeeze', 7, 340),
      happy: bakeSprite(ANA_UPPER, 'happy', 7, 340),
    },
    lower: bakeSprite(ANA_LOWER, 'jaw', 7, 350),
    roof: bakeSprite(ANA_INSIDE, 'roof', 7, 360),
    floor: bakeSprite(ANA_INSIDE, 'floor', 7, 360),
    caiman: bakeCaiman(),
  };
}

// ---------------------------------------------------------------- the snake

interface Axis {
  /** The way the head points, and the side that's up on screen. */
  readonly e: Pt;
  readonly up: Pt;
}

const axisOf = (heading: number): Axis => {
  const e = { x: Math.cos(heading), y: Math.sin(heading) };
  return { e, up: { x: -e.y, y: e.x } };
};

const along = (p: Pt, a: Axis, forward: number, up: number): Pt => ({ x: p.x + a.e.x * forward + a.up.x * up, y: p.y + a.e.y * forward + a.up.y * up });

/** What the side-on head needs of the neck behind it. */
interface HeadRoom {
  readonly reach: number;
  readonly side: number;
  /** The skull's top and the chin's underside, which the neck carries on behind the hinges. */
  readonly skull: JawEdge;
  readonly chin: JawEdge;
  /** How far behind the tip the jaw art has faded out. */
  readonly hold: number;
}

/** Art units the skull's back stands off the upper jaw's hinge line, and the chin's off the lower's. */
const SKULL_RISE_ART = 11.8;
const CHIN_DROP_ART = 10;
/** Art units behind the hinge where the jaws' fadeBack has cleared them. */
const JAW_FADE_ART = 24;
/** World units over which the neck eases from the head's edges to its own. */
const SEAM_EASE = 260;

function headRoom(q: JawPlace, reach: number, side: number, heading: number): HeadRoom {
  const up = axisOf(heading).up;
  const down = { x: -up.x, y: -up.y };
  const k = Math.hypot(q.tipU.x - q.hingeU.x, q.tipU.y - q.hingeU.y) / ANA_JAW_ART;
  return {
    reach,
    side,
    skull: jawEdge(q.hingeU, q.tipU, ANA_JAW_ART, SKULL_RISE_ART, up),
    chin: jawEdge(q.hingeL, q.tipL, ANA_JAW_ART, CHIN_DROP_ART, down),
    hold: reach + JAW_FADE_ART * k,
  };
}

interface BodyShape {
  readonly spine: readonly Pt[];
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
  readonly widths: readonly number[];
  /** Whether the body is swollen here (it gets its own contour: the strip's lies outside the clip). */
  readonly swollen: readonly boolean[];
}

/** The body from `d0` behind the rim back to the tail, swollen round the meal to its outline. */
/** The neck just behind the head: straight along the head's axis, easing back onto the path, so a turning head stays joined to it. */
interface Neck {
  readonly p: Pt;
  readonly q: Pt;
  readonly e: Pt;
  /** How long the head's chord is along the path, and how far the chord really reaches. */
  readonly len: number;
  readonly chord: number;
}

function neckOf(t: number, head: HeadRoom): Neck {
  const len = TONGUE_BACK * 2 + (head.reach - TONGUE_BACK * 2) * head.side;
  const { p, q, heading } = headAxis(t, len);
  return { p, q, e: { x: Math.cos(heading), y: Math.sin(heading) }, len, chord: Math.hypot(p.x - q.x, p.y - q.y) };
}

/** The body's spine point `d` behind the tip: on the head's straight line near it, on the path further back. */
function neckAt(n: Neck, h: number, d: number): { x: number; y: number; heading: number } {
  const path = pathAt(h - d);
  const w = Math.min(1, Math.max(0, (d - n.len) / (n.len * 1.4)));
  if (w >= 1) return path;
  const s = w * w * (3 - 2 * w);
  const back = d <= n.len ? (d * n.chord) / n.len : n.chord + (d - n.len);
  const straight = { x: n.p.x - n.e.x * back, y: n.p.y - n.e.y * back };
  const heading = Math.atan2(n.e.y, n.e.x);
  const dh = Math.atan2(Math.sin(path.heading - heading), Math.cos(path.heading - heading));
  return { x: straight.x + (path.x - straight.x) * s, y: straight.y + (path.y - straight.y) * s, heading: heading + dh * s };
}

function bodyWorld(t: number, d0: number, head: HeadRoom): BodyShape {
  const h = headU(t);
  const neck = neckOf(t, head);
  const rim = mealRim(t);
  const size = lumpSize(t);
  const spine: Pt[] = [];
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  const widths: number[] = [];
  const swollen: boolean[] = [];
  for (let d = d0; d <= BODY_LEN; d += 4) {
    const p = neckAt(neck, h, d);
    const a = rim - d;
    const thin = taper(d / BODY_LEN, 0.55, 0.04);
    // Under the jaws' faded backs the neck keeps to the skull's top and the chin's underside, then eases to its own outline.
    const room = head.side * seamWeight(d, head.hold, SEAM_EASE);
    const swellT = (swellTop(a, size) + ridgeBump(a, size)) * thin;
    const swellB = swellBottom(a, size) * thin;
    const axis = axisOf(p.heading);
    const floor = (NECK_W / 2) * thin;
    const skull = room > 0 ? Math.max(floor, edgeDistance(p, axis.up, head.skull) ?? swellT) : swellT;
    const chin = room > 0 ? Math.max(floor, edgeDistance(p, { x: -axis.up.x, y: -axis.up.y }, head.chin) ?? swellB) : swellB;
    const top = swellT + room * (skull - swellT);
    const bottom = swellB + room * (chin - swellB);
    spine.push(p);
    upper.push(along(p, axis, 0, top));
    lower.push(along(p, axis, 0, -bottom));
    widths.push(2 * Math.max(top, bottom));
    swollen.push(room > 0.02 || Math.max(top, bottom) > (NECK_W / 2 + 3) * thin);
  }
  return { spine, upper, lower, widths, swollen };
}

function strokeRuns(ctx: CanvasRenderingContext2D, edge: readonly Pt[], on: readonly boolean[], width: number): void {
  ctx.beginPath();
  edge.forEach((p, i) => {
    if (!on[i]) return;
    if (i === 0 || !on[i - 1]) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawSnakeBody(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, d0: number, head: HeadRoom): readonly Pt[] {
  const body = bodyWorld(t, d0, head);
  const upper = body.upper.map((p) => toScreen(view, p));
  const lower = body.lower.map((p) => toScreen(view, p));
  const pose = {
    spine: body.spine.map((p) => toScreen(view, p)),
    widths: body.widths.map((w) => w * view.zoom),
    along: (NECK_W * view.zoom) / 24,
    offset: d0 / (NECK_W / 24),
  };
  drawBodyShadow(ctx, pose, NECK_W * view.zoom);
  ctx.save();
  ctx.beginPath();
  const neck = [...upper, ...[...lower].reverse()];
  neck.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  drawBody(ctx, cast.strip, boil, pose);
  ctx.restore();
  strokeRuns(ctx, upper, body.swollen, 6 * view.zoom);
  strokeRuns(ctx, lower, body.swollen, 7.5 * view.zoom);
  return neck;
}

interface JawPlace {
  readonly offU: number;
  readonly offL: number;
  readonly hingeU: Pt;
  readonly hingeL: Pt;
  readonly tipU: Pt;
  readonly tipL: Pt;
}

/**
 * The head laid on the path the neck follows: its tip at the head, its axis
 * along the chord back to the point `back` behind it where the neck meets
 * it, so on a bend or a turn it never swings off the neck.
 */
function headAxis(t: number, back: number): { p: Pt; q: Pt; heading: number } {
  const h = headU(t);
  const p = pathAt(h);
  const q = pathAt(h - back);
  const heading = Math.hypot(p.x - q.x, p.y - q.y) > 1e-6 ? Math.atan2(p.y - q.y, p.x - q.x) : p.heading;
  return { p, q, heading };
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

function drawTopHead(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, alpha: number): void {
  const k = (NECK_W * view.zoom) / HEAD_W;
  // The sprite's origin sits this far behind the tip; its neck fades out about as far again behind that.
  const reach = HEAD_TIP * (NECK_W / HEAD_W);
  const { p, heading } = headAxis(t, 2 * reach);
  const c = toScreen(view, along(p, axisOf(heading), -reach, 0));
  drawSprite(ctx, cast.head, boil, { x: c.x, y: c.y, rotation: heading, scale: k, alpha });
}

/** The top-down head's chord length back from the tip (as drawTopHead's). */
const TONGUE_BACK = HEAD_TIP * (NECK_W / HEAD_W);

function drawTongue(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View): void {
  const out = tongue(t);
  if (out <= 0) return;
  const { p, heading } = headAxis(t, 2 * TONGUE_BACK);
  const k = (NECK_W * view.zoom) / HEAD_W;
  const tip = toScreen(view, along(p, axisOf(heading), -6 + 100 * out - 60, 0));
  drawSprite(ctx, cast.tongue, boil, { x: tip.x, y: tip.y, rotation: heading, scale: k * 0.9 });
}

/** Keeps what the jaws have passed from showing round the neck: only the side of the hinge the rim is on. */
function clipPastHinge(ctx: CanvasRenderingContext2D, view: View, q: JawPlace): void {
  const hinge = { x: (q.hingeU.x + q.hingeL.x) / 2, y: (q.hingeU.y + q.hingeL.y) / 2 };
  const tip = { x: (q.tipU.x + q.tipL.x) / 2, y: (q.tipU.y + q.tipL.y) / 2 };
  // Across the jaws: from tip to tip, or square to the head when they are shut.
  const gap = { x: q.tipU.x - q.tipL.x, y: q.tipU.y - q.tipL.y };
  const fwd = { x: tip.x - hinge.x, y: tip.y - hinge.y };
  const up = Math.hypot(gap.x, gap.y) > 20 ? gap : { x: -fwd.y, y: fwd.x };
  const len = Math.hypot(up.x, up.y) || 1;
  const n = { x: (up.x / len) * 4000, y: (up.y / len) * 4000 };
  const out = { x: -n.y, y: n.x };
  const forward = out.x * fwd.x + out.y * fwd.y > 0 ? out : { x: -out.x, y: -out.y };
  const corners = [
    { x: hinge.x + n.x, y: hinge.y + n.y }, { x: hinge.x + n.x + forward.x, y: hinge.y + n.y + forward.y },
    { x: hinge.x - n.x + forward.x, y: hinge.y - n.y + forward.y }, { x: hinge.x - n.x, y: hinge.y - n.y },
  ].map((p) => toScreen(view, p));
  ctx.beginPath();
  corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

// ---------------------------------------------------------------- words

function drawWords(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  const head = toScreen(view, pathAt(headU(t)));
  const score = scoreAt(t);
  if (score) drawTextLine(ctx, SCORE_TEXT, Math.max(220, head.x + 120), head.y - 160 - 90 * score.rise, 128, 700, score.alpha);
  const bigger = biggerAt(t);
  if (bigger) drawTextLine(ctx, 'Bigger!', 540, 1120 - 120 * bigger.rise, 140, 700, bigger.alpha, { fill: RED, halo: '#fffaf0' });
  for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  drawTextLine(ctx, CREDIT_TEXT.text, VIDEO.width / 2, CREDIT_TEXT.y, CREDIT_TEXT.size, 700, CREDIT_TEXT.alpha);
}

// ---------------------------------------------------------------- a frame

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const shake = shakeAt(t);
  const view = viewAt(t);
  const side = sideView(t);
  const caiman = caimanAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.fillStyle = '#5a4026';
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
  drawBank(ctx, cast.bank, groundAt(t));
  if (caiman) drawCaimanShadow(ctx, caiman, view);
  const j = jawsAt(t);
  const q = jawPlace(t, j);
  if (side > 0 && j.tipTop + j.tipBottom > 8) drawMouth(ctx, view, q, side);
  if (caiman) {
    ctx.save();
    if (t < 6) clipPastHinge(ctx, view, q);
    drawCaiman(ctx, cast.caiman, caiman, t, boil, view);
    ctx.restore();
  }
  const neck = drawSnakeBody(ctx, cast, t, boil, view, 60 + side * (j.reach * 0.86 - 60), headRoom(q, j.reach, side, headAxis(t, j.reach).heading));
  if (side > 0) {
    const open = side * Math.min(1, Math.max(0, (j.tipTop + j.tipBottom - 12) / 70));
    drawJaw(ctx, cast.floor, boil, view, q.hingeL, q.tipL, open, neck);
    drawJaw(ctx, cast.lower, boil, view, q.hingeL, q.tipL, side, neck);
    drawJaw(ctx, cast.roof, boil, view, q.hingeU, q.tipU, open, neck);
    drawJaw(ctx, cast.upper[snakeEye(t)], boil, view, q.hingeU, q.tipU, side, neck);
  }
  if (side < 1) drawTopHead(ctx, cast, t, boil, view, 1 - side);
  drawTongue(ctx, cast, t, boil, view);
  drawSplashes(ctx, t, view);
  drawAlarm(ctx, t, caiman, view);
  ctx.restore();
  drawWords(ctx, t, view);
}

export function createGulpCaiman(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, wrap(seconds)), audio: renderGulpCaimanAudio };
}
