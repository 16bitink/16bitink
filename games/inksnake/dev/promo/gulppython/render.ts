import { leaf } from '../../../src/art/chapters/junglePlaceKit';
import { COBRA_ART } from '../../../src/art/chapters/jungleSnake';
import { PYTHON_ART } from '../../../src/art/chapters/jungleRivalsPython';
import { pt } from '../../../src/art/kit';
import { INK, RED } from '../../../src/art/palette';
import type { SpriteArt } from '../../../src/art/types';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { pathAt } from '../gulphen/path';
import { lerp, ramp, type Short, VIDEO } from '../short';
import { bakeSprite, bakeStrip, boilAt, drawBody, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip, taper } from '../sprites';
import { drawJawInNeck, edgeDistance, type JawEdge, jawEdge, seamWeight } from '../headSeam';
import { renderGulpPythonAudio } from './audio';
import { headAxis, neckAt, neckOf, TOP_HEAD_BACK } from './neck';
import { drawStretchedBody } from './stretch';
import { COBRA_INSIDE, COBRA_LOWER, COBRA_UPPER, JAW_ART } from './cobraJaws';
import { drawYard, paintYard, type Yard } from './ground';
import { alarmAnchor, leavesAt, type PyEye, type PythonPose, pythonAt, pythonHead, pythonShadow, pythonSpine } from './meal';
import { PY_ART, pyHalf } from './profile';
import { PY_HEAD } from './pythonArt';
import {
  alarmAt, biggerAt, BODY_LEN, CAPTIONS, captionAlpha, CREDIT_TEXT, groundAt, headU, hoodAt, type JawFrame, PACKED, pyPlaceAt, jawsAt, lumpSize, LOOP_S, mealRim, NECK_W, scoreAt, SCORE_TEXT,
  shakeAt, sideView, snakeEye, swell, tongue, toScreen, type View, viewAt, wrap,
} from './story';

/** Draws the king cobra and rock python short (story.ts has the beats, meal.ts the python). */

const LEAF: SpriteArt<'leaf'> = { frame: 40, res: 8, poses: ['leaf'], draw: (d) => leaf(d, pt(-12, 0), 0, 24, createRng(771), { age: 0.15, lift: 0, tone: '#c99654' }) };
/** The python's body width the pattern is laid for (its thickest). */
const PY_W = 188;

interface Cast {
  readonly yard: Yard;
  readonly strip: Strip;
  readonly pyStrip: Strip;
  readonly head: Sprite;
  readonly tongue: Sprite;
  readonly upper: Readonly<Record<'open' | 'squeeze' | 'happy', Sprite>>;
  readonly lower: Sprite;
  readonly roof: Sprite;
  readonly floor: Sprite;
  readonly pyHead: Readonly<Record<PyEye, Sprite>>;
  readonly leaf: Sprite;
}

function bakeCast(): Cast {
  const cobra = COBRA_ART;
  if (!cobra?.head || !cobra.tongue) throw new Error('gulppython: the king cobra art is missing');
  return {
    yard: paintYard(),
    strip: bakeStrip(cobra, 9),
    pyStrip: bakeStrip(PYTHON_ART, 9, 23),
    head: bakeSprite(cobra.head, 'shut', 9, 300),
    tongue: bakeSprite(cobra.tongue, 'flick', 9, 320),
    upper: {
      open: bakeSprite(COBRA_UPPER, 'open', 7, 340),
      squeeze: bakeSprite(COBRA_UPPER, 'squeeze', 7, 340),
      happy: bakeSprite(COBRA_UPPER, 'happy', 7, 340),
    },
    lower: bakeSprite(COBRA_LOWER, 'jaw', 7, 350),
    roof: bakeSprite(COBRA_INSIDE, 'roof', 7, 360),
    floor: bakeSprite(COBRA_INSIDE, 'floor', 7, 360),
    pyHead: { wide: bakeSprite(PY_HEAD, 'wide', 7, 400), dozy: bakeSprite(PY_HEAD, 'dozy', 7, 400), asleep: bakeSprite(PY_HEAD, 'asleep', 7, 400) },
    leaf: bakeSprite(LEAF, 'leaf', 8, 440),
  };
}

// ---------------------------------------------------------------- the cobra

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
const SKULL_RISE_ART = 14;
const CHIN_DROP_ART = 10.4;
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
  /** How much of the hood is spread here, 0 .. 1: its pale throat shows. */
  readonly hood: readonly number[];
  /** The skin's stretch over the python (≥ 1), and the python's place under each point. */
  readonly stretch: readonly number[];
  readonly place: readonly number[];
}

