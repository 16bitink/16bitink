/**
 * Level 8, "The Brick Whale". Signature: Picture. A whale made of single bricks (soft body, tough
 * fins and tail, a row of x3 across its belly) above a stone sea floor with open water at the far
 * left (9 cells): get the stone up through it and it rattles round the whale, and the belly row splits it. Pieces: soft, tough, x3, pickup, keg.
 */
import type { BrickDef, BrickKind } from '../../sim/types';
import { fill, stone } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

// b soft, t tough, e tough eye, 3 x3, w soft spout, K keg, + pickup
const ART = [
  '..............w...............',
  '.............www..............',
  '..........b3b3b3b3b3..........',
  '.......bbbbbbbbbbbbbbbb.....tt',
  '.....bbbbbbbbbbbbbbbbbbbb..ttt',
  '....bbebbbbbbbbbbbbbbbbbbb.tt.',
  '...bbbbbbbbbbbbbbbbbbbbbbbbb..',
  '...bbbbbbbbbbbbbbbbbbbbbbbbtt.',
  '..3b3b3b3b3b3b3b3b3b3b3b3b3b..',
  '..bbbbbbbbbbbbbbbbbbbbbbbbbb..',
  '...bbbbbbbbbbbbbbbbbbbbbbbb...',
  '.....bbbbbbbbbbbbbbbbbbbb.....',
  '.......ttttttbbbbbbbbbb.......',
  '..........ttttttt.............',
];
const KINDS: Record<string, { kind: BrickKind; extra?: Partial<BrickDef> }> = {
  b: { kind: 'soft' }, w: { kind: 'soft', extra: { tint: 1 } }, t: { kind: 'tough', extra: { hp: 2 } },
  e: { kind: 'tough', extra: { hp: 2, tint: 2 } }, '3': { kind: 'x3' }, K: { kind: 'keg' },
};
const X0 = 3;
const Y0 = 9;
const WHALE: BrickDef[] = ART.flatMap((row, r) => [...row].flatMap((c, i) => {
  // The whale's back (rows 3-4 of the art) is tough: the stones rattling over it take two hits each.
  const k = KINDS[c === 'b' && r >= 3 && r <= 4 ? 't' : c];
  return k ? [{ x: X0 + i, y: Y0 + r, w: 1, h: 1, kind: k.kind, ...k.extra } as BrickDef] : [];
}));
// The sea floor: a stone shelf under the whale, open at the left end.
const OPENING = 9;
const SHELF = [stone(OPENING, 25, 36 - OPENING, 1)];
// Teasers under the shelf, away from the lane under the opening.
const SEA = [...fill(15, 29, 18, 2, 'soft'),
  { x: 5, y: 19, w: 1, h: 1, kind: 'x3' } as BrickDef, { x: 5, y: 21, w: 1, h: 1, kind: 'x3' } as BrickDef, { x: 5, y: 23, w: 1, h: 1, kind: 'x3' } as BrickDef];

export const BRICK_WHALE: LevelDef = {
  id: 'ch1-08-whale',
  name: 'The Brick Whale',
  number: 8,
  chapter: 1,
  layout: 'picture',
  par: 50,
  tip: 'Up the left side; the belly row splits the stone.',
  inside: [{ x: 0, y: 0, w: 36, h: 25 }],
  bricks: [...WHALE, ...SHELF, ...SEA],
};
