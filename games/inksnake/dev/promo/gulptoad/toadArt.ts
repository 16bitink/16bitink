import { createRng } from '../../../src/logic/rng';
import { blob } from '../../../src/art/groundKit';
import { closed, cub, type Draw, oval, pt, TAU } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { ellipseAt, glaze } from '../../../src/art/critters/preyKit';
import { bump, scatter } from '../../../src/art/chapters/barrensCrittersKit';
import type { SpriteArt } from '../../../src/art/types';
import { mix, rgba } from '../../../src/art/wash';
import { BALL_R } from './story';

/**
 * The toad from the side, facing +x: the game's top-down American toad
 * (chapters/barrensCrittersToad.ts) walked round to the camera, in its grey
 * colour form so it stands off the orange snake: a cool slate-olive back
 * with dark spots, each holding a wart or two, big pitted glands behind gold
 * eyes with a level black pupil, a wide shut mouth, and a whitish belly
 * freckled grey. Blown up, its body is a ball with the skin stretched tight
 * and shining. Here the body and head; toadLimbs.ts has the legs.
 *
 * Art units; PER_ART world units to one.
 */
export const PER_ART = 6.6;

export const TOAD_GREY = {
  back: '#6f7464', backLit: '#a6aa92', deep: '#272c2c', spot: '#37393a', rim: '#bcbfa6', wart: '#7b7860', wartDark: '#565440', hi: '#e2e3d0',
  gland: '#92917a', belly: '#f4f2ea', bellyCool: '#c5caca', bellyDeep: '#8d9799', freckle: '#4b5252', gold: '#edb53c', goldDeep: '#8a5412', pupil: '#0f0d12',
} as const;
const T = TOAD_GREY;

const R = BALL_R / PER_ART;

/** Where the dark back meets the pale belly: a line across the ball, wavering, lower at the shoulder and the haunch. */
const border = (x: number): number => 6.5 + 2.4 * Math.sin(x * 0.16 + 0.6) + 1.1 * Math.sin(x * 0.41);

/** The ball, its back broken by warts along the outline. */
function ball(): Pt[] {
  const n = 96;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const up = Math.max(0, -Math.sin(a) + 0.15);
    const warty = 1 + 0.011 * Math.sin(i * 2.17) * Math.min(1, up * 1.6);
    return pt(Math.cos(a) * R * warty, Math.sin(a) * R * warty);
  });
}

/** Squashes a mark towards the ball's edge, as it turns away: the place on the ball for a flat (u, v) in −1..1. */
function onBall(u: number, v: number): { c: Pt; sx: number; sy: number } {
  const r = Math.min(0.97, Math.hypot(u, v));
  return { c: pt(u * R, v * R), sx: Math.sqrt(1 - Math.min(0.94, u * u)), sy: Math.sqrt(1 - Math.min(0.94, v * v)) * (1 - 0.1 * r) };
}

/** The dark spots of the back (place on the ball, size): stretched wide apart by the air. */
const SPOTS: readonly (readonly [number, number, number])[] = [
  [-0.56, -0.5, 5.2], [-0.1, -0.64, 5.8], [0.38, -0.58, 4.6], [-0.78, -0.12, 4.2], [-0.3, -0.18, 5.4], [0.2, -0.2, 4.4], [0.62, -0.22, 3.6], [-0.36, -0.84, 4], [0.14, -0.9, 3.8], [0.46, 0.02, 2.6], [-0.56, 0.12, 2.6],
];