/** The hood's flare behind the head, world units: narrow, as a king cobra's is. */
function hoodFlare(t: number, d: number, reach: number): number {
  const s = (d - reach + 40) / 620;
  return s <= 0 || s >= 1 ? 0 : 0.42 * NECK_W * hoodAt(t) * Math.sin(Math.PI * s ** 0.7) ** 1.2;
}

function bodyWorld(t: number, d0: number, head: HeadRoom): BodyShape {
  const h = headU(t);
  const neck = neckOf(t, head.reach, head.side);
  const rim = mealRim(t);
  const size = lumpSize(t);
  const spine: Pt[] = [];
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  const widths: number[] = [];
  const swollen: boolean[] = [];
  const hoods: number[] = [];
  const stretch: number[] = [];
  const place: number[] = [];
  for (let d = d0; d <= BODY_LEN; d += 4) {
    const p = neckAt(neck, h, d);
    const thin = taper(d / BODY_LEN, 0.55, 0.03);
    // Under the jaws' faded backs the neck keeps to the skull's top and the chin's underside, then eases to its own outline.
    const room = head.side * seamWeight(d, head.hold, SEAM_EASE);
    const hood = hoodFlare(t, d, head.reach);
    const a = pyPlaceAt(rim, d);
    const lump = swell(a, size);
    const swellT = Math.max(lump, NECK_W / 2 + 0.55 * hood) * thin;
    const swellB = Math.max(lump, NECK_W / 2 + 0.45 * hood) * thin;
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
    hoods.push(lump > NECK_W / 2 + 4 ? 0 : hood / (0.42 * NECK_W));
    stretch.push(d > head.reach + 60 ? lump / (NECK_W / 2) : 1);
    place.push(a);
  }
  return { spine, upper, lower, widths, swollen, hood: hoods, stretch, place };
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

/** The swallowed python's saddles showing faintly through the cobra's stretched skin. */
function drawGhost(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, view: View, body: BodyShape): void {
  const idx = body.stretch.map((s, i) => (s > 1.04 ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 3) return;
  const first = idx[0]!;
  const last = idx[idx.length - 1]!;
  const run = Array.from({ length: last - first + 1 }, (_, k) => first + k);
  const along = (0.7 * PY_W * PACKED * view.zoom) / 24;
  const pose = {
    spine: run.map((i) => toScreen(view, body.spine[i]!)),
    widths: run.map((i) => Math.max(2, body.widths[i]! - NECK_W * 0.75) * view.zoom),
    along,
    offset: -body.place[first]! / ((0.7 * PY_W) / 24),
  };
  ctx.save();
  ctx.globalAlpha = 0.3;
  drawBody(ctx, cast.pyStrip, boil, pose);
  ctx.restore();
}

/** The hood's pale cream throat, along the low side of the flare, its edge inked. */
function drawThroat(ctx: CanvasRenderingContext2D, body: BodyShape, view: View): void {
  const idx = body.hood.map((h, i) => (h > 0.05 ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 3) return;
  const edge = idx.map((i) => toScreen(view, body.lower[i]!));
  const inner = idx.map((i) => {
    const [lo, sp] = [body.lower[i]!, body.spine[i]!];
    const k = 0.55 * Math.min(1, body.hood[i]! * 1.6);
    return toScreen(view, { x: lo.x + (sp.x - lo.x) * k, y: lo.y + (sp.y - lo.y) * k });
  });
  ctx.save();
  ctx.beginPath();
  [...edge, ...[...inner].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(236,224,172,0.82)';
  ctx.fill();
  ctx.beginPath();
  inner.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = 'rgba(40,36,20,0.55)';
  ctx.lineWidth = 2.4 * view.zoom;
  ctx.stroke();
  ctx.restore();
}

function drawSnakeBody(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, d0: number, head: HeadRoom): readonly Pt[] {
  const body = bodyWorld(t, d0, head);
  const upper = body.upper.map((p) => toScreen(view, p));
  const lower = body.lower.map((p) => toScreen(view, p));
  const pose = { spine: body.spine.map((p) => toScreen(view, p)), widths: body.widths.map((w) => w * view.zoom), along: (NECK_W * view.zoom) / 24, offset: d0 / (NECK_W / 24) };
  drawBodyShadow(ctx, pose, NECK_W * view.zoom);
  ctx.save();
  ctx.beginPath();
  const neck = [...upper, ...[...lower].reverse()];
  neck.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  drawStretchedBody(ctx, cast.strip, boil, pose, body.stretch);
  drawGhost(ctx, cast, boil, view, body);
  drawThroat(ctx, body, view);
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

function jawPlace(t: number, j: JawFrame): JawPlace {
  const { p, q: back, heading } = headAxis(t, j.reach);
  const a = axisOf(heading);
  const hinge = 0.04 + 0.68 * Math.min(1, (j.tipTop + j.tipBottom) / 120);
  const offU = Math.max(j.hingeTop - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  const offL = Math.max(j.hingeBottom - NECK_W / 2, 0) + (NECK_W / 2) * hinge;
  return { offU, offL, hingeU: along(back, a, 0, offU), hingeL: along(back, a, 0, -offL), tipU: along(p, a, 0, j.tipTop), tipL: along(p, a, 0, -j.tipBottom) };
}

/** The inside of the mouth, behind whatever is in it. */
function drawMouth(ctx: CanvasRenderingContext2D, view: View, q: JawPlace, alpha: number): void {
  const [hu, hl, tu, tl] = [q.hingeU, q.hingeL, q.tipU, q.tipL].map((p) => toScreen(view, p)) as [Pt, Pt, Pt, Pt];
  const back = { x: (hu.x + hl.x) / 2, y: (hu.y + hl.y) / 2 };
  const front = { x: (tu.x + tl.x) / 2, y: (tu.y + tl.y) / 2 };
  const g = ctx.createLinearGradient(back.x, back.y, front.x, front.y);
  g.addColorStop(0, '#4a1a20');
  g.addColorStop(0.18, '#94404a');
  g.addColorStop(0.5, '#d88c90');
  g.addColorStop(1, '#f0c4bc');
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
  drawJawInNeck(ctx, h, e, neck, () => drawSprite(ctx, sprite, boil, { x: h.x, y: h.y, rotation, flip: -1, scale: Math.hypot(e.x - h.x, e.y - h.y) / JAW_ART, alpha }));
}

/** The game's top-down head, for the wide shot. */
function drawTopHead(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View, alpha: number): void {
  const k = (NECK_W * view.zoom) / 22;
  const { p, heading } = headAxis(t, 2 * TOP_HEAD_BACK);
  const c = toScreen(view, along(p, axisOf(heading), -TOP_HEAD_BACK, 0));
  drawSprite(ctx, cast.head, boil, { x: c.x, y: c.y, rotation: heading, scale: k, alpha });
}

function drawTongue(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View): void {
  const out = tongue(t);
  if (out <= 0) return;
  const { p, heading } = headAxis(t, 2 * TOP_HEAD_BACK);
  const k = (NECK_W * view.zoom) / 22;
  const tip = toScreen(view, along(p, axisOf(heading), -6 + 95 * out - 60, 0));
  drawSprite(ctx, cast.tongue, boil, { x: tip.x, y: tip.y, rotation: heading, scale: k * 0.9 });
}

// ---------------------------------------------------------------- the python

function clipPastHinge(ctx: CanvasRenderingContext2D, view: View, q: JawPlace): void {
  const hinge = { x: (q.hingeU.x + q.hingeL.x) / 2, y: (q.hingeU.y + q.hingeL.y) / 2 };
  const up = { x: q.tipU.x - q.tipL.x, y: q.tipU.y - q.tipL.y };
  const len = Math.hypot(up.x, up.y) || 1;
  const n = { x: (up.x / len) * 4000, y: (up.y / len) * 4000 };
  const out = { x: -n.y, y: n.x };
  const forward = out.x * (q.tipU.x - hinge.x) + out.y * (q.tipU.y - hinge.y) > 0 ? out : { x: -out.x, y: -out.y };
  const corners = [
    { x: hinge.x + n.x, y: hinge.y + n.y }, { x: hinge.x + n.x + forward.x, y: hinge.y + n.y + forward.y },
    { x: hinge.x - n.x + forward.x, y: hinge.y - n.y + forward.y }, { x: hinge.x - n.x, y: hinge.y - n.y },
  ].map((p) => toScreen(view, p));
  ctx.beginPath();
  corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

/** The python's body from under its head back to the tail, and its head. */
function drawPython(ctx: CanvasRenderingContext2D, cast: Cast, p: PythonPose, t: number, boil: number, view: View, stage: 'shadow' | 'python'): void {
  const spine = pythonSpine(p);
  const body = spine.filter((q) => q.a >= 230);
  if (body.length > 1) {
    const pose = {
      spine: body.map((q) => toScreen(view, q)),
      widths: body.map((q) => 2 * Math.max(pyHalf(q.a), 3) * view.zoom),
      // A shorter step along the body than the pattern's own, so the slices overlap less round its tight bends.
      along: (0.7 * PY_W * view.zoom) / 24,
      offset: body[0]!.a / ((0.7 * PY_W) / 24),
    };
    if (stage === 'shadow') drawBodyShadow(ctx, pose, PY_W * 0.8 * view.zoom, pythonShadow(t));
    else drawBody(ctx, cast.pyStrip, boil, pose);
  }
  const head = pythonHead(spine);
  if (!head || stage === 'shadow') return;
  const c = toScreen(view, head.at);
  drawSprite(ctx, cast.pyHead[p.eye], boil, { x: c.x, y: c.y, rotation: head.angle, scale: PY_ART * view.zoom });
}

function drawLeaves(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, view: View): void {
  for (const f of leavesAt(t)) {
    const q = toScreen(view, f);
    drawSprite(ctx, cast.leaf, boil, { x: q.x, y: q.y, rotation: f.rot, scale: 3.4 * view.zoom * f.size, alpha: f.alpha });
  }
}

// ---------------------------------------------------------------- marks and words

function drawAlarm(ctx: CanvasRenderingContext2D, t: number, p: PythonPose | null, view: View): void {
  const a = alarmAt(t);
  const at = p ? alarmAnchor(pythonSpine(p)) : null;
  if (a <= 0 || !at) return;
  const q = toScreen(view, at);
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(0.12);
  ctx.scale(a, a);
  drawTextLine(ctx, '!', 0, 80, 280 * view.zoom, 700, 1, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}

function drawWords(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  const head = toScreen(view, pathAt(headU(t)));
  const score = scoreAt(t);
  // Under the head, clear of the caption above it.
  if (score) drawTextLine(ctx, SCORE_TEXT, Math.max(200, head.x - 40), head.y + 240 - 90 * score.rise, 128, 700, score.alpha);
  const bigger = biggerAt(t);
  if (bigger) drawTextLine(ctx, 'Bigger!', 540, 1120 - 120 * bigger.rise, 140, 700, bigger.alpha, { fill: RED, halo: '#fffaf0' });
  for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  drawTextLine(ctx, CREDIT_TEXT.text, VIDEO.width / 2, CREDIT_TEXT.y, CREDIT_TEXT.size, 700, CREDIT_TEXT.alpha);
}

/** Deep green shade pooled at the frame's edges, as under the canopy. */
function drawUndergrowth(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 820, 380, VIDEO.width / 2, 900, 1250);
  g.addColorStop(0, 'rgba(24,38,22,0)');
  g.addColorStop(0.6, 'rgba(24,38,22,0.35)');
  g.addColorStop(1, 'rgba(18,32,18,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
}

// ---------------------------------------------------------------- a frame

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const shake = shakeAt(t);
  const view = viewAt(t);
  const side = sideView(t);
  const python = pythonAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.fillStyle = '#6a5c40';
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
  drawYard(ctx, cast.yard, groundAt(t));
  // The canopy's shade over the loam, so the pale python stands out from it.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#5c5844';
  ctx.fillRect(-40, -40, VIDEO.width + 80, VIDEO.height + 80);
  ctx.restore();
  drawUndergrowth(ctx);
  if (python) drawPython(ctx, cast, python, t, boil, view, 'shadow');
  const j = jawsAt(t);
  const q = jawPlace(t, j);
  if (side > 0 && j.tipTop + j.tipBottom > 8) drawMouth(ctx, view, q, side);
  if (python) {
    ctx.save();
    if (t < 6) clipPastHinge(ctx, view, q);
    drawPython(ctx, cast, python, t, boil, view, 'python');
    ctx.restore();
  }
  const neck = drawSnakeBody(ctx, cast, t, boil, view, lerp(70, j.reach * 0.86, side), headRoom(q, j.reach, side, headAxis(t, j.reach).heading));
  if (side > 0) {
    const open = side * Math.min(1, Math.max(0, (j.tipTop + j.tipBottom - 12) / 70));
    drawJaw(ctx, cast.floor, boil, view, q.hingeL, q.tipL, open, neck);
    drawJaw(ctx, cast.lower, boil, view, q.hingeL, q.tipL, side, neck);
    drawJaw(ctx, cast.roof, boil, view, q.hingeU, q.tipU, open, neck);
    drawJaw(ctx, cast.upper[snakeEye(t)], boil, view, q.hingeU, q.tipU, side, neck);
  }
  if (side < 1) drawTopHead(ctx, cast, t, boil, view, 1 - side);
  drawTongue(ctx, cast, t, boil, view);
  drawLeaves(ctx, cast, t, boil, view);
  drawAlarm(ctx, t, python, view);
  ctx.restore();
  drawWords(ctx, t, view);
}

export function createGulpPython(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, wrap(seconds)), audio: renderGulpPythonAudio };
}
