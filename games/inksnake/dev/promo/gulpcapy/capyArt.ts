import { createRng } from '../../../src/logic/rng';
import { paintFur, type Pelt } from '../../../src/art/chapters/barrensCrittersBeast';
import { ellipseAt } from '../../../src/art/critters/preyKit';
import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { CAPY_LEN, capyBottom, capyTop } from './story';

/**
 * The capybara from the side, facing +x: the game's top-down capybara
 * (chapters/floodedCrittersCapybara*.ts) walked round to the camera, warmer
 * and redder: a long barrel with no tail, a big blunt box of a head with a
 * deep square muzzle, small round ears and small glossy eyes set high, the
 * bald dark gland on his nose, a coarse sparse reddish-brown coat darker
 * down the back, short legs with webbed toes and blunt nails. His mouth
 * stays shut. The body follows story.ts's outline, so the lump in the snake
 * is his shape.
 *
 * Art units; PER_ART world units to one. Each part is its own sprite with its
 * origin at its joint, so he can drink, paddle and kick.
 */
export const PER_ART = 6.6;

export const FUR = {
  base: '#a5663a', deep: '#5a3119', light: '#d49a62', dark: '#3e2414', warm: '#bf7c45', pale: '#dcb183',
  belly: '#c9925e', muzzle: '#6e4228', nose: '#2a1a12', gland: '#3a2418', foot: '#4a3226', nail: '#22160f', earIn: '#9a6450',
} as const;

const hair = (_p: Pt, r: number): string => (r < 0.2 ? FUR.dark : r < 0.36 ? FUR.deep : r < 0.76 ? FUR.base : r < 0.92 ? FUR.warm : FUR.pale);
const PELT: Pelt = { base: FUR.base, deep: FUR.deep, light: FUR.light, hair };
const LEG_PELT: Pelt = { base: '#8a522e', deep: FUR.dark, light: FUR.base, hair: (_p, r) => (r < 0.45 ? FUR.dark : r < 0.85 ? FUR.deep : FUR.base) };

const BODY_A = 470;
const NECK_A = 215;
/** An axis place `a` (world units from the nose) as an art x about a joint at `from`. */
const artX = (a: number, from: number): number => (from - a) / PER_ART;

/** Joints, along the axis (world units) and off it (art units, down). */
export const JOINTS = {
  body: { a: BODY_A, y: 0 },
  neck: { a: NECK_A, y: 0 },
  foreNear: { a: 335, y: 17 },
  foreFar: { a: 300, y: 16 },
  hindNear: { a: 625, y: 13 },
  hindFar: { a: 590, y: 12 },
} as const;

/** The vertical wash of a part: dark along the back, warm on the flank, sandy underneath. */
function coatWash(ctx: CanvasRenderingContext2D, y0: number, y1: number, x0: number, w: number): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, FUR.deep);
  g.addColorStop(0.3, FUR.base);
  g.addColorStop(0.65, FUR.warm);
  g.addColorStop(1, FUR.belly);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, y1 - y0);
}

/** The outline along story.ts's curves, from behind the head to the rump. */
function bodyShape(): Pt[] {
  const [from, to, n] = [200, CAPY_LEN - 4, 50];
  const at = (i: number): number => from + ((to - from) * i) / n;
  const round = (a: number): number => Math.min(1, Math.max(0, (a - from + 8) / 80)) ** 0.5;
  const top = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(i), BODY_A), (-capyTop(at(i)) * round(at(i))) / PER_ART));
  const bottom = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(n - i), BODY_A), (capyBottom(at(n - i)) * round(at(n - i))) / PER_ART));
  return [...top, ...bottom];
}

