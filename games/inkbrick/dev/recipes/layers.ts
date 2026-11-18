/**
 * Kit recipe: `layers` (docs/inkbrick-level-kit.md "Recipe: layers"). Three full-width stone
 * floors, 8 rows apart, with 3-wide gaps on alternating sides 4-6 cells from the wall; a 3-row
 * band of bricks in each corridor (one empty row above it, three below: the stone runs along the
 * band's underside, a row of 1 x 1 bricks with an x3 shell every 8th cell, driftwood above); a sealed top room past the last gap with x3 shells on its bottom row and a
 * chained keg line; teasers under the bottom floor with a lane kept open under its gap, and
 * driftwood low on the gap's side across the free shots from the launch spot.
 * The variant export swaps the gaps for flip walls worked by levers.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const GAPS = [{ x: 5, y: 36 }, { x: 28, y: 28 }, { x: 5, y: 20 }];
const FLOORS = GAPS.flatMap((g) => [stone(0, g.y, g.x, 1), stone(g.x + 3, g.y, 36 - g.x - 3, 1)]);
/** Each corridor's band: 3 rows; its bottom row (the face a stone climbing the corridor runs along) of 1 x 1 bricks, x3 every 4th. */
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 2, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 8 === 1 ? { ...b, kind: 'x3' as const } : b)),
];
const BANDS = [...band(30), ...band(22)];
const ROOM_SHELLS = fill(0, 16, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 !== 0 });
const ROOM_KEGS = fill(1, 10, 35, 1, 'keg', { bw: 1, skip: (x) => (x - 1) % 3 !== 0 });
const ROOM = [...ROOM_SHELLS, ...ROOM_KEGS, ...fill(0, 4, 36, 6, 'tough', { hp: 3 }), ...fill(0, 11, 36, 4, 'tough', { hp: 2 })];
/** Teasers right of the gap's lane, and 3-hit driftwood low on the left across the launch spot's shots at the gap. */
const TEASERS = [...fill(15, 39, 21, 1, 'tough', { hp: 2 }), ...fill(15, 42, 21, 1, 'soft'), ...fill(6, 46, 9, 1, 'tough', { hp: 3 }), { x: 7, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 } as BrickDef];

export const RECIPE_LAYERS: LevelDef = {
  id: 'recipe-layers', name: 'Floor by Floor', number: 0, chapter: 0, layout: 'layers', par: 90,
  tip: 'Climb the gaps, left then right, floor by floor.',
  bricks: [...FLOORS, ...BANDS, ...ROOM, ...TEASERS],
};

/** The same floors with their gaps shut by flip walls; a lever by the left wall low in the water opens them all. */
const LEVER: BrickDef = { x: 1, y: 41, w: 3, h: 1, kind: 'lever', link: 'a' };
export const RECIPE_LAYERS_LEVERS: LevelDef = {
  ...RECIPE_LAYERS, id: 'recipe-layers-levers', name: 'The Lever Decks',
  tip: 'Hit the lever to open every floor.',
  bricks: [...RECIPE_LAYERS.bricks, LEVER],
  flips: GAPS.map((g) => ({ x: g.x, y: g.y, w: 3, h: 1, link: 'a', on: true })),
};
