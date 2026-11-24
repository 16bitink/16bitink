/**
 * Level 4, "Chain Blast". Signature: Fuse. A row of kegs runs along the top of a soft field in the
 * middle of the cove, each one three cells from the next: break one and the whole row goes off in
 * a chain, taking the bricks under it. The water is open on both sides of the field (9 cells each)
 * and above it, so a shot off either wall gets up to the fuse; two kegs under the field are a taste of
 * it. Pieces: soft, tough, x3, keg, pickup. Mirrored about the middle (but for the pickups).
 */
import { fill, swapKind } from '../../sim/kit';
import type { BrickDef, LevelDef } from '../../sim/types';

const X = 9;
const W = 18;
const TOP_ROW = 8;
const DEPTH = 9;

const FUSE = [
  ...fill(X, TOP_ROW, W, 1, 'keg', { bw: 1, skip: (x) => (x - X) % 3 !== 1 }),
  ...fill(X, TOP_ROW, W, 1, 'soft', { bw: 1, skip: (x) => (x - X) % 3 === 1 }),
];
const BODY = fill(X, TOP_ROW + 1, W, DEPTH - 2, 'soft');
const LOW = TOP_ROW + DEPTH - 1;
const BOTTOM = fill(X, LOW, W, 1, 'tough', { hp: 2 });
const FIELD = swapKind(swapKind(swapKind(swapKind([...FUSE, ...BODY, ...BOTTOM],
  [[X, LOW], [X + W - 3, LOW]], 'keg', { hp: 1 }),
[[X, TOP_ROW + 3], [X + W - 3, TOP_ROW + 3], [X + 6, TOP_ROW + 6], [X + 9, TOP_ROW + 6]], 'x3'),
[[X + 3, TOP_ROW + 6]], 'pickup', { drop: 'plus3' }),
[[X + 12, TOP_ROW + 6]], 'pickup', { drop: 'fireball' });
// A few soft teasers low in the middle, either side of the straight-up shot.
const TEASERS: BrickDef[] = [...fill(11, 30, 3, 1, 'soft'), ...fill(22, 30, 3, 1, 'soft'), ...fill(8, 34, 3, 1, 'soft'), ...fill(25, 34, 3, 1, 'soft')];

export const CHAIN_BLAST: LevelDef = {
  id: 'ch1-04-fuse',
  name: 'Chain Blast',
  number: 4,
  chapter: 1,
  par: 55,
  layout: 'fuse',
  tip: 'Get over the top: break one keg and watch the row go.',
  inside: [{ x: 0, y: 0, w: 36, h: TOP_ROW }],
  bricks: [...FIELD, ...TEASERS],
};
