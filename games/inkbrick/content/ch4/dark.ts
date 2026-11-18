/**
 * Level 33, "Lantern Light". Signature: Vault, new piece: the dark. The cave is dark: only the
 * area around each stone is lit, so you find the room by feel. Its floor hole is wide and sits
 * right where straight shots go, and once a stone is inside it lights up the sandcastle as it
 * breaks it. Teaches: the dark hides the board, not the rules. Pieces: dark, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(8, 12, 19, 18, [{ side: 'bottom', at: 2, width: 3 }]);
const INSIDE = swapKind(fill(14, 16, 12, 13, 'soft'), [[17, 16], [23, 16]], 'x3');
const TEASERS = [...fill(0, 4, 36, 2, 'soft', { tint: 4 }), ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }), ...fill(0, 33, 6, 1, 'tough', { hp: 2 }), ...fill(30, 33, 6, 1, 'tough', { hp: 2 })];

export const LANTERN_LIGHT: LevelDef = {
  id: 'ch4-33-dark',
  name: 'Lantern Light',
  number: 33,
  chapter: 4,
  layout: 'vault',
  par: 95,
  tip: 'It is dark in here. The hole is under the left of the room.',
  dark: true,
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
