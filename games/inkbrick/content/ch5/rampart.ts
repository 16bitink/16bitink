/**
 * Level 47, "Over the Rampart". Signature: Over the wall. A full-width stone rampart with
 * one tunnel near the left edge. Up the tunnel the stone climbs a chimney to the open water under
 * the ceiling and runs along the backs of the bricks, x3 shells lining the chimney. Pieces: soft, tough, x3, pickup.
 * Lab (30 runs): 7/11 PASS · MISS break-in novice 16.6s, break-in skilled 1.1s, cascade 8s 11.7%, last-brick hunt 15.6s
 */
import { fill, minus, shell, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 24, 7, 1), stone(11, 24, 25, 1)]; // tunnel x7-10
const BEHIND = swapKind([
  ...fill(0, 4, 6, 20, 'soft', { bw: 3 }),
  ...fill(12, 4, 24, 2, 'tough', { hp: 2 }), ...fill(12, 6, 24, 10, 'soft'), ...fill(12, 16, 24, 2, 'tough', { hp: 2 }),
  ...fill(12, 18, 24, 4, 'soft'), ...fill(12, 22, 24, 2, 'tough', { hp: 2 }),
], [[12, 8], [18, 10], [24, 7], [30, 9], [33, 12], [12, 18], [27, 18]], 'x3');
const FRONT = swapKind([
  ...fill(26, 28, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 30, 10, 1, 'soft', { bw: 5 }), ...fill(26, 32, 10, 2, 'tough', { hp: 2, bw: 5 }),
  ...fill(26, 35, 10, 1, 'soft', { bw: 5 }), ...fill(26, 37, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 39, 10, 2, 'soft', { bw: 5 }),
  ...fill(26, 42, 10, 1, 'tough', { hp: 2, bw: 5 }), ...fill(26, 44, 10, 1, 'soft', { bw: 5 }), ...fill(26, 46, 10, 2, 'tough', { hp: 2, bw: 5 }),
  ...fill(0, 31, 3, 8, 'soft', { bw: 3, bh: 2 }), ...fill(0, 41, 3, 8, 'tough', { hp: 2, bw: 3, bh: 2 }),
], [[31, 30]], 'pickup', { drop: 'plus3' });

export const OVER_THE_RAMPART: LevelDef = {
  id: 'ch5-47-rampart',
  name: 'Over the Rampart',
  number: 47,
  chapter: 5,
  layout: 'wall',
  par: 85,
  tip: 'One tunnel by the left. Get the stone up it and let it run.',
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
