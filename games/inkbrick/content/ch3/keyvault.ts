/**
 * Level 24, "The Locked Cove". Signature: Vault with the key outside. The vault's floor hole is
 * gated; the key brick sits among the teasers down in the left corner. Break the key and the gate
 * opens, then in through the right-hand hole and up the chimney. Pieces: key, gate, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const SHELL = shell(7, 12, 22, 18, [{ side: 'bottom', at: 16, width: 3 }]);
const GATE: BrickDef = { x: 23, y: 29, w: 3, h: 1, kind: 'gate', link: 'cove' };
const KEY: BrickDef = { x: 2, y: 35, w: 3, h: 1, kind: 'key', link: 'cove' };
const INSIDE = swapKind(fill(8, 16, 14, 13, 'soft'), [[11, 16], [17, 16], [14, 21]], 'x3');
const TEASERS = [
  ...fill(0, 4, 36, 3, 'soft', { tint: 3 }), ...fill(0, 8, 6, 2, 'soft'), ...fill(30, 8, 6, 2, 'soft'),
  ...fill(0, 37, 9, 1, 'tough', { hp: 2 }), ...fill(27, 34, 9, 1, 'tough', { hp: 2 }),
  ...fill(0, 39, 15, 1, 'soft'), ...fill(30, 39, 6, 1, 'soft'), ...fill(0, 42, 15, 1, 'tough', { hp: 2 }),
];

export const LOCKED_COVE: LevelDef = {
  id: 'ch3-24-vault', name: 'The Locked Cove', number: 24, chapter: 3, layout: 'vault', par: 150,
  tip: 'The key is out in the open. Find it.',
  bricks: [...SHELL, GATE, KEY, ...INSIDE, ...TEASERS],
};
