/**
 * Level 25, "The Long Quay". Signature: Over the wall. A full-width stone quay with one tunnel by
 * the right edge; up the tunnel the stone climbs an empty chimney to the open water under the
 * ceiling and runs along the backs of the bricks, x3 shells lining the chimney. A band of ice in
 * front gives the stone something to chew on while it lines up. Pieces: soft, tough, x3, ice, pickup.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 14, 28, 1), stone(32, 14, 4, 1)];
const BEHIND = swapKind([
  ...fill(0, 4, 27, 2, 'soft', { bw: 3 }), ...fill(0, 6, 27, 4, 'soft', { bw: 3 }), ...fill(0, 10, 27, 2, 'tough', { hp: 2, bw: 3 }), ...fill(0, 12, 27, 2, 'tough', { hp: 2 }),
  ...fill(32, 4, 4, 10, 'soft', { bw: 1 }),
], [[24, 5], [24, 8], [24, 11], [12, 8]], 'x3');
const FRONT = [
  ...fill(0, 18, 24, 1, 'tough', { hp: 2 }), ...fill(4, 22, 15, 2, 'ice'), ...swapKind(fill(0, 27, 24, 1, 'soft'), [[9, 27]], 'pickup', { drop: 'plus3' }),
  ...fill(6, 31, 18, 1, 'tough', { hp: 2 }), ...fill(0, 35, 15, 1, 'soft'), ...fill(33, 24, 3, 6, 'soft', { bw: 1 }), ...fill(33, 33, 3, 6, 'tough', { bw: 1, hp: 2 }),
];

export const LONG_QUAY: LevelDef = {
  id: 'ch3-25-quay', name: 'The Long Quay', number: 25, chapter: 3, layout: 'wall', par: 95,
  tip: 'One tunnel by the right edge. Get the stone up it and let it run.',
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
