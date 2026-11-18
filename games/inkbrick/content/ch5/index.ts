/** Chapter 5, Brumm's Fort (paid, server only): levels 41-50 in order. */
import type { LevelDef } from '../../src/sim/types';
import { BRUMMS_ANCHOR } from './anchor';
import { BRINE_GLASS } from './glass';
import { TWO_DOORS } from './doors';
import { WHIRLPOOL_KEEP } from './keep';
import { FROZEN_STAIRS } from './frostmaze';
import { POWDER_FORT } from './powder';
import { OVER_THE_RAMPART } from './rampart';
import { SLUICE_GATE } from './sluice';
import { WARDED_KEEP } from './warded';
import { BRUMMS_LAST_STAND } from './boss';

export const CH5_LEVELS: readonly LevelDef[] = [
  TWO_DOORS, SLUICE_GATE, BRUMMS_ANCHOR, FROZEN_STAIRS, WARDED_KEEP, POWDER_FORT, OVER_THE_RAMPART, BRINE_GLASS, WHIRLPOOL_KEEP, BRUMMS_LAST_STAND,
];
