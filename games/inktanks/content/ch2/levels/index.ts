import type { LevelDef } from '../../../src/logic/level/types';
import { LEVEL_11 } from './level11';
import { LEVEL_12 } from './level12';
import { LEVEL_13 } from './level13';
import { LEVEL_14 } from './level14';
import { LEVEL_15 } from './level15';
import { LEVEL_16 } from './level16';
import { LEVEL_17 } from './level17';
import { LEVEL_18 } from './level18';
import { LEVEL_19 } from './level19';
import { LEVEL_20 } from './level20';

/**
 * Chapter 2, Dust Flats: levels 11–20 (design doc "Chapter 2: Dust Flats").
 * SERVER-ONLY, like content/paid.ts that lists them. Add each level here as
 * it's built (11 and 14 are the worked examples).
 * All ten are in (Nov 14).
 */
export const CH2_LEVEL_DEFS: readonly LevelDef[] = [LEVEL_11, LEVEL_12, LEVEL_13, LEVEL_14, LEVEL_15, LEVEL_16, LEVEL_17, LEVEL_18, LEVEL_19, LEVEL_20];
