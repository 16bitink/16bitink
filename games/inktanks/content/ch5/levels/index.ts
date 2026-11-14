import type { LevelDef } from '../../../src/logic/level/types';
import { LEVEL_41 } from './level41';
import { LEVEL_42 } from './level42';
import { LEVEL_43 } from './level43';
import { LEVEL_44 } from './level44';
import { LEVEL_45 } from './level45';
import { LEVEL_46 } from './level46';
import { LEVEL_47 } from './level47';
import { LEVEL_48 } from './level48';
import { LEVEL_49 } from './level49';
import { LEVEL_50 } from './level50';

/**
 * Chapter 5, Deepwood: levels 41–50 (design doc "Chapter 5: Deepwood").
 * SERVER-ONLY, like content/paid.ts that lists them. Add each level here as
 * it's built (41 and 45 are the worked examples).
 */
export const CH5_LEVEL_DEFS: readonly LevelDef[] = [LEVEL_41, LEVEL_42, LEVEL_43, LEVEL_44, LEVEL_45, LEVEL_46, LEVEL_47, LEVEL_48, LEVEL_49, LEVEL_50];
