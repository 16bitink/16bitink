/**
 * Level 35, "The Pearl Locks". Rebuilt 2026-11-18 as layers (the old pins of ch4-35-poolvault are
 * gone). Signature: Layers with whirlpools linking the floors, goal Pearls. A solid stone floor
 * (row 34) seals the cave: the way in is one of two whirlpools in the open water (row 40, x 5 and
 * x 30, each under a driftwood cap so stray stones rattling under the floor don't drop in), both
 * leading into the first chamber. The floors above (rows 26, 18) have a 2-wide gap each and a
 * whirlpool shortcut by the walls into the next chamber. A pearl in each chamber and one over the
 * top room. x3 shells only over the next gap and by the first chamber's whirlpool exits; one in
 * the room. Pieces: whirlpool x4, soft, tough, x3.
 * Lab 30 runs: 6/10 (aim 3.5%, last pearl skilled 81.9 s, novice clears 73.3%; MISS break-in
 * novice 9.9 s, skilled 6.7 s, cascade 28.7%, luck 0.55): a whirlpool end in the open water is
 * found by wandering stones within seconds wherever it sits.
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

/** Floors 8 rows apart; the upper two have a 2-wide gap (x) besides their whirlpool, which is the shortcut. */
const GAPS = [{ x: 9, y: 26 }, { x: 24, y: 18 }];
const FLOORS = [stone(0, 34, 36, 1), ...GAPS.flatMap((g) => [stone(0, g.y, g.x, 1), stone(g.x + 2, g.y, 34 - g.x, 1)])];
/** A chamber's band, right under the floor above: driftwood over a row of 1 x 1 sandcastle, x3 shells only over the next gap. */
const band = (y: number, x3: readonly number[]): BrickDef[] => [
  ...fill(0, y, 36, 1, 'tough', { hp: 3 }), ...fill(0, y + 1, 36, 1, 'tough', { hp: 3 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (x3.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
];
const ROOM = [
  ...fill(0, 14, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x === 17 ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 9, 36, 5, 'tough', { hp: 2 }), ...fill(0, 4, 36, 5, 'tough', { hp: 3 }),
];
/** Launch screen from `screenLaunch(level, pearls, LOW_SCREEN_ROWS)`: 3-hit driftwood on row 50. */
const SCREEN: BrickDef[] = [5, 10, 27].map((x) => ({ x, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }));
/** Caps over the open-water whirlpools (a row clear of them), sandcastle where returns land. */
const TEASERS: BrickDef[] = [...fill(2, 38, 7, 1, 'tough', { hp: 3 }), ...fill(27, 38, 7, 1, 'tough', { hp: 3 }), ...fill(9, 44, 9, 1, 'soft'), ...fill(20, 44, 8, 1, 'soft'), ...fill(24, 47, 5, 1, 'soft'), ...SCREEN];

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
    { a: { x: 5, y: 40 }, b: { x: 22, y: 32 } },
    { a: { x: 30, y: 40 }, b: { x: 13, y: 32 } },
    { a: { x: 4, y: 33 }, b: { x: 31, y: 25 } },
    { a: { x: 4, y: 25 }, b: { x: 31, y: 17 } },
  ],
  bricks: [...FLOORS, ...band(27, [9, 10, 21, 23]), ...band(19, [24, 25]), ...ROOM, ...TEASERS],
};
