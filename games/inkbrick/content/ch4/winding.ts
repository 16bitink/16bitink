/**
 * Level 37, "The Pool Shortcut". Signature: Maze with a whirlpool shortcut. The cave's three stone
 * floors with gaps left, right, left, as in the harbour maze, but a whirlpool in the bottom-left
 * water by the right wall drops the stone into the middle lane, skipping the first floor. x3
 * shells sit right over the first gap and the pool's exit; driftwood keeps straight shots off both.
 * Pieces: whirlpool pair, soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const FLOORS = [
  stone(0, 36, 5, 1), stone(8, 36, 28, 1), // left gap x5-7
  stone(0, 28, 28, 1), stone(31, 28, 5, 1), // right gap x28-30
  stone(0, 20, 5, 1), stone(8, 20, 28, 1), // left gap
];
const BANDS = [
  ...swapKind(fill(0, 30, 36, 2, 'soft', { bw: 3 }), [[12, 30], [24, 31]], 'x3'),
  ...swapKind(fill(0, 32, 36, 1, 'soft', { bw: 1 }), [3, 5, 7, 9].map((x) => [x, 32] as const), 'x3'), // x3 over the first gap
  ...swapKind(fill(0, 22, 36, 3, 'soft', { bw: 3 }), [[6, 22], [21, 24]], 'x3'),
  ...swapKind(fill(0, 25, 36, 1, 'soft', { bw: 1 }), [16, 20].map((x) => [x, 25] as const), 'x3'), // x3 over the pool's exit
];
const TOP = swapKind(fill(0, 4, 36, 13, 'soft', { bw: 3 }), [[9, 6], [21, 6], [15, 10], [27, 10]], 'x3');
const TEASERS = [...fill(15, 41, 21, 1, 'soft', { bw: 3 }), ...fill(21, 44, 9, 1, 'tough', { bw: 3, hp: 2 }), ...fill(15, 38, 21, 1, 'tough', { bw: 3, hp: 2 })];
// Driftwood: a block a few rows under the first gap (straight shots), one across the launch shot at it,
// and the same pair for the whirlpool by the right wall.
const DRIFTWOOD = [
  ...fill(4, 44, 6, 1, 'tough', { hp: 3 }), ...fill(11, 47, 3, 1, 'tough', { hp: 3 }),
  ...fill(30, 50, 6, 1, 'tough', { hp: 3 }), ...fill(28, 49, 3, 1, 'tough', { hp: 3 }),
];

export const POOL_SHORTCUT: LevelDef = {
  id: 'ch4-37-maze',
  name: 'The Pool Shortcut',
  number: 37,
  chapter: 4,
  layout: 'maze',
  par: 105,
  tip: 'Dive into the whirlpool to skip the first floor.',
  whirlpools: [{ a: { x: 34, y: 45 }, b: { x: 18, y: 26 } }],
  bricks: [...FLOORS, ...BANDS, ...TOP, ...TEASERS, ...DRIFTWOOD],
};
