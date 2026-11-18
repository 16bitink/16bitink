/**
 * Level 5, "The Pearl Stairs". Signature: Layers, goal Pearls. Three stone floors cross the cove:
 * the bottom one has a gap by each wall, the middle one a gap in the middle, the top one a gap by
 * each wall again, so the stone climbs in a zigzag. A pearl lies on each landing: one in the middle
 * of the first corridor, one at each end of the second, one under the roof of the top room.
 * Teaches: you don't have to break everything; climb floor by floor and pick up the pearls.
 * Pieces: soft, tough, x3. The whole board is mirrored about the middle.
 */
import { fill, stone } from '../../sim/kit';
import type { BrickDef, CellPoint, LevelDef } from '../../sim/types';

/** A stone floor across the board with gaps (x, w), in cells. */
function floor(y: number, gaps: readonly (readonly [number, number])[]): BrickDef[] {
  const edges = [0, ...gaps.flatMap(([x, w]) => [x, x + w]), 36];
  const runs: BrickDef[] = [];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1]! > edges[i]!) runs.push(stone(edges[i]!, y, edges[i + 1]! - edges[i]!, 1));
  return runs;
}
const SIDE_GAPS = [[5, 3], [28, 3]] as const;
// The bottom floor's gaps are 2 wide (the stone just fits): the way in takes a careful shot.
const BOTTOM_GAPS = [[5, 2], [29, 2]] as const;
const FLOORS = [...floor(38, BOTTOM_GAPS), ...floor(30, [[16, 4]]), ...floor(22, SIDE_GAPS)];
/**
 * A corridor's band, hung one row under the floor above: a driftwood row over a row of 1 x 1
 * sandcastle (the face a climbing stone runs along), with x3 shells over the gaps below, where a
 * stone coming up lands first.
 */
const band = (y: number, shells: readonly number[]): BrickDef[] => [
  ...fill(0, y, 36, 1, 'tough', { hp: 2 }),
  ...fill(0, y + 1, 36, 1, 'soft', { bw: 1 }).map((b) => (shells.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
];
const BANDS = [...band(32, [5, 6, 29, 30]), ...band(24, [17, 18])];
/** Four x3 shells on the top room's bottom row, mirrored about the middle. */
const ROOM_SHELLS = [6, 14, 21, 29];
// The top room: x3 shells on its bottom row, sandcastle, driftwood, and two 3-hit beams under the roof's pearl.
const ROOM = [
  ...fill(0, 18, 36, 1, 'soft', { bw: 1 }).map((b) => (ROOM_SHELLS.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 12, 36, 6, 'soft'),
  ...fill(0, 9, 36, 3, 'tough', { hp: 2 }),
  ...fill(0, 7, 36, 2, 'tough', { hp: 3 }),
];
const PEARLS: CellPoint[] = [{ x: 17, y: 36 }, { x: 2, y: 28 }, { x: 33, y: 28 }, { x: 17, y: 4 }];
// Teasers in the middle under the bottom floor, the lanes under its gaps kept open. Four planks of
// driftwood low by the raft screen the launch spot's shots at the gaps, straight and banked off the
// walls (where the generator's launch screen puts them); every other shot stays open.
const TEASERS = [...fill(11, 41, 14, 1, 'tough', { hp: 2 }), ...fill(11, 44, 14, 1, 'soft')];
const SCREEN: BrickDef[] = [6, 11, 22, 27].map((x) => ({ x, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }));

export const WRECK_HOLD: LevelDef = {
  id: 'ch1-05-hold',
  name: 'The Pearl Stairs',
  number: 5,
  chapter: 1,
  layout: 'layers',
  goal: 'pearls',
  par: 80,
  tip: 'Climb the gaps floor by floor and grab every pearl.',
  pearls: PEARLS,
  bricks: [...FLOORS, ...BANDS, ...ROOM, ...TEASERS, ...SCREEN],
};
