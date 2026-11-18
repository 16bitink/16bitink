/**
 * Level 14, "The Puffin Hut". Signature: Vault, goal Rescue (a puffin is penned in 3-hit driftwood in the hut's far corner), new piece for the vault: drifting floes. A stone hut with a
 * 3-wide door in its floor at the left and an empty chimney up to the roof gap. Inside, bands of ice and
 * driftwood. Outside, two floes of ice drift along the lower board, so the bricks you chase keep moving.
 * Pieces: ice floe, ice, soft, tough, x3.
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(6, 10, 24, 20, [{ side: 'bottom', at: 2, width: 3 }]);
const PUFFIN = { x: 27, y: 26, who: 'puffin' as const };
const INSIDE = minus(swapKind([
  ...fill(12, 14, 17, 5, 'ice'), ...fill(12, 19, 17, 2, 'tough', { hp: 2 }), ...fill(12, 21, 17, 1, 'ice'),
  ...fill(12, 22, 17, 2, 'soft'), ...fill(12, 24, 17, 2, 'ice'), ...fill(12, 26, 17, 3, 'soft'),
], [[20, 23], [24, 23]], 'x3'), [stone(24, 25, 5, 4)]);
// The pen: 3-hit driftwood on its left and under the roof of the corner, the far end from the door.
const PEN = [...fill(24, 25, 3, 4, 'tough', { hp: 2 }), ...fill(27, 25, 2, 1, 'tough', { hp: 2, bw: 2 })];
const TOP = [...fill(0, 3, 36, 1, 'soft', { tint: 1 }), ...fill(0, 4, 36, 3, 'ice')];
const SIDES = [...fill(0, 12, 5, 6, 'soft'), ...fill(31, 12, 5, 6, 'soft')];
const FLOES = [...fill(0, 32, 6, 2, 'ice', { floe: 'west' }), ...fill(30, 36, 6, 2, 'ice', { floe: 'east' })];

export const ICE_HUT: LevelDef = {
  id: 'ch2-14-hut',
  name: 'The Puffin Hut',
  number: 14,
  chapter: 2,
  layout: 'vault',
  goal: 'rescue',
  rescue: PUFFIN,
  par: 115,
  tip: 'Slip in the door and free the puffin in the far corner.',
  floes: [{ id: 'west', dx: 8, dy: 0, period: 7 }, { id: 'east', dx: -8, dy: 0, period: 7 }],
  bricks: [...SHELL, ...INSIDE, ...PEN, ...TOP, ...SIDES, ...FLOES],
};
