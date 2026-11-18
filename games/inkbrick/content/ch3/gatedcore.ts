/**
 * Level 28, "The Gated Shell Core". Signature: Multiplier core behind a gate. A stone core packed
 * with x3 shells has a gate on its floor hole and an open door in its roof; the key hangs out in
 * the corner. Break the key, break in, and the stones multiply and pour out the top into the
 * field. Pieces: key, gate, x3, kegs, soft, tough.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const CORE = shell(11, 24, 14, 10, [
  { side: 'bottom', at: 5, width: 4 },
  { side: 'top', at: 5, width: 4 },
]);
const GATE: BrickDef = { x: 17, y: 33, w: 3, h: 1, kind: 'gate', link: 'shellkey' };
const KEY: BrickDef = { x: 1, y: 36, w: 3, h: 1, kind: 'key', link: 'shellkey' };
const CORE_FILL = fill(12, 27, 12, 4, 'x3', { bw: 1, skip: (x, y) => (x + y) % 2 === 1 });
const FIELD = swapKind([
  ...fill(0, 4, 36, 4, 'tough', { hp: 2, tint: 2 }), ...fill(0, 8, 36, 8, 'soft', { tint: 2 }),
], [[0, 5], [33, 5], [0, 13], [33, 13]], 'keg');
const TEASERS = [
  ...fill(0, 37, 9, 1, 'tough', { hp: 2 }),
  ...fill(27, 37, 9, 1, 'soft'), ...fill(0, 41, 9, 1, 'soft'), ...fill(27, 41, 9, 1, 'soft'),
];

export const GATED_CORE: LevelDef = {
  id: 'ch3-28-core', name: 'The Gated Shell Core', number: 28, chapter: 3, layout: 'core', par: 80,
  tip: 'The core is locked: its key is down in the left corner.',
  bricks: [...CORE, GATE, KEY, ...CORE_FILL, ...FIELD, ...TEASERS],
};
