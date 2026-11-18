/**
 * Level 6, "The Tide Wall". Signature: Over the wall, mid-board and with the tunnel on the right.
 * A full-width wall low in the field; one tunnel near the right edge; above it an empty chimney to the
 * open water under the ceiling. Up the tunnel the stone climbs the chimney, comes off the roof at an
 * angle and rattles over the backs of the bricks. Pieces: soft, tough, x3 shells lining the chimney's left side; the
 * water right of the tunnel is kept open for bank shots off the wall.
 */
import { fill, minus, stone, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const WALL_ROW = 17;
const TUNNEL_X = 28;
const TUNNEL_W = 3;
const CHIM_X = TUNNEL_X - 1;
const CHIM_W = TUNNEL_W + 2;

const WALL = [stone(0, WALL_ROW, TUNNEL_X, 1), stone(TUNNEL_X + TUNNEL_W, WALL_ROW, 36 - TUNNEL_X - TUNNEL_W, 1)];
const BEHIND = swapKind(swapKind([
  ...fill(0, 6, CHIM_X - 1, 5, 'tough', { hp: 2 }), ...fill(0, 11, CHIM_X - 1, 5, 'soft'), ...fill(CHIM_X + CHIM_W + 1, 6, 36 - CHIM_X - CHIM_W - 1, 10, 'soft', { bw: 1 }),
], [[6, 8], [12, 10], [18, 8]], 'x3'), [[0, 6], [3, 6], [0, 14], [3, 14], [6, 14], [9, 14], [12, 14], [15, 14]], 'tough', { hp: 2 });
const LINING = [...fill(CHIM_X - 1, 6, 1, 10, 'x3', { bw: 1, skip: (x, y) => y % 3 !== 0 }), 
  ...fill(CHIM_X - 1, 6, 1, 10, 'tough', { bw: 1, hp: 2, skip: (x, y) => y % 3 === 0 }), ...fill(CHIM_X + CHIM_W, 6, 1, 10, 'tough', { bw: 1, hp: 2 })];
const FRONT = [...fill(0, 20, 22, 1, 'tough', { hp: 2 }), ...fill(2, 22, 20, 1, 'soft'),
  ...fill(2, 26, 18, 1, 'tough', { hp: 2 }), ...fill(2, 28, 20, 1, 'soft'),
  ...fill(0, 31, 9, 1, 'tough', { hp: 2 }), ...fill(2, 34, 18, 1, 'soft'), ...fill(13, 38, 10, 1, 'soft'), ...fill(0, 36, 22, 1, 'soft'), ...fill(0, 40, 22, 1, 'tough', { hp: 2 }), ...fill(0, 47, 22, 1, 'soft'),
  ...fill(0, 41, 14, 1, 'soft', { tint: 1 }), ...fill(0, 44, 10, 1, 'tough', { hp: 2 }),];

export const TIDE_WALL: LevelDef = {
  id: 'ch1-06-tide',
  name: 'The Tide Wall',
  number: 6,
  chapter: 1,
  layout: 'wall',
  par: 65,
  tip: 'This tunnel is on the right. Same trick: up it and let the stone run.',
  bricks: [...WALL, ...minus(BEHIND, LINING), ...LINING, ...FRONT],
};
