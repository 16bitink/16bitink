/**
 * Level 6, "The Buoy Garden". Signature: Open (no stone), new piece: the bumper. An arch of 3-hit
 * driftwood planks spans the cove, low by the walls and high in the middle; behind it a flat face of kegs
 * and x3 shells, and the sandcastle above. Barnacle buoys stand in the lanes where returns fall: a
 * stone that lands on one is kicked back up early, steeper and faster, into the planks.
 * Teaches: buoys kick the stone, faster and steeper; aim the returns at them. Pieces: soft, tough,
 * x3, keg, bumper. Mirrored about the middle.
 */
import { fill } from '../../sim/kit';
import type { BrickDef, BumperDef, LevelDef } from '../../sim/types';

const CELL = 15;
const PLANK_W = 6;
/**
 * The arch: 6 planks 6 wide, the middle two level on row 25, stepping down a row per plank to row 27
 * by the walls. Every step's notch is 6+ cells wide, so none counts as inside (a single raised
 * plank between two lower ones would leave a 1-row pocket the lab counts as inside).
 */
const ARCH_ROWS = [27, 26, 25, 25, 26, 27];
const ARCH: BrickDef[] = ARCH_ROWS.map((y, k) => ({ x: k * PLANK_W, y, w: PLANK_W, h: 1, kind: 'tough' as const, hp: 3, armour: true }));
const FACE_ROW = 21;
// The face, flat over the arch: keg, x3, sandcastle, ... (kegs every 3 cells chain).
const FACE = [
  ...fill(0, FACE_ROW, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(0, FACE_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, FACE_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
// Above: a second face of x3 every other cell, sandcastle, driftwood, and a beam over a keg fuse.
const PAYLOAD = [
  ...fill(0, 16, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 2 === 0 && b.x < 18) || (b.x % 2 === 1 && b.x >= 18) ? { ...b, kind: 'x3' as const } : b),
  ...fill(0, 17, 36, 4, 'soft'),
  ...fill(0, 14, 36, 2, 'soft', { tint: 5 }),
  ...fill(0, 10, 36, 4, 'tough', { hp: 2, tint: 5 }),
  ...fill(0, 6, 36, 4, 'tough', { hp: 2, tint: 6 }),
  ...fill(0, 4, 36, 1, 'tough', { hp: 2, tint: 6 }),
  ...fill(0, 5, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 5, 36, 1, 'soft', { bw: 1, tint: 6, skip: (x) => x % 3 === 1 }),
];
const at = (col: number, row: number, r: number): BumperDef => ({ x: col * CELL, y: row * CELL + CELL / 2, r });
/**
 * Barnacle buoys in the lanes where returns come down: one either side of the middle, and one by
 * each wall under the teasers. A falling stone that lands on one is kicked back up early, steeper
 * and faster, into the planks.
 */
const BUOYS: BumperDef[] = [at(12, 37, 18), at(24, 37, 18), at(4, 41, 16), at(32, 41, 16)];
// Teasers under the shoulders at the sides, and a small one under the crown in the straight-up lane.
const TEASERS = [...fill(15, 30, 6, 1, 'soft'), ...fill(0, 30, 9, 1, 'soft'), ...fill(27, 30, 9, 1, 'soft'), ...fill(0, 33, 6, 1, 'tough', { hp: 2 }), ...fill(30, 33, 6, 1, 'tough', { hp: 2 })];

export const TIDE_WALL: LevelDef = {
  id: 'ch1-06-tide',
  name: 'The Buoy Garden',
  number: 6,
  chapter: 1,
  layout: 'open',
  par: 90,
  tip: 'Barnacle buoys kick the stone back up. Use them!',
  bumpers: BUOYS,
  bricks: [...ARCH, ...FACE, ...PAYLOAD, ...TEASERS],
};
