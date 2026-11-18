/**
 * Level 34, "The Tide Gate". Signature: Guarded gate with a spinner. A wide cave room with its
 * floor hole at the right, and a stone bar turning under it: lying flat it seals the hole, stood up
 * it lets the stone through. A +3 pickup sits in the room's field. Teaches: time the shot to the
 * bar, from the other side. Pieces: spinner, soft, tough, x3, pickup.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(7, 12, 20, 18, [{ side: 'bottom', at: 13, width: 4 }]);
const FIELD = swapKind(swapKind(fill(8, 16, 12, 13, 'soft'), [[8, 16], [17, 16], [11, 22]], 'x3'), [[14, 25]], 'pickup', { drop: 'plus3' });
const TEASERS = [...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }), ...fill(0, 41, 8, 1, 'soft')];

export const TIDE_GATE: LevelDef = {
  id: 'ch4-34-tide',
  name: 'The Tide Gate',
  number: 34,
  chapter: 4,
  layout: 'guarded',
  par: 85,
  tip: 'The gate is on the right this time. Shoot when the bar stands up.',
  spinners: [{ x: 21, y: 32, length: 3, period: 2.5, phase: 0.625 }],
  bricks: [...SHELL, ...FIELD, ...TEASERS],
};
