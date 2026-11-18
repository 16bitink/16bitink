/**
 * Level 34, "The Turning Bars". Rebuilt 2026-11-18 as layers (the old pins of ch4-34-tide are
 * gone). Signature: Layers with spinners guarding the gaps. Two stone floors cut the sea cave in
 * three: each gap (4 wide) has a stone bar turning under it, flat it seals the gap, upright it lets
 * the stone through. The bottom gap hugs the left wall (x 2-5, bank shots off the wall), the upper
 * gap is by the right wall, then the cave's top room of driftwood. x3 shells sit over the bottom
 * gap in the band (columns 1, 3, 5) and every 9th cell under the room; no +3 pickup (with it and
 * x3 every 6th cell novices cleared 100%). Lab 30 runs: 11/11 (aim 2.0%, break-in novice 27.5 s,
 * skilled 11.5 s, cascade 46.7%, clear skilled 87.7 s, novice clears 76.7%).
 * Pieces: spinner, soft, tough, x3.
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const GAPS = [{ x: 2, y: 34, w: 4 }, { x: 24, y: 20, w: 4 }];
const FLOORS = GAPS.flatMap((g) => [stone(0, g.y, g.x, 1), stone(g.x + g.w, g.y, 36 - g.x - g.w, 1)]);
/** The one corridor between the floors: a band of driftwood over a row of 1 x 1 sandcastle with x3 shells. */
const BAND: BrickDef[] = [
  ...fill(0, 26, 36, 1, 'tough', { hp: 3 }), ...fill(0, 27, 36, 1, 'tough', { hp: 3 }),
  ...fill(0, 28, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 6 === 3 || b.x === 5 || b.x === 1 ? { ...b, kind: 'x3' as const } : b)),
];
const ROOM: BrickDef[] = [
  ...fill(0, 9, 36, 1, 'tough', { hp: 3 }),
  ...fill(0, 16, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 9 === 4 ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 11, 36, 5, 'tough', { hp: 3 }), ...fill(0, 10, 36, 1, 'tough', { hp: 3 }), ...fill(0, 5, 36, 4, 'tough', { hp: 3 }), ...fill(0, 4, 36, 1, 'tough', { hp: 3 }),
];
const TEASERS: BrickDef[] = [...fill(18, 41, 18, 1, 'tough', { hp: 3 }), ...fill(21, 44, 15, 1, 'tough', { hp: 3 }), ...fill(20, 38, 16, 1, 'tough', { hp: 3 }), ...fill(0, 41, 7, 1, 'tough', { hp: 3 }), ...fill(0, 47, 9, 1, 'tough', { hp: 3 }), ...fill(26, 47, 10, 1, 'tough', { hp: 3 }), { x: 12, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }];

export const TIDE_GATE: LevelDef = {
  id: 'ch4-34-tide',
  name: 'The Turning Bars',
  number: 34,
  chapter: 4,
  layout: 'layers',
  par: 110,
  tip: 'Shoot through each gap when its bar stands up.',
  spinners: [
    { x: 3, y: 38, length: 3, period: 2.2, phase: 0.55 },
    { x: 25, y: 23, length: 3, period: 2.2, phase: 1.65 },
  ],
  bricks: [...FLOORS, ...BAND, ...ROOM, ...TEASERS],
};
