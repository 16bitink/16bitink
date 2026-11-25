import { createRng } from '../../../src/logic/rng';
import { ellipseAt } from '../../../src/art/critters/preyKit';
import { closed, cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { headBottom, headTop, NECK_END } from './shape';
import { PER_ART } from './turtleShell';

/**
 * The river turtle's head and neck, legs and tail from the side, +x towards
 * the nose: dark slate skin with the bright yellow stripes of the game's
 * turtle, a blunt horny beak (always shut), a calm dark eye, stout scaly
 * legs with webbed, clawed feet, a tiny pointed tail. Each part's origin is
 * its root, so it can stretch its neck, plod, paddle and waggle.
 */
export const NECK_A = 285;

const SKIN = {
  base: '#4a5563', deep: '#1f242d', light: '#8794a2', mid: '#38414d', stripe: '#f6cc38', stripeDeep: '#b98418', claw: '#e2d6b0', horn: '#b39a68', hornDeep: '#6e5a38',
} as const;

const at = (a: number, h: number): Pt => pt((NECK_A - a) / PER_ART, -h / PER_ART);

/** Small scales as flecks: lit above, dark below. */
function scales(d: Draw, shape: readonly Pt[], n: number, seed: number, box: readonly [number, number, number, number], r = 0.62): void {
  const { pen } = d;
  const rng = createRng(seed);
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const p = pt(box[0] + rng() * (box[2] - box[0]), box[1] + rng() * (box[3] - box[1]));
      const s = r * (0.7 + rng() * 0.6);
      pen.hair([pt(p.x - s, p.y + 0.1), pt(p.x - s * 0.4, p.y + s * 0.6), pt(p.x + s * 0.5, p.y + s * 0.55), pt(p.x + s, p.y)], 0.28, SKIN.deep, 0.6);
      if (i % 2 === 0) pen.hair([pt(p.x - s * 0.5, p.y - 0.3), pt(p.x + s * 0.5, p.y - 0.35)], 0.3, SKIN.light, 0.45);
    }
  });
}

function stripe(d: Draw, spine: readonly Pt[], w: (u: number) => number): void {
  const { pen } = d;
  const wide = ribbon(spine, (u) => w(u) + 0.8).shape;
  const line = ribbon(spine, w);
  pen.fill(wide, SKIN.deep, 0.8);
  pen.fill(line.shape, SKIN.stripe, 1);
  pen.clipped(line.shape, () => {
    pen.hair(line.bot, w(0.5) * 0.5, SKIN.stripeDeep, 0.6);
    pen.hair(line.top, w(0.5) * 0.3, PAPER_FILL, 0.6);
  });
}

function eye(d: Draw, alarm: boolean): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = at(66, 27);
  const r = alarm ? 3.9 : 3.4;
  const ball = ellipseAt(c.x, c.y, r * 1.06, r * (alarm ? 1.02 : 0.9), 0, 26);
  pen.fill(ellipseAt(c.x, c.y, r * 1.5, r * 1.36, 0, 24), SKIN.deep, 0.9);
  pen.fill(ellipseAt(c.x, c.y, r * 1.34, r * 1.2, 0, 24), SKIN.stripe, 0.95);
  pen.fill(ball, '#120c08', 1);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x + 0.6, c.y + 0.8, r * 0.3, c.x, c.y, r * 1.1);
    g.addColorStop(0, '#1a100a');
    g.addColorStop(0.55, '#3d2412');
    g.addColorStop(0.85, '#8a5a26');
    g.addColorStop(1, '#20120a');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 5, c.y - 5, 10, 10);
    pen.fill(ellipseAt(c.x + 0.2, c.y, r * 0.56, r * 0.6, 0, 18), '#0b0705', 1);
    glaze(ctx, c.x + 0.8, c.y + r * 0.62, r * 0.7, r * 0.34, 0, '#c98d4a', 0.5);
    // The calm eye's upper lid.
    if (!alarm) pen.fill([pt(c.x - 6, c.y - 6), pt(c.x + 6, c.y - 6), pt(c.x + 6, c.y - r * 0.42), pt(c.x, c.y - r * 0.6), pt(c.x - 6, c.y - r * 0.3)], SKIN.base, 1);
  });
  pen.stroke(closed(ball), 0.8, d.ink, 1, false);
  if (!alarm) pen.stroke([pt(c.x - r, c.y - r * 0.3), pt(c.x, c.y - r * 0.6), pt(c.x + r, c.y - r * 0.4)], 0.9, d.ink, 1, false);
  pen.dot(c.x + r * 0.34, c.y - r * 0.3, r * 0.27, PAPER_FILL, 1);
  pen.dot(c.x - r * 0.4, c.y + r * 0.4, r * 0.12, PAPER_FILL, 0.7);
  if (alarm) pen.stroke(cub(pt(c.x - 4.6, c.y - 4.6), pt(c.x - 1.6, c.y - 6.8), pt(c.x + 2, c.y - 6.8), pt(c.x + 4.6, c.y - 5), 8), 0.8, d.ink, 0.9, false);
}

