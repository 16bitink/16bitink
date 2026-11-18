/**
 * Level 13, "Penguin Point". Signature: Picture, an animal on ice. A penguin drawn in 1 x 1 bricks:
 * a ring of ice round a belly of sandcastle, tough eyes. Above a stone shelf with a 3-wide hole at the
 * left; an open chimney runs up beside the penguin. Crack the outline and the whole ice ring shatters,
 * the belly stands alone. Teaches: ice runs along every touching brick, soft stops it.
 * Pieces: ice, soft, tough, x3 (one in the belly).
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const ART = [
  '........******........',
  '......**********......',
  '.....****T****T*****..',
  '.....****oooooo*****..',
  '....************.....',
  '...*****ooo3oooo*****.',
  '...*****oooooooo*****.',
  '..******oooooooooo****',
  '..**************oo****',
  '..******oooooooooo****',
  '...*****oooooooo*****.',
  '...**************oo**.',
  '....****oooooooo*****.',
  '....*****oooooo******.',
  '.....***************..',
  '......**TT*****TT.....',
  '.....TTTT.....TTTT....',
];
const KIND: Record<string, BrickDef['kind']> = { '*': 'ice', o: 'soft', T: 'tough', '3': 'x3' };
const PENGUIN: BrickDef[] = ART.flatMap((row, r) =>
  [...row].flatMap((ch, c) => (KIND[ch] ? [{ x: 7 + c, y: 4 + r, w: 1, h: 1, kind: KIND[ch], ...(ch === 'T' ? { hp: 2 } : {}) } as BrickDef] : [])));
const SHELF = [stone(0, 24, 3, 1), stone(6, 24, 30, 1)];
const TEASERS = [
  ...fill(12, 28, 6, 2, 'soft'), ...fill(26, 28, 9, 2, 'soft'), ...fill(26, 31, 9, 2, 'ice'),
];

export const PENGUIN_POINT: LevelDef = {
  id: 'ch2-13-penguin',
  name: 'Penguin Point',
  number: 13,
  chapter: 2,
  layout: 'picture',
  par: 135,
  tip: 'Crack the ice outline and it all shatters.',
  bricks: [...PENGUIN, ...SHELF, ...TEASERS],
};
