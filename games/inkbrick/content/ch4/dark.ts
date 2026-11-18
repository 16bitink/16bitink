/**
 * Level 33, "Glints in the Dark". Signature: Open (no stone), new piece: hidden bricks, in the
 * dark. A fence of 3-hit driftwood spans the cave; behind it a face of kegs and x3 shells and the
 * sandcastle above. Under the fence, in the dark water where every return falls, hang hidden
 * planks of driftwood: nothing shows but a faint glint until a stone touches one, then it pops into
 * view (2 hits, so it stays on screen). The one right over the launch spot is a hidden x3 shell, so
 * the first straight throw finds a glint and splits into three. One hidden x3 only: more of them
 * multiply the stones chewing the fence and the break-in comes in seconds.
 * Teaches: glints in the dark are hidden bricks; the stone finds them. Pieces: dark, hidden,
 * soft, tough, x3, keg. Rebuilt 2026-11-18 (was the vault "Lantern Light"): old replay pins go.
 */
import { fill } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const FENCE_ROW = 24;
const FACE_ROW = FENCE_ROW - 4;
const BED_ROW = FACE_ROW - 4;
// Planks 4 wide: a stone's hits land on the same plank, and the breach is wide enough to fly through.
const FENCE: BrickDef[] = fill(0, FENCE_ROW, 36, 1, 'tough', { hp: 3, bw: 4 }).map((b) => ({ ...b, armour: true }));
// The face three rows over the fence: keg, x3, sandcastle, ... (kegs every 3 cells chain).
const FACE = [
  ...fill(0, FACE_ROW, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(0, FACE_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, FACE_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
// The bed: a second face of x3 every other cell (out of the kegs' reach), sandcastle, driftwood, a beam over a keg fuse.
const PAYLOAD = [
  ...fill(0, BED_ROW + 1, 36, FACE_ROW - BED_ROW - 1, 'soft', { tint: 4 }),
  ...fill(0, BED_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 === 1 }),
  ...fill(0, BED_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 2 === 0 }),
  ...fill(0, 13, 36, BED_ROW - 13, 'soft', { tint: 5 }),
  ...fill(0, 10, 36, 3, 'tough', { hp: 2, tint: 5 }),
  ...fill(0, 6, 36, 4, 'tough', { hp: 2, tint: 6 }),
  ...fill(0, 4, 36, 1, 'tough', { hp: 2, tint: 6 }),
  ...fill(0, 5, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 5, 36, 1, 'soft', { bw: 1, tint: 6, skip: (x) => x % 3 === 1 }),
];
/**
 * The glints: 2 x 1 hidden bricks scattered in the dark water under the fence, in the lanes returns
 * fall through (cells x, y), 3+ rows under the fence and clear of the teasers (a tighter pocket counts
 * as inside). The first, on the launch line, is an x3 shell; the rest are 2-hit driftwood.
 */
const GLINT_CELLS: readonly (readonly [number, number])[] = [
  [17, 36], [10, 33], [24, 33], [4, 30], [30, 30], [13, 29], [21, 29], [7, 35], [27, 35], [14, 32], [20, 32], [11, 39], [23, 39],
];
const X3_GLINTS = 1;
const GLINTS: BrickDef[] = GLINT_CELLS.map(([x, y], k) => (k < X3_GLINTS ? { x, y, w: 2, h: 1, kind: 'x3', hidden: true } : { x, y, w: 2, h: 1, kind: 'tough', hp: 2, hidden: true }));
// Teasers under the fence at the sides only: the shot lanes in the middle stay open.
const TEASERS = [...fill(0, FENCE_ROW + 3, 9, 1, 'soft'), ...fill(27, FENCE_ROW + 3, 9, 1, 'soft')];

export const LANTERN_LIGHT: LevelDef = {
  id: 'ch4-33-dark',
  name: 'Glints in the Dark',
  number: 33,
  chapter: 4,
  layout: 'open',
  par: 95,
  tip: 'A glint in the dark is a hidden brick. Hit it!',
  dark: true,
  bricks: [...FENCE, ...FACE, ...PAYLOAD, ...GLINTS, ...TEASERS],
};
