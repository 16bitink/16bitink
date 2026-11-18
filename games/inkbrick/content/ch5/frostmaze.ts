/**
 * Level 44, "The Frozen Stairs". Signature: Maze. Four stone floors with their gaps on alternating
 * sides; each lane holds a band of sandcastle, ice and driftwood. Climb the gaps floor by floor to
 * the top room where the x3 shells wait. Pieces: ice, soft, tough, x3.
 * Lab (30 runs): 8/11 PASS · MISS break-in novice 11.6s, break-in skilled 2.5s, cascade 8s 21.3%
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const FLOORS = [
  stone(0, 36, 27, 1), stone(31, 36, 5, 1), // right gap x27-30 (4 wide at the entry)
  stone(0, 27, 4, 1), stone(8, 27, 28, 1), // left gap x4-7
  stone(0, 18, 27, 1), stone(31, 18, 5, 1), // right gap x27-30
];
const lane = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 1, 'soft', { bw: 4 }), ...fill(0, y + 1, 36, 1, 'ice'), ...fill(0, y + 2, 36, 1, 'soft', { bw: 4 }),
];
const LANES = [...lane(29), ...lane(20)];
const TOP = swapKind([...fill(0, 4, 36, 2, 'tough', { hp: 2, bw: 6 }), ...fill(0, 10, 36, 8, 'soft', { bw: 4 })], [[4, 17], [12, 17], [20, 17], [28, 17], [8, 13], [24, 13], [16, 11], [0, 11], [32, 11]], 'x3');
const TEASERS = [...fill(0, 39, 24, 1, 'soft', { bw: 6 }), ...fill(0, 42, 18, 1, 'tough', { hp: 2, bw: 6 }), ...fill(0, 45, 24, 1, 'soft', { bw: 6 })];

export const FROZEN_STAIRS: LevelDef = {
  id: 'ch5-44-stairs',
  name: 'The Frozen Stairs',
  number: 44,
  chapter: 5,
  layout: 'maze',
  par: 125,
  tip: 'Climb the gaps, right then left, floor by floor.',
  bricks: [...FLOORS, ...LANES, ...TOP, ...TEASERS],
};
