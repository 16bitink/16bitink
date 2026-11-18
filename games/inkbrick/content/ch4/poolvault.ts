/**
 * Level 35, "The Hidden Vault". Signature: Vault reached through a whirlpool. A cave room whose
 * only floor hole is a tiny 2-wide slot at the right; the easy way in is the whirlpool at the left
 * of the open water, whose twin sits high in the room's empty right-hand chimney. Pieces:
 * whirlpool pair, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(9, 12, 19, 18, [{ side: 'bottom', at: 15, width: 2 }]);
const INSIDE = swapKind(fill(10, 16, 12, 13, 'soft'), [[13, 16], [19, 22]], 'x3');
const TEASERS = [
  ...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }),
  ...fill(30, 33, 6, 1, 'tough', { hp: 2 }), ...fill(0, 41, 7, 1, 'soft'),
];

export const HIDDEN_VAULT: LevelDef = {
  id: 'ch4-35-poolvault',
  name: 'The Hidden Vault',
  number: 35,
  chapter: 4,
  layout: 'vault',
  par: 90,
  tip: 'The slot is tiny. The whirlpool at the left drops you inside.',
  whirlpools: [{ a: { x: 4, y: 45 }, b: { x: 24, y: 20 } }],
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
