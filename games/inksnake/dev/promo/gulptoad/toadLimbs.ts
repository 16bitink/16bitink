import { capsule, closed, cub, type Draw, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { bump, scatter } from '../../../src/art/chapters/barrensCrittersKit';
import { glaze } from '../../../src/art/critters/preyKit';
import type { SpriteArt } from '../../../src/art/types';
import { mix } from '../../../src/art/wash';
import { TOAD_GREY } from './toadArt';

/**
 * The toad's legs, in segments so they fold, paddle, kick and stretch: the
 * short stout arm with its four fingers, and the hind leg's thigh, shank and
 * long foot with five splayed toes, webbed at their roots. Each lies along
 * +x from the joint at its origin; art units as toadArt.ts.
 */
const T = TOAD_GREY;

/** Each segment's length, joint to joint. */
export const LIMB = { thigh: 16.5, shank: 16, foot: 19, arm: 12.5, forearm: 10 } as const;

/** Skin over a limb's shape: slate on its upper side paling to the belly's white under it, banded, warty, inked. */
function limbSkin(d: Draw, shape: readonly Pt[], len: number, half: number, seed: number, bands: readonly number[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(seed);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -half, 0, half);
    g.addColorStop(0, T.backLit);
    g.addColorStop(0.3, T.back);
    g.addColorStop(0.72, mix(T.back, T.deep, 0.2));
    g.addColorStop(1, T.bellyCool);
    ctx.fillStyle = g;
    ctx.fillRect(-half - 4, -half - 4, len + half * 2 + 8, half * 2 + 8);
    for (const x of bands) pen.fill([pt(x - 1.5, -half - 1), pt(x + 1.3, -half - 1), pt(x + 1.9, half * 0.45), pt(x - 0.9, half * 0.5)], T.spot, 0.62);
    glaze(d, len * 0.4, -half * 0.5, len * 0.45, half * 0.35, 0, T.hi, 0.5);
    pen.crescent(shape, pt(-0.8, -1.8), () => pen.fill(shape, T.deep, 0.32));
    for (const p of scatter(rng, shape, 9, 2.4, (q) => q.y < half * 0.3)) bump(d, p, 0.5 + rng() * 0.45, mix(T.back, T.hi, 0.2), T.hi, T.deep, 0.26);
  });
  pen.stroke(closed(shape), 0.95, d.ink, 1);
}

/** Toes fanned from `base` round +x, each jointed and blunt, the webbing between their roots. */
function toes(d: Draw, base: Pt, list: readonly (readonly [number, number])[], w: number): void {
  const { pen } = d;
  const tipOf = ([a, l]: readonly [number, number]): Pt => pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l);
  for (let i = 0; i + 1 < list.length; i++) {
    const [p, q] = [tipOf([list[i]![0], list[i]![1] * 0.62]), tipOf([list[i + 1]![0], list[i + 1]![1] * 0.62])];
    const web = [base, p, pt((p.x + q.x) / 2 * 0.86 + base.x * 0.14, (p.y + q.y) / 2 * 0.86 + base.y * 0.14), q];
    pen.fill(web, mix(T.bellyCool, T.back, 0.35), 1);
    pen.hair(closed(web), 0.4, d.ink, 0.7);
  }
  for (const toe of list) {
    const tip = tipOf(toe);
    const mid = pt(base.x + Math.cos(toe[0]) * toe[1] * 0.55, base.y + Math.sin(toe[0]) * toe[1] * 0.55 - 0.5);
    const s = ribbon([base, mid, tip], (u) => w * (1 - 0.32 * u)).shape;
    const end = capsule(pt(tip.x - Math.cos(toe[0]) * 0.8, tip.y - Math.sin(toe[0]) * 0.8), tip, w * 0.8, w * 0.72);
    for (const part of [end, s]) pen.stroke(closed(part), 0.9, d.ink, 1, false);
    for (const part of [end, s]) pen.fill(part, T.back, 1);
    pen.hair([base, mid, tip], w * 0.3, T.hi, 0.45);
    for (const k of [0.45, 0.72]) pen.dot(base.x + (tip.x - base.x) * k, base.y + (tip.y - base.y) * k + w * 0.18, w * 0.2, T.deep, 0.5);
    pen.dot(tip.x, tip.y, w * 0.28, T.wartDark, 0.9);
  }
}