function paintBack(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const rng = createRng(7711);
  // The slate back, lit from the upper left, over the pale belly, its edge mottled.
  const back = [...Array.from({ length: 41 }, (_, i) => { const x = -R - 2 + (i / 40) * (2 * R + 4); return pt(x, border(x)); }), pt(R + 3, -R - 4), pt(-R - 3, -R - 4)];
  pen.clipped(shape, () => {
    pen.fill(back, T.back, 0.97);
    for (let i = 0; i < 46; i++) {
      const x = -R + rng() * 2 * R;
      pen.fill(blob(pt(x, border(x) + (rng() - 0.35) * 3), 1 + rng() * 2, 0.8 + rng() * 1.2, rng, 0.3, 10, rng() * TAU), T.back, 0.75);
    }
    glaze(d, -8, -18, 24, 15, -0.5, T.backLit, 0.75);
    glaze(d, 20, 2, 14, 20, 0.2, T.deep, 0.3);
    glaze(d, -24, 4, 14, 12, 0.2, '#5f6a58', 0.4);
    for (const [u, v, r] of SPOTS) {
      const { c, sx, sy } = onBall(u, v);
      const b = blob(c, r * sx, r * 0.82 * sy, rng, 0.3, 18, rng() * 0.6);
      pen.fill(b.map((p) => pt(c.x + (p.x - c.x) * 1.16 - 0.3, c.y + (p.y - c.y) * 1.16 - 0.3)), T.rim, 0.4);
      pen.fill(b, T.spot, 0.82);
      pen.fill(b.map((p) => pt(c.x + (p.x - c.x) * 0.66 - 0.4, c.y + (p.y - c.y) * 0.66 - 0.4)), mix(T.spot, T.back, 0.4), 0.45);
      pen.hair(closed(b).slice(4, 15), 0.32, d.ink, 0.5);
    }
  });
}

/** Warts over the back: bigger in the spots, spread by the stretch. */
function paintWarts(d: Draw, shape: readonly Pt[]): void {
  const rng = createRng(7721);
  const spots = SPOTS.map(([u, v, r]) => ({ c: onBall(u, v).c, r }));
  const pts = scatter(rng, shape, 130, 3.1, (p) => p.y < border(p.x) - 2.2 && Math.hypot(p.x, p.y) < R * 0.96);
  for (const p of pts) {
    const { sx, sy } = onBall(p.x / R, p.y / R);
    const inSpot = spots.some((s) => Math.hypot(p.x - s.c.x, p.y - s.c.y) < s.r * 0.8);
    const r = ((inSpot ? 1.9 : 0.9) + rng() * (inSpot ? 0.8 : 1)) * (0.55 + 0.45 * Math.min(sx, sy));
    bump(d, p, r, inSpot ? mix(T.wartDark, T.back, rng() * 0.45) : rng() < 0.4 ? mix(T.wart, T.back, 0.5) : mix(T.back, T.hi, 0.25), inSpot ? T.rim : T.hi, T.deep, 0.34);
  }
}

/** The belly: whitish, cool in the shade, freckled grey, denser by the back's edge. */
function paintBelly(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(7731);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, 4, 0, R);
    g.addColorStop(0, T.belly);
    g.addColorStop(0.55, '#eceae2');
    g.addColorStop(1, T.bellyCool);
    ctx.fillStyle = g;
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
    for (let i = 0; i < 210; i++) {
      const x = -R + rng() * 2 * R;
      const down = rng() ** 1.5;
      const y = border(x) + 1.5 + down * 19;
      pen.fill(ellipseAt(x, y, 0.35 + rng() * 0.75, 0.28 + rng() * 0.45, rng() * 3, 8), T.freckle, 0.5 * (1 - down * 0.6));
    }
  });
}

