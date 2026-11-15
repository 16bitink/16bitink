import { INK } from '../../../src/art/palette';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { HOG_PAINT } from '../../../src/art/chapters/barrensSnakePaint';
import { SNAKE_W } from '../../../src/art/types';
import { HOG_SNOUT } from '../../../src/art/chapters/barrensSnakeHead';
import { drawLaid } from '../cobra/lay';
import { spineOf } from '../pythonbear/python';
import { drawBodyShadow, taper, type Pt, type Sprite } from '../sprites';
import type { Cast } from './cast';
import { BODY_W, HEAD0, type Cam, type SnakeState } from './stage';

/**
 * The hognose laid on the sand from above, as the game draws it: its body a
 * strip laid along a spine (the back, or the belly once it has rolled over),
 * the head sprite at the front (mouth shut or open, its tongue). The body is
 * one of three shapes (alive, bluffing, dead) or a blend; the neck spreads
 * wide for the bluff; a roll squeezes the whole animal flat across its length
 * and opens it out again the other side up.
 */
const K = 1.1;
const off = (pts: ReadonlyArray<readonly [number, number]>): Pt[] => pts.map(([x, y]) => ({ x: HEAD0.x + x * K, y: HEAD0.y + y * K }));
const ALIVE = off([[0, 0], [15, 2], [30, -5], [46, 3], [62, 13], [78, 7], [94, -2], [108, 3]]);
const BLUFF = off([[0, 0], [-4, 16], [-14, 31], [-18, 47], [-6, 62], [16, 68], [40, 63], [62, 70]]);
const DEAD = off([[0, 0], [12, 10], [28, 18], [46, 16], [58, 30], [52, 50], [34, 60], [18, 74]]);

const mixPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** The body's knots in board units, head first, for a state. */
export function knotsOf(st: SnakeState): Pt[] {
  const knots = ALIVE.map((a, i) => mixPt(mixPt(a, BLUFF[i]!, st.bluff), DEAD[i]!, st.dead));
  const pivot = knots[3]!;
  const turned = knots.map((p, i) => {
    const w = [1, 0.7, 0.35][i] ?? 0;
    const a = st.turn * w;
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    return { x: pivot.x + dx * Math.cos(a) - dy * Math.sin(a), y: pivot.y + dx * Math.sin(a) + dy * Math.cos(a) };
  });
  const head = turned[0]!;
  const len = Math.hypot(head.x - pivot.x, head.y - pivot.y) || 1;
  const dir = { x: (head.x - pivot.x) / len, y: (head.y - pivot.y) / len };
  return turned.map((p, i) => {
    const w = [1, 0.6, 0.25][i] ?? 0;
    return { x: p.x + dir.x * st.strike * 22 * w, y: p.y + dir.y * st.strike * 22 * w };
  });
}

const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

/** How far the spread neck stands out past the body at distance d (in body widths) behind the head: a smooth hump. */
const hoodBump = (d: number): number => (d <= 0.25 || d >= 3.6 ? 0 : Math.sin(Math.PI * smooth((d - 0.25) / 3.35)) ** 0.9);

export interface Placed {
  readonly spine: readonly Pt[];
  readonly base: number;
  readonly head: Pt;
  readonly dir: number;
  readonly flat: number;
}

const screen = (p: Pt, cam: Cam, shake: Pt): Pt => ({ x: (p.x - cam.cx) * cam.s + 540 + shake.x, y: (p.y - cam.cy) * cam.s + 960 + shake.y });

export function placeSnake(st: SnakeState, cam: Cam, shake: Pt): Placed {
  const knots = knotsOf(st).map((p) => screen(p, cam, shake));
  const spine = spineOf(knots, 6);
  const base = BODY_W * cam.s;
  const reach = spine[Math.min(spine.length - 1, Math.max(2, Math.round((base * 0.9) / 6)))]!;
  const head = spine[0]!;
  const flat = Math.max(0.1, Math.abs(Math.cos(st.roll * Math.PI)));
  return { spine, base, head, dir: Math.atan2(head.y - reach.y, head.x - reach.x), flat };
}

function drawSpriteXY(ctx: CanvasRenderingContext2D, sp: Sprite, boil: number, at: Pt, rot: number, sx: number, sy: number): void {
  const canvas = sp.frames[((boil % sp.frames.length) + sp.frames.length) % sp.frames.length]!;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.drawImage(canvas, -sp.frame / 2, -sp.frame / 2, sp.frame, sp.frame);
  ctx.restore();
}

/**
 * The bluff's spread neck from above: flattened and widened behind the head
 * into a smooth-edged hood, the back's tan stretched over it with the dark
 * neck blotch either side, a sheen down the middle, a firm contour.
 */
/** A frame-sized layer the hood is painted on, so its far end can melt into the body's own pattern. */
let hoodLayer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