type HeadPose = 'calm' | 'alarm';

function drawHead(d: Draw, pose: HeadPose): void {
  const { pen } = d;
  const { ctx } = pen;
  const n = 44;
  const sample = (f: (a: number) => number, sign: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => at((NECK_END * i) / n, sign * f((NECK_END * i) / n)));
  const top = sample(headTop, 1);
  const bottom = sample(headBottom, -1);
  const shape = [...top, ...bottom.slice().reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -12, 0, 11);
    g.addColorStop(0, SKIN.mid);
    g.addColorStop(0.2, SKIN.base);
    g.addColorStop(0.55, SKIN.base);
    g.addColorStop(0.8, SKIN.light);
    g.addColorStop(1, SKIN.mid);
    ctx.fillStyle = g;
    ctx.fillRect(-4, -14, 54, 28);
    glaze(ctx, 31, -9.4, 9, 2.6, 0.06, SKIN.light, 0.75);
    glaze(ctx, 14, -7.4, 12, 1.8, 0, SKIN.light, 0.45);
    // Shade under the shell's lip, and behind the cheek.
    const lip = ctx.createLinearGradient(16, 0, 4, 0);
    lip.addColorStop(0, 'rgba(16,18,24,0)');
    lip.addColorStop(1, 'rgba(16,18,24,0.75)');
    ctx.fillStyle = lip;
    ctx.fillRect(-6, -14, 22, 28);
    glaze(ctx, 19.5, 2, 2.6, 9, 0, SKIN.deep, 0.5);
  });
  scales(d, shape, 190, 8301, [2, -12, 32, 11]);
  pen.clipped(shape, () => {
    // Folds of the neck.
    for (const x of [17, 12.4, 8]) pen.hair(cub(pt(x, -9), pt(x - 1.6, -3), pt(x - 1.6, 3), pt(x, 9.4), 10), 0.6, SKIN.deep, 0.7);
    stripe(d, cub(at(92, 52), at(150, 40), at(200, 36), at(NECK_END, 38), 18), (u) => 2.1 - 0.5 * u);
    stripe(d, cub(at(62, -8), at(100, -8), at(180, 4), at(NECK_END, 2), 22), (u) => 1.7 + 1.1 * Math.sin(Math.PI * u));
    stripe(d, cub(at(78, -40), at(130, -34), at(190, -34), at(NECK_END, -34), 16), (u) => 2.2 - 0.6 * u);
    // The horny beak, blunt and paler, a little hooked.
    const beak = [...cub(at(-6, 62), at(26, 52), at(30, 26), at(40, 4), 10), ...cub(at(40, 4), at(52, -16), at(44, -50), at(20, -72), 10), at(-6, -60)];
    pen.fill(beak, SKIN.horn, 0.9);
    glaze(ctx, 42.2, -4, 2.6, 5, 0, '#ecdcae', 0.8);
    glaze(ctx, 38.6, 6.6, 5, 2.6, 0.5, SKIN.hornDeep, 0.6);
    pen.hair([...cub(at(-6, 62), at(26, 52), at(30, 26), at(40, 4), 10), ...cub(at(40, 4), at(52, -16), at(44, -50), at(20, -72), 10)], 0.5, SKIN.deep, 0.6);
  });
  // The mouth, shut: from the beak's tip back under the eye, its corner just up.
  pen.stroke(cub(at(2, -14), at(28, -18), at(58, -28), at(96, -16), 14), 1.15, d.ink, 1, false);
  pen.hair(cub(at(6, -19), at(30, -24), at(58, -33), at(90, -23), 14), 0.4, SKIN.light, 0.6);
  pen.dot(at(9, 22).x, at(9, 22).y, 0.75, '#100c08', 1);
  pen.fill(ellipseAt(at(112, 26).x, at(112, 26).y, 2, 1.6, 0.2, 14), SKIN.stripe, 1);
  pen.hair(closed(ellipseAt(at(112, 26).x, at(112, 26).y, 2, 1.6, 0.2, 14)), 0.4, SKIN.deep, 0.9);
  eye(d, pose === 'alarm');
  pen.stroke(top, 1.5, d.ink, 1);
  pen.stroke(bottom, 1.4, d.ink, 1);
}

