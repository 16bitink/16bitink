/**
 * Level 49, "The Whirlpool Keep". Signature: Nested vault with whirlpools. A stone hall with a
 * door on the right holds a second room whose door faces the middle. A whirlpool in the open
 * water at the lower left pops the stone out in the cavity under the inner door, going up: a
 * shortcut for the second break-in. Pieces: whirlpool, soft, tough, x3.
 * Lab (30 runs): 7/11 PASS · MISS break-in novice 7.5s, break-in skilled 0.7s, cascade 8s 4.3%, novice clears 86.7%
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const OUTER = shell(5, 8, 26, 26, [{ side: 'bottom', at: 21, width: 2 }]); // door x26-27
const INNER = shell(9, 12, 16, 12, [{ side: 'bottom', at: 12, width: 3 }]); // door x21-23
const INSIDE = swapKind([
  ...fill(10, 15, 10, 8, 'soft', { bw: 2 }), ...fill(10, 13, 14, 2, 'soft', { bw: 1, skip: (x) => x > 19 }),
], [[10, 15], [12, 15], [14, 15], [16, 15], [18, 15], [14, 19]], 'x3');
const CAVITY = fill(7, 31, 15, 2, 'soft');
const TEASERS = [
  ...fill(0, 4, 36, 3, 'soft', { tint: 5, bw: 6, bh: 3 }), ...fill(0, 8, 5, 24, 'soft', { bw: 5, bh: 6 }), ...fill(31, 8, 5, 24, 'soft', { bw: 5, bh: 6 }),
  ...fill(0, 36, 5, 1, 'tough', { hp: 2 }), ...fill(31, 36, 5, 1, 'tough', { hp: 2 }), ...fill(16, 40, 9, 1, 'tough', { hp: 2 }), ...fill(6, 44, 10, 1, 'soft'), ...fill(29, 40, 7, 1, 'tough', { hp: 2 }),
];

export const WHIRLPOOL_KEEP: LevelDef = {
  id: 'ch5-49-whirlkeep',
  name: 'The Whirlpool Keep',
  number: 49,
  chapter: 5,
  layout: 'nested',
  par: 120,
  tip: 'The whirlpool by the left edge carries the stone under the inner door.',
  whirlpools: [{ a: { x: 2, y: 44 }, b: { x: 22, y: 28 } }],
  bricks: [...OUTER, ...INNER, ...INSIDE, ...CAVITY, ...TEASERS],
};
