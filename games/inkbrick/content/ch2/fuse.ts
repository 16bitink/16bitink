/**
 * Level 18, "The Three Stone Fuse". Signature: Fuse, new goal: Few Stones (3 stones, break 90%, no
 * hearts). A row of kegs along the foot of a block of ice behind a stone wall with a 3-wide gap: in
 * through the gap, the blasts chain along the line and set off the ice waves above, and three x3
 * shells over the fuse split the stone. Outside, a field of 3-hit driftwood low on the left is the
 * single-stone work that spends stones. Teaches: every launch counts; a stone trapped behind the
 * wall is a stone you can't lose. Pieces: keg, ice, soft, tough, x3.
 * Rebuilt 2026-11-18 (was the clear level "The Powder Ice"): its replay pins no longer apply.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 14, 23, 1), stone(26, 14, 10, 1)];
const FUSE = fill(0, 13, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 });
// Three x3 shells (columns 1, 13, 25) in the driftwood row just above the blasts' reach.
const SPLIT_ROW = [
  ...fill(0, 9, 36, 1, 'x3', { bw: 1, skip: (x) => x % 12 !== 1 }),
  ...fill(0, 9, 36, 1, 'tough', { bw: 1, hp: 2, skip: (x) => x % 12 === 1 }),
];
const BLOCK = swapKind([
  ...fill(0, 3, 36, 3, 'soft', { tint: 1 }), ...fill(0, 6, 36, 3, 'ice'), ...SPLIT_ROW,
  ...fill(0, 10, 36, 1, 'tough', { hp: 2 }), ...fill(0, 11, 36, 2, 'ice'),
], [[8, 4], [27, 4]], 'x3');
// Under the wall at the sides, where returns land; the lane under the gap stays open.
const HIGH = (x: number, w: number) => [...fill(x, 18, w, 2, 'soft'), ...fill(x, 21, w, 2, 'ice')];
/**
 * The long single-stone work: 3-hit driftwood low on the left only (rows 30-39), so the bank shots
 * off the right wall into the gap stay free (both sides low cut the aim window to 1.6%).
 */
const LOW = [
  ...fill(0, 30, 15, 2, 'tough', { hp: 3 }), ...fill(0, 32, 15, 2, 'ice'),
  ...fill(0, 34, 15, 6, 'tough', { hp: 3 }),
];

export const POWDER_ICE: LevelDef = {
  id: 'ch2-18-fuse',
  name: 'The Three Stone Fuse',
  number: 18,
  chapter: 2,
  layout: 'fuse',
  par: 105,
  goal: 'stones',
  stones: 3,
  need: 0.9,
  tip: 'Only three stones! Light the fuse and keep them up.',
  bricks: [...WALL, ...FUSE, ...BLOCK, ...HIGH(0, 15), ...HIGH(30, 6), ...LOW],
};
