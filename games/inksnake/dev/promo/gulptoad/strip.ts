import { SNAKE_W } from '../../../src/art/types';
import { makeCanvas } from '../../../src/art/pen';
import type { BodyPose, Pt, Sprite, Strip } from '../sprites';

/**
 * The hognose's body over the swallowed toad, after the eel short's
 * (gulpmoray/body.ts): laid as the game lays it (sprites.ts drawBody, the
 * strip in thin slices along the spine), lit side up, but where the toad
 * stretches the skin the saddles stretch less than the sandy skin between
 * them, which pales, so they spread apart round the ball, and the belly's
 * cream shows up its side.
 */

/** The game's saddles (barrensSnake.ts): five a period of 120, each from about 5 to 19 into its 24. */
const STEP = 24;
const SADDLE = [5, 19] as const;
/** Strip units at each side that are the inked edge. */
const INK_EDGE = 1.7;

/** Strip units across that are the back's saddles; the rest is the flank. */
const BACK_TO = 20.4;

const EDGE_INSET = 0.3 / SNAKE_W;
/** The stretched skin's pale sand. */
const STRETCHED = '#f6e3b8';

/** Warms the game's sandy hognose to the bold orange form, keeping its darks: in place, on a baked canvas. */
function warm(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const { canvas: out, ctx } = makeCanvas(canvas.width, canvas.height);
  ctx.drawImage(canvas, 0, 0);
  for (const [mode, colour, alpha] of [['color', '#e07f1e', 0.62], ['soft-light', '#ffb860', 0.5]] as const) {
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(canvas, 0, 0);
  return out;
}
export const warmStrip = (s: Strip): Strip => ({ ...s, frames: s.frames.map(warm) });
export const warmSprite = (s: Sprite): Sprite => ({ ...s, frames: s.frames.map(warm) });

/** Fades a top-down head's rigid neck out between two art xs behind its skull, so the body's own bending neck shows there. */
export const trimNeck = (s: Sprite, from: number, to: number): Sprite => ({
  ...s,
  frames: s.frames.map((frame) => {
    const { canvas, ctx } = makeCanvas(frame.width, frame.height);
    ctx.drawImage(frame, 0, 0);
    const x = (art: number): number => (art + s.frame / 2) * s.res;
    const g = ctx.createLinearGradient(x(from), 0, x(to), 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, x(from), canvas.height);
    return canvas;
  }),
});

function outline(b: BodyPose): Pt[] {
  const n = b.spine.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = b.spine[Math.max(0, i - 1)]!;
    const c = b.spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const [nx, ny] = [-(a.y - c.y) / len, (a.x - c.x) / len];
    const half = (b.widths[i]! / 2) * (1 - 2 * EDGE_INSET);
    const p = b.spine[i]!;
    left.push({ x: p.x + nx * half, y: p.y + ny * half });
    right.push({ x: p.x - nx * half, y: p.y - ny * half });
  }
  return [...left, ...right.reverse()];
}

/** How far into the skin between two saddles strip place `u` is, 0 at a saddle's edge .. 1 halfway. */
function gapDepth(u: number): number {
  const p = ((u % STEP) + STEP) % STEP;
  const half = (STEP - (SADDLE[1] - SADDLE[0])) / 2;
  const d = p >= SADDLE[1] ? p - SADDLE[1] : p <= SADDLE[0] ? SADDLE[0] - p : 0;
  return Math.min(1, d / half);
}

/** How fully the skin is stretched tight at `s`, 0 .. 1. */
const tightness = (s: number): number => Math.min(1, Math.max(0, (s - 1) / 0.9));

/** How far the belly has come up the side, 0 .. 1: easing out of and back into the neck's underside. */
const bellyRise = (s: number): number => {
  const t = Math.min(1, Math.max(0, (s - 1.03) / 0.8));
  return t * t * (3 - 2 * t);
};

/** The belly: opaque cream-white, a cool shade turning under, pale scute lines across it. */
const BELLY = { cream: '#fdfaf0', shade: '#8d95a8', line: '#7d7a80' } as const;
const SOFT_BANDS = 7;
const SHADE_BANDS = 12;
/** Strip units between the belly's scutes, along the body. */
const SCUTE = 3.4;

