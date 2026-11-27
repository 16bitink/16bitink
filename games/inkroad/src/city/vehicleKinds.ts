import type { VehicleKind } from '../sim/types';
import type { Leg, Tour } from './day';
import { carById } from './households';
import type { City } from './state';

/** Share of other people's cars that are vans. */
export const VAN_SHARE = 0.12;

/** The vehicle a tour is made in, when it is not a household's own car. */
export const kindOf = (t: Tour, mode: Leg['mode']): VehicleKind => (mode === 'taxi' ? 'taxi' : t.purpose === 'truck' ? 'truck' : t.seed < VAN_SHARE ? 'van' : 'car');

/** The vehicle a leg drives: its household car, or the tour's. */
export const legKind = (c: City, leg: Leg): VehicleKind => carById(c, leg.car)?.kind ?? kindOf(leg.tour, leg.mode);