function drawBody(d: Draw): void {
  const { ctx } = d.pen;
  const shape = bodyShape();
  paintFur(d, PELT, {
    shape, n: 900, len: 3.2, seed: 7301, tuft: 1.8, line: 1.2,
    dir: (p) => Math.PI - 0.12 + Math.max(-0.5, Math.min(0.9, p.y / 30)),
    wet: () => {
      coatWash(ctx, -28, 26, -60, 110);
      // The round haunch, the shoulder, sun along the back, the belly in shade.
      glaze(ctx, -24, 2, 16, 14, 0, FUR.deep, 0.35);
      glaze(ctx, -20, -6, 9, 7, 0, FUR.light, 0.3);
      glaze(ctx, 18, -2, 12, 13, 0, FUR.deep, 0.22);
      glaze(ctx, 4, -24, 34, 3.2, 0, FUR.light, 0.45);
      glaze(ctx, -4, 24, 40, 4, 0, '#3a2414', 0.4);
    },
  });
  // The round haunch's front edge, down to the knee.
  const arc = Array.from({ length: 16 }, (_, i) => {
    const th = -1.5 + (i / 15) * 2.6;
    return pt(-25 + Math.cos(th) * 14, 4 + Math.sin(th) * 15);
  });
  d.pen.hair(arc, 0.7, d.ink, 0.45);
  d.pen.hair(arc.map((p) => pt(p.x - 1.2, p.y)), 1.6, FUR.light, 0.25);
}

/** His body: the barrel, the haunch rounding the rump. */
export const CAPY_BODY: SpriteArt<'body'> = { frame: 124, res: 7, poses: ['body'], draw: drawBody };

/** The head's outline round the neck joint: story.ts's curves from the jowl to the blunt muzzle. */
function headShape(): Pt[] {
  const n = 30;
  const back = 262;
  const at = (i: number): number => back + ((5 - back) * i) / n;
  const top = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(i), NECK_A), -capyTop(at(i)) / PER_ART));
  const bottom = Array.from({ length: n + 1 }, (_, i) => pt(artX(at(n - i), NECK_A), capyBottom(at(n - i)) / PER_ART));
  const nose = top[top.length - 1]!;
  const chin = bottom[0]!;
  const front = cub(nose, pt(nose.x + 1.4, nose.y + 3), pt(chin.x + 1.6, chin.y - 4), chin, 8).slice(1, -1);
  const jowl = cub(bottom[bottom.length - 1]!, pt(-10, 12), pt(-10, -12), top[0]!, 10).slice(1, -1);
  return [...top, ...front, ...bottom, ...jowl];
}

const EYE = pt(9.6, -10.4);
const EAR = pt(1.2, -16.4);

/** The small glossy eye, high on the head: half shut under a heavy lid (calm), or the lid flown up and the brow raised (alarm). */
function eye(d: Draw, alarm: boolean): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = alarm ? 2.5 : 2.1;
  const ball = ellipseAt(EYE.x, EYE.y, r * 1.12, r, 0, 22);
  pen.fill(ellipseAt(EYE.x, EYE.y + 0.3, r * 1.6, r * 1.4, 0, 22), FUR.deep, 0.45);
  pen.fill(ball, '#140c08', 1);
  pen.clipped(ball, () => {
    glaze(ctx, EYE.x + r * 0.35, EYE.y + r * 0.45, r * 0.8, r * 0.5, 0, '#7a4a2a', 0.6);
    if (!alarm) pen.fill([pt(EYE.x - 4, EYE.y - 4), pt(EYE.x + 4, EYE.y - 4), pt(EYE.x + 4, EYE.y + 0.1), pt(EYE.x - 4, EYE.y - 0.3)], '#7a4426', 1);
  });
  pen.dot(EYE.x + r * 0.35, EYE.y - r * (alarm ? 0.4 : -0.25), r * 0.26, PAPER_FILL, 1);
  pen.stroke(closed(ball), 0.7, d.ink, 0.9, false);
  const lid = alarm ? EYE.y - r * 1.1 : EYE.y - 0.1;
  pen.stroke([pt(EYE.x - r * 1.25, lid + 0.3), pt(EYE.x, lid - (alarm ? 0.5 : 0)), pt(EYE.x + r * 1.25, lid + 0.2)], alarm ? 0.9 : 1.1, d.ink, 1, false);
  // The brow: raised in alarm.
  if (alarm) pen.hair(cub(pt(EYE.x - 3.4, EYE.y - 3.6), pt(EYE.x - 1, EYE.y - 5.4), pt(EYE.x + 1.6, EYE.y - 5.4), pt(EYE.x + 3.6, EYE.y - 4), 8), 0.7, d.ink, 0.8);
}

