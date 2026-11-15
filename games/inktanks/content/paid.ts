import type { LevelDef } from '../src/logic/level/types';
import { CH2_LEVEL_DEFS } from './ch2/levels';
import { CH3_LEVEL_DEFS } from './ch3/levels';
import { CH4_LEVEL_DEFS } from './ch4/levels';
import { CH5_LEVEL_DEFS } from './ch5/levels';

/**
 * The full game's levels (11–50, chapters 2–5). SERVER-ONLY: imported by
 * the website's content registry and served by /api/content/inktanks to
 * verified owners. Never import this, or the chapter files it lists, from
 * the game's client code, or they ship to everyone. (The level lab in
 * src/sim imports it: the sim is a dev tool, never part of the client.)
 *
 * Chapter 5 (Deepwood) is being built (41 and 45 in). Raise READY_CHAPTERS in
 * src/logic/campaign.ts as each chapter's ten levels are all here, so the map sells it.
 */
export const INKTANKS_PAID_LEVELS: readonly LevelDef[] = [...CH2_LEVEL_DEFS, ...CH3_LEVEL_DEFS, ...CH4_LEVEL_DEFS, ...CH5_LEVEL_DEFS];
