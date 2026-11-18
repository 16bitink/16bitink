/**
 * Level 6, "The Buoy Garden". Signature: Open (no stone), new piece: the bumper. An arch of 3-hit
 * driftwood spans the cove, low by the walls and high in the middle; behind it a flat face of kegs
 * and x3 shells, and the sandcastle above. Barnacle buoys stand in the water under the arch's low
 * shoulders and either side of the middle: a stone that comes off the arch onto a buoy is kicked
 * straight back up into the planks, so one throw can knock the same plank two or three times.
 * Teaches: buoys kick the stone, faster and steeper; aim the returns at them. Pieces: soft, tough,
 * x3, keg, bumper. Mirrored about the middle.
 */
import { fill } from '../../sim/kit';
import type { BrickDef, BumperDef, LevelDef } from '../../sim/types';

const CELL = 15;
const PLANK_W = 4;
/** The arch: 9 planks 4 wide, row 24 in the middle stepping down one row per plank to row 28 by the walls. */
const ARCH: BrickDef[] = Array.from({ length: 9 }, (_, k) => ({
  x: k * PLANK_W, y: 24 + Math.abs(k - 4), w: PLANK_W, h: 1, kind: 'tough' as const, hp: 3, armour: true,
}));
const FACE_ROW = 20;
// The face, flat over the arch: keg, x3, sandcastle, ... (kegs every 3 cells chain).
const FACE = [
  ...fill(0, FACE_ROW, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(0, FACE_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, FACE_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
// Above: a second face of x3 every other cell, sandcastle, and a driftwood beam over a keg fuse.
const PAYLOAD = [
  ...fill(0, 15, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 2 === 0 && b.x < 18) || (b.x % 2 === 1 && b.x >= 18) ? { ...b, kind: 'x3' as const } : b),
  ...fill(0, 16, 36, 4, 'soft'),
  ...fill(0, 6, 36, 9, 'soft', { tint: 5 }),
  ...fill(0, 4, 36, 1, 'tough', { hp: 2, tint: 6 }),
  ...fill(0, 5, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 5, 36, 1, 'soft', { bw: 1, tint: 6, skip: (x) => x % 3 === 1 }),
];
const at = (col: number, row: number, r: number): BumperDef => ({ x: col * CELL, y: row * CELL + CELL / 2, r });
/** Barnacle buoys: under the arch's shoulders, and either side of the middle lower down. */
const BUOYS: BumperDef[] = [at(6, 32, 18), at(30, 32, 18), at(13, 37, 16), at(23, 37, 16)];

export const TIDE_WALL: LevelDef = {
  id: 'ch1-06-tide',
  name: 'The Buoy Garden',
  number: 6,
  chapter: 1,
  layout: 'open',
  par: 90,
  tip: 'Barnacle buoys kick the stone back up. Use them!',
  bumpers: BUOYS,
  bricks: [...ARCH, ...FACE, ...PAYLOAD],
};
