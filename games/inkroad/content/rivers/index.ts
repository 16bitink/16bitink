import type { CityDef } from '../../src/sim/types';
import { GATES, LOTS, MAP, ROADS_DEF } from './map';
import { RIVERS_YEARS } from './years';

/** City 5 (paid, skeleton): an ageing freeway city where the bravest road is the one you take away. */
export const RIVERS: CityDef = {
  id: 'rivers',
  name: 'Cross Rivers',
  number: 5,
  blurb: 'A freeway city with worn knees. Mend it, match it, or take the freeway away and plant a tree.',
  map: MAP,
  style: 'rivers',
  startMoney: 480,
  startControl: 'yield',
  roads: ROADS_DEF,
  controls: [{ cell: [18, 16], control: 'roundabout' }, { cell: [18, 28], control: 'roundabout' }, { cell: [43, 16], control: 'roundabout' }, { cell: [43, 28], control: 'roundabout' }, { cell: [18, 6], control: 'roundabout' }],
  lots: LOTS,
  gates: GATES,
  years: RIVERS_YEARS,
  rules: { carOwnership: 0.86, landPrice: 3, widen: true, ageing: { match: 3 }, freeway: { from: 6 } },
};
