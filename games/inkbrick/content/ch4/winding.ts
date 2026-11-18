/**
 * Level 37, "The Pool Shortcut". Signature: Maze with a whirlpool shortcut. The cave's three stone
 * floors with gaps left, right, left, as in the harbour maze, but a whirlpool in the bottom-left
 * water drops the stone into the middle lane, skipping the first floor. Pieces: whirlpool pair,
 * soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const FLOORS = [
  stone(0, 36, 5, 1), stone(8, 36, 28, 1), // left gap x5-7
  stone(0, 28, 28, 1), stone(31, 28, 5, 1), // right gap x28-30
  stone(0, 20, 5, 1), stone(8, 20, 28, 1), // left gap
];
const BANDS = [
  ...swapKind(fill(0, 30, 36, 3, 'soft', { bw: 3 }), [[12, 30], [24, 31]], 'x3'),
  ...swapKind(fill(0, 22, 36, 4, 'soft', { bw: 3 }), [[6, 22], [21, 24]], 'x3'),
];
const TOP = swapKind(fill(0, 4, 36, 13, 'soft', { bw: 3 }), [[9, 6], [21, 6], [15, 10], [27, 10]], 'x3');
const TEASERS = [...fill(0, 47, 15, 1, 'soft', { bw: 3 }), ...fill(24, 47, 12, 1, 'soft', { bw: 3 }), ...fill(15, 41, 21, 1, 'soft', { bw: 3 }), ...fill(21, 44, 12, 1, 'tough', { bw: 3, hp: 2 }), ...fill(15, 38, 21, 1, 'tough', { bw: 3, hp: 2 })];

export const POOL_SHORTCUT: LevelDef = {
  id: 'ch4-37-maze',
  name: 'The Pool Shortcut',
  number: 37,
  chapter: 4,
  layout: 'maze',
  par: 100,
  tip: 'Dive into the whirlpool to skip the first floor.',
  whirlpools: [{ a: { x: 4, y: 44 }, b: { x: 18, y: 26 } }],
  bricks: [...FLOORS, ...BANDS, ...TOP, ...TEASERS],
};