/** The balloon's light and shade: core shadow at the lower right, bounced light, the skin's tight shine, thin stretch lines. */
function modelBall(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.clipped(shape, () => {
    const g = ctx.createRadialGradient(-9, -12, R * 0.2, -4, -5, R * 1.14);
    g.addColorStop(0, rgba(PAPER_FILL, 0.26));
    g.addColorStop(0.35, rgba(PAPER_FILL, 0));
    g.addColorStop(0.62, rgba(T.deep, 0.06));
    g.addColorStop(0.86, rgba(T.deep, 0.34));
    g.addColorStop(0.96, rgba(T.deep, 0.5));
    g.addColorStop(1, rgba(T.deep, 0.36));
    ctx.fillStyle = g;
    ctx.fillRect(-R - 2, -R - 2, 2 * R + 4, 2 * R + 4);
    glaze(d, 6, R * 0.9, 20, 3.4, 0, '#e9d6ae', 0.4);
    // The tight shine: a soft bloom and a crisp window of light in it.
    glaze(d, -12, -19, 13, 7, -0.6, PAPER_FILL, 0.5);
    pen.fill(ellipseAt(-14.5, -21, 6.2, 2.5, -0.6, 20), PAPER_FILL, 0.66);
    pen.fill(ellipseAt(-5.6, -25.6, 1.7, 1, -0.3, 12), PAPER_FILL, 0.75);
    glaze(d, -10, 16, 10, 5, 0.35, PAPER_FILL, 0.5);
    for (const [cx, cy, a0] of [[14, 22, -2.4], [-19, 14, -1.5]] as const) {
      for (let i = 0; i < 5; i++) {
        const a = a0 + i * 0.26;
        pen.hair([pt(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4), pt(cx + Math.cos(a + 0.08) * (9 + (i % 2) * 3), cy + Math.sin(a + 0.08) * (9 + (i % 2) * 3))], 0.4, T.deep, 0.35);
      }
    }
    pen.crescent(shape, pt(-3.4, -5), () => pen.hatch(shape, 1.7, 0.9, 0.3, { color: d.ink, alpha: 0.22 }));
  });
}

/** Warts standing off the outline of the back. */
function edgeWarts(d: Draw): void {
  const rng = createRng(7725);
  for (let i = 0; i < 19; i++) {
    const a = -Math.PI * (0.04 + 0.95 * ((i + 0.3 * rng()) / 19));
    const r = 1.2 + rng() * 1.1;
    const c = pt(Math.cos(a) * (R - 0.2), Math.sin(a) * (R - 0.2));
    const w = ellipseAt(c.x, c.y, r * 1.25, r, a + Math.PI / 2, 14);
    d.pen.stroke(closed(w), 1.6, d.ink, 1, false);
    d.pen.fill(w, mix(T.back, T.hi, 0.15 + 0.2 * rng()), 1);
  }
}

function drawBody(d: Draw): void {
  edgeWarts(d);
  const shape = ball();
  paintBelly(d, shape);
  paintBack(d, shape);
  d.pen.clipped(shape, () => paintWarts(d, shape));
  modelBall(d, shape);
  d.pen.stroke(closed(shape), 1.25, d.ink, 1);
}

/** Its body, blown up: a ball of BALL_R, the origin its middle. */
export const TOAD_BODY: SpriteArt<'body'> = { frame: 78, res: 9, poses: ['body'], draw: drawBody };

export type HeadPose = 'calm' | 'alarm';
/** The head's root (its origin) along the axis from the nose, world units. */
export const HEAD_ROOT = 204;
/** The nose's art x. */
const NOSE = HEAD_ROOT / PER_ART;

/** The head's outline: from the nape over the eye's bump, down the blunt snout, back along the chin and the full throat. */
const HEAD: readonly Pt[] = [
  ...cub(pt(-7, -15.6), pt(-2, -16.4), pt(3, -16), pt(6.4, -15.6), 8),
  ...cub(pt(6.4, -15.6), pt(8.6, -20.4), pt(18.4, -20.6), pt(20.6, -14.2), 12).slice(1),
  ...cub(pt(20.6, -14.2), pt(25.4, -13.2), pt(NOSE - 0.8, -10.4), pt(NOSE + 0.2, -4.4), 10).slice(1),
  ...cub(pt(NOSE + 0.2, -4.4), pt(NOSE + 1.2, -0.6), pt(NOSE + 0.8, 3), pt(NOSE - 1.4, 6), 7).slice(1),
  ...cub(pt(NOSE - 1.4, 6), pt(24, 14.4), pt(13, 17.4), pt(4, 16.4), 12).slice(1),
  ...cub(pt(4, 16.4), pt(0, 16), pt(-4, 15.4), pt(-7, 15), 6).slice(1),
];
/** The wide shut mouth: from under the snout's tip, a long level line dipping to a deep corner behind the eye. */
const MOUTH: readonly Pt[] = [...cub(pt(NOSE + 0.6, 2.2), pt(24, 1.4), pt(17, 1.2), pt(9, 4.6), 14), ...cub(pt(9, 4.6), pt(6.6, 5.8), pt(4.4, 8), pt(3.6, 11), 6).slice(1)];
const EYE = pt(13.6, -12);

