/**
 * Level 1, "The Sandcastle Vault". Signature: Vault. A stone room with one hole in its floor, at
 * the left. Above the hole an empty chimney runs up to a gap under the roof: any shot up through
 * the hole, even a straight one, reaches the roof, slides off sideways and rattles along the top of
 * the sandcastle, breaking it from above. Teaches: get the stone in and let it work.
 * Pieces: soft, tough, and two x3 shells on top of the sandcastle as a first taste.
 */
import { fill, shell, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const SHELL = shell(8, 12, 19, 18, [{ side: 'bottom', at: 1, width: 3 }]);
const INSIDE = swapKind(fill(14, 16, 12, 13, 'soft'), [[17, 16], [23, 16]], 'x3');
const TEASERS = [...fill(0, 4, 36, 2, 'soft', { tint: 1 }), ...fill(0, 36, 6, 1, 'tough', { hp: 2 }), ...fill(30, 36, 6, 1, 'tough', { hp: 2 })];

export const VAULT: LevelDef = {
  id: 'ch1-01-vault',
  name: 'The Sandcastle Vault',
  number: 1,
  chapter: 1,
  layout: 'vault',
  par: 90,
  tip: 'Send the stone up through the hole and let it rattle.',
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
