/**
 * Level 15, "The Frozen Wall". Signature: Over the wall. A full-width stone wall with a 3-wide tunnel
 * near the left edge and an empty chimney above it; the stone runs under the roof along the backs of
 * the bricks. Behind the wall bands of ice and sandcastle; in front, sliding floes.
 * Pieces: ice, ice floe, soft, tough, x3, +3 pickup.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALL_ROW = 20;
const TUNNEL_X = 5;
const TUNNEL_W = 3;
const BX = TUNNEL_X + TUNNEL_W + 1;

const WALL = [stone(0, WALL_ROW, TUNNEL_X, 1), stone(TUNNEL_X + TUNNEL_W, WALL_ROW, 36 - TUNNEL_X - TUNNEL_W, 1)];
const BEHIND = swapKind([
  ...fill(0, 7, 4, 13, 'soft', { bw: 1 }),
  ...fill(BX, 7, 27, 3, 'ice'), ...fill(BX, 10, 27, 2, 'soft'), ...fill(BX, 12, 27, 3, 'ice'),
  ...fill(BX, 15, 27, 2, 'tough', { hp: 2 }), ...fill(BX, 17, 27, 3, 'ice'),
], [[15, 16], [26, 14], [30, 11]], 'x3');
const FRONT = [
  ...swapKind(fill(10, 25, 26, 2, 'soft'), [[20, 25]], 'pickup', { drop: 'plus3' }),
  ...fill(14, 30, 6, 2, 'tough', { hp: 2 }), ...fill(30, 30, 6, 2, 'tough', { hp: 2 }),
  ...fill(8, 34, 8, 2, 'ice', { floe: 'a' }), ...fill(20, 38, 8, 2, 'ice', { floe: 'b' }),
];

export const FROZEN_WALL: LevelDef = {
  id: 'ch2-15-wall',
  name: 'The Frozen Wall',
  number: 15,
  chapter: 2,
  layout: 'wall',
  par: 110,
  tip: 'Up the tunnel, then let the stone run behind the wall.',
  floes: [{ id: 'a', dx: 12, dy: 0, period: 8 }, { id: 'b', dx: -12, dy: 0, period: 8 }],
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