/** The bulging gold eye: a thick warty lid, a level black pupil, grain, the lid's shadow, a wet catchlight; stretched open in alarm. */
function drawEye(d: Draw, alarm: boolean): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = alarm ? 6 : 5.4;
  const c = EYE;
  const socket = oval(c.x, c.y, r * 1.26, r * 1.18, 28);
  pen.fill(socket.map((p) => pt(p.x + 0.4, p.y + 0.9)), T.deep, 0.5);
  pen.fill(socket, T.back, 1);
  pen.clipped(socket, () => glaze(d, c.x - 2, c.y - 4, r, r * 0.6, -0.3, T.hi, 0.6));
  pen.stroke(closed(socket), 0.6, d.ink, 0.9, false);
  const ry = alarm ? r * 0.96 : r * 0.82;
  const ballShape = oval(c.x + 0.3, c.y + 0.2, r, ry, 28);
  pen.clipped(ballShape, () => {
    const g = ctx.createRadialGradient(c.x - 0.6, c.y + 1.2, 0.4, c.x, c.y, r * 1.06);
    g.addColorStop(0, '#f8d878');
    g.addColorStop(0.55, T.gold);
    g.addColorStop(1, T.goldDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r - 1, c.y - r - 1, 2 * r + 2, 2 * r + 2);
    const rng = createRng(7741);
    for (let i = 0; i < 44; i++) {
      const a = rng() * TAU;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.5, c.y + Math.sin(a) * r * 0.45), pt(c.x + Math.cos(a) * r * 0.95, c.y + Math.sin(a) * r * 0.9)], 0.2, rng() < 0.5 ? T.goldDeep : '#5a360c', 0.5);
    }
    pen.fill(oval(c.x + 0.5, c.y + 0.3, r * 0.64, r * (alarm ? 0.3 : 0.34), 22), T.pupil, 1);
    pen.fill(ballShape.map((p) => pt(p.x, p.y - ry * 1.55)), '#3a2208', alarm ? 0.4 : 0.6);
  });
  pen.stroke(closed(ballShape), 0.95, d.ink, 1, false);
  pen.dot(c.x - 1.9, c.y - 1.9, 1.15, PAPER_FILL, 1);
  pen.dot(c.x + 2.4, c.y + 2, 0.5, PAPER_FILL, 0.7);
  // The raised crest over it.
  pen.hair(cub(pt(c.x - r * 1.3, c.y - r * 0.3), pt(c.x - r * 0.8, c.y - r * 1.34), pt(c.x + r * 0.7, c.y - r * 1.36), pt(c.x + r * 1.3, c.y - r * 0.2), 12), 1.3, mix(T.back, T.hi, 0.35), 0.9);
  pen.hair(cub(pt(c.x - r * 1.36, c.y - r * 0.1), pt(c.x - r * 0.9, c.y - r * 1.1), pt(c.x + r * 0.8, c.y - r * 1.12), pt(c.x + r * 1.28, c.y - r * 0.02), 12), 0.5, d.ink, 0.7);
}

