import type { LevelDef } from '../../../src/logic/level/types';
import { LEVEL_21 } from './level21';
import { LEVEL_22 } from './level22';
import { LEVEL_23 } from './level23';
import { LEVEL_24 } from './level24';
import { LEVEL_25 } from './level25';
import { LEVEL_26 } from './level26';
import { LEVEL_27 } from './level27';
import { LEVEL_29 } from './level29';
import { LEVEL_30 } from './level30';
import { LEVEL_28 } from './level28';

/**
 * Chapter 3, Mirefen: levels 21–30 (design doc "Chapter 3: Mirefen").
 * SERVER-ONLY, like content/paid.ts that lists them. Add each level here as
 * it's built (21 and 23 are the worked examples).
 */
export const CH3_LEVEL_DEFS: readonly LevelDef[] = [LEVEL_21, LEVEL_22, LEVEL_23, LEVEL_24, LEVEL_25, LEVEL_26, LEVEL_27, LEVEL_28, LEVEL_29, LEVEL_30];
