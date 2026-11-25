import { INK } from '../../../src/art/palette';
import { drawBodyShadow, type Pt, type Strip, taper } from '../sprites';
import { edgeDistance, type JawEdge, seamWeight } from '../headSeam';
import { ramp, VIDEO, window01 } from '../short';
import { toScreen, type View } from './camera';
import { swellBottom, swellTop } from './jaws';
import { pathAt } from './path';
import { BALL_A, BALL_R, BODY_LEN, GULP_AT, headU, hoodAt, lumpSize, mealRim, NECK_W, puffAt, STRIKE_AT } from './story';
import { drawStretchedBody, paintBelly } from './strip';

/** The hognose's body in the world: the neck joined to the head, the lump round the toad, and its drawing. */

export interface Axis {
  /** The way the head points, and the side that's up on screen. */
  readonly e: Pt;
  readonly up: Pt;
}

export const axisOf = (heading: number): Axis => {
  const e = { x: Math.cos(heading), y: Math.sin(heading) };
  return { e, up: { x: -e.y, y: e.x } };
};

export const along = (p: Pt, a: Axis, forward: number, up: number): Pt => ({ x: p.x + a.e.x * forward + a.up.x * up, y: p.y + a.e.y * forward + a.up.y * up });

/** The game's head is this many art units across the neck, and its snout tip this far before its origin. */
export const HEAD_W = 20.4;
export const HEAD_TIP = 22.4;
/** The top-down head's origin back from the tip, and the chord it lies along. */
export const TOP_BACK = HEAD_TIP * (NECK_W / HEAD_W);
export const TOP_CHORD = 1.4 * TOP_BACK;

/** What the side-on head needs of the neck behind it. */
export interface HeadRoom {
  readonly reach: number;
  readonly side: number;
  /** The skull's top and the chin's underside, which the neck carries on behind the hinges. */
  readonly skull: JawEdge;
  readonly chin: JawEdge;
  /** How far behind the tip the jaw art has faded out. */
  readonly hold: number;
}

/** World units over which the neck eases from the head's edges to its own. */
const SEAM_EASE = 300;

/**
 * The head laid on the path the neck follows: its tip at the head, its axis
 * along the chord back to the point `back` behind it where the neck meets
 * it, so on a bend or a turn it never swings off the neck.
 */
export function headAxis(t: number, back: number): { p: Pt; q: Pt; heading: number } {
  const h = headU(t);
  const p = pathAt(h);
  const q = pathAt(h - back);
  const heading = Math.hypot(p.x - q.x, p.y - q.y) > 1e-6 ? Math.atan2(p.y - q.y, p.x - q.x) : p.heading;
  return { p, q, heading };
}

/** The neck just behind the head: straight along the head's axis, easing back onto the path, so a turning head stays joined to it. */
interface Neck {
  readonly p: Pt;
  readonly e: Pt;
  readonly len: number;
  readonly chord: number;
}

function neckOf(t: number, head: HeadRoom): Neck {
  const len = TOP_CHORD + (head.reach - TOP_CHORD) * head.side;
  const { p, q, heading } = headAxis(t, len);
  return { p, e: { x: Math.cos(heading), y: Math.sin(heading) }, len, chord: Math.hypot(p.x - q.x, p.y - q.y) };
}

/** The body's spine point `d` behind the tip: on the head's straight line near it, on the path further back. */
function neckAt(n: Neck, h: number, d: number): Pt & { readonly heading: number } {
  const path = pathAt(h - d);
  const w = Math.min(1, Math.max(0, (d - n.len) / (n.len * 0.7)));
  if (w >= 1) return path;
  const s = w * w * (3 - 2 * w);
  const back = d <= n.len ? (d * n.chord) / n.len : n.chord + (d - n.len);
  const straight = { x: n.p.x - n.e.x * back, y: n.p.y - n.e.y * back };
  const heading = Math.atan2(n.e.y, n.e.x);
  const dh = Math.atan2(Math.sin(path.heading - heading), Math.cos(path.heading - heading));
  return { x: straight.x + (path.x - straight.x) * s, y: straight.y + (path.y - straight.y) * s, heading: heading + dh * s };
}

