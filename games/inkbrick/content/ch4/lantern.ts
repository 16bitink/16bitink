/**
 * Level 36, "The Lantern Cave". Signature: Picture, a big lantern of bricks (iron frame, glass,
 * an x3 flame and x3 embers at its base) hanging over a stone quay with a 2-wide gap, driftwood
 * across the launch shot at it. A whirlpool between two shelves by the left wall also lifts the
 * stone to just over the quay. Pieces: whirlpool pair, soft, tough, x3.
 */
import { fill, minus, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const FRAME = [
  ...fill(14, 7, 8, 1, 'tough', { hp: 2 }), ...fill(14, 8, 2, 3, 'tough', { hp: 2 }), ...fill(20, 8, 2, 3, 'tough', { hp: 2 }),
  ...fill(10, 11, 16, 2, 'tough', { hp: 2 }), ...fill(8, 13, 20, 2, 'tough', { hp: 2 }),
  ...fill(8, 29, 20, 2, 'tough', { hp: 2 }),
  // the lantern's glowing base: x3 embers right over the quay's gap
  ...swapKind(fill(12, 31, 12, 1, 'soft', { bw: 1 }), [15, 20].map((x) => [x, 31] as const), 'x3'),
];
const FLAME = fill(14, 18, 8, 8, 'x3', { bw: 1, skip: (x, y) => (x + y) % 2 === 1 });
const GLASS = minus(fill(9, 15, 18, 14, 'soft', { bw: 2, tint: 2 }), FLAME);
const WINGS = [...fill(0, 16, 6, 14, 'soft', { tint: 3, bw: 1 }), ...fill(30, 16, 6, 14, 'soft', { tint: 3, bw: 1 })];
const QUAY = [stone(0, 36, 15, 1), stone(17, 36, 19, 1)]; // gap x15-16
// Driftwood across the launch shot at the quay's gap; the whirlpool hides between two shelves by the left wall.
const DRIFTWOOD = fill(14, 45, 6, 1, 'tough', { hp: 3 });
const TEASERS = [
  ...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 40, 10, 1, 'soft'), ...fill(26, 40, 10, 1, 'tough', { hp: 2 }),
  ...fill(0, 43, 8, 1, 'tough', { hp: 2 }), ...fill(28, 44, 8, 1, 'soft'),
];

export const LANTERN_CAVE: LevelDef = {
  id: 'ch4-36-lantern',
  name: 'The Lantern Cave',
  number: 36,
  chapter: 4,
  layout: 'picture',
  par: 110,
  whirlpools: [{ a: { x: 3, y: 41 }, b: { x: 22, y: 33 } }],
  bricks: [...FRAME, ...GLASS, ...FLAME, ...WINGS, ...QUAY, ...TEASERS, ...DRIFTWOOD],
};
