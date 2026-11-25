import type { CityDef } from '../../sim/types';
import { BEACHES, GATES, LOTS, MAP, ROADS_DEF } from './saffronMap';
import { SAFFRON_YEARS } from './saffronYears';

/** City 1 (free): a young desert port where everyone drives. */
export const SAFFRON: CityDef = {
  id: 'saffron',
  name: 'Saffron Bay',
  number: 1,
  blurb: 'A young port in the sand. Cheap land, wide hopes, and everyone drives.',
  map: MAP,
  style: 'gulf',
  startMoney: 240,
  startControl: 'yield',
  roads: ROADS_DEF,
  controls: [{ cell: [22, 8], control: 'roundabout' }],
  lots: LOTS,
  gates: GATES,
  beaches: BEACHES,
  years: SAFFRON_YEARS,
  rules: { carOwnership: 0.82, landPrice: 2, widen: true },
};
