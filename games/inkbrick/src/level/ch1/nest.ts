/**
 * Level 9, "The Seal Loft". Signature: Layers, goal Rescue (the run-up to Brumm). Three stone
 * floors high in the cove with their gaps on alternating sides (left, right, left; the bottom one
 * only 2 wide); a seal pup is caged in 3-hit driftwood under the roof of the top loft. Teaches: the
 * stone only has to touch the pup, so climb the floors and dig for the cage, from below or along the
 * roof; no need to clear the board. Pieces: soft, tough, x3. The bands, loft and cage are mirrored.
 */
import { fill, stone } from '../../sim/kit';
import type { BrickDef, LevelDef } from '../../sim/types';

/** A stone floor across the board with gaps (x, w), in cells. */
function floor(y: number, gaps: readonly (readonly [number, number])[]): BrickDef[] {
  const edges = [0, ...gaps.flatMap(([x, w]) => [x, x + w]), 36];
  const runs: BrickDef[] = [];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1]! > edges[i]!) runs.push(stone(edges[i]!, y, edges[i + 1]! - edges[i]!, 1));
  return runs;
}
// The floors sit high (the bottom one 26 rows over the raft) and the bottom gap is 2 wide (the stone
// just fits): the way in is a long, careful shot.
const FLOORS = [...floor(34, [[5, 2]]), ...floor(26, [[28, 3]]), ...floor(18, [[5, 3]])];
/**
 * A corridor's band, one row under the floor above: two rows of driftwood over 1 x 1 sandcastle,
 * with x3 shells over both gaps (where a climbing stone first lands), mirrored about the middle.
 */
const BAND_SHELLS = [6, 29];
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 2, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (BAND_SHELLS.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
];
const BANDS = [...band(28), ...band(20)];
// The pup's cage: 3-hit driftwood bars round a 2 x 2 pen under the roof, in the middle.
const PUP = { x: 17, y: 5, who: 'pup' as const };
const CAGE: BrickDef[] = [
  ...fill(15, 4, 1, 3, 'tough', { hp: 3, bw: 1, bh: 3 }), ...fill(20, 4, 1, 3, 'tough', { hp: 3, bw: 1, bh: 3 }),
  ...fill(15, 7, 6, 1, 'tough', { hp: 3, bw: 3 }), ...fill(16, 4, 4, 1, 'tough', { hp: 3, bw: 2 }),
];
// The loft: x3 shells every 4th cell on its bottom row (mirrored), sandcastle, driftwood round the cage.
const LOFT_SHELLS = [2, 6, 10, 14, 21, 25, 29, 33];
const LOFT = [
  ...fill(0, 14, 36, 1, 'soft', { bw: 1 }).map((b) => (LOFT_SHELLS.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 11, 36, 3, 'soft'),
  ...fill(0, 8, 36, 3, 'tough', { hp: 2 }),
  ...fill(0, 4, 15, 4, 'tough', { hp: 2 }), ...fill(21, 4, 15, 4, 'tough', { hp: 2 }),
];
// Teasers right of the first gap's lane. Two planks of driftwood low by the raft screen the launch
// spot's shots at the gap, straight and banked off the wall (where the generator's launch screen puts them).
const TEASERS = [...fill(15, 37, 21, 1, 'tough', { hp: 2 }), ...fill(15, 40, 21, 1, 'soft')];
const SCREEN: BrickDef[] = [8, 12].map((x) => ({ x, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }));

export const DOUBLE_WRECK: LevelDef = {
  id: 'ch1-09-nest',
  name: 'The Seal Loft',
  number: 9,
  chapter: 1,
  layout: 'layers',
  goal: 'rescue',
  par: 80,
  tip: 'Climb to the loft and touch the pup to set it free.',
  rescue: PUP,
  bricks: [...FLOORS, ...BANDS, ...CAGE, ...LOFT, ...TEASERS, ...SCREEN],
};