/** The pitted gland behind the eye and the round eardrum under it. */
function glandAndEar(d: Draw): void {
  const { pen } = d;
  const g = [...cub(pt(6, -10.4), pt(3, -15.4), pt(-8, -15.8), pt(-13, -10.6), 12), ...cub(pt(-13, -10.6), pt(-15.4, -6), pt(-7, -3.4), pt(0, -5), 12).slice(1), ...cub(pt(0, -5), pt(5, -6), pt(7, -8.2), pt(6, -10.4), 8).slice(1, -1)];
  pen.fill(g.map((p) => pt(p.x + 0.5, p.y + 1.1)), T.deep, 0.45);
  pen.fill(g, T.gland, 1);
  pen.clipped(g, () => {
    glaze(d, -4, -11.6, 8, 2.8, 0.05, T.hi, 0.75);
    pen.crescent(g, pt(-0.8, -1.6), () => pen.fill(g, T.deep, 0.4));
    const rng = createRng(7751);
    for (let i = 0; i < 40; i++) pen.dot(-13 + rng() * 19, -14 + rng() * 10, 0.45, T.deep, 0.5);
  });
  pen.stroke(closed(g), 0.8, d.ink, 0.95, false);
  const ear = oval(7, -1.4, 2.7, 2.9, 20);
  pen.fill(ear, mix(T.back, '#8a6a58', 0.4), 0.95);
  pen.clipped(ear, () => pen.crescent(ear, pt(0.8, 1), () => pen.fill(ear, T.deep, 0.5)));
  pen.hair(closed(ear), 0.5, d.ink, 0.75);
}

function drawHead(d: Draw, pose: HeadPose): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(7761);
  pen.fill(HEAD, PAPER_FILL, 1);
  pen.clipped(HEAD, () => {
    const g = ctx.createLinearGradient(0, -20, 0, 16);
    g.addColorStop(0, T.backLit);
    g.addColorStop(0.2, T.back);
    g.addColorStop(0.58, T.back);
    g.addColorStop(0.7, T.belly);
    g.addColorStop(1, T.bellyCool);
    ctx.fillStyle = g;
    ctx.fillRect(-12, -24, 50, 44);
    // Under the mouth's line everything is throat: pale and freckled.
    pen.fill([...MOUTH, pt(-9, 10.5), pt(-9, 20), pt(34, 20), pt(34, 2)], T.belly, 0.95);
    glaze(d, 22, 9, 10, 6, -0.6, T.bellyCool, 0.6);
    glaze(d, 14, 14, 16, 4, -0.1, T.bellyDeep, 0.5);
    glaze(d, 2, 8, 8, 9, 0, T.bellyCool, 0.5);
    for (let i = 0; i < 80; i++) pen.dot(-4 + rng() * 32, 4 + rng() * 12, 0.28 + rng() * 0.5, T.freckle, 0.4);
    // Dark bars from the eye to the lip, warts, light on the snout.
    for (const [x, w] of [[22.5, 2.4], [15, 2.8], [8.4, 2]] as const) pen.fill([pt(x - w / 2, -6), pt(x + w / 2, -6), pt(x + w * 0.3 - 1, 2.6), pt(x - w * 0.8 - 1, 2.9)], T.spot, 0.5);
    glaze(d, 25, -8, 6, 4, 0.6, T.hi, 0.5);
    glaze(d, 16, 1, 14, 1.6, 0.02, T.hi, 0.4);
    const warts = scatter(rng, HEAD, 26, 2.6, (p) => p.y < 0 && Math.hypot(p.x - EYE.x, p.y - EYE.y) > 8.4 && p.x < 27);
    for (const p of warts) bump(d, p, 0.6 + rng() * 0.6, rng() < 0.4 ? T.wart : mix(T.back, T.hi, 0.25), T.hi, T.deep, 0.28);
  });
  pen.fill(ellipseAt(NOSE - 3.2, -5.4, 0.9, 0.65, 0.6, 12), T.deep, 1);
  // The mouth: shut, a firm line with a lit lip under it.
  pen.hair(MOUTH.map((p) => pt(p.x - 0.1, p.y + 1)), 1, PAPER_FILL, 0.7);
  pen.stroke(MOUTH, 1.15, d.ink, 1, false);
  drawEye(d, pose === 'alarm');
  pen.stroke(HEAD.slice(5), 1.2, d.ink, 1);
  // Its back melts into the body behind.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(-8, 0, 1.5, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(-14, -30, 15.5, 60);
  ctx.restore();
  glandAndEar(d);
}

/** Its head, the origin at its root, along +x; the mouth always shut. */
export const TOAD_HEAD: SpriteArt<HeadPose> = { frame: 76, res: 9, poses: ['calm', 'alarm'], draw: drawHead };
