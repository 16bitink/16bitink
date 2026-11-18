/**
 * Level 42, "The Sluice Gate". Signature: Guarded gate, shutter. A stone boathouse with a floor
 * door that a stone shutter slams shut on a beat; inside, bands of ice between sandcastle rows
 * and a few x3 shells. Time the shot, then crack one ice brick and a wave runs through the band.
 * Pieces: shutter, ice, soft, tough, x3.
 * Lab (30 runs): 8/11 PASS · MISS break-in novice 18.5s, break-in skilled 1.0s, novice clears 93.3%
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const SHELL = shell(8, 12, 20, 18, [{ side: 'bottom', at: 1, width: 4 }]);
const INSIDE = swapKind([
  ...fill(14, 16, 12, 1, 'soft'), ...fill(14, 17, 12, 2, 'ice'), ...fill(14, 19, 12, 1, 'soft'),
  ...fill(14, 20, 12, 2, 'ice'), ...fill(14, 22, 12, 1, 'tough', { hp: 2 }), ...fill(14, 23, 12, 2, 'ice'),
  ...fill(14, 25, 12, 4, 'tough', { hp: 2 }),
], [[17, 16], [23, 16], [20, 25]], 'x3');
const TEASERS = [
  ...fill(0, 4, 36, 3, 'tough', { hp: 2, tint: 5, bw: 6, bh: 3 }), ...fill(0, 8, 8, 22, 'soft', { bw: 8, bh: 3 }), ...fill(28, 8, 8, 22, 'soft', { bw: 8, bh: 3 }),
  ...fill(0, 36, 6, 1, 'tough', { hp: 2 }), ...fill(30, 36, 6, 1, 'tough', { hp: 2 }), ...fill(18, 38, 12, 1, 'soft'), ...fill(24, 43, 12, 1, 'tough', { hp: 2 }), ...fill(0, 46, 6, 1, 'soft'),
];

export const SLUICE_GATE: LevelDef = {
  id: 'ch5-42-sluice',
  name: 'The Sluice Gate',
  number: 42,
  chapter: 5,
  layout: 'guarded',
  par: 100,
  tip: 'The sluice shuts on a beat. Shoot as it opens, then crack the ice.',
  shutters: [{ x: 9, y: 29, w: 4, h: 1, open: 1.8, closed: 1.2, phase: 0 }],
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
