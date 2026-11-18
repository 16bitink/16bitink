/**
 * Level 11, "The Big Thaw". Signature: Vault, new piece: ice waves. Inside the vault three bands of
 * ice lie between rows of sandcastle: crack one ice brick and a wave runs through its whole band,
 * while the soft rows stop it. Gets in through a floor hole at the left, up an empty chimney to the
 * gap under the roof (as Level 1). Teaches: hit ice once and watch it spread; soft stops the wave.
 * Pieces: ice, soft, tough.
 */
import { fill, shell } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const SHELL = shell(8, 12, 19, 18, [{ side: 'bottom', at: 2, width: 3 }]);
const INSIDE = [
  ...fill(14, 16, 12, 3, 'ice'), ...fill(14, 19, 12, 1, 'soft'),
  ...fill(14, 20, 12, 3, 'ice'), ...fill(14, 23, 12, 1, 'soft'),
  ...fill(14, 24, 12, 3, 'ice'), ...fill(14, 27, 12, 2, 'soft'),
];
const TEASERS = [
  ...fill(0, 29, 6, 2, 'soft'), ...fill(30, 29, 6, 2, 'soft'), ...fill(0, 33, 6, 1, 'ice'), ...fill(30, 33, 6, 1, 'ice'),
  ...fill(0, 37, 6, 1, 'tough', { hp: 2 }), ...fill(30, 37, 6, 1, 'tough', { hp: 2 }),
];

export const BIG_THAW: LevelDef = {
  id: 'ch2-11-thaw',
  name: 'The Big Thaw',
  number: 11,
  chapter: 2,
  layout: 'vault',
  par: 115,
  tip: 'Crack one ice brick and the whole band shatters.',
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
