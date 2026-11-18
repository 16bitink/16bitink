/**
 * Level 26, "The Shuttered Gate". Signature: Guarded gate (shutter on the hole). The vault's floor
 * hole on the right is slammed shut by a stone shutter on a steady beat: wait for it to swing open,
 * then in and up the chimney. Pieces: shutter, soft, tough, x3, ice.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(7, 12, 22, 19, [{ side: 'bottom', at: 18, width: 3 }]);
const INSIDE = swapKind(fill(8, 16, 15, 14, 'soft'), [[11, 16], [17, 16], [14, 22], [20, 24], [9, 26]], 'x3');
const TEASERS = [
  ...fill(0, 4, 36, 3, 'soft', { tint: 2 }), ...fill(0, 8, 6, 2, 'soft'), ...fill(30, 8, 6, 2, 'soft'),
  ...fill(0, 34, 18, 1, 'ice'), ...fill(30, 34, 6, 1, 'tough', { hp: 2 }),
  ...fill(0, 38, 15, 1, 'tough', { hp: 2 }), ...fill(31, 40, 5, 1, 'soft', { bw: 1 }),
];

export const SHUTTERED_GATE: LevelDef = {
  id: 'ch3-26-gate', name: 'The Shuttered Gate', number: 26, chapter: 3, layout: 'guarded', par: 145,
  shutters: [{ x: 25, y: 31, w: 3, h: 1, open: 2.3, closed: 1.65, phase: 0 }],
  tip: 'Wait for the shutter to swing open, then shoot.',
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
