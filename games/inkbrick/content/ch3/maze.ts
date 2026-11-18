/**
 * Level 23, "The Winding Way". Signature: Maze. Three stone floors with their gaps on alternating
 * sides: the stone climbs the harbour's winding lanes floor by floor, clearing each corridor, up to
 * the top room where the x3 shells wait. Teaches: follow the corridors, one gap at a time.
 * Pieces: soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const FLOORS = [
  stone(0, 36, 5, 1), stone(8, 36, 28, 1), // left gap x5-7
  stone(0, 28, 28, 1), stone(31, 28, 5, 1), // right gap x28-30
  stone(0, 20, 5, 1), stone(8, 20, 28, 1), // left gap
];
const BANDS = [
  ...swapKind(fill(0, 30, 36, 3, 'soft', { bw: 3 }), [[12, 30], [24, 31]], 'x3'),
  ...swapKind(fill(0, 22, 36, 3, 'soft', { bw: 3 }), [[6, 22], [21, 23]], 'x3'),
];
const CORRIDORS = [...BANDS];
const TOP = swapKind(fill(0, 4, 36, 11, 'soft', { bw: 3 }), [[9, 6], [21, 6], [15, 10], [27, 10]], 'x3');
const TEASERS = [...fill(15, 41, 21, 1, 'soft', { bw: 3 }), ...fill(21, 44, 12, 1, 'tough', { bw: 3, hp: 2 }), ...fill(12, 47, 18, 1, 'soft', { bw: 3 }), ...fill(15, 38, 21, 1, 'tough', { bw: 3, hp: 2 })];

export const WINDING_WAY: LevelDef = {
  id: 'ch3-23-maze', name: 'The Winding Way', number: 23, chapter: 3, layout: 'maze', par: 90,
  tip: 'Climb the gaps, left then right, floor by floor.',
  bricks: [...FLOORS, ...CORRIDORS, ...TOP, ...TEASERS],
};
