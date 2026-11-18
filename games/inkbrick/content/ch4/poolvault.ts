/**
 * Level 35, "The Pearl Locks". Rebuilt 2026-11-18 as layers (the old pins of ch4-35-poolvault are
 * gone). Signature: Layers with whirlpools linking the floors, goal Pearls. Three solid stone
 * floors close the cave into stacked chambers with no gap at all: the only way up is a whirlpool
 * from the open water into the first chamber, another from it into the second, a third into the
 * top room. A pearl rests in each chamber and one under the roof. Pieces: whirlpool x3, soft,
 * tough, x3.
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

/** Floors 9 rows apart, each with a 2-wide gap (x) besides its whirlpool: the whirlpools are the shortcuts. */
const GAPS = [{ x: 34, y: 34 }, { x: 9, y: 26 }, { x: 24, y: 18 }];
const FLOORS = GAPS.flatMap((g) => (g.x + 2 < 36 ? [stone(0, g.y, g.x, 1), stone(g.x + 2, g.y, 34 - g.x, 1)] : [stone(0, g.y, g.x, 1)]));
/** A chamber's band, hung a row under the floor above: driftwood over a row of 1 x 1 sandcastle, x3 shells only over the next gap. */
const band = (y: number, x3: readonly number[]): BrickDef[] => [
  ...fill(0, y, 36, 1, 'tough', { hp: 3 }), ...fill(0, y + 1, 36, 1, 'tough', { hp: 3 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (x3.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
];
const ROOM = [
  ...fill(0, 14, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 12 === 2 ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 9, 36, 5, 'tough', { hp: 2 }), ...fill(0, 4, 36, 5, 'tough', { hp: 3 }),
];
/** Launch screen from `screenLaunch(level, pearls, LOW_SCREEN_ROWS)`: 3-hit driftwood on row 50. */
const SCREEN: BrickDef[] = [2, 7].map((x) => ({ x, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }));
/** Under the bottom floor, away from the gap's lane (x 20-29) and a cell clear of the low whirlpool. */
const TEASERS: BrickDef[] = [...fill(0, 38, 10, 1, 'tough', { hp: 2 }), ...fill(9, 44, 9, 1, 'soft'), ...fill(20, 41, 6, 1, 'tough', { hp: 2 }), ...fill(24, 47, 5, 1, 'soft'), ...SCREEN];

export const HIDDEN_VAULT: LevelDef = {
  id: 'ch4-35-poolvault',
  name: 'The Pearl Locks',
  number: 35,
  chapter: 4,
  layout: 'layers',
  goal: 'pearls',
  par: 100,
  tip: 'Ride the whirlpools up and take every pearl.',
  pearls: [{ x: 17, y: 31 }, { x: 17, y: 23 }, { x: 17, y: 16 }, { x: 17, y: 3 }],
  whirlpools: [
    { a: { x: 4, y: 45 }, b: { x: 22, y: 32 } },
    { a: { x: 4, y: 33 }, b: { x: 31, y: 25 } },
    { a: { x: 4, y: 25 }, b: { x: 31, y: 17 } },
  ],
  bricks: [...FLOORS, ...band(27, [9, 10, 21, 23, 31, 33, 35]), ...band(19, [24, 25]), ...ROOM, ...TEASERS],
};
