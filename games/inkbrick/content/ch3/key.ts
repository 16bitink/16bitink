/**
 * Level 21, "The Harbour Master's Key". Signature: Vault, new piece: key + gate. The vault's floor
 * hole is shut with a gate; the key brick hangs in the channel beside the vault. Break the key and
 * the gate opens, then in through the hole and up the chimney (as Level 1). Teaches: keys open
 * their gates. Pieces: key, gate, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const SHELL = shell(8, 12, 19, 18, [{ side: 'bottom', at: 2, width: 3 }]);
const GATE: BrickDef = { x: 10, y: 29, w: 3, h: 1, kind: 'gate', link: 'harbour' };
const KEY: BrickDef = { x: 1, y: 30, w: 3, h: 1, kind: 'key', link: 'harbour' };
const INSIDE = swapKind(fill(14, 16, 12, 13, 'soft'), [[17, 16], [23, 16], [20, 22]], 'x3');
const TEASERS = [
  ...fill(0, 4, 36, 3, 'soft', { tint: 3 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }),
  ...fill(30, 33, 6, 1, 'tough', { hp: 2 }),
];

export const HARBOUR_KEY: LevelDef = {
  id: 'ch3-21-key',
  name: "The Harbour Master's Key",
  number: 21,
  chapter: 3,
  layout: 'vault',
  par: 140,
  tip: 'Break the key to open the gate under the vault.',
  bricks: [...SHELL, GATE, KEY, ...INSIDE, ...TEASERS],
};
