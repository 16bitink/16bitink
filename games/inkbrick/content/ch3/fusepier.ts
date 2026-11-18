/**
 * Level 29, "The Three Stone Pier". Signature: Fuse, goal Few Stones (3 stones, break 90%). A room of
 * sandcastle over a stone floor with a 3-wide channel in the middle; up the channel the stone hits
 * the keg that tops it and the blast runs along the top line of kegs. Single-stone work (3-hit
 * driftwood and ice, low on the left only) spends stones; soft + ice under the floor at the sides
 * catch the returns. Pieces: kegs, soft, tough, ice, x3.
 * Rebuilt 2026-11-18 (was "The Powder Pier"): its replay pins no longer apply.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const FLOOR = [stone(0, 13, 17, 1), stone(20, 13, 16, 1), stone(16, 4, 1, 9), stone(20, 4, 1, 9)]; // channel x17-19
const LEFT = fill(0, 5, 16, 8, 'soft', { bw: 3 });
const RIGHT = fill(21, 5, 15, 8, 'soft', { bw: 3 });
const ROOM = swapKind([...LEFT, ...RIGHT], [[3, 6], [30, 6], [9, 9], [24, 9]], 'x3');
const TOUGH = [...fill(0, 8, 9, 1, 'tough', { hp: 2, bw: 3 }), ...fill(27, 8, 9, 1, 'tough', { hp: 2, bw: 3 })];
const kegs = (xs: number[], y: number): BrickDef[] => xs.map((x) => ({ x, y, w: 1, h: 1, kind: 'keg' }));
const LINE_A = kegs([0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33], 4);
const LINE_B = kegs([1, 7, 13, 23, 29, 35], 11);
// The long single-stone work, low on the left only: the bank shots off the right wall into the channel stay free.
// Under the floor at the sides, where returns land; the lane under the channel stays open.
const HIGH = (x: number, w: number): BrickDef[] => [...fill(x, 18, w, 2, 'soft'), ...fill(x, 21, w, 2, 'ice')];
const TEASERS = [
  ...HIGH(0, 14), ...HIGH(28, 8),
  ...fill(0, 34, 12, 1, 'soft'), ...fill(0, 36, 14, 2, 'tough', { hp: 3 }), ...fill(0, 38, 14, 1, 'ice'),
  ...fill(0, 39, 14, 6, 'tough', { hp: 3 }).filter((b) => !(b.y === 39 && [2, 7, 12].some((x) => b.x <= x && x < b.x + b.w))),
  ...[2, 7, 12].map((x): BrickDef => ({ x, y: 39, w: 1, h: 1, kind: 'x3' })),
];

const withoutOverlap = (bricks: BrickDef[], blockers: BrickDef[]): BrickDef[] =>
  bricks.filter((b) => !blockers.some((k) => b.x < k.x + k.w && k.x < b.x + b.w && b.y < k.y + k.h && k.y < b.y + b.h));
const ROOM_FREE = withoutOverlap(withoutOverlap(ROOM, TOUGH), [...LINE_B]);

export const POWDER_PIER: LevelDef = {
  id: 'ch3-29-pier', name: 'The Three Stone Pier', number: 29, chapter: 3, layout: 'fuse', par: 110,
  goal: 'stones', stones: 3, need: 0.9,
  tip: 'Only three stones! Light the fuse and keep them up.',
  bricks: [...FLOOR, ...LINE_A.filter((k) => true), ...TOUGH, ...LINE_B, ...ROOM_FREE, ...TEASERS],
};