export const TURTLE_HEAD: SpriteArt<HeadPose> = { frame: 104, res: 7, poses: ['calm', 'alarm'], draw: drawHead };

/** The skin of a limb: dark slate rounded from the light, big scales in rows down its front, a yellow stripe. */
function limb(d: Draw, spine: readonly Pt[], w: (u: number) => number, seed: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = ribbon(spine, w);
  pen.fill(r.shape, PAPER_FILL, 1);
  pen.fill(r.shape, SKIN.base, 1);
  pen.clipped(r.shape, () => {
    const g = ctx.createLinearGradient(-8, 0, 9, 0);
    g.addColorStop(0, SKIN.light);
    g.addColorStop(0.35, SKIN.base);
    g.addColorStop(1, SKIN.deep);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = g;
    ctx.fillRect(-14, -10, 30, 40);
    ctx.globalAlpha = 1;
    // Shade under the shell.
    const s = ctx.createLinearGradient(0, -2, 0, 8);
    s.addColorStop(0, 'rgba(14,16,22,0.7)');
    s.addColorStop(1, 'rgba(14,16,22,0)');
    ctx.fillStyle = s;
    ctx.fillRect(-14, -10, 30, 18);
  });
  scales(d, r.shape, 90, seed, [-9, 0, 12, 20], 0.8);
  pen.clipped(r.shape, () => {
    for (let i = 7; i < spine.length - 1; i += 3) {
      const p = r.bot[i]!;
      const q = oval(p.x + 0.4, p.y, 1.7, 1.25, 12);
      pen.fill(q, SKIN.light, 0.6);
      pen.hair(closed(q), 0.35, SKIN.deep, 0.8);
    }
    stripe(d, spine.slice(6).map((p) => pt(p.x - 1.2, p.y)), (u) => 1.7 - 0.6 * u);
  });
  pen.stroke([...r.top.slice().reverse(), ...r.bot], 1.3, d.ink, 1);
}

/** A broad webbed foot forward from the ankle at `c`: the toes spread, the web between them, a claw on each. */
function foot(d: Draw, c: Pt, lens: readonly number[], drop: number): void {
  const { pen } = d;
  const tips = lens.map((l, i) => pt(c.x + l, c.y + drop + 0.5 - (lens.length - 1 - i) * 1.35));
  const web = [pt(c.x - 3.6, c.y - 1.2), pt(c.x + 2.6, c.y - 2.6), ...tips.flatMap((t, i) => (i === 0 ? [t] : [pt((t.x + tips[i - 1]!.x) / 2 - 1.1, (t.y + tips[i - 1]!.y) / 2 + 0.1), t])), pt(c.x + 2, c.y + drop + 1), pt(c.x - 3, c.y + drop + 0.8), pt(c.x - 4.6, c.y + drop * 0.5)];
  for (const t of tips) {
    const claw = [pt(t.x - 0.8, t.y - 0.8), pt(t.x + 3, t.y + 0.7), pt(t.x - 0.6, t.y + 0.7)];
    pen.fill(claw, SKIN.claw, 1);
    pen.stroke(closed(claw), 0.5, d.ink, 0.95, false);
  }
  pen.fill(web, PAPER_FILL, 1);
  pen.fill(web, SKIN.base, 1);
  pen.clipped(web, () => {
    glaze(pen.ctx, c.x + 3, c.y - 0.6, 6, 2, 0.2, SKIN.light, 0.7);
    glaze(pen.ctx, c.x, c.y + drop, 8, 2, 0, SKIN.deep, 0.8);
    for (const t of tips) {
      pen.hair([pt(c.x + 1.4, c.y + 0.2), t], 1.5, SKIN.light, 0.5);
      pen.hair([pt(c.x + 1.2, c.y + 1.1), pt(t.x, t.y + 0.7)], 0.45, SKIN.deep, 0.85);
    }
  });
  scales(d, web, 24, 8390 + Math.round(c.x * 3), [c.x - 4, c.y - 2, c.x + 6, c.y + 4], 0.6);
  pen.stroke(closed(web), 1.1, d.ink, 1, false);
}

