/**
 * Level 22, "The Boathouse Doors". Signature: Guarded gate, new piece: shutters. A stone boathouse
 * with a floor hole that a stone shutter slams shut and swings open on a steady beat. Watch the
 * rhythm and shoot as it opens. Teaches: shutters open and close on a timer.
 * Pieces: shutter, soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(8, 12, 20, 18, [{ side: 'bottom', at: 1, width: 3 }]);
const INSIDE = swapKind(fill(14, 16, 12, 13, 'soft'), [[17, 16], [23, 16]], 'x3');
const TEASERS = [...fill(0, 4, 36, 3, 'soft', { tint: 3 }), ...fill(0, 36, 6, 1, 'tough', { hp: 2 }), ...fill(30, 36, 6, 1, 'tough', { hp: 2 }), ...fill(0, 33, 6, 1, 'tough', { hp: 2 }), ...fill(30, 33, 6, 1, 'tough', { hp: 2 })];

export const BOATHOUSE_DOORS: LevelDef = {
  id: 'ch3-22-shutters',
  name: 'The Boathouse Doors',
  number: 22,
  chapter: 3,
  layout: 'guarded',
  par: 130,
  tip: 'The door opens and shuts on a beat. Shoot as it opens.',
  shutters: [{ x: 9, y: 29, w: 3, h: 1, open: 1.8, closed: 1.3, phase: 0 }],
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
