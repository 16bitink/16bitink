import type { CityDef } from '../../src/sim/types';
import { GATES, MAP, ROADS_DEF } from './map';
import { LOTS } from './lots';
import { HILLS_ROUTINE } from './routine';
import { HILLS_YEARS } from './years';

/** City 4 (paid): two steep shores, two bridges, ferries and minibuses with opinions. */
export const HILLS: CityDef = {
  id: 'hills',
  name: 'Seven Hills',
  number: 4,
  blurb: 'A big steep city with water down the middle. The minibuses were here first, and they will tell you so.',
  map: MAP,
  style: 'hills',
  startMoney: 460,
  startControl: 'yield',
  roads: ROADS_DEF,
  controls: [{ cell: [6, 16], control: 'roundabout' }, { cell: [16, 10], control: 'roundabout' }, { cell: [48, 16], control: 'roundabout' }, { cell: [48, 10], control: 'roundabout' }],
  lots: LOTS,
  gates: GATES,
  years: HILLS_YEARS,
  routine: HILLS_ROUTINE,
  rules: { carOwnership: 0.6, landPrice: 5, widen: true, steep: true, ferries: 1.8, minibuses: { from: 3 } },
};
