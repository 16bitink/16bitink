/**
 * Level 35, "The Hidden Vault". Signature: Vault reached through a whirlpool. A cave room whose
 * only floor hole is a tiny 2-wide slot at the right; the easy way in is the whirlpool at the left
 * of the open water, whose twin sits high in the room's empty right-hand chimney. Pieces:
 * whirlpool pair, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(9, 12, 19, 18, [{ side: 'bottom', at: 15, width: 2 }]);
const INSIDE = [
  ...swapKind(fill(10, 16, 9, 13, 'soft'), [[13, 16]], 'x3'),
  ...fill(19, 16, 2, 13, 'soft', { bw: 1 }),
  ...swapKind(fill(21, 16, 1, 13, 'soft', { bw: 1 }), [16, 19, 22, 25, 28].map((y) => [21, y] as const), 'x3'),
];
// Driftwood across the free launch shots: one at the slot, one under the whirlpool.
const DRIFTWOOD = [
  ...fill(20, 44, 9, 1, 'tough', { hp: 3 }), ...fill(22, 40, 6, 1, 'tough', { hp: 3 }), // the launch shot and the straight shot at the slot
  ...fill(3, 47, 3, 1, 'tough', { hp: 3 }), ...fill(7, 50, 6, 1, 'tough', { hp: 3 }), // under the whirlpool, and the launch shot at it
];
// Cave walls either side of the vault, so the stones that spill out have work.
const SIDES = [...fill(0, 13, 6, 16, 'soft', { tint: 3 }), ...fill(30, 13, 6, 16, 'soft', { tint: 3 }), ...fill(0, 7, 36, 1, 'tough', { hp: 2 })];
const TEASERS = [
  ...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }),
  ...fill(30, 33, 6, 1, 'tough', { hp: 2 }), ...fill(0, 41, 7, 1, 'soft'), ...fill(9, 31, 12, 1, 'tough', { hp: 2 }),
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
  bricks: [...SHELL, ...INSIDE, ...TEASERS, ...DRIFTWOOD, ...SIDES],
};
