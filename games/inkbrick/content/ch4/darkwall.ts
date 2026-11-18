/**
 * Level 39, "The Dark Wall". Signature: Over the wall, in the dark. A full-width stone wall with a
 * wide tunnel near the left edge and a chimney of open water above it; only the area round the
 * stone is lit. Driftwood in the lane keeps straight shots off the tunnel; once the stone climbs
 * the chimney, x3 shells and a keg on its side multiply it. Pieces: dark, soft, tough, x3, keg.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALL_ROW = 12;
const TUNNEL_X = 4;
const TUNNEL_W = 4;
const BEHIND_X = TUNNEL_X + TUNNEL_W + 1;

const WALL = [stone(0, WALL_ROW, TUNNEL_X, 1), stone(TUNNEL_X + TUNNEL_W, WALL_ROW, 36 - TUNNEL_X - TUNNEL_W, 1)];
const BEHIND = [
  ...fill(0, 4, 3, 2, 'tough', { hp: 2, bw: 1 }), ...fill(0, 6, 3, 6, 'soft', { bw: 1 }),
  // the chimney's right side: x3 shells and a keg, the first things a stone over the wall hits
  ...swapKind(fill(BEHIND_X, 4, 1, 8, 'soft', { bw: 1 }), [5, 7, 9, 11].map((y) => [BEHIND_X, y] as const), 'x3'),
  ...swapKind(fill(BEHIND_X + 1, 4, 2, 8, 'soft', { bw: 1 }), [[BEHIND_X + 1, 8]], 'keg'),
  ...swapKind([...fill(BEHIND_X + 3, 4, 24, 2, 'soft'), ...fill(BEHIND_X + 3, 6, 24, 5, 'soft')], [[BEHIND_X + 9, 9], [BEHIND_X + 18, 6]], 'x3'),
  ...fill(BEHIND_X + 3, 11, 24, 1, 'tough', { hp: 2 }),
];
const FRONT = [
  ...fill(12, 14, 24, 2, 'soft', { tint: 3 }), ...fill(21, 19, 15, 2, 'tough', { hp: 2 }),
  ...fill(15, 17, 21, 1, 'tough', { hp: 2 }), ...fill(12, 22, 15, 1, 'soft'),
  ...fill(18, 27, 18, 1, 'soft'), ...fill(24, 32, 12, 2, 'tough', { hp: 2 }), ...fill(12, 36, 24, 2, 'tough', { hp: 2 }), ...fill(12, 41, 24, 1, 'soft'), ...fill(14, 45, 22, 1, 'soft'),
];

// Driftwood: a block in the lane under the tunnel, so straight shots don't find it.
const DRIFTWOOD = fill(3, 30, 6, 1, 'tough', { hp: 3 });

export const DARK_WALL: LevelDef = {
  id: 'ch4-39-darkwall',
  name: 'The Dark Wall',
  number: 39,
  chapter: 4,
  layout: 'wall',
  par: 80,
  tip: 'The tunnel is by the left edge. Feel your way up.',
  dark: true,
  bricks: [...WALL, ...BEHIND, ...FRONT, ...DRIFTWOOD],
};
