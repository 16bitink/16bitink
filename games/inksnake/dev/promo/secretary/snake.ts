import { closed, cub, type Draw, makeDraw, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { ellipseAt, glaze } from '../../../src/art/critters/birdKit';
import { spineOf } from '../pythonbear/python';
import type { SnakePaint } from './paint';

/**
 * The snake on the ground, side on, painted live in screen px: an
 * olive-brown back lit along its top, the pale belly showing low on the
 * flank, rows of small scales, a firm contour, and a slim head with a round
 * pupil and a catchlight (a harmless-looking, generic African snake; no
 * species named). Or the toy rubber snake on the force plate.
 *
 * `knots` run from the head back to the tail tip; `width` is the body's
 * depth in px.
 */
export interface SnakeLay {
  readonly knots: readonly Pt[];
  readonly width: number;
  readonly paint: SnakePaint;
  /** 0 calm .. 1 the head flattened, eye squeezed (pinned). */
  readonly pinned?: number;
}

const SEED = 7311;

const widthAt = (u: number): number => (u < 0.06 ? 0.8 + u * 1.6 : u < 0.3 ? 0.9 + (u - 0.06) * 0.42 : Math.max(0.1, 1 - ((u - 0.3) / 0.7) ** 1.6 * 0.92));

function body(d: Draw, spine: readonly Pt[], w: number, c: SnakePaint): void {
  const { pen } = d;
  const r = ribbon(spine, (u) => w * widthAt(u));
  const avg = (ps: readonly Pt[]): number => ps.reduce((s, p) => s + p.y, 0) / ps.length;
  const [top, bot] = avg(r.top) <= avg(r.bot) ? [r.top, r.bot] : [r.bot, r.top];
  const shape = r.shape;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, c.back, 0.95);
  const band = (k0: number, k1: number): Pt[] => [
    ...top.map((p, i) => pt(p.x + (bot[i]!.x - p.x) * k0, p.y + (bot[i]!.y - p.y) * k0)),
    ...[...top].reverse().map((p, j) => {
      const i = top.length - 1 - j;
      return pt(p.x + (bot[i]!.x - p.x) * k1, p.y + (bot[i]!.y - p.y) * k1);
    }),
  ];
  pen.clipped(shape, () => {
    pen.fill(band(0.05, 0.32), c.backLit, 0.55);
    pen.fill(band(0.0, 0.1), c.backLit, 0.35);
    pen.fill(band(0.55, 0.78), c.backDeep, 0.5);
    pen.fill(band(0.76, 1.05), c.belly, 0.95);
    pen.fill(band(0.9, 1.05), c.bellyDeep, 0.6);
    // Scales: small arcs in rows along the body, and the belly plates' lines.
    for (let i = 2; i < spine.length - 2; i += 2) {
      const k = (i / (spine.length - 1));
      const ww = w * widthAt(k);
      for (const row of [0.2, 0.42, 0.62]) {
        const a = top[i]!;
        const b = bot[i]!;
        const m = pt(a.x + (b.x - a.x) * (row + (i % 4 === 0 ? 0.08 : 0)), a.y + (b.y - a.y) * (row + (i % 4 === 0 ? 0.08 : 0)));
        pen.hair([pt(m.x - ww * 0.12, m.y - ww * 0.04), pt(m.x, m.y + ww * 0.06), pt(m.x + ww * 0.12, m.y - ww * 0.04)], Math.max(0.8, ww * 0.025), c.backDeep, 0.5);
      }
      const a = top[i]!;
      const b = bot[i]!;
      pen.hair([pt(a.x + (b.x - a.x) * 0.8, a.y + (b.y - a.y) * 0.8), pt(b.x, b.y)], Math.max(0.6, ww * 0.02), c.bellyDeep, 0.6);
    }
  });
  pen.hair(top.slice(2), Math.max(1, w * 0.03), PAPER_FILL, 0.35);
  // Open at the head end, so no ring shows where the neck meets the head.
  pen.stroke(shape, Math.max(2.5, w * 0.07), c.line, 1, false);
}

