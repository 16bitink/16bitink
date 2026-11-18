/**
 * Level 34, "The Turning Bars". Rebuilt 2026-11-18 as layers (the old pins of ch4-34-tide are
 * gone). Signature: Layers with spinners guarding the gaps. Two stone floors cut the sea cave in
 * three: each gap (4 wide) has a stone bar turning under it, flat it seals the gap, upright it lets
 * the stone through. Gap by the left wall below, by the right above, then the cave's top room
 * with a +3 pickup in the rubble. Pieces: spinner, soft, tough, x3, pickup.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const GAPS = [{ x: 6, y: 34 }, { x: 24, y: 20 }];
const FLOORS = GAPS.flatMap((g) => [stone(0, g.y, g.x, 1), stone(g.x + 4, g.y, 36 - g.x - 4, 1)]);
/** The one corridor between the floors: a band of driftwood over a row of 1 x 1 sandcastle with x3 shells. */
const BAND: BrickDef[] = [
  ...fill(0, 26, 36, 1, 'tough', { hp: 3 }), ...fill(0, 27, 36, 1, 'tough', { hp: 3 }),
  ...fill(0, 28, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 6 === 3 ? { ...b, kind: 'x3' as const } : b)),
];
const ROOM = swapKind([
  ...fill(0, 9, 36, 1, 'tough', { hp: 3 }),
  ...fill(0, 16, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 6 === 4 ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 11, 36, 5, 'tough', { hp: 3 }), ...fill(0, 10, 36, 1, 'tough', { hp: 3 }), ...fill(0, 5, 36, 4, 'tough', { hp: 3 }), ...fill(0, 4, 36, 1, 'tough', { hp: 2 }),
], [[18, 12]], 'pickup', { drop: 'plus3' });
const TEASERS: BrickDef[] = [...fill(18, 41, 18, 1, 'tough', { hp: 3 }), ...fill(21, 44, 15, 1, 'tough', { hp: 3 }), ...fill(20, 38, 16, 1, 'tough', { hp: 3 }), ...fill(0, 41, 7, 1, 'tough', { hp: 2 }), ...fill(0, 47, 9, 1, 'soft'), ...fill(26, 47, 10, 1, 'tough', { hp: 3 }), { x: 12, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }];

export const TIDE_GATE: LevelDef = {
  id: 'ch4-34-tide',
  name: 'The Turning Bars',
  number: 34,
  chapter: 4,
  layout: 'layers',
  par: 110,
  tip: 'Shoot through each gap when its bar stands up.',
  spinners: [
    { x: 7, y: 38, length: 3, period: 2.2, phase: 0.55 },
    { x: 25, y: 23, length: 3, period: 2.2, phase: 1.65 },
  ],
  bricks: [...FLOORS, ...BAND, ...ROOM, ...TEASERS],
};
