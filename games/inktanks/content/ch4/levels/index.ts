import type { LevelDef } from '../../../src/logic/level/types';
import { LEVEL_31 } from './level31';
import { LEVEL_32 } from './level32';
import { LEVEL_33 } from './level33';
import { LEVEL_34 } from './level34';
import { LEVEL_35 } from './level35';
import { LEVEL_36 } from './level36';
import { LEVEL_37 } from './level37';
import { LEVEL_38 } from './level38';
import { LEVEL_39 } from './level39';
import { LEVEL_40 } from './level40';

/**
 * Chapter 4, Frostridge: levels 31–40 (design doc "Chapter 4: Frostridge").
 * SERVER-ONLY, like content/paid.ts that lists them. Add each level here as
 * it's built (31 and 34 are the worked examples).
 */
export const CH4_LEVEL_DEFS: readonly LevelDef[] = [LEVEL_31, LEVEL_32, LEVEL_33, LEVEL_34, LEVEL_35, LEVEL_36, LEVEL_37, LEVEL_38, LEVEL_39, LEVEL_40];
