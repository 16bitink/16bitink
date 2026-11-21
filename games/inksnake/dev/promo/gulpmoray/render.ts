import { KRAIT_ART } from '../../../src/art/chapters/reefSnake';
import { INK, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { ramp, type Short, VIDEO } from '../short';
import { bakeSprite, bakeStrip, boilAt, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip, taper } from '../sprites';
import { drawJawInNeck, edgeDistance, type JawEdge, jawEdge, seamWeight } from '../headSeam';
import { renderGulpMorayAudio } from './audio';
import { drawStretchedBody } from './body';
import { drawFloor, drawWaterLight, paintReef, type Reef } from './ground';
import { JAW_ART, KRAIT_INSIDE, KRAIT_LOWER, KRAIT_UPPER } from './kraitSide';
import { paintEel } from './moray';
import { clipOutsideHole, drawOutcropBack, drawOutcropFront } from './outcrop';
import { pathAt, railAt } from './rail';
import {
  BODY_LEN, EEL_D, EEL_LEN, type EelPose, eelAt, eelOffset, groundAt, headU, type JawFrame, jawsAt, LOOP_S, lumpSize, mealRim, NECK_W, shakeAt, sideView, snakeEye, swellBottom,
  swellTop, tongue, toScreen, type View, viewAt, wrap,
} from './story';
import { ALARM_LIFT, alarmAt, biggerAt, bubblesAt, CAPTIONS, captionAlpha, CREDIT_TEXT, scoreAt, SCORE_TEXT } from './words';

/** Draws the banded sea krait and the moray short (story.ts has the beats, words.ts the words and sounds). */

interface Cast {
  readonly reef: Reef;
  readonly strip: Strip;
  readonly head: Sprite;
  readonly tongue: Sprite;
  readonly upper: Readonly<Record<'open' | 'squeeze' | 'happy', Sprite>>;
  readonly lower: Sprite;
  readonly roof: Sprite;
  readonly floor: Sprite;
}

function bakeCast(): Cast {
  const art = KRAIT_ART!;
  return {
    reef: paintReef(),
    strip: bakeStrip(art, 9),
    head: bakeSprite(art.head, 'shut', 9, 300),
    tongue: bakeSprite(art.tongue, 'flick', 9, 320),
    upper: {
      open: bakeSprite(KRAIT_UPPER, 'open', 7, 340),
      squeeze: bakeSprite(KRAIT_UPPER, 'squeeze', 7, 340),
      happy: bakeSprite(KRAIT_UPPER, 'happy', 7, 340),
    },
    lower: bakeSprite(KRAIT_LOWER, 'jaw', 7, 350),
    roof: bakeSprite(KRAIT_INSIDE, 'roof', 7, 360),
    floor: bakeSprite(KRAIT_INSIDE, 'floor', 7, 360),
  };
}

// ---------------------------------------------------------------- the snake

interface Axis {
  readonly e: Pt;
  readonly up: Pt;
}

const axisOf = (heading: number): Axis => {
  const e = { x: Math.cos(heading), y: Math.sin(heading) };
  return { e, up: { x: -e.y, y: e.x } };
};

const along = (p: Pt, a: Axis, forward: number, up: number): Pt => ({ x: p.x + a.e.x * forward + a.up.x * up, y: p.y + a.e.y * forward + a.up.y * up });

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
const SKULL_RISE_ART = 10.8;
const CHIN_DROP_ART = 9.6;
/** Art units behind the hinge where the jaws' fadeBack has cleared them. */
const JAW_FADE_ART = 24;
/** World units over which the neck eases from the head's edges to its own. */
const SEAM_EASE = 260;

function headRoom(q: JawPlace, reach: number, side: number, heading: number): HeadRoom {
  const up = axisOf(heading).up;
  const down = { x: -up.x, y: -up.y };
  const k = Math.hypot(q.tipU.x - q.hingeU.x, q.tipU.y - q.hingeU.y) / JAW_ART;
  return {
    reach,
    side,
    skull: jawEdge(q.hingeU, q.tipU, JAW_ART, SKULL_RISE_ART, up),
    chin: jawEdge(q.hingeL, q.tipL, JAW_ART, CHIN_DROP_ART, down),
    hold: reach + JAW_FADE_ART * k,
  };
}

interface BodyShape {
  readonly spine: readonly Pt[];
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
  readonly widths: readonly number[];
  readonly swollen: readonly boolean[];
  /** How much the skin between the rings is stretched over the meal (body.ts). */
  readonly stretch: readonly number[];
}

/** The body from `d0` behind the rim back to the tail, swollen round the moray to its outline. */
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
  const out = { spine: [] as Pt[], upper: [] as Pt[], lower: [] as Pt[], widths: [] as number[], swollen: [] as boolean[], stretch: [] as number[] };
  for (let d = d0; d <= BODY_LEN; d += 4) {
    const p = neckAt(neck, h, d);
    const a = rim - d;
    const thin = taper(d / BODY_LEN, 0.6, 0.03);
    // Under the jaws' faded backs the neck keeps to the skull's top and the chin's underside, then eases to its own outline.
    const room = head.side * seamWeight(d, head.hold, SEAM_EASE);
    const swellT = swellTop(a, size) * thin;
    const swellB = swellBottom(a, size) * thin;
    const axis = axisOf(p.heading);
    const floor = (NECK_W / 2) * thin;
    const skull = room > 0 ? Math.max(floor, edgeDistance(p, axis.up, head.skull) ?? swellT) : swellT;
    const chin = room > 0 ? Math.max(floor, edgeDistance(p, { x: -axis.up.x, y: -axis.up.y }, head.chin) ?? swellB) : swellB;
    const top = swellT + room * (skull - swellT);
    const bottom = swellB + room * (chin - swellB);
    out.spine.push(p);
    out.upper.push(along(p, axis, 0, top));
    out.lower.push(along(p, axis, 0, -bottom));
    out.widths.push(2 * Math.max(top, bottom));
    out.swollen.push(room > 0.02 || Math.max(top, bottom) > (NECK_W / 2 + 3) * thin);
    out.stretch.push(1 + 1.4 * Math.max(0, Math.max(swellT, swellB) / ((NECK_W / 2) * thin) - 1));
  }
  return out;
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
  drawStretchedBody(ctx, cast.strip, boil, pose, body.stretch);
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
  const hinge = 0.04 + 0.68 * Math.min(1, (j.tipTop + j.tipBottom) / 120);
  const offU = Math.max(j.hingeTop - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  const offL = Math.max(j.hingeBottom - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  return { offU, offL, hingeU: along(back, a, 0, offU), hingeL: along(back, a, 0, -offL), tipU: along(p, a, 0, j.tipTop), tipL: along(p, a, 0, -j.tipBottom) };
}

function drawMouth(ctx: CanvasRenderingContext2D, view: View, q: JawPlace, alpha: number): void {
  const [hu, hl, tu, tl] = [q.hingeU, q.hingeL, q.tipU, q.tipL].map((p) => toScreen(view, p)) as [Pt, Pt, Pt, Pt];
  const back = { x: (hu.x + hl.x) / 2, y: (hu.y + hl.y) / 2 };
  const front = { x: (tu.x + tl.x) / 2, y: (tu.y + tl.y) / 2 };
  const g = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  g.addColorStop(0, '#4a1c2a');
  g.addColorStop(0.16, '#9a4a5a');
  g.addColorStop(0.5, '#dc9aa0');
  g.addColorStop(1, '#eec3bf');
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
  drawJawInNeck(ctx, h, e, neck, () => drawSprite(ctx, sprite, boil, { x: h.x, y: h.y, rotation: Math.atan2(e.y - h.y, e.x - h.x), flip: -1, scale: Math.hypot(e.x - h.x, e.y - h.y) / JAW_ART, alpha }));
}

function drawTopHead(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, alpha: number): void {
  const k = (NECK_W * view.zoom) / 22;
  // The sprite's origin sits this far behind the tip; its neck fades out about as far again behind that.
  const reach = 20.2 * (NECK_W / 22);
  const { p, heading } = headAxis(t, 2 * reach);
  const c = toScreen(view, along(p, axisOf(heading), -reach, 0));
  drawSprite(ctx, cast.head, boil, { x: c.x, y: c.y, rotation: heading, scale: k, alpha });
}

/** The top-down head's chord length back from the tip (as drawTopHead's). */
const TONGUE_BACK = 20.2 * (NECK_W / 22);

function drawTongue(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View): void {
  const out = tongue(t);
  if (out <= 0) return;
  const { p, heading } = headAxis(t, 2 * TONGUE_BACK);
  const k = (NECK_W * view.zoom) / 22;
  const tip = toScreen(view, along(p, axisOf(heading), -6 + 95 * out - 60, 0));
  drawSprite(ctx, cast.tongue, boil, { x: tip.x, y: tip.y, rotation: heading, scale: k * 0.9 });
}

// ---------------------------------------------------------------- clips

function clipPoly(ctx: CanvasRenderingContext2D, view: View, corners: readonly Pt[]): void {
  ctx.beginPath();
  corners.map((p) => toScreen(view, p)).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

/** Keeps the side of the line through `at` (across `dir`) that `dir` points away from: a half plane. */
function halfPlane(at: Pt, dir: Pt): Pt[] {
  const n = { x: -dir.y * 5000, y: dir.x * 5000 };
  const back = { x: -dir.x * 5000, y: -dir.y * 5000 };
  return [{ x: at.x + n.x, y: at.y + n.y }, { x: at.x + n.x + back.x, y: at.y + n.y + back.y }, { x: at.x - n.x + back.x, y: at.y - n.y + back.y }, { x: at.x - n.x, y: at.y - n.y }];
}

/** Keeps what the jaws have passed from showing round the neck: only the rim's side of the hinge. */
function clipPastHinge(ctx: CanvasRenderingContext2D, view: View, q: JawPlace): void {
  const hinge = { x: (q.hingeU.x + q.hingeL.x) / 2, y: (q.hingeU.y + q.hingeL.y) / 2 };
  const rim = { x: (q.tipU.x + q.tipL.x) / 2, y: (q.tipU.y + q.tipL.y) / 2 };
  const len = Math.hypot(rim.x - hinge.x, rim.y - hinge.y) || 1;
  clipPoly(ctx, view, halfPlane(hinge, { x: (hinge.x - rim.x) / len, y: (hinge.y - rim.y) / len }));
}

// ---------------------------------------------------------------- the reef and the moray

function eelSpine(e: EelPose, t: number, view: View): (f: number) => Pt {
  return (f) => {
    const a = f * EEL_LEN;
    const r = railAt(e.nose + a, e.k);
    const off = eelOffset(e, a, t);
    return toScreen(view, { x: r.x - Math.sin(r.heading) * off, y: r.y + Math.cos(r.heading) * off });
  };
}

function drawEel(ctx: CanvasRenderingContext2D, e: EelPose, t: number, boil: number, view: View, q: JawPlace | null): void {
  const spine = eelSpine(e, t, view);
  const depth = EEL_D * view.zoom * (1 + 0.035 * e.shudder);
  ctx.save();
  clipOutsideHole(ctx, view, e.k);
  if (q) clipPastHinge(ctx, view, q);
  // Its soft shadow on the floor.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = depth * 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = spine(i / 40);
    if (i === 0) ctx.moveTo(p.x + 16, p.y + 30);
    else ctx.lineTo(p.x + 16, p.y + 30);
  }
  ctx.stroke();
  ctx.restore();
  paintEel(ctx, { spine, depth, boil, fins: true });
  ctx.restore();
}

function drawBubbles(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  ctx.save();
  for (const b of bubblesAt(t)) {
    const q = toScreen(view, b);
    const r = b.r * view.zoom;
    ctx.globalAlpha = b.alpha * 0.55;
    ctx.fillStyle = '#d8f2fa';
    ctx.beginPath();
    ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = b.alpha * 0.9;
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.strokeStyle = '#26406a';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(q.x - r * 0.35, q.y - r * 0.38, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- marks and words

function drawAlarm(ctx: CanvasRenderingContext2D, t: number, e: EelPose | null, view: View): void {
  const a = alarmAt(t);
  if (a <= 0 || !e) return;
  const head = railAt(e.nose + 60, e.k);
  const q = toScreen(view, { x: head.x + ALARM_LIFT.x, y: head.y + ALARM_LIFT.y });
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(-0.14);
  ctx.scale(a, a);
  drawTextLine(ctx, '!', 0, 80, 280 * view.zoom, 700, 1, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}

function drawWords(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  const head = toScreen(view, pathAt(headU(t)));
  const score = scoreAt(t);
  if (score) drawTextLine(ctx, SCORE_TEXT, Math.max(220, Math.min(860, head.x + 120)), head.y - 150 - 90 * score.rise, 128, 700, score.alpha);
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
  const eel = eelAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.fillStyle = '#5f9fb4';
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
  drawFloor(ctx, cast.reef, groundAt(t));
  for (const k of [0, 1]) drawOutcropBack(ctx, view, k);
  const j = jawsAt(t);
  const q = jawPlace(t, j);
  if (side > 0 && j.tipTop + j.tipBottom > 8) drawMouth(ctx, view, q, side);
  if (eel) drawEel(ctx, eel, t, boil, view, t < 6 ? q : null);
  for (const k of [0, 1]) drawOutcropFront(ctx, view, k);
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
  drawBubbles(ctx, t, view);
  drawWaterLight(ctx, t, LOOP_S);
  drawAlarm(ctx, t, eel, view);
  ctx.restore();
  drawWords(ctx, t, view);
}

export function createGulpMoray(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, wrap(seconds)), audio: renderGulpMorayAudio };
}
