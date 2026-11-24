/**
 * Level 5, "The Pearl Stairs". Signature: Layers, goal Pearls. Three stone floors cross the cove
 * with wide gaps (8 cells): the bottom one by each wall, the middle one in the middle, the top
 * one by each wall again, so the stone climbs in a zigzag. A pearl lies on each landing: one in the
 * middle of the first corridor, one at each end of the second, one under the roof of the top room.
 * Teaches: you don't have to break everything; climb floor by floor and pick up the pearls.
 * Pieces: soft, tough, x3. The whole board is mirrored about the middle.
 */
import { fill, stone } from '../../sim/kit';
import type { BrickDef, CellPoint, LevelDef } from '../../sim/types';

const SIDE_GAP = 8;
const MID_GAP = 8;
/** A floor with a gap by each wall, and one with a gap in the middle. */
const sideGaps = (y: number): BrickDef[] => [stone(SIDE_GAP, y, 36 - 2 * SIDE_GAP, 1)];
const midGap = (y: number): BrickDef[] => [stone(0, y, (36 - MID_GAP) / 2, 1), stone((36 + MID_GAP) / 2, y, (36 - MID_GAP) / 2, 1)];
const LOW = 34;
const MID = 27;
const HIGH = 20;
const FLOORS = [...sideGaps(LOW), ...midGap(MID), ...sideGaps(HIGH)];
/** A corridor's band, hung one row under the floor above: sandcastle, an x3 shell at each end. */
const band = (x: number, y: number, w: number): BrickDef[] =>
  fill(x, y, w, 1, 'soft').map((b): BrickDef => (b.x === x || b.x === x + w - 3 ? { ...b, kind: 'x3' } : b));
const BANDS = [...band(0, MID + 2, 12), ...band(24, MID + 2, 12), ...fill(12, HIGH + 2, 12, 2, 'soft')];
// The top room: sandcastle over the top floor, driftwood under the roof's pearl.
const ROOM = [
  ...fill(0, 13, 36, 2, 'soft').map((b): BrickDef => (b.y === 14 && (b.x === 9 || b.x === 24) ? { ...b, kind: 'x3' } : b)),
  ...fill(0, 11, 36, 2, 'soft'),
  ...fill(12, 8, 12, 1, 'tough', { hp: 2 }),
];
const PEARLS: CellPoint[] = [{ x: 17, y: LOW - 3 }, { x: 4, y: MID - 2 }, { x: 31, y: MID - 2 }, { x: 17, y: 5 }];
// Teasers in the middle under the bottom floor, the lanes under its gaps kept open.
const TEASERS = fill(12, 39, 12, 2, 'soft');

export const WRECK_HOLD: LevelDef = {
  id: 'ch1-05-hold',
  name: 'The Pearl Stairs',
  number: 5,
  chapter: 1,
  layout: 'layers',
  goal: 'pearls',
  par: 40,
  tip: 'Climb the gaps floor by floor and grab every pearl.',
  inside: [{ x: 0, y: 0, w: 36, h: LOW }],
  pearls: PEARLS,
  bricks: [...FLOORS, ...BANDS, ...ROOM, ...TEASERS],
};
