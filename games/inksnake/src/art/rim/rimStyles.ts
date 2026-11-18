import type { Place } from '../../level/types';
import type { RimStyle } from './rimKit';
import { barrensRim, dunesRim, farmRim, rainforestRim, savannaRim } from './rimStylesA';
import { floodedRim, heathRim, jungleRim, mountainsRim, reefRim } from './rimStylesB';

/** Each place's wall round the board. */
export const RIM_STYLES: Record<Place, RimStyle> = {
  farm: farmRim, barrens: barrensRim, dunes: dunesRim, savanna: savannaRim, rainforest: rainforestRim,
  reef: reefRim, mountains: mountainsRim, heath: heathRim, jungle: jungleRim, flooded: floodedRim,
};

