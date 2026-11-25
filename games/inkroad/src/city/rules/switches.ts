import type { Road } from '../../sim/types';

/** Why a road can't have a gate, or null. */
export const roadSwitchQuote = (r: Road | undefined): string | null =>
  (!r || r.level !== 0 || r.flyover ? 'Pick a road on the ground' : r.fixed ? 'The highway ministry owns this one' : null);
