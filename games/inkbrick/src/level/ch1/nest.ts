/**
 * Level 9, "The Seal Loft". Signature: Layers, goal Rescue (the run-up to Brumm). Three stone floors
 * high in the cove with wide gaps (9 cells) on alternating sides (left, right, left); a seal pup is
 * caged in 2-hit driftwood under the roof of the top loft. Teaches: the stone only has to touch the
 * pup, so climb the floors and dig for the cage; no need to clear the board. Pieces: soft, tough, x3.
 */
import { fill, stone } from '../../sim/kit';
import type { BrickDef, LevelDef } from '../../sim/types';

const GAP = 9;
const LOW = 33;
const MID = 26;
const HIGH = 18;
/** A stone floor with its gap by the left wall, or by the right one. */
const gapLeft = (y: number): BrickDef => stone(GAP, y, 36 - GAP, 1);
const gapRight = (y: number): BrickDef => stone(0, y, 36 - GAP, 1);
const FLOORS = [gapLeft(LOW), gapRight(MID), gapLeft(HIGH)];
/** A corridor's band, under the floor above: a row of sandcastle with four x3 shells. */
const BAND_SHELLS = [6, 15, 18, 27];
const band = (y: number): BrickDef[] => fill(0, y, 36, 1, 'soft').map((b): BrickDef => (BAND_SHELLS.includes(b.x) ? { ...b, kind: 'x3' } : b));
const BANDS = [...band(MID + 3), ...band(HIGH + 3)];
// The pup's cage: 2-hit driftwood bars round a 2 x 2 pen under the roof, in the middle.
const PUP = { x: 17, y: 5, who: 'pup' as const };
const CAGE: BrickDef[] = [
  ...fill(15, 4, 1, 3, 'tough', { hp: 2, bw: 1, bh: 3 }), ...fill(20, 4, 1, 3, 'tough', { hp: 2, bw: 1, bh: 3 }),
  ...fill(15, 7, 6, 1, 'tough', { hp: 2, bw: 3 }), ...fill(16, 4, 4, 1, 'tough', { hp: 2, bw: 2 }),
];
// Roof plank: row 3 over the cage, so a stone running the ceiling rows still has to dig.
const ROOF = fill(12, 3, 12, 1, 'tough', { hp: 2 });
// The loft: two x3 shells on its bottom row, sandcastle, driftwood under the cage.
const LOFT = [
  ...fill(0, 12, 36, 2, 'soft').map((b): BrickDef => (b.y === 13 && (b.x === 9 || b.x === 24) ? { ...b, kind: 'x3' } : b)),
  ...fill(6, 10, 24, 1, 'tough', { hp: 2 }),
];
// Teasers right of the first gap's lane.
const TEASERS = fill(18, 39, 18, 1, 'soft');

export const DOUBLE_WRECK: LevelDef = {
  id: 'ch1-09-nest',
  name: 'The Seal Loft',
  number: 9,
  chapter: 1,
  layout: 'layers',
  goal: 'rescue',
  par: 45,
  tip: 'Climb to the loft and touch the pup to set it free.',
  inside: [{ x: 0, y: 0, w: 36, h: LOW }],
  rescue: PUP,
  bricks: [...FLOORS, ...BANDS, ...CAGE, ...ROOF, ...LOFT, ...TEASERS],
};
