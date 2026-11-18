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
const PICTURE0: BrickDef[] = ROWS.flatMap((row, i) =>
  [...row].flatMap((ch, x) => (CELL[ch] ? [{ x, y: 4 + i, w: 1, h: 1, ...CELL[ch] } as BrickDef] : [])));

// x3 shells low on the flukes, over the quay gap, where a stone coming in lands first.
const PICTURE = swapKind(PICTURE0.map((b) => (b.kind === 'keg' ? { ...b, kind: 'tough' as const, hp: 2 } : b)), [[27, 31], [29, 31]], 'x3');
// The pup's cage: 3-hit driftwood bars round its 2 x 2 pen in the ring's eye.
const CAGE: BrickDef[] = [
  ...fill(15, 6, 2, 3, 'tough', { hp: 3 }), ...fill(19, 6, 2, 3, 'tough', { hp: 3 }), ...fill(17, 8, 2, 1, 'tough', { hp: 3 }), ...fill(14, 4, 8, 2, 'tough', { hp: 3 }), ...fill(11, 6, 3, 3, 'tough', { hp: 3 }), ...fill(22, 6, 3, 3, 'tough', { hp: 3 }), ...fill(14, 9, 8, 2, 'tough', { hp: 3 }),
];
// Driftwood low by the raft screens the launch spot's shots at the quay gap.
const SCREEN: BrickDef[] = [{ x: 21, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }];
const QUAY = [stone(0, 36, 28, 1), stone(31, 36, 5, 1)];
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
  bricks: [...minus(PICTURE, CAGE), ...CAGE, ...QUAY, ...TEASERS, ...SCREEN],
};
