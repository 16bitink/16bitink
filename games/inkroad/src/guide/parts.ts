import type { Cell, CityView, Id, Pt } from '../sim/types';
import { findDetour } from './detour';
import { dist, isRed, junctionOf, mainJunction, ptOf } from './places';
import type { GuideView, Memo, RoadPlanHint, Target } from './types';

/** Pieces scripts share: targets, checks, and numbers as words. */
export const secs = (n: number): string => `${Math.max(1, Math.round(n))} s`;
export const coins = (n: number): string => `${Math.round(n)} ${Math.round(n) === 1 ? 'coin' : 'coins'}`;

export const atJunction = (city: CityView, id: Id, tap = true): Target | null => {
  const j = junctionOf(city, id);
  return j ? { t: 'spot', at: { x: j.x, y: j.y }, r: Math.max(34, j.radius + 8), tap } : null;
};
export const ui = (...sel: string[]): Target => ({ t: 'ui', sel, tap: true });
export const look = (...sel: string[]): Target => ({ t: 'ui', sel, tap: false });

export const BUILD = ui('.ghostbar [data-act=build]:not(:disabled)');
export const NEXT = ui('.cards [data-act=next]:not(.hidden)');

export const selected = (v: GuideView, id: Id): boolean => v.selection?.kind === 'junction' && v.selection.id === id;
export const main = (v: GuideView): Id => mainJunction(v.city)?.id ?? -1;
export const waitAt = (v: GuideView, id: Id): number => v.city.junctionStats(id).wait;
export const redAt = (v: GuideView, id: Id): boolean => isRed(v.city.junctionStats(id).grade);
export const controlOf = (v: GuideView, id: Id): string => junctionOf(v.city, id)?.control ?? '';

/** A detour is worked out once and kept while the roads stay the same. */
const cache = new WeakMap<CityView, { version: number; money: number; node: Id; plan: RoadPlanHint | null }>();
export function detourOf(city: CityView, node: Id): RoadPlanHint | null {
  const was = cache.get(city);
  if (was && was.version === city.version && was.node === node && was.money === city.money) return was.plan;
  const plan = findDetour(city, node, city.money);
  cache.set(city, { version: city.version, money: city.money, node, plan });
  return plan;
}

/** Does this drawn road join the same two places? */
export function joins(cells: readonly Cell[], plan: RoadPlanHint): boolean {
  const a = cells[0];
  const b = cells[cells.length - 1];
  if (!a || !b) return false;
  const near = (c: Cell, d: Cell): boolean => dist(ptOf(c), ptOf(d)) <= 60;
  return (near(a, plan.from) && near(b, plan.to)) || (near(a, plan.to) && near(b, plan.from));
}

export const lineOf = (plan: RoadPlanHint): readonly Pt[] => plan.cells.map(ptOf);

/** Roads that were not there when `keep` was taken. */
export const roadIds = (city: CityView): number => Math.max(0, ...city.roads.map((r) => r.id));
export const newRoads = (city: CityView, sinceId: number) => city.roads.filter((r) => r.id > sinceId && r.level === 0 && !r.flyover);

/** The busiest of the roads drawn since, in cars a minute. */
export const newFlow = (v: GuideView, m: Memo): number => Math.max(0, ...newRoads(v.city, m.lastRoad ?? 0).map((r) => v.city.roadStats(r.id).flow));

const WEEKEND_ON = 1000;
/** Seconds into the season: the weekend comes after the workday, so it only rises. */
export const clockOf = (v: GuideView): number => v.city.clock + (v.city.dayKind === 'weekend' ? WEEKEND_ON : 0);
