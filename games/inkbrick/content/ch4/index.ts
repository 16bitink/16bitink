/** Chapter 4, Sea Cave (paid, server only): levels 31-40 in order. */
import type { LevelDef } from '../../src/sim/types';
import { LANTERN_LIGHT } from './dark';
import { DARK_WALL } from './darkwall';
import { LANTERN_CAVE } from './lantern';
import { HIDDEN_VAULT } from './poolvault';
import { TURNING_GATE } from './spinner';
import { WHIRLING_CORE } from './spinnercore';
import { TIDE_GATE } from './tide';
import { SWIRLING_POOL } from './whirlpool';
import { POOL_SHORTCUT } from './winding';
import { BRUMMS_WHIRLPOOL_DEN } from './boss';

export const CH4_LEVELS: readonly LevelDef[] = [
  SWIRLING_POOL, TURNING_GATE, LANTERN_LIGHT, TIDE_GATE, HIDDEN_VAULT, LANTERN_CAVE, POOL_SHORTCUT, WHIRLING_CORE, DARK_WALL, BRUMMS_WHIRLPOOL_DEN,
];
