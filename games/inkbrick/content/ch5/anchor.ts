/**
 * Level 43, "Brumm's Anchor". Signature: Picture, goal Rescue. Brumm's own anchor, drawn in 1 x 1
 * bricks, hangs over a stone quay (row 33); a seal pup is caught in the ring at the top, behind
 * 2-hit bars. The only way in is a 2-wide gap in the quay by the left wall (x 5-6), off the launch
 * line (two screen planks on row 50 take the launch spot's shots at it). The flukes' underside is a
 * fuse of kegs: the first stone in sets it off and the flukes blow apart; then up past the short
 * stock (x3 shells on its underside) to the ring. Pieces: rescue, soft, tough, x3, keg.
 * Rebuilt 2026-11-18 (gap moved, keg fuse under the flukes, quay raised 3 rows): old pins go.
 * Lab (30 runs): 10/10 PASS · aim 2.3%, break-in novice 29.5s / skilled 11.4s, cascade 76.7%,
 * drought 6.7s, rescue skilled 78.0s, novice clears 83.3%, luck 0.31.
 */
import { fill, minus, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

/** The left half of the picture (x 0-17) from row 3; the right half is its mirror. */
const HALF = [
  '.............RRRRR', //  3 ring
  '...........RRRRRRR', //  4
  '..........RRR...DD', //  5
  '..........RR....D.', //  6 (the pup's pen: x 17-18, rows 6-7)
  '..........RR....D.', //  7
  '..........RRR...DD', //  8
  '...........RRRRRRR', //  9
  '.............RRRRR', // 10
  '................TT', // 11 shank
  '......TTTTTTTTTTTT', // 12 stock
  '......T3TTTTTTTTTT', // 13
  '................oo', // 14
  '................oo', // 15
  '................TT', // 16
  '................oo', // 17
  '................oo', // 18
  '................TT', // 19
  '................oo', // 20
  '..TT............oo', // 21 fluke tips
  '..ToT...........oo', // 22
  '..oooo..........oo', // 23
  '...oooo.........oo', // 24
  '....oooo........oo', // 25
  '.....ooooo......oo', // 26
  '......oooooooooooo', // 27
  '.......ooooooooooo', // 28
  '......KooK3oKooKoK', // 29 the fuse under the flukes
];
const TOP = 3;
const ROWS = HALF.map((h) => h + [...h].reverse().join(''));
const CELL: Record<string, Partial<BrickDef> & { kind: BrickDef['kind'] }> = {
  o: { kind: 'soft', tint: 3 }, T: { kind: 'tough', hp: 2, tint: 6 }, D: { kind: 'tough', hp: 2, tint: 5 }, R: { kind: 'soft', tint: 6 },
  '3': { kind: 'x3' }, K: { kind: 'keg' },
};
const FRIEND = { x: 17, y: 6, who: 'pup' as const };
const PICTURE: BrickDef[] = minus(
  ROWS.flatMap((row, i) => [...row].flatMap((ch, x) => (CELL[ch] ? [{ x, y: TOP + i, w: 1, h: 1, ...CELL[ch] } as BrickDef] : []))),
  [{ x: FRIEND.x, y: FRIEND.y, w: 2, h: 2, kind: 'soft' }],
);
const GAP_X = 5;
const QUAY_Y = 33;
const QUAY = [stone(0, QUAY_Y, GAP_X, 1), stone(GAP_X + 2, QUAY_Y, 36 - GAP_X - 2, 1)];
// Teasers on the right only; the lane under the gap and the bank shots off the left wall stay open.
const TEASERS = [
  ...fill(24, 40, 12, 1, 'soft'), ...fill(27, 44, 9, 1, 'tough', { hp: 2 }), ...fill(21, 37, 15, 1, 'tough', { hp: 2 }),
];
// Driftwood low by the raft across the launch spot's shots at the gap (placed as screenLaunch does).
const SCREEN: BrickDef[] = [{ x: 8, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }, { x: 12, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }];

export const BRUMMS_ANCHOR: LevelDef = {
  id: 'ch5-43-anchor',
  name: "Brumm's Anchor",
  number: 43,
  chapter: 5,
  layout: 'picture',
  goal: 'rescue',
  par: 100,
  tip: 'Bank in by the left wall and free the pup in the ring.',
  rescue: FRIEND,
  bricks: [...PICTURE, ...QUAY, ...TEASERS, ...SCREEN],
};
