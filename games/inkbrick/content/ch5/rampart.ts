/**
 * Level 47, "Over the Rampart". Signature: Over the wall. A full-width stone rampart with
 * one tunnel near the left edge. Up the tunnel the stone climbs a chimney to the open water under
 * the ceiling and runs along the backs of the bricks, x3 shells lining the chimney. Crabs added 2026-11-18:
 * one walks the wall's face over the tunnel's mouth, one patrols the water under it. Pieces: crab, soft, tough, x3, pickup.
 * Lab (30 runs): 7/11 PASS · MISS break-in novice 16.6s, break-in skilled 1.1s, cascade 8s 11.7%, last-brick hunt 15.6s
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, CrabDef, LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 24, 7, 1), stone(11, 24, 25, 1)]; // tunnel x7-10
/** Both sides of the chimney, 1 x 1: an x3 shell every sixth row, sandcastle between (columns 6 and 11). */
const LINING: BrickDef[] = [6, 11].flatMap((x) => fill(x, 4, 1, 20, 'soft', { bw: 1 }).map((b) => ((b.y - 1) % 9 === 0 && b.y >= 7 ? { ...b, kind: 'x3' as const } : b)));
const BEHIND = swapKind([
  ...fill(0, 4, 6, 20, 'soft', { bw: 3 }),
  ...fill(12, 4, 24, 2, 'tough', { hp: 2 }), ...fill(12, 6, 24, 10, 'soft'), ...fill(12, 16, 24, 2, 'tough', { hp: 2 }),
  ...fill(12, 18, 24, 4, 'tough', { hp: 2 }),
], [[30, 9]], 'x3');
const FRONT = swapKind([
  ...fill(26, 28, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 30, 10, 1, 'soft', { bw: 5 }), ...fill(26, 32, 10, 2, 'tough', { hp: 2, bw: 5 }),
  ...fill(26, 35, 10, 1, 'soft', { bw: 5 }), ...fill(26, 37, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 39, 10, 2, 'soft', { bw: 5 }),
  ...fill(26, 42, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 44, 10, 1, 'soft', { bw: 5 }), ...fill(26, 46, 10, 2, 'tough', { hp: 2, bw: 5 }),
  ...fill(0, 31, 3, 8, 'soft', { bw: 3, bh: 2 }), ...fill(0, 41, 3, 8, 'tough', { hp: 2, bw: 3, bh: 2 }),
], [[31, 30]], 'pickup', { drop: 'plus3' });

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
