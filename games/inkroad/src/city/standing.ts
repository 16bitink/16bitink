import { YEARS_PER_CITY } from '../sim/constants';
import { expandCells } from '../sim/netPlan';
import type { Refusal } from '../sim/netGround';
import type { Cell, CityDef, CityView, Lot, PlannedRoad, RoadDef } from '../sim/types';
import type { Block } from './geometry';
import { vertexInBlock } from './geometry';
import type { City } from './state';

/** Who holds which ground, in words: a refusal always names something the player can see. */

/** Years ahead the Master Plan is drawn on the map and keeps its ground. */
export const PLAN_YEARS = 2;
/** The opening year of a plot that found no ground: it never opens. */
export const DROPPED = 99;

/** The year as the player reads it: a city's years run on from the one before. */
export const shownYear = (def: CityDef, year: number): number => (def.number - 1) * YEARS_PER_CITY + year;

export const isDue = (l: Lot, year: number): boolean => l.level === 0 && l.opensYear >= year && l.opensYear - year <= PLAN_YEARS;
/** Open blocks and the plots drawn on the map hold their ground; plots further ahead hold nothing. */
export const holdsGround = (l: Lot, year: number): boolean => l.kind !== 'beach' && (l.level > 0 || isDue(l, year));

const rectOf = (b: Block): Block => ({ gx: b.gx, gy: b.gy, w: b.w, h: b.h });

export function lotRefusal(def: CityDef, l: Lot): Refusal {
  return { why: l.level > 0 ? `${l.name} stands here` : `${l.name} opens here in year ${shownYear(def, l.opensYear)}`, at: rectOf(l) };
}
export const parkRefusal = (p: Block): Refusal => ({ why: 'A car park stands here', at: rectOf(p) });

/** What stands on a vertex, or null. */
export function standingAt(c: City): (cell: Cell) => Refusal | null {
  const lots = c.lots.filter((l) => holdsGround(l, c.year));
  return (cell) => {
    const lot = lots.find((l) => vertexInBlock(l, cell));
    if (lot) return lotRefusal(c.def, lot);
    const park = c.parks.find((p) => vertexInBlock(p, cell));
    return park ? parkRefusal(park) : null;
  };
}

export const defCells = (r: RoadDef): readonly Cell[] => expandCells(r.cells.map(([gx, gy]) => ({ gx, gy })));

const planCache = new WeakMap<CityDef, Map<number, readonly PlannedRoad[]>>();
/** The Council's own roads of the next two years. The same array for the same year. */
export function plannedRoads(def: CityDef, year: number): CityView['plannedRoads'] {
  const years = planCache.get(def) ?? new Map<number, readonly PlannedRoad[]>();
  planCache.set(def, years);
  const have = years.get(year);
  if (have) return have;
  const made = def.roads.flatMap((r): PlannedRoad[] => {
    const opens = r.opensYear ?? 1;
    return opens > year && opens - year <= PLAN_YEARS ? [{ cells: defCells(r), type: r.type, year: opens }] : [];
  });
  years.set(year, made);
  return made;
}
