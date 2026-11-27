import type { CityDef } from '../../src/sim/types';
import { BEACHES, GATES, LOTS, MAP, ROADS_DEF } from './map';
import { ISLES_ROUTINE } from './routine';
import { ISLES_YEARS } from './years';

/** City 3 (paid): two rich islands with a bridge, a tunnel and no spare ground. */
export const ISLES: CityDef = {
  id: 'isles',
  name: 'Twin Isles',
  number: 3,
  blurb: 'Two rich islands with almost no land. Cars need a licence, and the tolls watch you back.',
  map: MAP,
  style: 'islands',
  startMoney: 520,
  startControl: 'yield',
  roads: ROADS_DEF,
  controls: [{ cell: [14, 7], control: 'roundabout' }, { cell: [14, 24], control: 'roundabout' }, { cell: [42, 24], control: 'roundabout' }],
  lots: LOTS,
  gates: GATES,
  beaches: BEACHES,
  years: ISLES_YEARS,
  routine: ISLES_ROUTINE,
  rules: { carOwnership: 0.76, landPrice: 22, widen: true, licences: { from: 4, wish: 0.84 }, speedTolls: { from: 6 } },
};
