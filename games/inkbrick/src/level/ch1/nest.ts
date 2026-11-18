/**
 * Level 9, "The Seal Loft". Signature: Layers, goal Rescue (the run-up to Brumm). Three
 * stone floors with 3-wide gaps on alternating sides; a seal pup is caged in driftwood under the
 * roof of the top loft. Teaches: the stone only has to touch the pup, so climb the floors and dig
 * straight for the cage, no need to clear the board. Pieces: soft, tough, x3, keg.
 */
import { fill, stone } from '../../sim/kit';
import type { BrickDef, LevelDef } from '../../sim/types';

const GAP_W = 3;
const GAPS = [{ x: 5, y: 40 }, { x: 28, y: 32 }, { x: 5, y: 24 }];
const FLOORS = GAPS.flatMap((g) => [stone(0, g.y, g.x, 1), stone(g.x + GAP_W, g.y, 36 - g.x - GAP_W, 1)]);
/** A corridor's band, one row under the floor above: two rows of driftwood over 1 x 1 sandcastle with an x3 shell every 6th cell. */
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 2, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 6 === 2 ? { ...b, kind: 'x3' as const } : b)),
];
const BANDS = [...band(34), ...band(26)];
// The pup's cage: 3-hit driftwood bars round a 2 x 2 pen under the roof, in the middle.
const PUP = { x: 17, y: 5, who: 'pup' as const };
const CAGE: BrickDef[] = [
  ...fill(15, 4, 1, 3, 'tough', { hp: 3, bw: 1, bh: 3 }), ...fill(20, 4, 1, 3, 'tough', { hp: 3, bw: 1, bh: 3 }),
  ...fill(15, 7, 6, 1, 'tough', { hp: 3, bw: 3 }), ...fill(16, 4, 4, 1, 'tough', { hp: 3, bw: 2 }),
];
// The loft: x3 shells on its bottom row, a keg fuse higher up, sandcastle and driftwood around the cage.
const LOFT = [
  ...fill(0, 20, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 !== 0 }),
  ...fill(0, 20, 36, 1, 'soft', { bw: 1, skip: (x) => x % 2 === 0 }),
  ...fill(0, 14, 36, 6, 'soft'),
  ...fill(0, 13, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 13, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 === 1 }),
  ...fill(0, 8, 36, 5, 'tough', { hp: 2 }),
  ...fill(0, 4, 15, 4, 'tough', { hp: 2 }), ...fill(21, 4, 15, 4, 'tough', { hp: 2 }),
];
// Teasers right of the first gap's lane; driftwood low across the launch spot's shots at the gap.
const TEASERS = [...fill(15, 43, 21, 1, 'tough', { hp: 2 }), ...fill(15, 46, 21, 1, 'soft'), ...fill(6, 49, 9, 1, 'tough', { hp: 3 })];

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
  bricks: [...FLOORS, ...BANDS, ...CAGE, ...LOFT, ...TEASERS],
};
