/**
 * Level 7, "The Pearl Reef". Signature: Multiplier core, wide and flat with a door below and
 * one above. An empty chimney runs up from the bottom door to the shells; driftwood low in the open
 * water covers the shot from the launch spot. A packed field of tiny x3 shells in a stone reef: break in and the stones multiply and
 * pour out of the top door onto the kelp beds. Pieces: soft, tough, x3, keg (barrels in the kelp beds end the hunt).
 */
import { fill, shell, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const REEF = shell(6, 20, 24, 12, [{ side: 'bottom', at: 5, width: 3 }, { side: 'top', at: 16, width: 4 }]);
// A chimney (columns 10-15) up from the bottom door through the sandcastle to the x3 shells.
const REEF_FILL = swapKind([...fill(7, 23, 22, 2, 'x3', { bw: 1, skip: (x, y) => (x + y) % 2 === 1 || (y === 24 && x % 4 === 0) }),
  ...fill(7, 25, 22, 3, 'soft', { skip: (x) => x === 10 || x === 13 })], [[7, 25], [25, 25]], 'keg');
const FIELD = swapKind([...fill(0, 4, 36, 3, 'tough', { hp: 2, tint: 2 }), ...fill(0, 7, 36, 6, 'soft', { tint: 2 }), ...fill(0, 13, 36, 2, 'tough', { hp: 2 }), ...fill(0, 15, 36, 1, 'tough', { hp: 2 }), ...fill(0, 16, 36, 2, 'soft', { tint: 2 })], [[0, 7], [33, 7], [0, 15], [33, 15], [6, 10], [18, 10], [27, 10]], 'keg');
// Driftwood across the shot from the launch spot to the door, low in the open water.
const PLUG = [...fill(14, 46, 5, 1, 'tough', { hp: 3, bw: 5 }), ...fill(19, 33, 3, 1, 'tough', { hp: 2 }), ...fill(26, 35, 4, 1, 'tough', { hp: 2 })];
// Teasers either side of the lane under the door (columns 8-17 kept clear).
const TEASERS = [...fill(0, 38, 6, 1, 'tough', { hp: 2 }), ...fill(20, 38, 16, 1, 'tough', { hp: 2, skip: (x) => x % 9 > 5 }),
  ...fill(0, 41, 6, 1, 'soft'), ...fill(21, 41, 15, 1, 'soft', { skip: (x) => x % 12 > 8 })];

export const PEARL_REEF: LevelDef = {
  id: 'ch1-07-reef',
  name: 'The Pearl Reef',
  number: 7,
  chapter: 1,
  layout: 'core',
  par: 105,
  tip: 'Every x3 shell turns one stone into three. Get in, and pour out the top.',
  bricks: [...REEF, ...REEF_FILL, ...FIELD, ...PLUG, ...TEASERS],
};
