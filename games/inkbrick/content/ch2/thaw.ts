/**
 * Level 11, "Frozen Shelf" (rebuilt 2026-11-18 as an open level; a new level, its replay pin is gone).
 * Signature: Open, new piece: ice sheets. No stone: a row of 2-hit driftwood armour on row 20 is the
 * only wall; three rows over it a face of kegs, x3 shells and sandcastle sits on the first ice sheet,
 * so the first stone through the breach blows the face and the wave takes the sheet. Above: a bed of
 * x3 shells every other cell, five rows of 3-hit driftwood planks (the long work), then the second
 * ice sheet under a keg fuse and a driftwood beam: the stone that cracks the top sheet sets off the
 * fuse and the last planks go together (with 3-hit planks under the roof the last-brick hunt was
 * 19 s). Side teasers sit under the armour. Teaches: ice cracks in a chain, so one good hit clears a
 * sheet. Pieces: ice, soft, tough, x3, keg.
 * Lab (30 runs): 10/10 (break-in novice 41.6 s, skilled 17.7 s, cascade 64%, drought 7.9 s, clear
 * skilled 100 s, novice clears 73.3%, hunt 8.7 s, luck 0.30).
 */
import { fill } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const ARMOUR_ROW = 20;
const FACE_ROW = ARMOUR_ROW - 4;
const ARMOUR: BrickDef[] = fill(0, ARMOUR_ROW, 36, 1, 'tough', { hp: 2 }).map((b) => ({ ...b, armour: true }));
// The face three rows over the armour: keg, x3, sandcastle, ... (kegs every 3 cells chain).
const FACE = [
  ...fill(0, FACE_ROW, 36, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, FACE_ROW, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(0, FACE_ROW, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
const SHEETS = [
  // The first sheet sits on the face: its blasts crack it and the wave takes the sheet.
  ...fill(0, FACE_ROW - 3, 36, 3, 'ice'),
  // The second face: x3 shells every other cell, out of the face kegs' reach.
  ...fill(0, FACE_ROW - 4, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 === 1 }),
  ...fill(0, FACE_ROW - 4, 36, 1, 'soft', { bw: 1, skip: (x) => x % 2 === 0 }),
  // The planks: 3-hit driftwood, the level's long work.
  ...fill(0, 7, 36, FACE_ROW - 4 - 7, 'tough', { hp: 3 }),
  // The top: the second ice sheet under a keg fuse and a driftwood beam, so the last planks go off together.
  ...fill(0, 5, 36, 2, 'ice'),
  ...fill(0, 4, 36, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(0, 4, 36, 1, 'soft', { bw: 1, skip: (x) => x % 3 === 1 }),
  ...fill(0, 3, 36, 1, 'tough', { hp: 2 }),
];
// Teasers under the armour at the sides only: the shot lanes in the middle stay open.
const TEASERS = [
  ...fill(0, ARMOUR_ROW + 3, 15, 1, 'tough', { hp: 2 }), ...fill(21, ARMOUR_ROW + 3, 15, 1, 'tough', { hp: 2 }),
  ...fill(0, ARMOUR_ROW + 6, 12, 1, 'tough', { hp: 2 }), ...fill(24, ARMOUR_ROW + 6, 12, 1, 'tough', { hp: 2 }),
];

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
