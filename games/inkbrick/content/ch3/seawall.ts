/**
 * Level 25, WIP crabs.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, CrabDef, LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 14, 28, 1), stone(32, 14, 4, 1)];
/** Both sides of the chimney over the tunnel, 1 x 1: an x3 shell every third row, sandcastle between. */
const LINING: BrickDef[] = [26, 32].flatMap((x) => fill(x, 4, 1, 10, 'soft', { bw: 1 }).map((b) => ((b.y - 1) % 3 === 0 && b.y >= 7 ? { ...b, kind: 'x3' as const } : b)));
const BEHIND = swapKind([
  ...fill(0, 4, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 6, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 8, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 10, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 12, 26, 2, 'soft', { bw: 2 }),
  ...fill(33, 4, 3, 10, 'soft', { bw: 1 }),
], [[12, 12]], 'x3');
const FRONT = [
  ...fill(0, 18, 24, 1, 'tough', { hp: 2 }), ...fill(4, 22, 15, 2, 'ice'), ...fill(0, 27, 24, 1, 'soft'),
  ...fill(6, 31, 18, 1, 'tough', { hp: 2 }), ...fill(0, 35, 15, 1, 'tough', { hp: 2 }),
];
/** A crab walks the quay's face, under the wall, back and forth across the tunnel's mouth. */
const CRABS: CrabDef[] = [{ y: 15, x0: 24, x1: 33, speed: 2, phase: 0 }, { y: 44, x0: 16, x1: 33, speed: 5, phase: 0.5 }];

export const LONG_QUAY: LevelDef = {
  id: 'ch3-25-quay', name: 'The Crab Quay', number: 25, chapter: 3, layout: 'wall', par: 95,
  tip: 'A crab guards the tunnel. Shoot when it walks away.',
  crabs: CRABS,
  bricks: [...WALL, ...LINING, ...BEHIND, ...FRONT],
};
