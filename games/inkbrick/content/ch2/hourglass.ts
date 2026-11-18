/**
 * Level 16, "The Frozen Strait". Signature: Hourglass. Two stone shelves leave a 3-wide neck at the right;
 * the top half is a block of ice, soft and driftwood bands, the bottom half the floe-strewn water.
 * Break through the neck and the top half empties in waves. Pieces: ice, soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const NECK_ROW = 24;
const NECK_X = 24;
const NECK_W = 3;
const SHELF = [stone(0, NECK_ROW, NECK_X, 1), stone(NECK_X + NECK_W, NECK_ROW, 36 - NECK_X - NECK_W, 1)];
const TOP = swapKind([
  ...fill(0, 4, 36, 5, 'ice'), ...fill(0, 9, 36, 2, 'soft'), ...fill(0, 11, 36, 3, 'tough', { hp: 2 }), ...fill(0, 14, 36, 6, 'ice'),
], [[6, 9], [18, 9], [30, 9]], 'x3');
const BOTTOM = [
  ...fill(0, 29, 7, 2, 'soft'), ...fill(29, 29, 7, 2, 'soft'), ...fill(0, 33, 7, 2, 'ice'), ...fill(29, 33, 7, 2, 'ice'),
  ...fill(0, 37, 7, 1, 'tough', { hp: 2 }), ...fill(29, 37, 7, 1, 'tough', { hp: 2 }),
];

export const FROZEN_STRAIT: LevelDef = {
  id: 'ch2-16-strait',
  name: 'The Frozen Strait',
  number: 16,
  chapter: 2,
  layout: 'hourglass',
  par: 120,
  tip: 'Through the narrow neck and the whole top half falls.',
  bricks: [...SHELF, ...TOP, ...BOTTOM],
};
