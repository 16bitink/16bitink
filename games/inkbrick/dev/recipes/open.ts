/**
 * Kit recipe: `open` (docs/inkbrick-level-kit.md "Recipe: open"). No stone at all. A full-width
 * band of driftwood armour (1 row, 3 hits, `armour: true`) is the wall; three empty rows over
 * it; then the payload's face, its bottom row of 1 x 1 bricks: keg, x3, sandcastle, keg, ... (kegs
 * every 3 cells chain: the first stone through the breach sets off the whole face, and the blasts
 * take the payload's lower rows and much of the armour with them); a second face of x3 shells
 * every other cell on row 10, just out of the blasts' reach, for the stones that follow. Teasers under the
 * band where returns land. The break-in is the first stone to reach a cell the armour encloses.
 */
import { fill } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const ARMOUR: BrickDef[] = fill(0, 18, 36, 1, 'tough', { hp: 3 }).map((b) => ({ ...b, armour: true }));
const FACE = fill(0, 14, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 });
const KEGS = fill(0, 14, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 });
const PAYLOAD = [...FACE, ...KEGS, ...fill(0, 14, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }), ...fill(0, 10, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 === 1 }), ...fill(0, 10, 36, 1, 'soft', { bw: 1, skip: (x) => x % 2 === 0 }), ...fill(0, 4, 36, 6, 'tough', { hp: 2 }), ...fill(0, 11, 36, 3, 'soft')];
const TEASERS = [...fill(0, 21, 12, 1, 'soft'), ...fill(24, 21, 12, 1, 'soft'), ...fill(0, 24, 9, 1, 'tough', { hp: 2 }), ...fill(27, 24, 9, 1, 'tough', { hp: 2 })];

export const RECIPE_OPEN: LevelDef = {
  id: 'recipe-open', name: 'The Driftwood Fort', number: 0, chapter: 0, layout: 'open', par: 90,
  tip: 'Chew through the driftwood: the shells behind it do the rest.',
  bricks: [...ARMOUR, ...PAYLOAD, ...TEASERS],
};

/** With a pair of bumpers in the open water (r 18 px, 120 px either side of the middle, row 40). */
export const RECIPE_OPEN_BUMPERS: LevelDef = {
  ...RECIPE_OPEN, id: 'recipe-open-bumpers', name: 'The Bumper Fort',
  bumpers: [{ x: 150, y: 607.5, r: 18 }, { x: 390, y: 607.5, r: 18 }],
};
