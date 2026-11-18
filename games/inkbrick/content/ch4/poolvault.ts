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

const FLOORS = [stone(0, 42, 36, 1), stone(0, 32, 36, 1), stone(0, 22, 36, 1)];
/** A chamber's band, hung two rows under the floor above: driftwood over a row of 1 x 1 sandcastle with an x3 every 8th cell. */
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 1, 'tough', { hp: 3 }), ...fill(0, y + 1, 36, 1, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 8 === 5 ? { ...b, kind: 'x3' as const } : b)),
];
const ROOM = [
  ...fill(0, 18, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 6 === 2 ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 11, 36, 7, 'soft'), ...fill(0, 6, 36, 5, 'tough', { hp: 3 }), ...fill(0, 4, 36, 2, 'tough', { hp: 2 }),
];
const TEASERS: BrickDef[] = [...fill(0, 45, 8, 1, 'tough', { hp: 2 }), ...fill(24, 45, 12, 1, 'soft'), ...fill(14, 48, 12, 1, 'soft'), { x: 1, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }, { x: 7, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }];

export const HIDDEN_VAULT: LevelDef = {
  id: 'ch4-35-poolvault',
  name: 'The Pearl Locks',
  number: 35,
  chapter: 4,
  layout: 'layers',
  goal: 'pearls',
  par: 100,
  tip: 'Ride the whirlpools up and take every pearl.',
  pearls: [{ x: 22, y: 33 }, { x: 12, y: 23 }, { x: 10, y: 20 }, { x: 24, y: 3 }],
  whirlpools: [
    { a: { x: 4, y: 47 }, b: { x: 31, y: 41 } },
    { a: { x: 4, y: 41 }, b: { x: 31, y: 31 } },
    { a: { x: 4, y: 31 }, b: { x: 31, y: 21 } },
  ],
  bricks: [...FLOORS, ...band(34), ...band(24), ...ROOM, ...TEASERS],
};
