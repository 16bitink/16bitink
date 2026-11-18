/**
 * Level 18, "The Powder Ice". Signature: Fuse. A row of kegs along the foot of a block of ice: break
 * the first keg and the blasts chain along the line, and each blast sets off an ice wave above it.
 * A stone wall with a 2-wide gap guards the kegs. Pieces: keg, ice, soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 14, 23, 1), stone(26, 14, 10, 1)];
const FUSE = fill(0, 13, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 });
const BLOCK = swapKind([
  ...fill(0, 3, 36, 3, 'soft', { tint: 1 }), ...fill(0, 6, 36, 3, 'ice'), ...fill(0, 9, 36, 2, 'tough', { hp: 2 }), ...fill(0, 11, 36, 2, 'ice'),
], [[8, 4], [27, 4]], 'x3');
const TEASERS = [
  ...fill(0, 20, 8, 2, 'soft'), ...fill(28, 20, 8, 2, 'soft'), ...fill(0, 24, 8, 2, 'ice'), ...fill(28, 24, 8, 2, 'ice'),
  ...fill(0, 29, 8, 1, 'tough', { hp: 2 }), ...fill(28, 29, 8, 1, 'tough', { hp: 2 }),
];

export const POWDER_ICE: LevelDef = {
  id: 'ch2-18-fuse',
  name: 'The Powder Ice',
  number: 18,
  chapter: 2,
  layout: 'fuse',
  par: 105,
  goal: 'stones',
  stones: 4,
  need: 0.6,
  tip: 'Light the first keg and the blasts run down the line.',
  bricks: [...WALL, ...FUSE, ...BLOCK],
};
