/**
 * Level 17, "The Frozen Core". Signature: Multiplier core. A stone core of 1 x 1 x3 shells with a door
 * below and one above; kegs and ice in the field above it. The stones pour out the top into bands of
 * ice, so one crack runs the whole band. Pieces: x3, ice, keg, soft, tough.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const CORE = shell(11, 24, 14, 10, [{ side: 'bottom', at: 5, width: 4 }, { side: 'top', at: 5, width: 3 }]);
const CORE_FILL = fill(12, 27, 12, 3, 'x3', { bw: 1, skip: (x, y) => (x + y) % 3 !== 0 });
const FIELD = swapKind([
  ...fill(0, 4, 36, 3, 'ice', { bw: 2 }), ...fill(0, 7, 36, 3, 'soft', { tint: 2, bw: 2 }), ...fill(0, 10, 36, 3, 'ice', { bw: 2 }),
  ...fill(0, 13, 36, 3, 'tough', { hp: 2, bw: 2 }), ...fill(0, 16, 36, 6, 'soft', { tint: 2, bw: 2 }),
], [[0, 8], [34, 8], [0, 20], [34, 20], [18, 12]], 'keg');
const PLUG = [...fill(0, 37, 8, 1, 'tough', { hp: 2 }), ...fill(28, 37, 8, 1, 'tough', { hp: 2 })];
const TEASERS = [...fill(0, 40, 9, 1, 'soft'), ...fill(27, 40, 9, 1, 'soft'), ...fill(0, 33, 8, 2, 'ice'), ...fill(28, 33, 8, 2, 'ice')];

export const FROZEN_CORE: LevelDef = {
  id: 'ch2-17-core',
  name: 'The Frozen Core',
  number: 17,
  chapter: 2,
  layout: 'core',
  par: 135,
  tip: 'Crack a shell and the stone becomes three. Then the ice goes.',
  bricks: [...CORE, ...CORE_FILL, ...FIELD, ...PLUG, ...TEASERS],
};
