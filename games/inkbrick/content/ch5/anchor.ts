/**
 * Level 43, "Brumm's Anchor". Signature: Picture. Brumm's own anchor, made of 1 x 1 bricks, hangs
 * over a stone quay with one gap on the right; in through the gap and the stone wears the picture
 * away from the flukes up. Kegs on the shank, x3 shells on the ring. Pieces: soft, tough, x3, keg.
 * Goal changed to Rescue (a pup in the ring's eye); old pins no longer apply.
 * Lab (30 runs): 7/11 PASS · MISS break-in novice 8.5s, break-in skilled 0.7s, cascade 8s 13.3%, novice clears 90.0%
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const HALF = [
  '..............oooo',
  '............o3oooo',
  '...........ooo....',
  '...........oo.....',
  '...........ooo....',
  '............oooooo',
  '..............oooo',
  '..TTTTTTTTTTTTTTTT',
  '..TTTT3TTTTTTTTTT',
  '................TT',
  '................oo',
  '................oo',
  '................KK',
  '................oo',
  '................oo',
  '................oo',
  '................oo',
  '................KK',
  '................oo',
  '................oo',
  '................oo',
  '................oo',
  '..TT............oo',
  '..ooo...........oo',
  '..oooo..........oo',
  '...oooo.........oo',
  '....oooo........oo',
  '.....oooooooooooo3',
  '......oooooooooooo',
  '..............oooo',
];
const ROWS = HALF.map((h) => h + [...h].reverse().join(''));
const CELL: Record<string, Partial<BrickDef> & { kind: BrickDef['kind'] }> = {
  o: { kind: 'soft', tint: 3 }, T: { kind: 'tough', hp: 2 }, '3': { kind: 'x3' }, K: { kind: 'keg' },
};
const PICTURE: BrickDef[] = ROWS.flatMap((row, i) =>
  [...row].flatMap((ch, x) => (CELL[ch] ? [{ x, y: 4 + i, w: 1, h: 1, ...CELL[ch] } as BrickDef] : [])));

const QUAY = [stone(0, 36, 29, 1), stone(31, 36, 5, 1)];
const TEASERS = [
  ...fill(0, 40, 15, 1, 'tough', { hp: 2 }), ...fill(0, 44, 12, 1, 'soft'), ...fill(30, 40, 6, 1, 'soft'),
  ...fill(30, 44, 6, 1, 'tough', { hp: 2 }), ...fill(0, 47, 12, 1, 'tough', { hp: 3 }), ...fill(0, 38, 12, 1, 'tough', { hp: 2 }), ...fill(0, 50, 12, 1, 'soft'),
];

export const BRUMMS_ANCHOR: LevelDef = {
  id: 'ch5-43-anchor',
  name: "Brumm's Anchor",
  number: 43,
  chapter: 5,
  layout: 'picture',
  goal: 'rescue',
  par: 100,
  tip: "Free the pup caught in the anchor's ring.",
  rescue: { x: 17, y: 6, who: 'pup' },
  bricks: [...PICTURE, ...QUAY, ...TEASERS],
};