function drawHood(ctx: CanvasRenderingContext2D, p: Placed, hood: number): void {
  if (hood < 0.02) return;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const mid: Pt[] = [];
  const bump: number[] = [];
  let d = 0;
  for (let i = 0; i < p.spine.length; i++) {
    const q = p.spine[i]!;
    if (i > 0) d += Math.hypot(q.x - p.spine[i - 1]!.x, q.y - p.spine[i - 1]!.y);
    if (d > 3.7 * p.base) break;
    const a = p.spine[Math.max(0, i - 1)]!;
    const b = p.spine[Math.min(p.spine.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    const k = hood * hoodBump(d / p.base);
    const h = (p.base / 2) * (0.97 + 1.0 * k);
    left.push({ x: q.x + n.x * h, y: q.y + n.y * h });
    right.push({ x: q.x - n.x * h, y: q.y - n.y * h });
    mid.push(q);
    bump.push(k);
  }
  if (mid.length < 3) return;
  const shape = [...left, ...[...right].reverse()];
  const c = mid[Math.floor(mid.length * 0.45)]!;
  if (!hoodLayer) hoodLayer = makeCanvas(VIDEO.width, VIDEO.height);
  const lc = hoodLayer.ctx;
  lc.clearRect(0, 0, VIDEO.width, VIDEO.height);
  const pen = new Pen(lc, 42011, 0.4);
  const g = lc.createRadialGradient(c.x, c.y, p.base * 0.2, c.x, c.y, p.base * 1.9);
  g.addColorStop(0, '#d8b77c');
  g.addColorStop(0.6, '#c39a5c');
  g.addColorStop(1, '#9c7642');
  pen.fill(shape, g as unknown as string, 1);
  pen.clipped(shape, () => {
    // The pair of dark neck blotches, spread apart with the skin; a pale sheen down the middle; the stretched scale rows.
    for (const side of [left, right]) {
      const q = side[Math.floor(side.length * 0.42)]!;
      glaze(lc, c.x + (q.x - c.x) * 0.62, c.y + (q.y - c.y) * 0.62, p.base * 0.42, p.base * 0.3, Math.atan2(q.y - c.y, q.x - c.x), HOG_PAINT.blotch, 0.85);
    }
    pen.hair(mid, p.base * 0.18, '#f1dfae', 0.35);
    for (let j = 2; j < mid.length - 2; j += 2) pen.hair([left[j]!, mid[j]!, right[j]!], 0.9, HOG_PAINT.shadow, 0.12);
  });
  // Its far end melts into the body's pattern.
  const from = mid[Math.floor(mid.length * 0.62)]!;
  const to = mid[mid.length - 1]!;
  const fade = lc.createLinearGradient(from.x, from.y, to.x, to.y);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  lc.save();
  lc.globalCompositeOperation = 'destination-in';
  lc.fillStyle = fade;
  lc.fillRect(0, 0, VIDEO.width, VIDEO.height);
  lc.restore();
  ctx.save();
  ctx.globalAlpha = Math.min(1, hood * 2.5);
  ctx.drawImage(hoodLayer.canvas, 0, 0);
  // The contour along each spread edge, where it stands out past the body.
  const edgePen = new Pen(ctx, 42012, 0.4);
  const out = bump.map((k, i) => (k > 0.04 ? i : -1)).filter((i) => i >= 0);
  if (out.length > 2) {
    const [i0, i1] = [Math.max(0, out[0]! - 1), Math.min(mid.length, out[out.length - 1]! + 2)];
    for (const side of [left, right]) edgePen.stroke(side.slice(i0, i1), Math.max(2.4, p.base * 0.028), INK, 1);
  }
  ctx.restore();
}

export function drawSnake(ctx: CanvasRenderingContext2D, cast: Cast, st: SnakeState, cam: Cam, boil: number, shake: Pt): Placed {
  const p = placeSnake(st, cam, shake);
  const total = p.spine.reduce((d, q, i) => (i === 0 ? 0 : d + Math.hypot(q.x - p.spine[i - 1]!.x, q.y - p.spine[i - 1]!.y)), 0);
  let d = 0;
  const widths = p.spine.map((q, i) => {
    if (i > 0) d += Math.hypot(q.x - p.spine[i - 1]!.x, q.y - p.spine[i - 1]!.y);
    return p.base * taper(d / total, 0.5, 0.1) * p.flat;
  });
  const belly = st.roll > 0.5;
  const strip = belly ? cast.belly : cast.back;
  const lay = { spine: p.spine, widths, base: p.base, headRight: true };
  if (st.lift > 0) drawBodyShadow(ctx, { spine: p.spine.slice(0, 8), widths: widths.slice(0, 8), along: p.base / SNAKE_W }, p.base, st.lift * 1.4);
  drawLaid(ctx, { right: strip, left: strip }, boil, lay, INK, 0.9);
  drawHood(ctx, p, st.hood);
  const k = (p.base / SNAKE_W) * (1 + 0.1 * st.hood + 0.14 * st.lift);
  const key = `${belly ? 'up' : ''}${belly ? (st.mouth === 'open' ? 'Open' : 'Shut') : st.mouth}` as keyof Cast['head'];
  const tongue = st.flick;
  if (tongue > 0.02) {
    const snout = { x: p.head.x + Math.cos(p.dir) * HOG_SNOUT * k, y: p.head.y + Math.sin(p.dir) * HOG_SNOUT * k };
    drawSpriteXY(ctx, cast.tongue, boil, snout, p.dir, k * (0.25 + 0.75 * tongue) * 1.7, k * p.flat * 1.8);
  }
  drawSpriteXY(ctx, cast.head[key], boil, p.head, p.dir, k, k * p.flat);
  return p;
}
