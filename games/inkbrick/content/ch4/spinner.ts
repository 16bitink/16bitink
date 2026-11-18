/**
 * Level 32, "The Turning Gate". Signature: Guarded gate, new piece: spinners. A cave room with a
 * floor hole and a stone bar turning just under it: sometimes it lies flat across the hole,
 * sometimes it stands up and the way is clear (and a stone it hits flies off at a new angle).
 * Teaches: spinners guard holes; shoot when the bar points up. Pieces: spinner, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(8, 12, 20, 18, [{ side: 'bottom', at: 2, width: 4 }]);
const INSIDE = swapKind(fill(15, 16, 12, 13, 'soft'), [[18, 16], [24, 16], [21, 22]], 'x3');
const TEASERS = [...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 })];

export const TURNING_GATE: LevelDef = {
  id: 'ch4-32-spinner',
  name: 'The Turning Gate',
  number: 32,
  chapter: 4,
  layout: 'guarded',
  par: 110,
  tip: 'Wait for the bar to stand up, then shoot through the hole.',
  spinners: [{ x: 11, y: 32, length: 3, period: 2.5, phase: 0.625 }],
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
