/**
 * Level 2, "Over the Sea Wall". Signature: Over the wall. A stone wall in the middle of the cove
 * with open water either side of it (9 cells each) and above it up to the
 * ceiling: the stone goes up a side, comes off the ceiling at an angle and runs between the ceiling
 * and the backs of the bricks. x3 shells line the sides, so the stones multiply on the way in.
 * Pieces: soft, tough, x3; new: the stone wall, and pickup bricks (+3 stones, wide raft) in front.
 */
import { fill, stone, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const WALL_ROW = 12;
const OPENING = 9;
const WALL_W = 36 - 2 * OPENING;

const WALL = [stone(OPENING, WALL_ROW, WALL_W, 1)];
const R = OPENING + WALL_W - 3;
const BEHIND = swapKind(fill(OPENING, 6, WALL_W, 5, 'soft'), [[OPENING, 7], [OPENING, 10], [R, 7], [R, 10], [15, 6], [18, 6]], 'x3');
const FRONT = [
  ...swapKind(fill(12, 18, 12, 1, 'soft'), [[15, 18]], 'pickup', { drop: 'plus3' }),
  ...swapKind(fill(12, 22, 12, 1, 'soft'), [[18, 22]], 'pickup', { drop: 'wide' }),
];

export const OVER_THE_WALL: LevelDef = {
  id: 'ch1-02-wall',
  name: 'Over the Sea Wall',
  number: 2,
  chapter: 1,
  layout: 'wall',
  par: 40,
  tip: 'Go round the side of the wall and break it from above.',
  inside: [{ x: 0, y: 0, w: 36, h: WALL_ROW }],
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