/** In the shade of the shell: the far side's legs. */
function shaded(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(14,16,26,0.42)';
  ctx.fillRect(-40, -40, 80, 80);
  ctx.restore();
}

/** A limb's round root, at the top of its spine. */
const ROUND = 0.3;
const rounded = (u: number): number => (u >= ROUND ? 1 : Math.sqrt(Math.max(0.02, 1 - ((ROUND - u) / ROUND) ** 2)));

type LegPose = 'fore' | 'hind' | 'foreFar' | 'hindFar';

function drawLeg(d: Draw, pose: LegPose): void {
  if (pose === 'fore' || pose === 'foreFar') {
    limb(d, cub(pt(-1.5, -6), pt(0.5, 2), pt(2.4, 8), pt(1.8, 15.5), 22), (u) => (15 - 4.6 * u) * rounded(u), 8371);
    foot(d, pt(2, 15.4), [7.4, 8.8, 9.2, 8.2], 4);
  } else {
    limb(d, cub(pt(1.5, -6), pt(3, 3), pt(-0.5, 8), pt(-1, 15.5), 22), (u) => (17.5 - 6.6 * u) * rounded(u), 8381);
    foot(d, pt(-0.8, 15.4), [6.8, 8.4, 8.8, 7.6], 4);
  }
  if (pose === 'foreFar' || pose === 'hindFar') shaded(d.pen.ctx);
}

export const TURTLE_LEG: SpriteArt<LegPose> = { frame: 60, res: 7, poses: ['fore', 'hind', 'foreFar', 'hindFar'], draw: drawLeg };

/** The tiny pointed tail along −x. */
function drawTail(d: Draw): void {
  const { pen } = d;
  const spine = cub(pt(5, -1), pt(-3, 0), pt(-9, 2), pt(-15.5, 0.6), 14);
  const r = ribbon(spine, (u) => 8.4 * (1 - u) ** 0.8 + 0.3);
  pen.fill(r.shape, PAPER_FILL, 1);
  pen.fill(r.shape, SKIN.base, 1);
  pen.clipped(r.shape, () => {
    glaze(pen.ctx, -4, 3, 10, 2, 0.1, SKIN.deep, 0.8);
    glaze(pen.ctx, -5, -1.6, 9, 1.1, 0.1, SKIN.light, 0.8);
  });
  scales(d, r.shape, 40, 8391, [-14, -4, 6, 5], 0.6);
  pen.clipped(r.shape, () => stripe(d, spine.slice(2, -2), (u) => 1.6 - 1.1 * u));
  pen.stroke(closed(r.shape), 1.2, d.ink, 1, false);
}

export const TURTLE_TAIL: SpriteArt<'tail'> = { frame: 44, res: 7, poses: ['tail'], draw: drawTail };

/** A drop of river water flying along +x. */
function drawDrop(d: Draw): void {
  const { pen } = d;
  const shape = [...cub(pt(-8, 0), pt(-3, -1.4), pt(0.4, -3.2), pt(2.4, -2.6), 8), ...cub(pt(2.4, -2.6), pt(4.6, -1.6), pt(4.6, 1.6), pt(2.4, 2.6), 8), ...cub(pt(2.4, 2.6), pt(0.4, 3.2), pt(-3, 1.4), pt(-8, 0), 8)];
  pen.fill(shape, '#e9f3f2', 0.95);
  pen.clipped(shape, () => {
    glaze(pen.ctx, 1, 1.6, 4, 1.6, 0, '#7fa8b4', 0.8);
    pen.dot(2, -0.9, 0.7, '#ffffff', 1);
  });
  pen.stroke(closed(shape), 0.7, d.ink, 0.9, false);
}

export const WATER_DROP: SpriteArt<'drop'> = { frame: 24, res: 8, poses: ['drop'], draw: drawDrop };
