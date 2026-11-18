/** Chapter 1 (free, bundled): levels in order, numbers 1-10. */
import type { LevelDef } from '../../sim/types';
import { BRUMMS_SEA_WALL } from './boss';
import { MULTIPLIER_CORE } from './core';
import { CHAIN_BLAST } from './fuse';
import { WRECK_HOLD } from './hold';
import { DOUBLE_WRECK } from './nest';
import { PEARL_REEF } from './reef';
import { TIDE_WALL } from './tide';
import { VAULT } from './vault';
import { OVER_THE_WALL } from './wall';
import { BRICK_WHALE } from './whale';

export const CH1_LEVELS: readonly LevelDef[] = [
  VAULT, OVER_THE_WALL, MULTIPLIER_CORE, CHAIN_BLAST, WRECK_HOLD, TIDE_WALL, PEARL_REEF, BRICK_WHALE, DOUBLE_WRECK, BRUMMS_SEA_WALL,
];
