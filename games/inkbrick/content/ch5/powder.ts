/**
 * Level 46, "The Rising Powder Fort". Signature: Fuse, goal Rising Tide. Two rooms of sandcastle over
 * a stone floor with a 4-wide channel near the left. Up the channel the stone hits the keg that tops
 * it and the blast runs along the fort's top line of kegs; a second, unlit line waits lower down.
 * Every 4.5 s the field sinks a row; a brick on the line (row 51) costs a heart and lifts the field
 * 6 rows. The lowest bricks are two ice sheets (one hit buys the rows back); a 5-wide 3-hit plank (row 44,
 * placed as screenLaunch does) across the launch spot's shot keeps the break-in from being a
 * first-second shot.
 * Pieces: kegs, soft, tough, ice, x3.
 * Rebuilt 2026-11-18 (goal was clear): its replay pins no longer apply.
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const FLOOR = [stone(0, 15, 8, 1), stone(12, 15, 24, 1), stone(7, 4, 1, 11), stone(12, 4, 1, 11)]; // channel x8-11
const LEFT = fill(0, 5, 6, 10, 'soft');
const RIGHT = fill(13, 5, 23, 10, 'soft');
const ROOM = swapKind([...LEFT, ...RIGHT], [[16, 5], [28, 5], [22, 9], [31, 9], [13, 13], [3, 6]], 'x3');
const kegs = (xs: number[], y: number): BrickDef[] => xs.map((x) => ({ x, y, w: 1, h: 1, kind: 'keg' }));
const LINE_A = kegs([0, 3, 6, 9, 11, 14, 17, 20, 23, 26, 29, 32, 35], 4);
const LINE_B = kegs([13, 19, 25, 31], 12);
const ICE = fill(13, 8, 23, 1, 'ice');
const SCREEN = fill(12, 44, 5, 1, 'tough', { hp: 3 }); // launchScreen: across the straight shot from the launch spot
const TEASERS = [
  ...SCREEN,
  ...fill(0, 18, 6, 3, 'soft'), ...fill(16, 20, 20, 1, 'tough', { hp: 2 }), ...fill(21, 24, 15, 1, 'soft'),
  ...fill(0, 28, 6, 1, 'ice'), ...fill(0, 36, 6, 1, 'tough', { hp: 2 }), ...fill(24, 40, 12, 2, 'ice'), ...fill(24, 32, 12, 1, 'tough', { hp: 2 }),
];
const SET = minus(minus(minus(ROOM, LINE_A), LINE_B), ICE);

export const POWDER_FORT: LevelDef = {
  id: 'ch5-46-powder',
  name: 'The Rising Powder Fort',
  number: 46,
  chapter: 5,
  layout: 'fuse',
  par: 90,
  goal: 'tide',
  tide: { every: 4.5, line: 51 },
  tip: 'Rising tide! Light the fuse, break the low bricks.',
  bricks: [...FLOOR, ...LINE_A, ...LINE_B, ...ICE, ...SET, ...TEASERS],
};
