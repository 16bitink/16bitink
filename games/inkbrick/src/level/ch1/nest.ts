/**
 * Level 9, "The Double Wreck". Signature: a break-in inside a break-in (the run-up to Brumm): two
 * wrecks stacked, each with its own door. The lower wreck's door is at the bottom right; the stone
 * has to cross it and find the hatch in its roof on the left, which is the floor door of the upper
 * wreck, where the x3 cargo is. A small hatch in its roof lets stones out onto the deck, where a fuse of kegs
 * clears the last bricks. Pieces: soft,
 * tough, x3, keg.
 */
import { fill, shell, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const UPPER = shell(8, 8, 20, 18, [{ side: 'bottom', at: 2, width: 3 }, { side: 'top', at: 15, width: 2 }]);
const LOWER = shell(8, 26, 20, 18, [{ side: 'top', at: 2, width: 3 }, { side: 'bottom', at: 15, width: 2 }]);
const CARGO = swapKind([...fill(14, 17, 13, 2, 'tough', { hp: 2 }), ...fill(14, 19, 13, 6, 'soft'), ...fill(14, 16, 13, 1, 'x3', { bw: 1, skip: (x) => x % 6 !== 2 })], [], 'keg');
// x3 shells strung across the lower hold: a stone that gets in splits and finds the hatch.
const HOLD = fill(11, 34, 14, 1, 'x3', { bw: 1, skip: (x) => x !== 18 });
// The deck above: stones out of the upper wreck's roof hatch rattle along under it.
// A fuse of 1 x 1 kegs along the deck, one every three cells: the last bricks up there go off together.
const FUSE = fill(1, 4, 35, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 });
const FIELD = [...fill(0, 3, 36, 1, 'tough', { hp: 2, tint: 2 }), ...fill(0, 4, 36, 2, 'soft', { tint: 2, bw: 1, skip: (x, y) => y === 4 && x % 3 === 1 }),
  ...fill(0, 8, 6, 9, 'soft'), ...fill(30, 8, 6, 9, 'soft'), ...FUSE];
// Driftwood low across the shot from the launch spot to the lower door.
const FLOOR = [...fill(0, 46, 14, 1, 'soft'), ...fill(31, 46, 5, 1, 'soft'), ...fill(0, 49, 10, 1, 'tough', { hp: 2 }),
  ...fill(20, 50, 4, 1, 'tough', { hp: 3, bw: 4 })];

export const DOUBLE_WRECK: LevelDef = {
  id: 'ch1-09-nest',
  name: 'The Double Wreck',
  number: 9,
  chapter: 1,
  layout: 'nested',
  par: 80,
  tip: 'Two doors: in at the bottom right, then up through the hatch on the left.',
  bricks: [...UPPER, ...LOWER, ...CARGO, ...HOLD, ...FIELD, ...FLOOR],
};
