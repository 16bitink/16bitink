/** Chapter 3, The Harbour (paid, server only): levels 21-30 in order. */
import type { LevelDef } from '../../src/sim/types';
import { GATED_CORE } from './gatedcore';
import { POWDER_PIER } from './fusepier';
import { HARBOUR_KEY } from './key';
import { LOCKED_COVE } from './keyvault';
import { WINDING_WAY } from './maze';
import { OLD_GALLEON } from './anchor';
import { LONG_QUAY } from './seawall';
import { BOATHOUSE_DOORS } from './shutters';
import { SHUTTERED_GATE } from './shutterhall';
import { BRUMMS_HARBOUR_LOCK } from './boss';

export const CH3_LEVELS: readonly LevelDef[] = [
  HARBOUR_KEY, BOATHOUSE_DOORS, WINDING_WAY, LOCKED_COVE, LONG_QUAY, SHUTTERED_GATE, OLD_GALLEON, GATED_CORE, POWDER_PIER, BRUMMS_HARBOUR_LOCK,
];