function ear(d: Draw): void {
  const { pen } = d;
  const shape = ellipseAt(EAR.x, EAR.y, 2.8, 3.1, -0.3, 18);
  pen.fill(shape, FUR.deep, 1);
  pen.fill(ellipseAt(EAR.x + 0.6, EAR.y + 0.2, 1.5, 1.8, -0.3, 14), FUR.earIn, 0.85);
  pen.stroke(closed(shape), 0.8, d.ink, 1, false);
}

type HeadPose = 'calm' | 'alarm';

/** Neck and head, the origin at the neck's root, the muzzle along +x. His mouth stays shut. */
function drawHead(d: Draw, pose: HeadPose): void {
  const { pen } = d;
  const { ctx } = pen;
  const alarm = pose === 'alarm';
  ear(d);
  const shape = headShape();
  paintFur(d, PELT, {
    shape, n: 300, len: 2.2, seed: 7311, tuft: 1.2, line: 1.1,
    dir: (p) => Math.PI + 0.05 + Math.max(-0.4, Math.min(0.6, p.y / 18)),
    wet: () => {
      coatWash(ctx, -17, 15, -12, 50);
      // The deep square muzzle, a shade darker towards the front; the pale cheek.
      const g = ctx.createLinearGradient(18, 0, 34, 0);
      g.addColorStop(0, 'rgba(110,66,40,0)');
      g.addColorStop(1, 'rgba(90,50,28,0.6)');
      ctx.fillStyle = g;
      ctx.fillRect(16, -14, 20, 30);
      glaze(ctx, 4, 4, 8, 6, 0, FUR.pale, 0.4);
      glaze(ctx, 10, -12, 14, 2, 0, FUR.light, 0.4);
    },
  });
  // The bald dark gland (the morrillo) on the bridge of his nose.
  const gland = ellipseAt(22.4, -11.6, 3.4, 1.5, 0.08, 16);
  pen.fill(gland, FUR.gland, 0.92);
  pen.clipped(gland, () => glaze(ctx, 22, -12.4, 2.4, 0.6, 0, '#7a5a48', 0.6));
  pen.hair(closed(gland), 0.4, d.ink, 0.7);
  // The dark nose on the blunt front, a slit nostril on top.
  const nose = ellipseAt(30.8, -5, 2.8, 4, 0.2, 18);
  pen.fill(nose, FUR.nose, 1);
  pen.clipped(nose, () => glaze(ctx, 30, -7, 1.6, 1, 0, '#8a6a58', 0.7));
  pen.hair(closed(nose), 0.5, d.ink, 0.8);
  pen.stroke(cub(pt(29.4, -7.8), pt(30.8, -7.4), pt(31.8, -6.4), pt(32, -4.8), 6), 1.1, '#0c0604', 1, false);
  // The split upper lip and the small, flat, shut mouth.
  pen.stroke([pt(32.4, -2.4), pt(31.6, 1.6)], 0.6, d.ink, 0.75, false);
  pen.stroke(cub(pt(31.6, 2), pt(29.6, 3.4), pt(27, 3.6), pt(24.6, 3.2), 8), 0.7, d.ink, 0.8, false);
  for (let i = 0; i < 4; i++) pen.hair([pt(28, -2 + i * 1.6), pt(35 + i, -4 + i * 2.4)], 0.22, '#2a1a12', 0.6);
  eye(d, alarm);
  fadeRoot(ctx, -10, -3.5, 'x');
}

export const CAPY_HEAD: SpriteArt<HeadPose> = { frame: 84, res: 7, poses: ['calm', 'alarm'], draw: drawHead };

/** Erases a part's root from x (or y) `from` to `to`, so it dissolves into what it grows from. */
function fadeRoot(ctx: CanvasRenderingContext2D, from: number, to: number, axis: 'x' | 'y'): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = axis === 'x' ? ctx.createLinearGradient(from, 0, to, 0) : ctx.createLinearGradient(0, from, 0, to);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  if (axis === 'x') ctx.fillRect(from - 30, -40, to - from + 30, 80);
  else ctx.fillRect(-30, from - 30, 60, to - from + 30);
  ctx.restore();
}

