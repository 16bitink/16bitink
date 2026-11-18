/**
 * Level 41, "Two Doors". Signature: Nested vault. A big stone hall holds a second stone room: in
 * at the hall's floor door on the left, cross the dark cavity under the inner room, then up
 * through the inner room's own door on the right to reach the sandcastle and the x3 shells. Two
 * break-ins. Teaches: a vault can hide a vault. Pieces: soft, tough, x3.
 * Lab (30 runs): 8/11 PASS · MISS break-in novice 18.7s, break-in skilled 0.8s, cascade 8s 5.7%
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const OUTER = shell(5, 8, 26, 26, [{ side: 'bottom', at: 2, width: 4 }]); // door x7-10
const INNER = shell(11, 12, 16, 12, [{ side: 'bottom', at: 1, width: 4 }]); // door x12-15
const INSIDE = swapKind([
  ...fill(17, 15, 9, 8, 'soft', { bw: 1 }), ...fill(12, 13, 14, 2, 'soft', { bw: 1, skip: (x) => x < 17 }),
], [[17, 15], [19, 15], [21, 15], [23, 15], [25, 15], [20, 19]], 'x3');
const CAVITY = fill(14, 30, 15, 3, 'soft');
const TEASERS = [
  ...fill(0, 4, 36, 3, 'soft', { tint: 5, bw: 6, bh: 3 }), ...fill(0, 8, 5, 24, 'soft', { bw: 5, bh: 6 }), ...fill(31, 8, 5, 24, 'soft', { bw: 5, bh: 6 }),
  ...fill(0, 36, 5, 1, 'tough', { hp: 2 }), ...fill(31, 36, 5, 1, 'tough', { hp: 2 }), ...fill(18, 40, 12, 1, 'tough', { hp: 2 }),
  ...fill(0, 40, 5, 1, 'soft'), ...fill(31, 40, 5, 1, 'soft'),
];

export const TWO_DOORS: LevelDef = {
  id: 'ch5-41-doors',
  name: 'Two Doors',
  number: 41,
  chapter: 5,
  layout: 'nested',
  par: 130,
  tip: 'In at the hall door on the left, then up through the inner door on the right.',
  bricks: [...OUTER, ...INNER, ...INSIDE, ...CAVITY, ...TEASERS],
};
