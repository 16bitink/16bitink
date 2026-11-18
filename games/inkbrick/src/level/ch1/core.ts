/**
 * Level 3, "The Driftwood Fence". Signature: Open (no stone at all). A fence of 3-hit driftwood
 * runs across the cove; behind it, three rows up, a face of kegs and x3 shells, and the shell bed
 * above. Teaches: a wall can be breakable, and the x3 shells behind it split the first stone
 * through into three. New piece: driftwood armour (`armour: true`, 3 hits). Pieces: soft, tough,
 * x3, keg.
 */
import { fill } from '../../sim/kit';
import type { BrickDef, LevelDef } from '../../sim/types';

const FENCE_ROW = 27;
const FACE_ROW = FENCE_ROW - 4;
const BED_ROW = FACE_ROW - 5;
// Planks 4 wide: a stone's hits land on the same plank, and the breach is wide enough to fly through.
const FENCE: BrickDef[] = fill(0, FENCE_ROW, 36, 1, 'tough', { hp: 3, bw: 4 }).map((b) => ({ ...b, armour: true }));
// The face three rows over the fence: keg, x3, sandcastle, ... (kegs every 3 cells chain).
const FACE = [
  ...fill(0, FACE_ROW, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(0, FACE_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, FACE_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
// The picture in the sandcastle above the bed: a scallop shell on blue water (looks only).
const SCALLOP_HALF = [2, 4, 5, 6, 6, 6, 5, 4, 3, 2, 1, 3]; // half-width per row, in 3-wide bricks
function scallopTint(col: number, row: number): number {
  const d = Math.abs(col - 5.5) + 0.5; // 1..6 from the middle, mirrored
  const half = SCALLOP_HALF[row] ?? 0;
  if (d > half) return 5;
  if (d === half || row === SCALLOP_HALF.length - 1) return 3;
  return d % 2 === 0 ? 2 : 1;
}
// The shell bed: a second face of x3 every other cell, out of the kegs' reach.
const BED = [
  ...fill(0, BED_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 === 1 }),
  ...fill(0, BED_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 2 === 0 }),
  ...fill(0, BED_ROW + 1, 36, 4, 'soft'),
  ...fill(0, 6, 36, BED_ROW - 6, 'soft').map((b) => ({ ...b, tint: scallopTint(b.x / 3, b.y - 6) })),
];
// The top: a driftwood beam over a fuse of kegs (one every 3 cells): the last bricks up there go off together.
const TOP = [
  ...fill(0, 4, 36, 1, 'tough', { hp: 2, tint: 2 }),
  ...fill(0, 5, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 5, 36, 1, 'soft', { bw: 1, tint: 2, skip: (x) => x % 3 === 1 }),
];
// Teasers under the fence at the sides only: the shot lanes in the middle stay open.
const TEASERS = [...fill(0, FENCE_ROW + 3, 9, 1, 'soft'), ...fill(27, FENCE_ROW + 3, 9, 1, 'soft'), ...fill(0, FENCE_ROW + 6, 6, 1, 'tough', { hp: 2 }), ...fill(30, FENCE_ROW + 6, 6, 1, 'tough', { hp: 2 })];

export const MULTIPLIER_CORE: LevelDef = {
  id: 'ch1-03-core',
  name: 'The Driftwood Fence',
  number: 3,
  chapter: 1,
  layout: 'open',
  par: 90,
  tip: 'Chew through the driftwood, and the shells do the rest.',
  bricks: [...FENCE, ...FACE, ...BED, ...TOP, ...TEASERS],
};
