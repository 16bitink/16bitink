/**
 * Level 27, "The Old Galleon". Signature: Picture. A tall ship of 1 x 1 bricks, sails, masts and
 * hull, hangs over a stone quay with one gap on the right; in through the gap and the stone wears
 * the picture away from the hull up. Pieces: soft, tough, x3, kegs (the cannons).
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const ROWS = [
  '.............fffff..................',
  '.............fffff..................',
  '............Tffff...................',
  '............T.......................',
  '....ssss3sssTsssssss................',
  '....ssssssssTsssssss....T...........',
  '....ssssssssTsssssss....T...........',
  '....ssssssssTsssssssssssTsssssss....',
  '.....sssssssTssssssss3ssTsssssss....',
  '.....sssssssTsssssssssssTsssssss....',
  '.....sssssssTsssssssssssTss3ssss....',
  '.....sssssssTsssssssssssTssssss.....',
  '......ssssssTsssssssssssTssssss.....',
  '......ssssssTsssssssssssTssssss.....',
  '......ssssssTss3ssssssssTssssss.....',
  '......ssssssTsssssssssssTsssss......',
  '.......sssssTsssssssssssTsssss......',
  '............T...........T...........',
  '............T...........T...........',
  '...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..',
  '....ooooooooooooooooooooooooooooo...',
  '......TTTTTKTTTTTTTTTTTTTKTTTTT.....',
  '........oooooo3ooooo3oooooooo.......',
  '..........oooooooooooooooo..........',
];
const TOP_ROW = 4;
const CELL: Record<string, Partial<BrickDef> & { kind: BrickDef['kind'] }> = {
  o: { kind: 'soft' }, s: { kind: 'soft', tint: 1 }, f: { kind: 'soft', tint: 2 },
  T: { kind: 'tough', hp: 2 }, '3': { kind: 'x3' }, K: { kind: 'keg' },
};
const SHIP: BrickDef[] = ROWS.flatMap((row, i) =>
  [...row].flatMap((ch, x) => (CELL[ch] ? [{ x, y: TOP_ROW + i, w: 1, h: 1, ...CELL[ch] } as BrickDef] : [])));

const QUAY = [stone(0, 32, 28, 1), stone(31, 32, 5, 1)]; // gap x28-30
const TEASERS = [
  ...fill(0, 36, 18, 1, 'soft'), ...fill(0, 40, 15, 1, 'tough', { hp: 2 }), ...fill(18, 38, 9, 1, 'soft'),
  ...fill(33, 35, 3, 4, 'soft', { bw: 1 }), ...fill(3, 44, 12, 1, 'soft'),
];

export const OLD_GALLEON: LevelDef = {
  id: 'ch3-27-galleon', name: 'The Old Galleon', number: 27, chapter: 3, layout: 'picture', par: 120,
  tip: 'Under the quay gap the old galleon waits. Wear it away.',
  bricks: [...SHIP, ...QUAY, ...TEASERS],
};
