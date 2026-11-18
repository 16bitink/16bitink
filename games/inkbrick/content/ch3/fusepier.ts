/**
 * Level 29, "The Powder Pier". Signature: Fuse. A room of sandcastle over a stone floor with a
 * 3-wide channel in the middle. Up the channel the stone hits the keg that tops it, and the blast
 * runs along the pier's top line of kegs; a second, unlit line of kegs lower down waits for the
 * stone that rattles in afterwards. Pieces: kegs, soft, tough, x3, pickup.
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
const TEASERS = [
  ...fill(0, 34, 12, 1, 'soft'), ...fill(24, 34, 12, 1, 'soft'), ...fill(0, 37, 9, 1, 'tough', { hp: 2 }),
  ...fill(27, 37, 9, 1, 'tough', { hp: 2 }), ...fill(3, 40, 6, 1, 'soft'), ...fill(27, 40, 6, 1, 'soft'),
];

const withoutOverlap = (bricks: BrickDef[], blockers: BrickDef[]): BrickDef[] =>
  bricks.filter((b) => !blockers.some((k) => b.x < k.x + k.w && k.x < b.x + b.w && b.y < k.y + k.h && k.y < b.y + b.h));
const ROOM_FREE = withoutOverlap(withoutOverlap(ROOM, TOUGH), [...LINE_B]);

export const POWDER_PIER: LevelDef = {
  id: 'ch3-29-pier', name: 'The Powder Pier', number: 29, chapter: 3, layout: 'fuse', par: 110,
  tip: 'Up the middle channel the keg on top lights the whole line.',
  bricks: [...FLOOR, ...LINE_A.filter((k) => true), ...TOUGH, ...LINE_B, ...ROOM_FREE, ...TEASERS],
};