/** Webbed toes along +x from `heel`, each with a blunt nail. */
function toes(d: Draw, heel: Pt, lens: readonly number[]): void {
  const { pen } = d;
  const tips = lens.map((l, i) => pt(heel.x + l * 1.3, heel.y + 1.6 + i * 0.3 - (lens.length - 1 - i) * 0.6));
  pen.fill([heel, ...tips, pt(heel.x - 1, heel.y + 2.2)], FUR.foot, 0.95);
  for (const tip of tips) {
    const toe = ribbon([pt(heel.x + 1, heel.y + 0.8), pt((heel.x + tip.x) / 2 + 0.4, tip.y - 0.4), tip], (u) => 2.3 - 0.8 * u).shape;
    pen.fill(toe, FUR.foot, 1);
    pen.stroke(closed(toe), 0.5, d.ink, 0.9, false);
    pen.fill(oval(tip.x + 0.6, tip.y + 0.1, 0.9, 0.6, 10), FUR.nail, 1);
  }
  // The web between the toes.
  pen.hair(tips.map((p) => pt(p.x - 2.2, p.y - 0.2)), 0.3, FUR.nail, 0.6);
}

function legFur(d: Draw, shape: Pt[], seed: number): void {
  paintFur(d, LEG_PELT, { shape, n: 120, len: 1.6, seed, tuft: 0.9, line: 0.9, dir: () => Math.PI / 2 + 0.3 });
}

/** The fore leg, hanging +y from the elbow: short and straight, four webbed toes forward. */
function drawFore(d: Draw): void {
  legFur(d, ribbon(cub(pt(0, -4), pt(0.6, 4), pt(0.6, 10), pt(1, 15.6), 12), (u) => 7 - 2.2 * u).shape, 7321);
  toes(d, pt(0.4, 15.4), [4.4, 5.6, 5.2, 4.2]);
  fadeRoot(d.pen.ctx, -3, 5, 'y');
}

/** The hind leg, hanging +y from the hip: the haunch, the hock bent back, the long flat foot with three webbed toes. */
function drawHind(d: Draw): void {
  const shank = ribbon(cub(pt(0.6, -3), pt(2.4, 5), pt(0.4, 12), pt(-2.6, 18.6), 14), (u) => 8 - 3.6 * u).shape;
  legFur(d, shank, 7331);
  const foot = ribbon([pt(-3.6, 18.6), pt(0, 19.4), pt(3, 19.4)], (u) => 2.6 - 0.6 * u).shape;
  d.pen.fill(foot, FUR.foot, 1);
  d.pen.stroke(closed(foot), 0.6, d.ink, 0.9, false);
  toes(d, pt(2.4, 18.6), [4.6, 5.8, 4.8]);
  fadeRoot(d.pen.ctx, -2, 6, 'y');
}

export const CAPY_LEG: SpriteArt<'fore' | 'hind'> = { frame: 56, res: 7, poses: ['fore', 'hind'], draw: (d, pose) => (pose === 'fore' ? drawFore(d) : drawHind(d)) };

/** A tuft of coarse hair puffed loose, along +x. */
function drawTuft(d: Draw): void {
  const rng = createRng(7341);
  for (let i = 0; i < 9; i++) {
    const a = -0.5 + rng();
    const l = 6 + rng() * 5;
    const p0 = pt(-4 + rng() * 2, -1 + rng() * 2);
    const tip = pt(p0.x + Math.cos(a) * l, p0.y + Math.sin(a) * l);
    d.pen.hair([p0, pt((p0.x + tip.x) / 2, (p0.y + tip.y) / 2 - 0.8), tip], 0.7, i % 3 === 0 ? FUR.dark : i % 3 === 1 ? FUR.base : FUR.warm, 0.95);
  }
}

export const CAPY_TUFT: SpriteArt<'tuft'> = { frame: 28, res: 8, poses: ['tuft'], draw: drawTuft };
