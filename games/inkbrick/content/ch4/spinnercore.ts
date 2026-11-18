/**
 * Level 38, "The Whirling Core". Signature: Multiplier core. A stone core packed with x3 shells,
 * a door below and one above; a spinner turns under the lower door and guards it. Kegs in the
 * field's corners stop the hunt. Pieces: spinner, x3, kegs, soft, tough.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const CORE = shell(11, 24, 14, 10, [
  { side: 'bottom', at: 5, width: 4 },
  { side: 'top', at: 5, width: 4 },
]);
const CORE_FILL = fill(12, 27, 12, 4, 'x3', { bw: 1, skip: (x, y) => (x + y) % 2 === 1 });
const FIELD = swapKind([
  ...fill(0, 4, 36, 4, 'tough', { hp: 2, tint: 2 }), ...fill(0, 8, 36, 8, 'soft', { tint: 2 }),
], [[0, 5], [33, 5], [0, 13], [33, 13]], 'keg');
const TEASERS = [
  ...fill(0, 37, 9, 1, 'tough', { hp: 2 }), ...fill(27, 37, 9, 1, 'soft'), ...fill(0, 41, 9, 1, 'soft'), ...fill(27, 41, 9, 1, 'soft'),
];

export const WHIRLING_CORE: LevelDef = {
  id: 'ch4-38-core',
  name: 'The Whirling Core',
  number: 38,
  chapter: 4,
  layout: 'core',
  par: 80,
  spinners: [{ x: 17, y: 36, length: 4, period: 1.6, phase: 0.4 }],
  bricks: [...CORE, ...CORE_FILL, ...FIELD, ...TEASERS],
};