function drawThigh(d: Draw): void {
  const L = LIMB.thigh;
  const shape = [
    ...cub(pt(-5.5, 0), pt(-6, -8.4), pt(4, -9.2), pt(L - 2, -5), 12),
    ...cub(pt(L - 2, -5), pt(L + 4, -3.4), pt(L + 4, 4), pt(L - 1, 5), 8).slice(1),
    ...cub(pt(L - 1, 5), pt(6, 8.8), pt(-5, 8.2), pt(-5.5, 0), 12).slice(1, -1),
  ];
  limbSkin(d, shape, L, 8, 7811, [4, 11]);
}

function drawShank(d: Draw): void {
  const L = LIMB.shank;
  const shape = [
    ...cub(pt(-4.4, 0), pt(-4.6, -5.4), pt(2, -5.6), pt(L - 1, -3.2), 10),
    ...cub(pt(L - 1, -3.2), pt(L + 3, -2.4), pt(L + 3, 2.6), pt(L - 1, 3.2), 6).slice(1),
    ...cub(pt(L - 1, 3.2), pt(4, 5.4), pt(-4.4, 5), pt(-4.4, 0), 10).slice(1, -1),
  ];
  limbSkin(d, shape, L, 5, 7821, [3.5, 10]);
}

function drawFoot(d: Draw): void {
  toes(d, pt(8, 0.4), [[-0.62, 8.5], [-0.3, 12], [0.02, 14.5], [0.34, 11.5], [0.68, 8]], 2.5);
  const shape = [
    ...cub(pt(-3, 0), pt(-3, -3.6), pt(3, -3.4), pt(9.4, -2.6), 8),
    ...cub(pt(9.4, -2.6), pt(11, -1), pt(11, 2), pt(9.4, 3), 5).slice(1),
    ...cub(pt(9.4, 3), pt(3, 3.6), pt(-3, 3.6), pt(-3, 0), 8).slice(1, -1),
  ];
  limbSkin(d, shape, 9, 3.4, 7831, [4]);
}

/** The arm: upper arm out along +x, the hand at its end, fingers spread. */
function drawArm(d: Draw): void {
  const L = LIMB.arm;
  toes(d, pt(L + LIMB.forearm - 1, 0), [[-0.85, 5.6], [-0.3, 7.4], [0.25, 7.2], [0.8, 5.4]], 2.3);
  const fore = [
    ...cub(pt(L - 5, 0), pt(L - 5, -4.4), pt(L + 2, -4.4), pt(L + LIMB.forearm - 1, -2.6), 8),
    ...cub(pt(L + LIMB.forearm - 1, -2.6), pt(L + LIMB.forearm + 1.6, -1.6), pt(L + LIMB.forearm + 1.6, 1.8), pt(L + LIMB.forearm - 1, 2.8), 5).slice(1),
    ...cub(pt(L + LIMB.forearm - 1, 2.8), pt(L + 2, 4.4), pt(L - 5, 4.4), pt(L - 5, 0), 8).slice(1, -1),
  ];
  limbSkin(d, fore, L + LIMB.forearm, 4, 7841, [L + 2.5, L + 7]);
  const upper = [
    ...cub(pt(-4.6, 0), pt(-4.8, -5.4), pt(4, -5.6), pt(L - 1, -4), 9),
    ...cub(pt(L - 1, -4), pt(L + 3, -2.8), pt(L + 3, 3), pt(L - 1, 4), 6).slice(1),
    ...cub(pt(L - 1, 4), pt(4, 5.6), pt(-4.8, 5.2), pt(-4.6, 0), 9).slice(1, -1),
  ];
  limbSkin(d, upper, L, 5, 7851, [5]);
}

export type LimbPart = 'thigh' | 'shank' | 'foot' | 'arm';
const DRAW: Readonly<Record<LimbPart, (d: Draw) => void>> = { thigh: drawThigh, shank: drawShank, foot: drawFoot, arm: drawArm };
export const TOAD_LIMB: SpriteArt<LimbPart> = { frame: 66, res: 9, poses: ['thigh', 'shank', 'foot', 'arm'], draw: (d, pose) => DRAW[pose](d) };
