/**
 * Level 12, "Drift Ice". Signature: Hourglass, new piece: sliding floes. A full-width stone shelf
 * with a narrow neck at the left; under it a floe of ice drifts back and forth and covers the neck
 * now and then. Above the neck the top half waits. Teaches: moving bricks block and unblock a
 * hole; time the shot, or smash the floe. Pieces: ice floe, soft, tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const NECK_ROW = 18;
const NECK_X = 8;
const NECK_W = 3;

const SHELF: BrickDef[] = [stone(0, NECK_ROW, NECK_X, 1), stone(NECK_X + NECK_W, NECK_ROW, 36 - NECK_X - NECK_W, 1)];
const TOP = swapKind([...fill(0, 4, 36, 5, 'tough', { hp: 2 }), ...fill(0, 9, 36, 5, 'soft')], [[3, 13], [18, 13], [30, 13]], 'x3');
const FLOE = fill(14, 30, 9, 1, 'ice', { floe: 'drift' });
const TEASERS = [...fill(0, 38, 6, 1, 'tough', { hp: 2 }), ...fill(30, 38, 6, 1, 'tough', { hp: 2 }), ...fill(24, 24, 12, 2, 'soft'), ...fill(0, 34, 6, 1, 'tough', { hp: 2 }), ...fill(30, 34, 6, 1, 'tough', { hp: 2 })];

export const DRIFT_ICE: LevelDef = {
  id: 'ch2-12-drift',
  name: 'Drift Ice',
  number: 12,
  chapter: 2,
  layout: 'hourglass',
  par: 100,
  tip: 'The floe drifts across the neck. Shoot when it has passed.',
  floes: [{ id: 'drift', dx: -12, dy: 0, period: 6 }],
  bricks: [...SHELF, ...TOP, ...FLOE, ...TEASERS],
};
