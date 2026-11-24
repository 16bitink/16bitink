/**
 * Level 3, "The Driftwood Fence". Signature: Open (no stone at all). A fence of driftwood under a
 * great bed of sandcastle, split down the middle by an open lane 12 cells wide that runs from the
 * raft to the ceiling (owner, 2026-11-24: without a way to the top it took five minutes to chew
 * through from below). Up the lane the stone comes off the ceiling and works along the top, over a
 * fuse of kegs; x3 shells line the lane. Teaches: the top of a wall is the quick way through it.
 * New piece: driftwood armour. Pieces: soft, x3, keg, wide-raft
 * pickups. Mirrored about the middle.
 */
import { fill } from '../../sim/kit';
import type { BrickDef, LevelDef } from '../../sim/types';

const BANK_W = 12;
const FENCE_ROW = 24;
const TOP_ROW = 9;
const BED_ROWS = 6;
/** A bank on the left, and its mirror image on the right. */
const mirrored = (bricks: readonly BrickDef[]): BrickDef[] => [...bricks, ...bricks.map((b) => ({ ...b, x: 36 - b.x - b.w }))];

// The banks' colours by row, from the top (looks only): deep sea, shallows, sand.
const ROW_TINTS = [6, 6, 5, 5, 1, 1];
const TOP = [
  ...fill(0, TOP_ROW, BANK_W, 1, 'soft', { bw: 1, skip: (x) => x % 3 === 1 }),
  ...fill(0, TOP_ROW, BANK_W, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
];
// The shell bed, with x3 shells on the lane's side where a stone going up brushes past.
const BED = fill(0, TOP_ROW + 1, BANK_W, BED_ROWS, 'soft')
  .map((b): BrickDef => (b.x === BANK_W - 3 && (b.y - TOP_ROW) % 2 === 0 ? { ...b, kind: 'x3' } : b.x === 3 && b.y === TOP_ROW + BED_ROWS ? { ...b, kind: 'pickup', drop: 'wide' } : { ...b, tint: ROW_TINTS[b.y - TOP_ROW - 1]! }));
const FACE = [
  ...fill(0, TOP_ROW + BED_ROWS + 1, BANK_W, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, TOP_ROW + BED_ROWS + 1, BANK_W, 1, 'soft', { bw: 1, skip: (x) => x % 3 === 1 }),
];
const FENCE = fill(0, FENCE_ROW, BANK_W, 1, 'tough', { hp: 2, bw: 6 }).map((b) => ({ ...b, armour: true }));

export const MULTIPLIER_CORE: LevelDef = {
  id: 'ch1-03-core',
  name: 'The Driftwood Fence',
  number: 3,
  chapter: 1,
  layout: 'open',
  par: 45,
  tip: 'Shoot up the middle lane and break it from the top.',
  inside: [{ x: 0, y: 0, w: 36, h: TOP_ROW }],
  bricks: mirrored([...TOP, ...BED, ...FACE, ...FENCE]),
};
