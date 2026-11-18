/**
 * Level 35, "The Hidden Vault". Signature: Vault reached through a whirlpool. A cave room whose
 * only floor hole is a tiny 2-wide slot at the right, screened by driftwood; the easy way in is the
 * whirlpool low by the left wall, whose twin sits in the room's empty right-hand chimney, lined
 * with x3 shells. Stones falling back into the twin come out low and fast. Tough cave walls (with
 * a keg each) either side. Pieces: whirlpool pair, soft, tough, x3, keg.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(9, 12, 19, 18, [{ side: 'bottom', at: 15, width: 2 }]);
const INSIDE = [
  ...fill(10, 16, 9, 13, 'soft'), ...fill(19, 16, 2, 13, 'soft', { bw: 1 }),
  ...swapKind(fill(21, 16, 1, 13, 'soft', { bw: 1 }), [16, 18, 20, 22, 24, 26, 28].map((y) => [21, y] as const), 'x3'), // x3 lining the chimney
];
// Driftwood across the free launch shots: one at the slot, one under the whirlpool.
const DRIFTWOOD = [
  ...fill(20, 44, 3, 1, 'tough', { hp: 3 }), ...fill(23, 40, 3, 1, 'tough', { hp: 3 }), // the launch shot and the straight shot at the slot
  ...fill(9, 50, 3, 1, 'tough', { hp: 3 }), // the launch shot at the whirlpool
];
// Cave walls either side of the vault, so the stones that spill out have work; kegs stop the last-brick hunt.
const SIDES = [...swapKind([...fill(0, 13, 6, 18, 'tough', { hp: 2 }), ...fill(30, 13, 6, 18, 'tough', { hp: 2 })], [[3, 13], [30, 13]], 'keg', { hp: 1 }), ...fill(0, 7, 36, 2, 'soft', { tint: 3 })];
const TEASERS = [
  ...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }),
  ...fill(30, 33, 6, 1, 'tough', { hp: 2 }), ...fill(0, 40, 6, 1, 'tough', { hp: 2 }), ...fill(9, 31, 12, 1, 'tough', { hp: 2 }),
];

export const HIDDEN_VAULT: LevelDef = {
  id: 'ch4-35-poolvault',
  name: 'The Hidden Vault',
  number: 35,
  chapter: 4,
  layout: 'vault',
  par: 100,
  tip: 'The slot is tiny. The whirlpool at the left drops you inside.',
  whirlpools: [{ a: { x: 4, y: 43 }, b: { x: 24, y: 20 } }],
  bricks: [...SHELL, ...INSIDE, ...TEASERS, ...DRIFTWOOD, ...SIDES],
};
