/**
 * Level 11, "Frozen Shelf" (rebuilt 2026-11-18 as an open level; a new level, its replay pin is gone).
 * Signature: Open, new piece: ice sheets. No stone: a plank of 3-hit driftwood is the only wall; behind
 * it a face of kegs and shells, then two ice sheets split by driftwood. Crack one ice brick and the
 * whole sheet shatters; the driftwood stops the wave. Teaches: ice cracks in a chain, so one good hit
 * clears a sheet. Pieces: ice, soft, tough, x3, keg.
 */
import { fill } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const ARMOUR: BrickDef[] = fill(0, 18, 36, 1, 'tough', { hp: 3 }).map((b) => ({ ...b, armour: true }));
const FACE = [
  ...fill(0, 14, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 14, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(0, 14, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
const SHEETS = [
  ...fill(0, 11, 36, 3, 'ice'),
  ...fill(0, 10, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 === 1 }),
  ...fill(0, 10, 36, 1, 'soft', { bw: 1, skip: (x) => x % 2 === 0 }),
  ...fill(0, 7, 36, 3, 'tough', { hp: 2 }),
  ...fill(0, 4, 36, 3, 'ice'),
];
const TEASERS = [...fill(0, 21, 12, 1, 'soft'), ...fill(24, 21, 12, 1, 'soft'), ...fill(0, 24, 9, 1, 'tough', { hp: 2 }), ...fill(27, 24, 9, 1, 'tough', { hp: 2 })];

export const BIG_THAW: LevelDef = {
  id: 'ch2-11-thaw',
  name: 'Frozen Shelf',
  number: 11,
  chapter: 2,
  layout: 'open',
  par: 100,
  tip: 'Chew the planks, then crack ice: one hit shatters a sheet.',
  bricks: [...ARMOUR, ...FACE, ...SHEETS, ...TEASERS],
};
