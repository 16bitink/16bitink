/**
 * Level 15, "The Sinking Ice Shelf". Signature: Open (no stone), new goal: Rising Tide. A shallow V
 * of 3-hit driftwood planks (low in the middle, over the launch spot) spans the floe; three rows
 * above it a face of kegs and x3 shells sits on a thick band of ice, so the first stone through the
 * breach blows the face and the ice wave takes the whole band. Above: sandcastle, more ice, driftwood
 * and a keg fuse under the top row. Every 4.5 s the whole field sinks a row; a brick reaching the line
 * (row 42) costs a heart and lifts the field 6 rows. Two ice sheets low by the walls are the first
 * to sink: one hit shatters a sheet and buys ten rows. Teaches: watch the line, break the lowest
 * bricks first. Pieces: tough (armour), ice, soft, x3, keg. Mirrored about the middle.
 * Rebuilt 2026-11-18 (was the wall level "The Frozen Wall"): its replay pins no longer apply.
 */
import { fill } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const PLANK_W = 4;
/**
 * The V: 9 planks 4 wide, stepping down a row per pair to the single middle plank on row 28 (over
 * column 18, the launch spot). 4-wide planks keep a stone's hits on one plank; 6-wide ones spread
 * them and the skilled break-in took 36-40 s.
 */
const V_ROWS = [26, 26, 27, 27, 28, 27, 27, 26, 26];
const ARMOUR: BrickDef[] = V_ROWS.map((y, k) => ({ x: k * PLANK_W, y, w: PLANK_W, h: 1, kind: 'tough' as const, hp: 3, armour: true }));
const FACE_ROW = 22;
// The face three rows over the highest planks: keg, x3, sandcastle, ... (kegs every 3 cells chain).
const FACE = [
  ...fill(0, FACE_ROW, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(0, FACE_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, FACE_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
const PAYLOAD = [
  ...fill(0, 18, 36, 4, 'ice'), // under the face: the blasts crack it and the wave takes the band
  ...fill(0, 17, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 2 === 0 ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 15, 36, 2, 'soft'),
  ...fill(0, 14, 36, 1, 'tough', { hp: 2 }),
  ...fill(0, 11, 36, 3, 'ice'),
  ...fill(0, 6, 36, 5, 'tough', { hp: 2 }),
  // The top: a driftwood beam over a keg fuse, so the last bricks up there go off together.
  ...fill(0, 5, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 5, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 === 1 }),
  ...fill(0, 4, 36, 1, 'tough', { hp: 2 }),
];
/**
 * Ice sheets low by the walls, the lowest bricks: 10 rows over the line, so the bots go in first
 * and dig them only once the tide brings them within 7 rows (with the line 6 rows under them the
 * skilled bot dug first and broke in at 36-40 s).
 */
const SHEETS = [...fill(0, 31, 9, 2, 'ice'), ...fill(27, 31, 9, 2, 'ice')];

export const FROZEN_WALL: LevelDef = {
  id: 'ch2-15-wall',
  name: 'The Sinking Ice Shelf',
  number: 15,
  chapter: 2,
  layout: 'open',
  par: 110,
  goal: 'tide',
  tide: { every: 4.5, line: 42 },
  tip: 'The tide sinks the ice! Break the lowest bricks first.',
  bricks: [...ARMOUR, ...FACE, ...PAYLOAD, ...SHEETS],
};
