/**
 * Level 48, "The Brine Glass". Signature: Hourglass. Two stone shelves leave a narrow 2-wide neck;
 * the top half is bands of ice, sandcastle, driftwood and x3 shells, the bottom half the harbour
 * floor. Through the neck and the whole top half empties in waves. Pieces: ice, soft, tough, x3.
 * Lab (30 runs): 9/11 PASS · MISS break-in skilled 5.1s, novice clears 86.7%
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const NECK_ROW = 26;
const NECK_X = 22;
const NECK_W = 2;
const SHELF = [stone(0, NECK_ROW, NECK_X, 1), stone(NECK_X + NECK_W, NECK_ROW, 36 - NECK_X - NECK_W, 1)];
const TOP = swapKind([
  ...fill(0, 4, 36, 4, 'ice'), ...fill(0, 8, 36, 3, 'tough', { hp: 2 }), ...fill(0, 11, 36, 3, 'tough', { hp: 2 }),
  ...fill(0, 14, 36, 4, 'ice'), ...fill(0, 18, 36, 3, 'tough', { hp: 2 }), ...fill(0, 21, 36, 5, 'ice'),
], [[6, 9], [18, 9], [30, 9], [12, 19], [24, 19]], 'x3');
const BOTTOM = [
  ...fill(0, 30, 16, 2, 'soft'), ...fill(30, 30, 6, 2, 'soft'), ...fill(0, 34, 12, 2, 'ice'), ...fill(30, 34, 6, 2, 'ice'),
  ...fill(0, 38, 12, 1, 'tough', { hp: 2 }), ...fill(30, 38, 6, 1, 'tough', { hp: 2 }), ...fill(0, 42, 9, 1, 'soft'), 
];

export const BRINE_GLASS: LevelDef = {
  id: 'ch5-48-glass',
  name: 'The Brine Glass',
  number: 48,
  chapter: 5,
  layout: 'hourglass',
  par: 105,
  tip: 'The neck is only two cells wide. Thread it.',
  bricks: [...SHELF, ...TOP, ...BOTTOM],
};
