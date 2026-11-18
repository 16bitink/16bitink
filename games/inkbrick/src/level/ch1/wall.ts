/**
 * Level 2, "Over the Sea Wall". Signature: Over the wall. A full-width stone wall with one narrow
 * tunnel near the left edge. Above the tunnel an empty chimney runs up to the open water under the
 * ceiling: up the tunnel, the stone climbs the chimney, comes off the ceiling at an angle and runs
 * between the ceiling and the backs of the bricks. x3 shells line the chimney, so the stones
 * multiply on the way in. Pieces: soft, tough, x3; new: a pickup brick (+3 stones) in front.
 */
import { fill, stone, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const WALL_ROW = 12;
const TUNNEL_X = 4;
const TUNNEL_W = 3;
const BEHIND_X = TUNNEL_X + TUNNEL_W + 1;

const WALL = [stone(0, WALL_ROW, TUNNEL_X, 1), stone(TUNNEL_X + TUNNEL_W, WALL_ROW, 36 - TUNNEL_X - TUNNEL_W, 1)];
const BEHIND = swapKind([
  ...fill(0, 4, 3, 2, 'tough', { hp: 2, bw: 1 }), ...fill(0, 6, 3, 6, 'soft', { bw: 1 }),
  ...fill(BEHIND_X, 4, 27, 2, 'soft'), ...fill(BEHIND_X, 6, 27, 5, 'soft'), ...fill(BEHIND_X + 1, 11, 27, 1, 'tough', { hp: 2 }),
], [[8, 10], [2, 9], [26, 6]], 'x3');
const FRONT_ROW = swapKind(fill(12, 22, 15, 1, 'soft'), [[18, 22]], 'pickup', { drop: 'plus3' });
const FRONT = [
  ...fill(15, 17, 21, 1, 'tough', { hp: 2 }), ...FRONT_ROW,
  ...fill(18, 27, 18, 1, 'soft'), ...fill(24, 32, 12, 2, 'tough', { hp: 2 }),
];

export const OVER_THE_WALL: LevelDef = {
  id: 'ch1-02-wall',
  name: 'Over the Sea Wall',
  number: 2,
  chapter: 1,
  layout: 'wall',
  par: 85,
  tip: 'One tunnel by the left edge. Get the stone up it and let it run.',
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
