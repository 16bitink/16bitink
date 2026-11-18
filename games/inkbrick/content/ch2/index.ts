/** Chapter 2, Ice Floe (paid, server only): levels 11-20 in order. */
import type { LevelDef } from '../../src/sim/types';
import { DRIFT_ICE } from './drift';
import { FROZEN_CORE } from './core';
import { POWDER_ICE } from './fuse';
import { FROZEN_STRAIT } from './hourglass';
import { ICE_MAZE } from './maze';
import { PENGUIN_POINT } from './penguin';
import { BIG_THAW } from './thaw';
import { FROZEN_WALL } from './wall';
import { ICE_HUT } from './hut';
import { BRUMMS_ICE_SHELF } from './boss';

export const CH2_LEVELS: readonly LevelDef[] = [
  BIG_THAW, DRIFT_ICE, PENGUIN_POINT, ICE_HUT, FROZEN_WALL, FROZEN_STRAIT, FROZEN_CORE, POWDER_ICE, ICE_MAZE, BRUMMS_ICE_SHELF,
];