function head(d: Draw, at: Pt, ang: number, w: number, c: SnakePaint, pinned: number): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(ang);
  // Keep the head upright whichever way it faces.
  if (Math.cos(ang) < 0) ctx.scale(1, -1);
  const L = w * 1.55;
  const H = w * (0.46 - pinned * 0.06);
  const shape = [
    ...cub(pt(-L * 0.25, -H * 0.85), pt(L * 0.25, -H * 1.15), pt(L * 0.8, -H * 0.9), pt(L, -H * 0.15), 12),
    ...cub(pt(L, -H * 0.15), pt(L * 1.04, H * 0.3), pt(L * 0.8, H * 0.75), pt(L * 0.4, H * 0.8), 8).slice(1),
    ...cub(pt(L * 0.4, H * 0.8), pt(L * 0.1, H * 0.9), pt(-L * 0.2, H * 0.9), pt(-L * 0.25, H * 0.8), 6).slice(1),
  ];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, c.back, 0.95);
  pen.clipped(shape, () => {
    glaze(d, L * 0.35, -H * 0.7, L * 0.6, H * 0.4, 0, c.backLit, 0.7);
    pen.fill([pt(-L, H * 0.28), pt(L * 1.2, H * 0.1), pt(L * 1.2, H * 2), pt(-L, H * 2)], c.belly, 0.95);
    pen.fill([pt(-L, H * 0.62), pt(L * 1.2, H * 0.45), pt(L * 1.2, H * 2), pt(-L, H * 2)], c.bellyDeep, 0.5);
    // The large head plates.
    pen.hair([pt(L * 0.15, -H * 0.95), pt(L * 0.3, -H * 0.4)], Math.max(0.8, w * 0.02), c.backDeep, 0.55);
    pen.hair([pt(L * 0.62, -H * 0.85), pt(L * 0.7, -H * 0.35)], Math.max(0.8, w * 0.02), c.backDeep, 0.55);
  });
  // The mouth line, the nostril, the eye.
  pen.hair([pt(L * 0.96, H * 0.1), pt(L * 0.55, H * 0.3), pt(L * 0.2, H * 0.28)], Math.max(1, w * 0.035), c.line, 0.9);
  pen.dot(L * 0.86, -H * 0.42, w * 0.035, c.line, 0.9);
  const e = pt(L * 0.58, -H * 0.38);
  const er = w * 0.16;
  const eye = ellipseAt(e.x, e.y, er, er * (1 - pinned * 0.7), 0, 18);
  pen.fill(eye, c.iris, 1);
  pen.clipped(eye, () => glaze(d, e.x + er * 0.2, e.y + er * 0.3, er, er, 0, c.pupil, 0.4));
  pen.dot(e.x, e.y, er * 0.55 * (1 - pinned * 0.6), c.pupil, 1);
  if (pinned < 0.5) pen.dot(e.x - er * 0.35, e.y - er * 0.35, er * 0.22, PAPER_FILL, 0.95);
  pen.stroke(closed(eye), Math.max(1, w * 0.03), c.line, 1, false);
  pen.stroke(closed(shape), Math.max(2.5, w * 0.07), c.line, 1, false);
  ctx.restore();
}

/** Draws the snake: its body, then its head at the first knot. */
export function drawSnake(ctx: CanvasRenderingContext2D, l: SnakeLay, boil: number): void {
  const d = makeDraw(ctx, SEED + boil * 13, boil, 0, l.paint.line);
  const spine = spineOf(l.knots, 6);
  const shadow = ribbon(spine.map((p) => pt(p.x + 6, p.y + l.width * 0.42)), (u) => l.width * widthAt(u) * 0.5).shape;
  d.pen.fill(shadow, '#2a1608', 0.22);
  const a = Math.atan2(spine[0]!.y - spine[2]!.y, spine[0]!.x - spine[2]!.x);
  // The head first, so the neck's scales run over its back end.
  head(d, pt(spine[0]!.x - Math.cos(a) * l.width * 0.15, spine[0]!.y - Math.sin(a) * l.width * 0.15), a, l.width, l.paint, l.pinned ?? 0);
  body(d, spine.slice(1), l.width, l.paint);
}
