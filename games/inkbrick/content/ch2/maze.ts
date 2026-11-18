/**
 * Level 19, "The Ice Maze". Signature: Maze (lite). Three stone walls make a serpentine: in through a
 * 3-wide gap at the left, along a corridor to a gap at the right, back along the next corridor, up into
 * the top chamber. Ice and sandcastle hang from each ceiling, so each corridor is cleared as the stone
 * winds through. A floe drifts along the first corridor. Pieces: ice floe, ice, soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALLS = [
  stone(0, 36, 6, 1), stone(9, 36, 27, 1),
  stone(0, 28, 27, 1), stone(30, 28, 6, 1),
  stone(0, 20, 6, 1), stone(9, 20, 27, 1),
];
const HANGING = [
  ...fill(0, 29, 26, 1, 'ice'), ...fill(30, 29, 6, 1, 'ice'), ...fill(0, 30, 26, 1, 'soft'), ...fill(30, 30, 6, 1, 'soft'),
  ...fill(0, 21, 5, 1, 'ice'), ...fill(10, 21, 26, 1, 'ice'), ...fill(0, 22, 5, 1, 'soft'), ...fill(10, 22, 26, 1, 'soft'),
];
const TOP = swapKind([
  ...fill(0, 4, 36, 3, 'ice', { bw: 2 }), ...fill(0, 7, 36, 2, 'soft', { bw: 2 }), ...fill(0, 9, 36, 4, 'ice', { bw: 2 }),
], [[8, 8], [26, 8]], 'x3');
const FLOE = fill(8, 34, 4, 1, 'ice', { floe: 'gate' });
const TEASERS = [...fill(14, 39, 9, 2, 'soft'), ...fill(27, 39, 9, 2, 'tough', { hp: 2 })];

export const ICE_MAZE: LevelDef = {
  id: 'ch2-19-maze',
  name: 'The Ice Maze',
  number: 19,
  chapter: 2,
  layout: 'maze',
  par: 105,
  tip: 'Follow the corridors. The floe drifts in the first one.',
  floes: [{ id: 'gate', dx: 14, dy: 0, period: 6 }],
  bricks: [...WALLS, ...HANGING, ...TOP, ...FLOE, ...TEASERS],
};
