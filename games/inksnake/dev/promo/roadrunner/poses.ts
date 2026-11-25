import { type LegPose } from './leg';
import { pt, type Pt } from './paint';

/**
 * The bird's gaits, in its own units from the hip: where each foot is
 * through a step, so a planted foot moves back exactly with the ground.
 */
export interface Gait {
  /** Share of a cycle the foot is planted, how far it carries back, the ground's depth under the hip, the swing's height. */
  readonly stance: number;
  readonly stride: number;
  readonly ground: number;
  readonly rise: number;
  /** Where the middle of the stride is, ahead of the hip. */
  readonly mid: number;
}

export const STRUT: Gait = { stance: 0.58, stride: 420, ground: 800, rise: 250, mid: 60 };
export const RUN: Gait = { stance: 0.36, stride: 620, ground: 690, rise: 300, mid: 70 };

export function footAt(g: Gait, phase: number): LegPose {
  const p = ((phase % 1) + 1) % 1;
  if (p < g.stance) return { foot: pt(g.mid + g.stride * (0.5 - p / g.stance), g.ground), lift: 0 };
  const u = (p - g.stance) / (1 - g.stance);
  const e = u * u * (3 - 2 * u);
  const up = Math.sin(Math.PI * Math.min(1, u * 1.02)) ** 0.8;
  return { foot: pt(g.mid + g.stride * (e - 0.5), g.ground - g.rise * up), lift: Math.sin(Math.PI * u) ** 0.7 };
}

/** The ground's speed (units a second) that a gait keeps up with. */
export const speedOf = (g: Gait, cycleS: number): number => g.stride / (g.stance * cycleS);

export const STAND: { readonly near: LegPose; readonly far: LegPose } = { near: { foot: pt(190, 800), lift: 0 }, far: { foot: pt(-110, 782), lift: 0 } };

/** The free snake, coiled in an S on the sand with its neck raised back and its tail up: knots from its head, px, about its middle. */
export const COILED: readonly Pt[] = [
  pt(-72, -236), pt(-8, -258), pt(62, -226), pt(72, -160), pt(8, -116), pt(-92, -86), pt(-150, -30), pt(-90, 22), pt(40, 10), pt(150, -18), pt(236, 6), pt(262, 64), pt(160, 92), pt(20, 88), pt(-60, 100), pt(0, 138), pt(150, 142), pt(290, 118), pt(336, 40), pt(318, -60), pt(340, -140),
];