/** The belly up the lower side of the stretched skin, from where it is tight; in `b`'s screen space, clipped by the caller. */
export function paintBelly(ctx: CanvasRenderingContext2D, b: BodyPose, stretch: readonly number[]): void {
  const i0 = stretch.findIndex((s) => tightness(s) > 0.02);
  if (i0 < 0) return;
  const after = stretch.findIndex((s, i) => i > i0 && tightness(s) <= 0.02);
  const i1 = after < 0 ? stretch.length : after;
  if (i1 - i0 < 3) return;
  /** A place across the body: 1 its lower edge, 0 its middle; drawn down to the edge where the skin isn't tight. */
  const at = (i: number, v: number): Pt => {
    const a = b.spine[Math.max(0, i - 1)]!;
    const c = b.spine[Math.min(b.spine.length - 1, i + 1)]!;
    const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    const half = (b.widths[i]! / 2) * (1 - (1 - v) * bellyRise(stretch[i]!));
    const p = b.spine[i]!;
    return { x: p.x - ((c.y - a.y) / len) * half, y: p.y + ((c.x - a.x) / len) * half };
  };
  const band = (v: number, colour: string, alpha: number): void => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (let i = i0; i < i1; i++) {
      const p = at(i, v);
      if (i === i0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    for (let i = i1 - 1; i >= i0; i--) {
      const p = at(i, 1.1);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  };
  ctx.save();
  for (let k = 0; k < SOFT_BANDS; k++) band(0.24 + (0.12 * k) / SOFT_BANDS, BELLY.cream, 0.28);
  band(0.36, BELLY.cream, 1);
  for (let k = 0; k < SHADE_BANDS; k++) band(0.56 + (0.42 * k) / SHADE_BANDS, BELLY.shade, 0.075);
  // The scutes: wide belly scales, their free edges bowing towards the tail.
  ctx.strokeStyle = BELLY.line;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, b.along * 0.16);
  let run = 0;
  for (let i = i0 + 1; i < i1; i++) {
    const [a, c] = [b.spine[i - 1]!, b.spine[i]!];
    run += Math.hypot(c.x - a.x, c.y - a.y);
    if (run < SCUTE * b.along) continue;
    run = 0;
    const t = tightness(stretch[i]!);
    if (t < 0.25) continue;
    const j = Math.min(i1 - 1, i + 3);
    const [p, q, r] = [at(i, 0.4), at(j, 0.72), at(i, 1.02)];
    ctx.globalAlpha = 0.34 * Math.min(1, t * 1.4);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(q.x * 2 - (p.x + r.x) / 2, q.y * 2 - (p.y + r.y) / 2, r.x, r.y);
    ctx.stroke();
  }
  // Where the flank's scales meet the scutes.
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  for (let i = i0; i < i1; i++) {
    const p = at(i, 0.38);
    if (i === i0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * `stretch[i]` ≥ 1: how much the skin between the saddles is stretched at
 * spine point i. `swollen[i]`: the body has its own contour there, so the
 * strip's inked edges are left off.
 */
export function drawStretchedBody(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, b: BodyPose, stretch: readonly number[], swollen: readonly boolean[]): void {
  const n = b.spine.length;
  if (n < 2) return;
  const tex = strip.frames[((boil % strip.frames.length) + strip.frames.length) % strip.frames.length]!;
  const res = strip.res;
  ctx.save();
  ctx.beginPath();
  outline(b).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const base = ctx.getTransform();
  let u = b.offset ?? 0;
  for (let i = 0; i + 1 < n; i++) {
    const a = b.spine[i]!;
    const c = b.spine[i + 1]!;
    const len = Math.hypot(c.x - a.x, c.y - a.y);
    if (len < 1e-6) continue;
    const s = Math.max(1, (stretch[i]! + stretch[i + 1]!) / 2);
    const gap = gapDepth(u);
    // The saddles stretch less; the skin between them takes most of it.
    const rate = 1 + (s - 1) * (gap > 0 ? 1.6 : 0.8);
    const du = len / b.along / rate;
    const [bx, by] = [(c.x - a.x) / len, (c.y - a.y) / len];
    const across = (b.widths[i]! + b.widths[i + 1]!) / 2 / SNAKE_W;
    const u0 = ((u % strip.period) + strip.period) % strip.period;
    const along = len / du;
    const w = du + 0.9 / b.along;
    const edge = swollen[i] ? INK_EDGE : 0;
    const tight = tightness(s);
    ctx.setTransform(base);
    // The strip's lit edge (y = 0) to the head's up side.
    ctx.transform(bx * along, by * along, -by * across, bx * across, a.x, a.y);
    // The back's pattern keeps to the upper part of a swollen stretch; the flank's takes the rest.
    const cut = BACK_TO * (1 - 0.2 * tight);
    ctx.drawImage(tex, u0 * res, edge * res, w * res, (BACK_TO - edge) * res, 0, -SNAKE_W / 2, w, cut);
    ctx.drawImage(tex, u0 * res, BACK_TO * res, w * res, (SNAKE_W - BACK_TO - edge) * res, 0, -SNAKE_W / 2 + cut - 0.1, w, SNAKE_W - cut + 0.1);
    if (gap > 0 && s > 1.02) {
      // Stretched thin, the skin shows paler between the scales.
      ctx.globalAlpha = Math.min(0.7, 0.85 * (s - 1)) * gap;
      ctx.fillStyle = STRETCHED;
      ctx.fillRect(0, -SNAKE_W / 2, du + 0.1 / b.along, SNAKE_W);
      ctx.globalAlpha = 1;
    }
    u += du;
  }
  ctx.restore();
}
