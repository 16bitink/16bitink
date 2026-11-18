/**
 * InkBrick's paid levels (11-50, chapters 2-5). SERVER-ONLY: served by the website only to owners
 * (apps/web/src/games/content.server.ts). Never import this, or the chapter files it lists, from
 * the game's client code, or they ship to everyone. (The lab in dev/ imports it: a dev tool.)
 */
import type { LevelDef } from '../src/sim/types';
import { CH2_LEVELS } from './ch2/index';
import { CH3_LEVELS } from './ch3/index';
import { CH4_LEVELS } from './ch4/index';
import { CH5_LEVELS } from './ch5/index';

export const INKBRICK_PAID_LEVELS: readonly LevelDef[] = [...CH2_LEVELS, ...CH3_LEVELS, ...CH4_LEVELS, ...CH5_LEVELS];