interface BodyShape {
  readonly spine: readonly Pt[];
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
  readonly widths: readonly number[];
  readonly stretch: readonly number[];
  /** Whether the body is swollen here (it gets its own contour: the strip's lies outside the clip). */
  readonly swollen: readonly boolean[];
}

/** A running mean over ± SOFT samples (4 world units each), twice, shorter at the ends. */
const SOFT = 9;
const mean = (v: readonly number[]): number[] => {
  const sums = [0];
  for (const x of v) sums.push(sums[sums.length - 1]! + x);
  return v.map((_, i) => {
    const r = Math.min(SOFT, i, v.length - 1 - i);
    return (sums[i + r + 1]! - sums[i - r]!) / (2 * r + 1);
  });
};
const softened = (v: readonly number[]): number[] => mean(mean(v));

const softMin = (a: number, b: number): number => (a ** -7 + b ** -7) ** (-1 / 7);

/** The hood's spread at `d` behind the tip, world units to each side. */
const hood = (t: number, d: number, reach: number): number => 26 * hoodAt(t) * window01(d, reach + 60, reach + 560, 220);

/** The body from `d0` behind the rim to the tail, swollen round the toad to its outline. */
function bodyWorld(t: number, d0: number, head: HeadRoom): BodyShape {
  const h = headU(t);
  const neck = neckOf(t, head);
  const rim = mealRim(t);
  // The jaws' edges behind the hinges, never standing higher than at the hinges.
  const hinge = neckAt(neck, h, head.reach);
  const hingeUp = axisOf(hinge.heading).up;
  const limits = new Map<JawEdge, number>([
    [head.skull, edgeDistance(hinge, hingeUp, head.skull) ?? Infinity],
    [head.chin, edgeDistance(hinge, { x: -hingeUp.x, y: -hingeUp.y }, head.chin) ?? Infinity],
  ]);
  const edgeAt = (p: Pt, n: Pt, edge: JawEdge, d: number): number | null => {
    const at = edgeDistance(p, n, edge);
    return at === null || d < head.reach ? at : Math.min(at, limits.get(edge)!);
  };
  const spine: (Pt & { readonly heading: number })[] = [];
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  const widths: number[] = [];
  const stretch: number[] = [];
  const swollen: boolean[] = [];
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (let d = d0; d <= BODY_LEN; d += 4) {
    const p = neckAt(neck, h, d);
    const thin = taper(d / BODY_LEN, 0.52, 0.04);
    // Under the jaws' faded backs the neck keeps to the skull's top and the chin's underside, then eases to its own outline.
    const room = head.side * seamWeight(d, head.hold, SEAM_EASE);
    const flare = hood(t, d, head.reach) * head.side;
    const axis = axisOf(p.heading);
    // The cheeks bulge out from behind the jaws, rising from their edges.
    const rise = Math.max(0, d - d0) * 0.8 + 3000 * ramp(d, head.reach, head.hold + 200) ** 2;
    const cheek = (n: Pt, edge: JawEdge, swelled: number): number => (head.side > 0 ? softMin(swelled, Math.max(NECK_W / 2, edgeAt(p, n, edge, d) ?? swelled) + rise) : swelled);
    const swellT = cheek(axis.up, head.skull, Math.max(swellTop(rim - d, t), NECK_W / 2 + flare) * thin);
    const swellB = cheek({ x: -axis.up.x, y: -axis.up.y }, head.chin, Math.max(swellBottom(rim - d, t), NECK_W / 2 + flare) * thin);
    const floor = (NECK_W / 2) * thin;
    // Never fanned out by a steep jaw: the skull's and chin's backs sink into the skin.
    const cap = 24 + 110 * (1 - ramp(d, head.reach, head.hold + 110));
    const edgeOf = (n: Pt, edge: JawEdge, swelled: number): number => Math.max(floor, swelled, Math.min(edgeAt(p, n, edge, d) ?? swelled, swelled + cap));
    const skull = room > 0 ? edgeOf(axis.up, head.skull, swellT) : swellT;
    const chin = room > 0 ? edgeOf({ x: -axis.up.x, y: -axis.up.y }, head.chin, swellB) : swellB;
    spine.push(p);
    tops.push(swellT + room * (skull - swellT));
    bottoms.push(swellB + room * (chin - swellB));
    const tight = Math.max(swellTop(rim - d, t), swellBottom(rim - d, t)) / (NECK_W / 2);
    stretch.push(1 + 0.42 * (tight - 1));
    swollen.push(room > 0.02 || Math.max(tops[tops.length - 1]!, bottoms[bottoms.length - 1]!) > (NECK_W / 2 + 3) * thin);
  }
  // The skin has no corners: its edges are smoothed where the head, cheeks and lump meet.
  const [top, bottom] = [softened(tops), softened(bottoms)];
  spine.forEach((p, i) => {
    const axis = axisOf(p.heading);
    upper.push(along(p, axis, 0, top[i]!));
    lower.push(along(p, axis, 0, -bottom[i]!));
    widths.push(2 * Math.max(top[i]!, bottom[i]!));
  });
  return { spine, upper, lower, widths, stretch, swollen };
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

/** The ball's light and shade over the lump, inside the body's outline (the context is clipped to it). */
function modelLump(ctx: CanvasRenderingContext2D, t: number, view: View, c: Pt): void {
  const size = lumpSize(t);
  if (size <= 0.15 || t > 9.5) return;
  const r = BALL_R * puffAt(Math.min(t, GULP_AT + 1)) * size * view.zoom;
  const a = Math.min(1, (size - 0.15) / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  const shade = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.36, r * 0.2, c.x - r * 0.04, c.y - r * 0.05, r * 1.4);
  shade.addColorStop(0, 'rgba(255,246,222,0.3)');
  shade.addColorStop(0.3, 'rgba(255,246,222,0)');
  shade.addColorStop(0.54, 'rgba(74,36,16,0.06)');
  shade.addColorStop(0.72, 'rgba(74,36,16,0.36)');
  shade.addColorStop(0.78, 'rgba(74,36,16,0.36)');
  shade.addColorStop(1, 'rgba(74,36,16,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(c.x - 2 * r, c.y - 2 * r, 4 * r, 4 * r);
  ctx.restore();
}

/** The spine and widths of the snake's shadow: from the tip when the mouth is shut, else from the hinges (it would fall on the toad). */
function shadowShape(t: number, d0: number, head: HeadRoom): { readonly spine: readonly Pt[]; readonly widths: readonly number[] } {
  const body = bodyWorld(t, d0, head);
  if (t < GULP_AT || t > STRIKE_AT - 0.4) return { spine: body.spine, widths: body.widths.map((w, i) => w * roundEnd(i / 45)) };
  const neck = neckOf(t, head);
  const ahead = Array.from({ length: Math.floor((d0 - 12) / 4) }, (_, i) => neckAt(neck, headU(t), 12 + i * 4));
  const first = body.widths[0] ?? NECK_W;
  const widths = [...ahead.map(() => Math.min(first, NECK_W * 1.1)), ...body.widths];
  return { spine: [...ahead, ...body.spine], widths: widths.map((w, i) => w * roundEnd(i / 40)) };
}

/** A round end: 0 .. 1 as a quarter circle over x = 0 .. 1. */
const roundEnd = (x: number): number => (x >= 1 ? 1 : Math.sqrt(1 - (1 - x) ** 2));

/** Layers of the soft shadow, each this much wider, world units; together as dark as the game's. */
const SHADOW_LAYERS = [-30, -18, -6, 6, 18, 30] as const;

/** The whole snake's shadow on the sand, soft-edged, under everything that stands on it. */
export function drawSnakeShadow(ctx: CanvasRenderingContext2D, t: number, view: View, d0: number, head: HeadRoom): void {
  const shape = shadowShape(t, d0, head);
  const spine = shape.spine.map((p) => toScreen(view, p));
  const wide = softened(softened(softened(shape.widths)));
  for (const grow of SHADOW_LAYERS) {
    drawBodyShadow(ctx, { spine, widths: wide.map((w) => Math.max(0, w + grow * Math.min(1, w / 90)) * view.zoom), along: (NECK_W * view.zoom) / 24 }, NECK_W * view.zoom, 1 / SHADOW_LAYERS.length);
  }
}

/** Clips the body out of the open mouth (a screen polygon): its skin shows only outside the lips. */
function keepOutOfMouth(ctx: CanvasRenderingContext2D, mouth: readonly Pt[]): void {
  ctx.rect(-400, -400, VIDEO.width + 800, VIDEO.height + 800);
  mouth.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
}

/** The ball's turn away at its sides and underneath, over the belly too, in a cool shade. */
function roundBelly(ctx: CanvasRenderingContext2D, t: number, view: View, c: Pt | undefined): void {
  const size = lumpSize(t);
  if (!c || size <= 0.15) return;
  const r = BALL_R * puffAt(Math.min(t, GULP_AT + 1)) * size * view.zoom;
  const g = ctx.createRadialGradient(c.x - r * 0.12, c.y - r * 0.05, r * 0.55, c.x - r * 0.04, c.y, r * 1.3);
  g.addColorStop(0, 'rgba(96,92,112,0)');
  g.addColorStop(0.35, 'rgba(96,92,112,0.1)');
  g.addColorStop(0.58, 'rgba(96,92,112,0.3)');
  g.addColorStop(0.66, 'rgba(96,92,112,0.24)');
  g.addColorStop(1, 'rgba(96,92,112,0)');
  ctx.save();
  ctx.globalAlpha = Math.min(1, (size - 0.15) / 0.5);
  ctx.fillStyle = g;
  ctx.fillRect(c.x - 2 * r, c.y, 4 * r, 2 * r);
  ctx.restore();
}

/** The stretch of the body to draw, world units behind the tip. */
export interface Span {
  readonly from: number;
  readonly to: number;
}

/** Draws the body over `span`, the pattern running on from `d0`; returns its outline on screen (the neck, for the jaws' backs). */
export function drawSnakeBody(ctx: CanvasRenderingContext2D, strip: Strip, t: number, boil: number, view: View, d0: number, span: Span, head: HeadRoom, mouth: readonly Pt[]): readonly Pt[] {
  const body = bodyWorld(t, d0, head);
  const i0 = Math.max(0, Math.floor((span.from - d0) / 4));
  const i1 = Math.ceil((span.to - d0) / 4) + 1;
  const upper = body.upper.slice(i0, i1).map((p) => toScreen(view, p));
  const lower = body.lower.slice(i0, i1).map((p) => toScreen(view, p));
  const pose = {
    spine: body.spine.map((p) => toScreen(view, p)),
    widths: body.widths.map((w) => w * view.zoom),
    along: (NECK_W * view.zoom) / 24,
    offset: d0 / (NECK_W / 24),
  };
  ctx.save();
  ctx.beginPath();
  if (span.from <= d0) keepOutOfMouth(ctx, mouth);
  ctx.beginPath();
  const neck = [...upper, ...[...lower].reverse()];
  neck.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  drawStretchedBody(ctx, strip, boil, pose, body.stretch, body.swollen);
  modelLump(ctx, t, view, pose.spine[Math.round((mealRim(t) - BALL_A - d0) / 4)] ?? toScreen(view, pathAt(headU(t) - mealRim(t) + BALL_A)));
  paintBelly(ctx, pose, body.stretch);
  roundBelly(ctx, t, view, pose.spine[Math.round((mealRim(t) - BALL_A - d0) / 4)]);
  ctx.restore();
  strokeRuns(ctx, upper, body.swollen.slice(i0, i1), 6 * view.zoom);
  strokeRuns(ctx, lower, body.swollen.slice(i0, i1), 7.5 * view.zoom);
  return neck;
}
