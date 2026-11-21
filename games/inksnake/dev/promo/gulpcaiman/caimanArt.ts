import { capsule, closed, cub, type Draw, pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { caimanBottom, caimanTop, U } from './story';

/**
 * The young caiman from the side, facing +x: the game's young caiman
 * (chapters/floodedCrittersCaiman.ts) walked round to the camera, greyed to
 * stand off the green anaconda: olive-grey with dark crossbands and a pale
 * yellowish belly, a short broad snout with its nostrils raised on a bump at
 * the tip, the bony "spectacle" ridge in front of the raised eyes, rows of
 * keeled scutes down the armoured back, a double crest on the tail's base
 * running into a single one, and short splayed legs with clawed toes. Its
 * jaws stay shut; a few teeth show along the lips. The trunk follows story.ts's
 * outline, so the lump in the snake is its shape.
 *
 * Art units; PER_ART world units to one. Each part is its own sprite with its
 * origin at its joint, so it can paddle, swim and lash its tail.
 */
export const PER_ART = 6.6 * U;
/** The base drawing's world units to one art unit: every `a` in the art is in base units, before U. */
const BASE = 6.6;

export const HIDE = {
  base: '#7c776a', deep: '#47433a', light: '#aaa592', band: '#2b2923', belly: '#e4d7a6', bellyShade: '#b9ac80',
  scute: '#625d50', keel: '#3b3830', jaw: '#d6c99c', tooth: '#f3ecd4', claw: '#1f1c17', iris: '#c3a446',
} as const;

/** Joints, along the axis (base units from the snout: times U for the world) and off it (art units, down). */
export const JOINTS = {
  body: { a: 380, y: 0 },
  neck: { a: 215, y: 0 },
  tail: { a: 545, y: 0 },
  tip: { a: 690, y: 0 },
  foreNear: { a: 290, y: 8 },
  foreFar: { a: 272, y: 7 },
  hindNear: { a: 505, y: 7 },
  hindFar: { a: 488, y: 6 },
} as const;

/** An axis place `a` as an art x about a joint at `from`. */
export const artX = (a: number, from: number): number => (from - a) / BASE;
const topY = (a: number): number => -caimanTop(a * U) / PER_ART;
const botY = (a: number): number => caimanBottom(a * U) / PER_ART;

/** The outline from `a0` (front) to `a1` (back) about a joint, with `lift(a)` art units added on top. */
export function outline(a0: number, a1: number, joint: number, n: number, lift: (a: number) => number = () => 0): { top: Pt[]; bottom: Pt[]; shape: Pt[] } {
  const at = (i: number): number => a0 + ((a1 - a0) * i) / n;
  const top = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(i), joint), topY(at(i)) - lift(at(i))));
  const bottom = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(i), joint), botY(at(i))));
  return { top, bottom, shape: [...top, ...[...bottom].reverse()] };
}

/** The hide's vertical wash: dark along the back, olive-grey flank, the pale yellowish belly. */
export function hideWash(ctx: CanvasRenderingContext2D, y0: number, y1: number, x0: number, w: number, bellyFrom = 0.66): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, HIDE.deep);
  g.addColorStop(0.22, HIDE.base);
  g.addColorStop(0.45, HIDE.light);
  g.addColorStop(bellyFrom - 0.06, HIDE.base);
  g.addColorStop(bellyFrom, HIDE.bellyShade);
  g.addColorStop(Math.min(1, bellyFrom + 0.14), HIDE.belly);
  g.addColorStop(1, HIDE.bellyShade);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, y1 - y0);
}

/**
 * A dark crossband from the back down the flank, fading out above the belly:
 * blotchy and soft-edged, leaning back with the body's curve, its width and
 * depth varying down its length (the scute rows painted over it break it up).
 */
