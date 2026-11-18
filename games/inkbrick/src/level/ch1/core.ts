/**
 * Level 3, "The Shell Core". Signature: Multiplier core. Small x3 shells packed in a stone core
 * with a hole below and a hole above: break in, and the stones multiply and pour out the top
 * into the sandcastles. New piece: x3 (each x3 a stone breaks splits it into three).
 */
import { fill, shell, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const CORE = shell(11, 22, 14, 10, [
  { side: 'bottom', at: 5, width: 4 },
  { side: 'top', at: 5, width: 4 },
]);
const CORE_FILL = fill(12, 25, 12, 4, 'x3', { bw: 1, skip: (x, y) => (x + y) % 2 === 1 });
// Kegs in the field's corners blow out the last bricks there (no long hunt).
const FIELD = swapKind([...fill(0, 4, 36, 4, 'tough', { hp: 2, tint: 2 }), ...fill(0, 8, 36, 8, 'soft', { tint: 2 })], [[0, 5], [33, 5], [0, 13], [33, 13]], 'keg');
// Driftwood under the core's door: straight shots must chew through it, angled ones slip past.
const PLUG = [...fill(16, 35, 3, 1, 'tough', { hp: 3 }), ...fill(10, 33, 3, 1, 'tough', { hp: 2 }), ...fill(23, 33, 3, 1, 'tough', { hp: 2 })];
const TEASERS = [...fill(0, 38, 9, 1, 'soft'), ...fill(27, 38, 9, 1, 'soft')];

export const MULTIPLIER_CORE: LevelDef = {
  id: 'ch1-03-core',
  name: 'The Shell Core',
  number: 3,
  chapter: 1,
  layout: 'core',
  par: 80,
  tip: 'Crack an x3 shell and the stone becomes three.',
  bricks: [...CORE, ...CORE_FILL, ...FIELD, ...PLUG, ...TEASERS],
};
