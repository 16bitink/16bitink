/**
 * Level 47, "Over the Rampart". Signature: Over the wall. A full-width stone rampart with
 * one tunnel near the left edge. Up the tunnel the stone climbs a chimney to the open water under
 * the ceiling and runs along the backs of the bricks, x3 shells lining the chimney. Crabs added 2026-11-18:
 * one walks the wall's face over the tunnel's mouth, one patrols the water under it. Pieces: crab, soft, tough, x3, keg.
 * Refit 2026-11-18: no bricks along the left wall under the rampart (they blocked the bank shots: aim
 * 1.8% -> 3.6%); only 2 x3 shells (lining, row 19) and no +3 pickup (4 x3 + pickup: novices 93%);
 * a 1 x 1 keg line under the ceiling (row 5) is the payoff instead (cascade 70%, no extra stones);
 * driftwood middle, a 3-row walkway over the wall, kegs where the last bricks were.
 * Lab (30 runs): 10/11 · MISS novice clears 86.7% (aim 3.6%, break-in novice 34.9 s, skilled
 * 8.5 s, cascade 70%, drought 8.4 s, clear skilled 93 s, hunt 13.3 s, luck 0.35)
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, CrabDef, LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 24, 7, 1), stone(11, 24, 25, 1)]; // tunnel x7-10
/** Both sides of the chimney, 1 x 1: an x3 shell every sixth row, sandcastle between (columns 6 and 11). */
const LINING: BrickDef[] = [6, 11].flatMap((x) => fill(x, 4, 1, 20, 'soft', { bw: 1 }).map((b) => (b.y === 19 ? { ...b, kind: 'x3' as const } : b)));
/** Kegs in the far-right corner of the low driftwood: the last bricks there blow together (hunt was 16-18 s). */
const BEHIND = swapKind(swapKind([
  ...fill(0, 4, 6, 20, 'soft', { bw: 3 }),
  ...fill(12, 4, 24, 1, 'soft', { bw: 1 }),
  ...fill(12, 5, 24, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }), ...fill(12, 5, 24, 1, 'soft', { bw: 1, skip: (x) => x % 3 === 0 }),
  ...fill(12, 6, 24, 4, 'soft'), ...fill(12, 10, 24, 6, 'tough', { hp: 2 }), ...fill(12, 16, 24, 2, 'tough', { hp: 2 }),
  ...fill(12, 18, 24, 3, 'tough', { hp: 2 }),
], [], 'x3'), [[33, 18], [27, 19], [21, 14], [30, 13]], 'keg');
/** A keg in the front field's right column, where its last bricks were. */
const FRONT = swapKind([
  ...fill(26, 28, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 30, 10, 1, 'soft', { bw: 5 }), ...fill(26, 32, 10, 2, 'tough', { hp: 2, bw: 5 }),
  ...fill(26, 35, 10, 1, 'soft', { bw: 5 }), ...fill(26, 37, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 39, 10, 2, 'soft', { bw: 5 }),
  ...fill(26, 42, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 44, 10, 1, 'soft', { bw: 5 }), ...fill(26, 46, 10, 2, 'tough', { hp: 2, bw: 5 }),
], [[31, 40]], 'keg');

/**
 * Crabs on the rampart: one walks the wall's face (row 25) across the tunnel's mouth at 2 cells/s, a
 * second patrols the water lane under the tunnel (row 44) at 3 cells/s, half a cycle behind.
 */
const CRABS: CrabDef[] = [{ y: 25, x0: 4, x1: 13, speed: 1.8, phase: 0.12 }, { y: 44, x0: 4, x1: 24, speed: 4, phase: 0.5 }];

export const OVER_THE_RAMPART: LevelDef = {
  id: 'ch5-47-rampart',
  name: 'Over the Rampart',
  number: 47,
  chapter: 5,
  layout: 'wall',
  par: 85,
  tip: 'Crabs guard the tunnel. Shoot when they walk off.',
  crabs: CRABS,
  bricks: [...WALL, ...LINING, ...BEHIND, ...FRONT],
};
