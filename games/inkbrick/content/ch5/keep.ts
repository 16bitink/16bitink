/**
 * Level 49, "The Gauntlet". Signature: Open (no stone), the finale before Brumm's last stand: every
 * piece of the fort in one board, each in its own band so it reads on a phone.
 * Bottom up: two bumpers in the open water; a lever low on the right works the two gates in the
 * fence; hidden driftwood planks glint in the return lanes (one hidden x3 on the launch line);
 * ice sheets by the walls; a crab walks the lane under the fence, guarding the gates. The fence is
 * two rows of 3-hit driftwood armour with two 4-wide flip gates (shut). Behind it: a face of kegs
 * and x3 shells three rows up, sandcastle, an x3 bed, an ice band, driftwood and a keg fuse under the roof.
 * Teaches: everything you have learned at once. Pieces: armour, lever, flip wall, crab, bumper,
 * hidden, ice, keg, x3, soft, tough. The fence is two rows deep, so a novice chews for a while;
 * the lever is the shortcut. The x3 bed (15 shells, row 15) and the 3-hit rows under the roof set
 * the length: 18 shells gave novice clears 90-100%, 12 gave 40% and a 150 s+ skilled clear.
 * Rebuilt 2026-11-18 (was the nested vault "The Whirlpool Keep"): old replay pins go.
 * Lab (30 runs): 10/10 PASS · break-in novice 25.0s / skilled 11.9s, cascade 100%, drought 7.8s,
 * clear skilled 99.2s, novice clears 70.0%, hunt 0.2s, luck 0.45.
 */
import { fill } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const FENCE_ROW = 24;
const FACE_ROW = FENCE_ROW - 5;
const GATES = [8, 24] as const; // the flip gates' x, 4 wide each, in the fence
const arm = (bs: BrickDef[]): BrickDef[] => bs.map((b) => ({ ...b, armour: true }));
// The fence: 4-wide planks of 3-hit driftwood, the gates' cells left to the flip walls.
const FENCE = arm([FENCE_ROW, FENCE_ROW - 1].flatMap((y) => fill(0, y, 36, 1, 'tough', { hp: 3, bw: 4, skip: (x) => GATES.some((g) => x === g) })));
const FLIPS = GATES.map((x) => ({ x, y: FENCE_ROW, w: 4, h: 1, link: 'gate', on: true }));
// The face three rows over the fence: keg, x3, sandcastle, ... (kegs every 3 cells chain).
const FACE = fill(0, FACE_ROW, 36, 1, 'soft', { bw: 1 }).map((b) => ({ ...b, kind: (['keg', 'x3', 'soft'] as const)[b.x % 3]! }));
const PAYLOAD: BrickDef[] = [
  ...fill(0, 16, 36, 3, 'soft', { tint: 4 }),
  ...fill(0, 15, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 2 === 0 && b.x % 12 !== 0 ? { ...b, kind: 'x3' as const } : { ...b, tint: 4 })),
  ...fill(0, 12, 36, 3, 'ice'),
  ...fill(0, 10, 36, 2, 'tough', { hp: 2, tint: 5 }),
  ...fill(0, 8, 36, 2, 'tough', { hp: 3, tint: 6 }),
  ...fill(0, 5, 36, 3, 'tough', { hp: 3, tint: 6 }),
  ...fill(0, 4, 36, 1, 'soft', { bw: 1, tint: 6 }).map((b) => (b.x % 3 === 1 ? { ...b, kind: 'keg' as const } : b)),
  ...fill(0, 3, 36, 1, 'tough', { hp: 2, tint: 6 }),
];
// Under the fence: the crab's lane (rows 27-28) stays clear; ice sheets flush with the walls.
const ICE_SHEETS = [...fill(0, 31, 9, 2, 'ice'), ...fill(27, 31, 9, 2, 'ice')];
// Hidden 2 x 1 planks in the return lanes, 2+ cells from the ice and 3+ rows under the fence.
const GLINT_CELLS: readonly (readonly [number, number])[] = [[17, 36], [12, 34], [22, 34], [6, 37], [28, 37], [14, 39], [20, 39]];
const GLINTS: BrickDef[] = GLINT_CELLS.map(([x, y], k) => (k === 0 ? { x, y, w: 2, h: 1, kind: 'x3', hidden: true } : { x, y, w: 2, h: 1, kind: 'tough', hp: 2, hidden: true }));
const LEVER: BrickDef = { x: 26, y: 42, w: 4, h: 1, kind: 'lever', link: 'gate' };

export const WHIRLPOOL_KEEP: LevelDef = {
  id: 'ch5-49-whirlkeep',
  name: 'The Gauntlet',
  number: 49,
  chapter: 5,
  layout: 'open',
  par: 120,
  tip: 'Pull the lever to open the gates. Mind the crab!',
  flips: FLIPS,
  crabs: [{ y: 27, x0: 4, x1: 29, speed: 2.5, phase: 0 }],
  bumpers: [{ x: 120, y: 690, r: 16 }, { x: 420, y: 690, r: 16 }],
  bricks: [...FENCE, ...FACE, ...PAYLOAD, ...ICE_SHEETS, ...GLINTS, LEVER],
};
