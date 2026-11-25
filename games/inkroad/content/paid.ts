import type { CityDef } from '../src/sim/types';
import { HARBOUR } from './harbour';
import { HILLS } from './hills';
import { ISLES } from './isles';
import { RIVERS } from './rivers';

/**
 * InkRoad's paid cities, in play order (Old Harbour: years 11 to 20). SERVER-ONLY: the
 * website serves them to owners. Never import this from the game's client code, or they ship to everyone.
 */
export const PAID_CITIES: readonly CityDef[] = [HARBOUR, ISLES, HILLS, RIVERS];
