/**
 * Level 31, "The Swirling Pool". Signature: Vault, new piece: whirlpools. A cave room with a small
 * floor hole at its left, and a whirlpool low in the open water at the right whose twin sits
 * halfway up the room's chimney: a stone that dives into the pool going up pops out inside, still
 * going up, and rattles along the top of the sandcastle. Teaches: whirlpools carry the stone, same
 * speed and direction. Pieces: whirlpool pair, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(8, 12, 19, 18, [{ side: 'bottom', at: 2, width: 3 }]);
const INSIDE = swapKind(fill(14, 16, 12, 13, 'soft'), [[17, 16], [23, 16]], 'x3');
const TEASERS = [
  ...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }),
  ...fill(0, 33, 6, 1, 'tough', { hp: 2 }),
];

export const SWIRLING_POOL: LevelDef = {
  id: 'ch4-31-whirlpool',
  name: 'The Swirling Pool',
  number: 31,
  chapter: 4,
  layout: 'vault',
  par: 95,
  tip: 'Send the stone up into the whirlpool and it pops up inside the room.',
  whirlpools: [{ a: { x: 32, y: 44 }, b: { x: 11, y: 21 } }],
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
