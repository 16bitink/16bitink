/**
 * Level 5, "The Wreck Hold". Signature: Vault (a wide, low hold with its door in the middle of the
 * floor). Two blocks of cargo stand either side of an empty chimney that runs up to open water under
 * the roof: send the stone up through the door, it climbs, slides off the roof and works along the
 * tops of the crates. Pieces: soft, tough, x3, keg (a few barrels in the cargo blow their
 * neighbours out).
 */
import { fill, shell, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const HOLD = shell(12, 13, 18, 19, [{ side: 'bottom', at: 14, width: 3 }]);
const CARGO = [...fill(13, 18, 11, 3, 'tough', { hp: 2 }), ...fill(13, 21, 11, 10, 'soft'), ...fill(13, 17, 11, 1, 'x3', { bw: 1, skip: (x) => x % 2 === 1 })];
const BARRELS = swapKind(CARGO, [[13, 26], [19, 29]], 'keg');
// Crates under the door: straight shots chew through, angled ones slip past.
const PLUG = [...fill(26, 35, 3, 1, 'tough', { hp: 3 })];
const TEASERS = [...fill(0, 4, 36, 3, 'soft', { tint: 1 }), ...fill(0, 8, 8, 1, 'tough', { hp: 2 }), ...fill(28, 8, 8, 1, 'tough', { hp: 2 }),
  ...fill(0, 36, 8, 1, 'tough', { hp: 2 }), ...fill(4, 40, 8, 1, 'soft'), ...fill(24, 40, 8, 1, 'soft'), ...fill(0, 44, 10, 1, 'soft'), ...fill(12, 37, 8, 1, 'soft')];

export const WRECK_HOLD: LevelDef = {
  id: 'ch1-05-hold',
  name: 'The Wreck Hold',
  number: 5,
  chapter: 1,
  layout: 'vault',
  par: 70,
  tip: 'The door is in the middle of the floor. Straight up and let it rattle.',
  bricks: [...HOLD, ...BARRELS, ...PLUG, ...TEASERS],
};
