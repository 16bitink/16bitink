/**
 * Level 39, "The Dark Wall". Signature: Over the wall, in the dark. A full-width stone wall with a
 * wide tunnel near the left edge and a chimney of open water above it; only the area round the
 * stone is lit. Once it climbs the chimney, x3 shells multiply it. Pieces: dark, soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALL_ROW = 12;
const TUNNEL_X = 4;
const TUNNEL_W = 4;
const BEHIND_X = TUNNEL_X + TUNNEL_W + 1;

const WALL = [stone(0, WALL_ROW, TUNNEL_X, 1), stone(TUNNEL_X + TUNNEL_W, WALL_ROW, 36 - TUNNEL_X - TUNNEL_W, 1)];
const BEHIND = swapKind([
  ...fill(0, 4, 3, 2, 'tough', { hp: 2, bw: 1 }), ...fill(0, 6, 3, 6, 'soft', { bw: 1 }),
  ...fill(BEHIND_X, 4, 27, 2, 'soft'), ...fill(BEHIND_X, 6, 27, 5, 'soft'), ...fill(BEHIND_X + 1, 11, 26, 1, 'tough', { hp: 2 }),
], [[9, 10], [27, 6]], 'x3');
const FRONT = [
  ...fill(15, 17, 21, 1, 'tough', { hp: 2 }), ...fill(12, 22, 15, 1, 'soft'),
  ...fill(18, 27, 18, 1, 'soft'), ...fill(24, 32, 12, 2, 'tough', { hp: 2 }), ...fill(12, 36, 24, 2, 'tough', { hp: 2 }), ...fill(12, 41, 24, 1, 'soft'), ...fill(14, 45, 22, 1, 'soft'),
];

export const DARK_WALL: LevelDef = {
  id: 'ch4-39-darkwall',
  name: 'The Dark Wall',
  number: 39,
  chapter: 4,
  layout: 'wall',
  par: 105,
  tip: 'The tunnel is by the left edge. Feel your way up.',
  dark: true,
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
