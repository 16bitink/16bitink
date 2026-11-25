/** Road cross-sections: what the traffic drives on and the renderer paints. */
import { DECK_Z, TIER_Z, LANE, ROADS } from './constants';
import { lineLength, smoothstep } from './geom';
import type { Link, Road, RoadType } from './types';

/** Strip between the two directions, px. */
export const MEDIAN: Readonly<Record<RoadType, number>> = { street: 0, avenue: 0, boulevard: 6, highway: 4 };

/** Lanes in one direction. A one-way road uses the whole width; a ramp has one lane. */
export function lanesPerLink(road: Pick<Road, 'type' | 'oneWay' | 'flyover'>): number {
  if (road.flyover) return 1;
  return ROADS[road.type].lanes * (road.oneWay ? 2 : 1);
}

/** Half of the paved width. */
export function halfWidth(road: Pick<Road, 'type' | 'oneWay' | 'flyover'>): number {
  if (road.flyover) return LANE / 2;
  return ROADS[road.type].lanes * LANE + (road.oneWay ? 0 : MEDIAN[road.type] / 2);
}

/** How far right of the road's centre line (in the link's direction) lane i runs; lane 0 is leftmost. */
export function laneOffset(road: Pick<Road, 'type' | 'oneWay' | 'flyover'>, i: number): number {
  const n = lanesPerLink(road);
  if (road.flyover || road.oneWay) return (i + 0.5 - n / 2) * LANE;
  return MEDIAN[road.type] / 2 + (i + 0.5) * LANE;
}

/** Link ids come from the road's id, so they never change. */
export const forwardLink = (roadId: number): number => roadId * 2;
export const backwardLink = (roadId: number): number => roadId * 2 + 1;
export const isForward = (link: Pick<Link, 'id'>): boolean => link.id % 2 === 0;

const RAMP_PX = 110;
const RAMP_SHARE = 0.34;
/** A higher deck climbs for longer. */
const RAMP_TIER = { px: 30, share: 0.06 } as const;

/** Height of a road's surface `s` px along road.line: ramps at both ends, level between. 0 for ground roads. */
export function deckZ(road: Pick<Road, 'level' | 'line' | 'tier'>, s: number, length = lineLength(road.line)): number {
  if (road.level === 0) return 0;
  const over = (road.tier ?? 1) - 1;
  const ramp = Math.min(RAMP_PX + RAMP_TIER.px * over, (RAMP_SHARE + RAMP_TIER.share * over) * length);
  const top = DECK_Z * road.level + TIER_Z * over;
  return top * smoothstep(Math.min(s, length - s) / ramp);
}
