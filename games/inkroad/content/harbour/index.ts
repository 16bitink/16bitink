import type { CityDef } from '../../src/sim/types';
import { GATES, LOTS, MAP, ROADS_DEF, WALL } from './map';
import { HARBOUR_ROUTINE } from './routine';
import { HARBOUR_YEARS } from './years';

/** City 2 (paid): an old stone town where nothing can be widened. */
export const HARBOUR: CityDef = {
  id: 'harbour',
  name: 'Old Harbour',
  number: 2,
  blurb: 'A stone town with three gates, thin lanes and a sea view. The walls will not move.',
  map: MAP,
  style: 'oldtown',
  startMoney: 420,
  startControl: 'yield',
  roads: ROADS_DEF,
  controls: [{ cell: [28, 19], control: 'signal' }],
  lots: LOTS,
  frontStreets: true,
  gates: GATES,
  years: HARBOUR_YEARS,
  routine: HARBOUR_ROUTINE,
  rules: { carOwnership: 0.66, landPrice: 6, widen: true, zoneCells: [[WALL.west, WALL.north, WALL.east - WALL.west, WALL.south - WALL.north + 4]] },
};