export function crossband(ctx: CanvasRenderingContext2D, x: number, w: number, y0: number, y1: number, alpha: number): void {
  const rnd = (k: number): number => {
    const v = Math.sin(x * 91.7 + k * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  const n = Math.max(4, Math.round((y1 - y0) / 1.1));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const y = y0 + (y1 - y0) * u;
    const fade = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
    const lean = -1.6 * u * u + (rnd(i) - 0.5) * 0.7;
    const half = (w / 2) * (0.75 + 0.6 * rnd(i + 40)) * (1 - 0.3 * u);
    glaze(ctx, x + lean, y, half * 1.15, 1.7, 0, HIDE.band, alpha * fade * (0.55 + 0.45 * rnd(i + 80)));
  }
}

/** Erases a part's end from x `from` to `to`, so it dissolves into the part it joins. */
export function fadeX(ctx: CanvasRenderingContext2D, from: number, to: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(from, 0, to, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  const [x0, x1] = from < to ? [from - 40, to] : [to, from + 40];
  ctx.fillRect(x0, -60, x1 - x0, 120);
  ctx.restore();
}

/** A keeled scute standing up off the back line at `p`, `h` tall. */
export function keel(d: Draw, p: Pt, w: number, h: number, color: string = HIDE.scute): void {
  const tri = [pt(p.x + w / 2, p.y + 0.4), pt(p.x - w * 0.1, p.y - h), pt(p.x - w / 2, p.y + 0.4)];
  d.pen.fill(tri, color, 1);
  d.pen.fill([tri[1]!, pt(p.x + w * 0.15, p.y - h * 0.3), tri[0]!], HIDE.light, 0.35);
  d.pen.stroke(tri, 0.5, d.ink, 0.9, false);
}

/** A row of oval armour plates along `y(x)`, top-lit, thin ink round each. */
function plates(d: Draw, xs: readonly number[], y: (x: number) => number, w: number, h: number): void {
  for (const x of xs) {
    const s = [pt(x - w / 2, y(x)), pt(x, y(x) - h / 2), pt(x + w / 2, y(x)), pt(x, y(x) + h / 2)];
    const plate = cub(s[0]!, pt(x - w / 2, y(x) - h / 2), pt(x + w / 2, y(x) - h / 2), s[2]!, 6).concat(cub(s[2]!, pt(x + w / 2, y(x) + h / 2), pt(x - w / 2, y(x) + h / 2), s[0]!, 6).slice(1));
    d.pen.fill(plate, HIDE.scute, 0.55);
    glaze(d.pen.ctx, x + 0.2, y(x) - h * 0.2, w * 0.35, h * 0.2, 0, HIDE.light, 0.5);
    d.pen.hair(closed(plate), 0.35, d.ink, 0.55);
  }
}

export const range = (from: number, to: number, step: number): number[] => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

// ---------------------------------------------------------------- body

/** The trunk, from behind the head to the tail's base: banded, armoured, the pale belly underneath. */
function drawBody(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const J = JOINTS.body.a;
  const o = outline(196, 600, J, 60);
  pen.clipped(o.shape, () => {
    hideWash(ctx, -15, 15, -40, 80, 0.64);
    for (const [a, w, k] of [[262, 2.6, 0.75], [322, 4.4, 0.6], [398, 3, 0.8], [452, 4.8, 0.55], [514, 2.6, 0.75], [562, 3.8, 0.65]] as const) crossband(ctx, artX(a, J), w, -16, 5, k);
    // The shoulder and the haunch rounding out, light along the back, the belly in shade.
    glaze(ctx, 13, 2, 7, 9, 0, HIDE.deep, 0.3);
    glaze(ctx, -18, 1, 8, 10, 0, HIDE.deep, 0.3);
    glaze(ctx, 0, -11, 30, 2.6, 0, HIDE.light, 0.4);
    glaze(ctx, 0, 14, 34, 2.2, 0, '#5a5030', 0.35);
    // Belly scales: faint squares.
    for (const x of range(-30, 30, 2.2)) pen.hair([pt(x, 8), pt(x - 0.4, 15)], 0.22, d.ink, 0.22);
    pen.hair(range(-30, 28, 2).map((x) => pt(x, 10.5 + 0.2 * Math.sin(x))), 0.22, d.ink, 0.22);
    // Flank tubercles, in loose rows.
    for (const row of [-3.5, 0, 3.4]) {
      for (const x of range(-30, 26, 2.6)) {
        const jx = x + ((row * 7 + x * 3) % 1.3);
        pen.dot(jx, row + 0.5 * Math.sin(x * 1.7), 0.5, HIDE.deep, 0.3);
        pen.dot(jx - 0.15, row - 0.25 + 0.5 * Math.sin(x * 1.7), 0.28, HIDE.light, 0.35);
      }
    }
    plates(d, range(-30, 26, 3.4), (x) => topAtX(x, J) + 2.4, 3, 1.8);
    plates(d, range(-28.3, 24, 3.4), (x) => topAtX(x, J) + 5.2, 2.8, 1.7);
  });
  pen.stroke(o.top, 1.3, d.ink, 1, false);
  pen.stroke(o.bottom, 1.5, d.ink, 1, false);
  // The keeled scutes standing along the back.
  for (const x of range(-30, 24, 3.4)) keel(d, pt(x, topAtX(x, J) + 0.4), 2.6, 1.3);
  fadeX(ctx, -30.5, -27);
}

/** The back line's art y at art x about a joint. */
const topAtX = (x: number, joint: number): number => topY(joint - x * BASE);

export const CAIMAN_BODY: SpriteArt<'body'> = { frame: 96, res: 7, poses: ['body'], draw: drawBody };

// ---------------------------------------------------------------- tail

/** The tail's base: banded, its double crest. */
function drawTailBase(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const J = JOINTS.tail.a;
  const o = outline(520, 702, J, 30);
  const crest = range(-21.5, 0.5, 2.3);
  // The far row of crests, darker, behind the outline.
  for (const x of crest) keel(d, pt(x - 1.1, topAtX(x - 1.1, J) - 0.2), 2.2, 2.6 - x * 0.04, HIDE.keel);
  pen.clipped(o.shape, () => {
    hideWash(ctx, -11, 9, -30, 40, 0.62);
    for (const [a, w, k] of [[590, 4, 0.75], [630, 2.6, 0.65], [676, 4.2, 0.8]] as const) crossband(ctx, artX(a, J), w, -12, 7, k);
    glaze(ctx, -10, -7, 16, 1.8, 0, HIDE.light, 0.35);
    plates(d, range(-22, 0, 3.2), (x) => topAtX(x, J) + 2.6, 2.8, 1.8);
    for (const x of range(-23, 2, 2.4)) pen.hair([pt(x, topAtX(x, J) + 4), pt(x - 0.3, 9)], 0.25, d.ink, 0.25);
  });
  pen.stroke(o.top, 1.3, d.ink, 1, false);
  pen.stroke(o.bottom, 1.4, d.ink, 1, false);
  for (const x of crest) keel(d, pt(x, topAtX(x, J) + 0.2), 2.2, 2.4 - x * 0.04);
  fadeX(ctx, 2.6, -1);
  fadeX(ctx, -23.6, -21.4);
}

/** The tail's end: a single crest dwindling to the tip. */
function drawTailTip(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const J = JOINTS.tip.a;
  const o = outline(676, 820, J, 26);
  pen.clipped(o.shape, () => {
    hideWash(ctx, -7, 5, -22, 26, 0.6);
    for (const [a, w, k] of [[722, 3.4, 0.8], [758, 2.4, 0.7], [796, 3, 0.85]] as const) crossband(ctx, artX(a, J), w, -8, 5, k);
    for (const x of range(-19, 2, 2.2)) pen.hair([pt(x, topAtX(x, J) + 1.5), pt(x - 0.3, 5)], 0.22, d.ink, 0.25);
  });
  pen.stroke([...o.top, ...[...o.bottom].reverse()].slice(1, -1), 1.2, d.ink, 1, false);
  for (const x of range(-18, 1, 2.1)) keel(d, pt(x, topAtX(x, J) + 0.2), 1.9, 1.9 + x * 0.07);
  fadeX(ctx, 2.2, 0.2);
}

export const CAIMAN_TAIL: SpriteArt<'base' | 'tip'> = { frame: 56, res: 7, poses: ['base', 'tip'], draw: (d, p) => (p === 'base' ? drawTailBase(d) : drawTailTip(d)) };

// ---------------------------------------------------------------- legs

/** Clawed toes fanned forward from `heel`. */
function toes(d: Draw, heel: Pt, n: number, len: number): void {
  for (let i = 0; i < n; i++) {
    // Flat on the ground, fanned: the far fingers foreshortened up, the near ones down.
    const ang = -0.75 + (i / Math.max(1, n - 1)) * 1.45;
    const l = len * (1 - 0.3 * Math.abs(i - (n - 1) / 2) / n);
    const tip = pt(heel.x + Math.cos(ang) * l, heel.y + Math.sin(ang) * l * 0.35 + 0.3);
    const toe = capsule(heel, tip, 1.5, 0.8);
    d.pen.fill(toe, i % 2 ? HIDE.base : HIDE.deep, 1);
    d.pen.stroke(closed(toe), 0.45, d.ink, 0.9, false);
    d.pen.stroke([tip, pt(tip.x + Math.cos(ang) * 1.1, tip.y + 0.7)], 0.7, HIDE.claw, 1, false);
  }
}

/** The flat of a hand or foot, from the wrist forward along the ground. */
function palm(d: Draw, wrist: Pt, ball: Pt, w: number): void {
  const s = capsule(wrist, ball, w * 0.8, w);
  d.pen.stroke(closed(s), 1.4, d.ink, 1, false);
  d.pen.fill(s, HIDE.base, 1);
  d.pen.clipped(s, () => glaze(d.pen.ctx, ball.x, ball.y + 1, w, 1.2, 0, HIDE.deep, 0.4));
}

function limb(d: Draw, joints: readonly Pt[], widths: readonly number[]): void {
  const segs = joints.slice(1).map((p, i) => capsule(joints[i]!, p, widths[i]!, widths[i + 1]!));
  for (const s of segs) d.pen.stroke(closed(s), 1.6, d.ink, 1, false);
  for (const s of segs) {
    d.pen.fill(s, HIDE.base, 1);
    d.pen.clipped(s, () => {
      glaze(d.pen.ctx, joints[0]!.x - 1, joints[0]!.y + 2, 4, 8, 0, HIDE.deep, 0.35);
      glaze(d.pen.ctx, joints[0]!.x + 1.5, joints[0]!.y + 1, 1.4, 5, 0, HIDE.light, 0.4);
    });
  }
  // Scale rings round the limb.
  for (let i = 1; i < joints.length - 1; i++) {
    const [a, b] = [joints[i]!, joints[i + 1]!];
    for (let k = 1; k < 4; k++) {
      const p = pt(a.x + ((b.x - a.x) * k) / 4, a.y + ((b.y - a.y) * k) / 4);
      d.pen.hair([pt(p.x - widths[i]! / 2, p.y - 0.3), pt(p.x + widths[i]! / 2, p.y + 0.3)], 0.3, d.ink, 0.45);
    }
  }
}

/** The fore leg from the shoulder, +y down: the elbow out behind, five clawed fingers spread forward. */
function drawFore(d: Draw): void {
  limb(d, [pt(0, -3), pt(-4.2, 3.8), pt(1.4, 10.2)], [7.6, 5.2, 3.8]);
  palm(d, pt(1.4, 10.2), pt(3.6, 11.3), 3.6);
  toes(d, pt(3.4, 11.3), 5, 3.2);
  fadeY(d.pen.ctx, -4, 2);
}

/** The hind leg from the hip, +y down: the thick thigh, the knee forward, the long foot with four clawed toes. */
function drawHind(d: Draw): void {
  limb(d, [pt(0, -4), pt(4.2, 4.2), pt(-0.6, 10.6)], [8.8, 5.6, 3.8]);
  palm(d, pt(-0.6, 10.6), pt(3.2, 12.1), 3.4);
  toes(d, pt(3, 12.1), 4, 3.8);
  fadeY(d.pen.ctx, -5, 2);
}

function fadeY(ctx: CanvasRenderingContext2D, from: number, to: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(0, from, 0, to);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-30, from - 30, 60, to - from + 30);
  ctx.restore();
}

export const CAIMAN_LEG: SpriteArt<'fore' | 'hind'> = { frame: 40, res: 8, poses: ['fore', 'hind'], draw: (d, p) => (p === 'fore' ? drawFore(d) : drawHind(d)) };
